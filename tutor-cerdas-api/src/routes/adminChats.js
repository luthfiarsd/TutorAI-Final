import { Router } from "express";
import { query, validationResult } from "express-validator";
import { authenticateUser, requireAdmin } from "../middleware/auth.js";
import pool from "../utils/db.js";

const router = Router();

// All routes require authentication and admin role
router.use(authenticateUser, requireAdmin);

/**
 * GET /api/admin/chats
 * Monitor all chats with filters
 */
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("user_id").optional().isInt(),
    query("start_date").optional().isISO8601(),
    query("end_date").optional().isISO8601(),
    query("language").optional().isIn(["id", "en"]),
    query("keyword").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const userId = req.query.user_id;
      const startDate = req.query.start_date;
      const endDate = req.query.end_date;
      const language = req.query.language;
      const keyword = req.query.keyword;

      // Build WHERE clause
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      if (userId) {
        whereConditions.push(`ch.user_id = $${paramIndex}`);
        queryParams.push(parseInt(userId));
        paramIndex++;
      }

      if (startDate) {
        whereConditions.push(`ch.created_at >= $${paramIndex}`);
        queryParams.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereConditions.push(`ch.created_at <= $${paramIndex}`);
        queryParams.push(endDate);
        paramIndex++;
      }

      if (language) {
        whereConditions.push(`ch.language = $${paramIndex}`);
        queryParams.push(language);
        paramIndex++;
      }

      if (keyword) {
        whereConditions.push(
          `(ch.message ILIKE $${paramIndex} OR ch.reply ILIKE $${paramIndex})`
        );
        queryParams.push(`%${keyword}%`);
        paramIndex++;
      }

      const whereClause =
        whereConditions.length > 0
          ? "WHERE " + whereConditions.join(" AND ")
          : "";

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM chat_history ch ${whereClause}`,
        queryParams
      );
      const totalChats = parseInt(countResult.rows[0].count);

      // Get chats
      const result = await pool.query(
        `SELECT 
         ch.id, ch.message, ch.reply, ch.language, ch.sources, ch.created_at,
         p.id as user_id, p.name as user_name, p.email as user_email
       FROM chat_history ch
       LEFT JOIN profiles p ON ch.user_id = p.id
       ${whereClause}
       ORDER BY ch.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, limit, offset]
      );

      res.json({
        success: true,
        data: {
          chats: result.rows,
          pagination: {
            page,
            limit,
            total: totalChats,
            total_pages: Math.ceil(totalChats / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get chats error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get chats",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/admin/chats/:id
 * Get chat details
 */
router.get("/:id", async (req, res) => {
  try {
    const chatId = parseInt(req.params.id);

    if (isNaN(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID",
      });
    }

    const result = await pool.query(
      `SELECT 
         ch.*,
         p.id as user_id, p.name as user_name, p.email as user_email
       FROM chat_history ch
       LEFT JOIN profiles p ON ch.user_id = p.id
       WHERE ch.id = $1`,
      [chatId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    // Get feedback if exists
    const feedbackResult = await pool.query(
      "SELECT rating, comment, created_at FROM feedback WHERE chat_id = $1",
      [chatId]
    );

    res.json({
      success: true,
      data: {
        chat: result.rows[0],
        feedback: feedbackResult.rows[0] || null,
      },
    });
  } catch (error) {
    console.error("Get chat error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get chat",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/chats/export
 * Export chats to CSV
 */
router.post("/export", async (req, res) => {
  try {
    const { user_id, start_date, end_date, language } = req.body;

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (user_id) {
      whereConditions.push(`ch.user_id = $${paramIndex}`);
      queryParams.push(user_id);
      paramIndex++;
    }

    if (start_date) {
      whereConditions.push(`ch.created_at >= $${paramIndex}`);
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereConditions.push(`ch.created_at <= $${paramIndex}`);
      queryParams.push(end_date);
      paramIndex++;
    }

    if (language) {
      whereConditions.push(`ch.language = $${paramIndex}`);
      queryParams.push(language);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    // Get chats
    const result = await pool.query(
      `SELECT 
         ch.id, ch.message, ch.reply, ch.language, ch.created_at,
         p.name as user_name, p.email as user_email
       FROM chat_history ch
       LEFT JOIN profiles p ON ch.user_id = p.id
       ${whereClause}
       ORDER BY ch.created_at DESC`,
      queryParams
    );

    // Generate CSV
    const csvHeader =
      "ID,User Name,User Email,Message,Reply,Language,Created At\n";
    const csvRows = result.rows
      .map((row) => {
        const message = row.message.replace(/"/g, '""').replace(/\n/g, " ");
        const reply = row.reply.replace(/"/g, '""').replace(/\n/g, " ");
        return `${row.id},"${row.user_name}","${row.user_email}","${message}","${reply}",${row.language},${row.created_at}`;
      })
      .join("\n");

    const csv = csvHeader + csvRows;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=chats-export-${Date.now()}.csv`
    );
    res.send(csv);
  } catch (error) {
    console.error("Export chats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export chats",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/admin/chats/:id
 * Delete a chat (admin can delete any chat)
 */
router.delete("/:id", async (req, res) => {
  try {
    const chatId = parseInt(req.params.id);

    if (isNaN(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID",
      });
    }

    const result = await pool.query(
      "DELETE FROM chat_history WHERE id = $1 RETURNING id",
      [chatId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    res.json({
      success: true,
      message: "Chat deleted successfully",
    });
  } catch (error) {
    console.error("Delete chat error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete chat",
      error: error.message,
    });
  }
});

export default router;
