import { useState, useEffect, useRef } from "react";
import { adminDocumentsAPI } from "../../lib/api";

export default function AdminDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);

  // Load documents
  useEffect(() => {
    loadDocuments();
  }, [currentPage, statusFilter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit,
        status: statusFilter !== "all" ? statusFilter : undefined,
      };

      console.log("Fetching documents with params:", params);
      const response = await adminDocumentsAPI.getDocuments(params);
      console.log("Full API Response:", response);
      console.log("Response data structure:", response.data);

      // Handle nested data structure
      const documentsData = response.data.data || response.data;
      console.log("Documents data:", documentsData);

      setDocuments(documentsData.documents || []);

      // Handle pagination
      const paginationData = documentsData.pagination || {};
      const totalCount = paginationData.total || documentsData.total || 0;
      console.log("Total documents:", totalCount);

      setTotalPages(Math.ceil(totalCount / limit));
      setError(null);
    } catch (err) {
      console.error("Load documents error:", err);
      console.error("Error response:", err.response);
      setError(err.response?.data?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setError(null);
    } else {
      setError("Please select a PDF file");
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setError(null);
    } else {
      setError("Please drop a PDF file");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("document", selectedFile);

      await adminDocumentsAPI.uploadDocument(formData);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      loadDocuments();
      alert("Document uploaded successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleReindex = async (docId) => {
    try {
      await adminDocumentsAPI.reindexDocument(docId);
      alert("Document queued for re-indexing");
      loadDocuments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reindex document");
    }
  };

  const handleEmbed = async (docId) => {
    try {
      await adminDocumentsAPI.embedDocument(docId);
      alert("Document queued for embedding generation");
      loadDocuments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to start embedding");
    }
  };

  const handleDeleteDocument = async () => {
    try {
      await adminDocumentsAPI.deleteDocument(documentToDelete.id);
      setShowDeleteModal(false);
      setDocumentToDelete(null);
      loadDocuments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete document");
    }
  };

  const openDeleteModal = (document) => {
    setDocumentToDelete(document);
    setShowDeleteModal(true);
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      pending: { bg: "#fff3cd", color: "#856404" },
      processing: { bg: "#cfe2ff", color: "#084298" },
      completed: { bg: "#d1e7dd", color: "#0f5132" },
      failed: { bg: "#f8d7da", color: "#842029" },
    };

    const style = statusStyles[status] || statusStyles.pending;

    return (
      <span
        style={{
          padding: "4px 8px",
          borderRadius: "12px",
          fontSize: "12px",
          background: style.bg,
          color: style.color,
          fontWeight: "500",
        }}
      >
        {status}
      </span>
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <h1 style={{ color: "#333" }}>Document Management</h1>

      {/* Upload Section */}
      <div
        style={{
          background: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Upload PDF Document</h2>

        {/* Drag & Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? "#2196F3" : "#ddd"}`,
            borderRadius: "8px",
            padding: "40px",
            textAlign: "center",
            cursor: "pointer",
            background: dragActive ? "#f0f8ff" : "#fafafa",
            transition: "all 0.3s",
            marginBottom: "15px",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          <div style={{ fontSize: "48px", marginBottom: "10px" }}></div>
          <p style={{ margin: "10px 0", color: "#666" }}>
            {selectedFile ? (
              <>
                <strong>{selectedFile.name}</strong>
                <br />
                {formatFileSize(selectedFile.size)}
              </>
            ) : (
              <>
                Drag & drop PDF file here or click to browse
                <br />
                <small>Supported format: PDF only</small>
              </>
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            style={{
              padding: "10px 20px",
              background: !selectedFile || uploading ? "#ccc" : "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: !selectedFile || uploading ? "not-allowed" : "pointer",
            }}
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </button>

          {selectedFile && (
            <button
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              style={{
                padding: "10px 20px",
                background: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>

        <button
          onClick={loadDocuments}
          style={{
            padding: "10px 20px",
            background: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: "15px",
            background: "#fee",
            color: "#c33",
            borderRadius: "4px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>Loading documents...</p>
        </div>
      ) : (
        <>
          {/* Documents Table */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th style={tableHeaderStyle}>Filename</th>
                  <th style={tableHeaderStyle}>Status</th>
                  <th style={tableHeaderStyle}>Size</th>
                  <th style={tableHeaderStyle}>Chunks</th>
                  <th style={tableHeaderStyle}>Embeddings</th>
                  <th style={tableHeaderStyle}>Uploaded</th>
                  <th style={tableHeaderStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!documents || documents.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      style={{ textAlign: "center", padding: "40px" }}
                    >
                      No documents found
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={tableCellStyle}>
                        <div
                          style={{
                            maxWidth: "300px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {doc.filename}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        {getStatusBadge(doc.status)}
                      </td>
                      <td style={tableCellStyle}>
                        {formatFileSize(doc.file_size || 0)}
                      </td>
                      <td style={tableCellStyle}>{doc.chunk_count || 0}</td>
                      <td style={tableCellStyle}>
                        {doc.chunk_count > 0 ? (
                          <div>
                            <div
                              style={{ fontSize: "14px", fontWeight: "500" }}
                            >
                              {doc.embedded_count || 0} / {doc.chunk_count || 0}
                            </div>
                            {doc.pending_count > 0 && (
                              <div
                                style={{ fontSize: "11px", color: "#ff9800" }}
                              >
                                {doc.pending_count} pending
                              </div>
                            )}
                            {doc.failed_count > 0 && (
                              <div
                                style={{ fontSize: "11px", color: "#f44336" }}
                              >
                                {doc.failed_count} failed
                              </div>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td style={tableCellStyle}>
                        {new Date(doc.created_at).toLocaleString()}
                      </td>
                      <td style={tableCellStyle}>
                        {doc.status === "failed" && (
                          <button
                            onClick={() => handleReindex(doc.id)}
                            style={{
                              padding: "5px 10px",
                              marginRight: "5px",
                              background: "#FF9800",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                          >
                            Reindex
                          </button>
                        )}
                        {doc.status === "completed" && (
                          <button
                            onClick={() => handleEmbed(doc.id)}
                            style={{
                              padding: "5px 10px",
                              marginRight: "5px",
                              background: "#2196F3",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                          >
                            Embed
                          </button>
                        )}
                        <button
                          onClick={() => openDeleteModal(doc)}
                          style={{
                            padding: "5px 10px",
                            background: "#f44336",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "8px 15px",
                  background: currentPage === 1 ? "#ccc" : "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                }}
              >
                ← Previous
              </button>

              <span>
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                style={{
                  padding: "8px 15px",
                  background: currentPage === totalPages ? "#ccc" : "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    currentPage === totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && documentToDelete && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2>Delete Document</h2>
            <p>
              Are you sure you want to delete{" "}
              <strong>{documentToDelete.filename}</strong>? This will also
              delete all associated chunks. This action cannot be undone.
            </p>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDocumentToDelete(null);
                }}
                style={{
                  padding: "10px 20px",
                  background: "#ccc",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDocument}
                style={{
                  padding: "10px 20px",
                  background: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const tableHeaderStyle = {
  padding: "12px",
  textAlign: "left",
  borderBottom: "2px solid #ddd",
  fontWeight: "600",
};

const tableCellStyle = {
  padding: "12px",
  textAlign: "left",
};

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalContentStyle = {
  background: "white",
  padding: "30px",
  borderRadius: "8px",
  maxWidth: "500px",
  width: "90%",
  maxHeight: "90vh",
  overflow: "auto",
};
