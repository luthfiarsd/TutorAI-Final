import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import axios from "axios";
import { authenticateUser, requireAdmin } from "../middleware/auth.js";
import pool from "../utils/db.js";

const router = Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || "./uploads/documents";
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
});

// All routes require authentication and admin role
router.use(authenticateUser, requireAdmin);

/**
 * POST /api/admin/documents/upload
 * Upload PDF document and trigger indexing
 */
router.post("/upload", upload.single("document"), async (req, res) => {
  let documentId = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please upload a PDF file.",
      });
    }

    const { originalname, filename, path: filePath, size } = req.file;
    const uploadedBy = req.user.id;

    // Save document metadata to database
    const result = await pool.query(
      `INSERT INTO documents (filename, file_path, uploaded_by, status, file_size)
       VALUES ($1, $2, $3, 'pending', $4)
       RETURNING id, filename, file_path, status, file_size, created_at`,
      [originalname, filePath, uploadedBy, size]
    );

    const document = result.rows[0];
    documentId = document.id;

    // Trigger indexing (call indexer service)
    const indexerUrl = process.env.INDEXER_URL || "http://localhost:8000";
    const absolutePath = path.resolve(filePath);

    // Call indexer asynchronously
    axios
      .post(`${indexerUrl}/index`, {
        document_id: documentId,
        file_path: absolutePath,
      })
      .then(() => {
        console.log(`Document ${documentId} indexed successfully`);
      })
      .catch((error) => {
        console.error(`Error indexing document ${documentId}:`, error.message);
      });

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully. Indexing in progress.",
      data: {
        document,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);

    // Clean up file if database insert failed
    if (req.file && documentId === null) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error("Error deleting file:", unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to upload document",
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/documents
 * List all documents with status and pagination
 */
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    let whereClauseCount = ""; // for simple count query (no alias)
    let whereClauseMain = ""; // for main query with alias d
    let queryParams = [];

    if (status) {
      // count query uses unaliased column name
      whereClauseCount = "WHERE status = $1";
      // main query (with joins) must qualify column to avoid ambiguity
      whereClauseMain = "WHERE d.status = $1";
      queryParams.push(status);
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM documents ${whereClauseCount}`,
      queryParams
    );
    const totalDocuments = parseInt(countResult.rows[0].count);

    // Get documents
    const result = await pool.query(
      `SELECT 
         d.id, d.filename, d.status, d.file_size, d.created_at,
         p.name as uploaded_by_name,
         COUNT(c.id) as chunk_count,
         COUNT(CASE WHEN c.status = 'embedded' THEN 1 END) as embedded_count,
         COUNT(CASE WHEN c.status = 'pending' THEN 1 END) as pending_count,
         COUNT(CASE WHEN c.status = 'failed' THEN 1 END) as failed_count
       FROM documents d
       LEFT JOIN profiles p ON d.uploaded_by = p.id
       LEFT JOIN chunks c ON d.id = c.document_id
       ${whereClauseMain}
       GROUP BY d.id, p.name
       ORDER BY d.created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );

    res.json({
      success: true,
      data: {
        documents: result.rows,
        pagination: {
          page,
          limit,
          total: totalDocuments,
          total_pages: Math.ceil(totalDocuments / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get documents",
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/documents/:id
 * Get document details
 */
router.get("/:id", async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);

    if (isNaN(documentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID",
      });
    }

    const result = await pool.query(
      `SELECT 
         d.*,
         p.name as uploaded_by_name,
         COUNT(c.id) as chunk_count
       FROM documents d
       LEFT JOIN profiles p ON d.uploaded_by = p.id
       LEFT JOIN chunks c ON d.id = c.document_id
       WHERE d.id = $1
       GROUP BY d.id, p.name`,
      [documentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    res.json({
      success: true,
      data: {
        document: result.rows[0],
      },
    });
  } catch (error) {
    console.error("Get document error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get document",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/admin/documents/:id
 * Delete document and its chunks
 */
router.delete("/:id", async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);

    if (isNaN(documentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID",
      });
    }

    // Get document info
    const docResult = await pool.query(
      "SELECT file_path FROM documents WHERE id = $1",
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    const filePath = docResult.rows[0].file_path;

    // Delete from database (cascades to chunks)
    await pool.query("DELETE FROM documents WHERE id = $1", [documentId]);

    // Delete file from filesystem
    try {
      await fs.unlink(filePath);
      console.log(`Deleted file: ${filePath}`);
    } catch (fileError) {
      console.error("Error deleting file:", fileError);
      // Continue even if file deletion fails
    }

    res.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete document",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/documents/:id/reindex
 * Trigger re-indexing for a document
 */
router.post("/:id/reindex", async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);

    if (isNaN(documentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID",
      });
    }

    // Get document
    const result = await pool.query(
      "SELECT id, file_path, status FROM documents WHERE id = $1",
      [documentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    const document = result.rows[0];

    // Delete existing chunks
    await pool.query("DELETE FROM chunks WHERE document_id = $1", [documentId]);

    // Update status to pending
    await pool.query(
      "UPDATE documents SET status = $1, updated_at = NOW() WHERE id = $2",
      ["pending", documentId]
    );

    // Trigger indexing
    const indexerUrl = process.env.INDEXER_URL || "http://localhost:8000";
    const absolutePath = path.resolve(document.file_path);

    axios
      .post(`${indexerUrl}/index`, {
        document_id: documentId,
        file_path: absolutePath,
      })
      .then(() => {
        console.log(`Document ${documentId} re-indexed successfully`);
      })
      .catch((error) => {
        console.error(
          `Error re-indexing document ${documentId}:`,
          error.message
        );
      });

    res.json({
      success: true,
      message: "Document re-indexing triggered",
    });
  } catch (error) {
    console.error("Reindex error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reindex document",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/documents/:id/embed
 * Trigger embedding generation for a specific document's chunks
 */
router.post("/:id/embed", async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);

    if (isNaN(documentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID",
      });
    }

    // Check if document exists
    const result = await pool.query(
      "SELECT id, status FROM documents WHERE id = $1",
      [documentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Trigger embedding
    const indexerUrl = process.env.INDEXER_URL || "http://localhost:8000";

    // Send document_id as query param so indexer will process only that document
    axios
      .post(`${indexerUrl}/embed`, null, {
        params: { document_id: documentId },
      })
      .then(() => {
        console.log(
          `Embeddings for document ${documentId} generation triggered successfully`
        );
      })
      .catch((error) => {
        console.error(
          `Error generating embeddings for document ${documentId}:`,
          error.message
        );
      });

    res.json({
      success: true,
      message: "Embedding generation triggered for document chunks",
    });
  } catch (error) {
    console.error("Embed error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to trigger embedding",
      error: error.message,
    });
  }
});

export default router;
