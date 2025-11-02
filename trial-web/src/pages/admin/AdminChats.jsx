import { useState, useEffect } from "react";
import { adminChatsAPI } from "../../lib/api";

export default function AdminChats() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Modals
  const [selectedChat, setSelectedChat] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);

  // Statistics
  const [stats, setStats] = useState({
    totalChats: 0,
    indonesian: 0,
    english: 0,
  });

  // Load chats
  useEffect(() => {
    loadChats();
  }, [currentPage, searchTerm, userFilter, dateFrom, dateTo]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit,
        search: searchTerm || undefined,
        user: userFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };

      const response = await adminChatsAPI.getChats(params);
      setChats(response.data.chats || []);
      setTotalPages(Math.ceil((response.data.total || 0) / limit));

      // Calculate stats
      const total = response.data.total || 0;
      const chatList = response.data.chats || [];
      const indonesian = chatList.filter(
        (c) => c.language === "id" || c.language === "indonesian"
      ).length;
      const english = chatList.filter(
        (c) => c.language === "en" || c.language === "english"
      ).length;

      setStats({ totalChats: total, indonesian, english });
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load chats");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (chat) => {
    try {
      const response = await adminChatsAPI.getChat(chat.id);
      setSelectedChat(response.data);
      setShowDetailModal(true);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load chat details");
    }
  };

  const handleDeleteChat = async () => {
    try {
      await adminChatsAPI.deleteChat(chatToDelete.id);
      setShowDeleteModal(false);
      setChatToDelete(null);
      loadChats();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete chat");
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = {
        search: searchTerm || undefined,
        user: userFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };

      const response = await adminChatsAPI.exportChats(params);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `chats-export-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      alert("Chats exported successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to export chats");
    }
  };

  const openDeleteModal = (chat) => {
    setChatToDelete(chat);
    setShowDeleteModal(true);
  };

  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <h1 style={{ color: "#333" }}>Chat Monitoring</h1>

      {/* Statistics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "15px",
          marginBottom: "20px",
        }}
      >
        <div style={statCardStyle}>
          <div
            style={{ fontSize: "32px", fontWeight: "bold", color: "#2196F3" }}
          >
            {stats.totalChats}
          </div>
          <div style={{ color: "#666" }}>Total Chats</div>
        </div>
        <div style={statCardStyle}>
          <div
            style={{ fontSize: "32px", fontWeight: "bold", color: "#4CAF50" }}
          >
            {stats.indonesian}
          </div>
          <div style={{ color: "#666" }}>Indonesian</div>
        </div>
        <div style={statCardStyle}>
          <div
            style={{ fontSize: "32px", fontWeight: "bold", color: "#FF9800" }}
          >
            {stats.english}
          </div>
          <div style={{ color: "#666" }}>English</div>
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
        <input
          type="text"
          placeholder=" Search messages..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            flex: "1",
            minWidth: "200px",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        />

        <input
          type="text"
          placeholder="Filter by user email..."
          value={userFilter}
          onChange={(e) => {
            setUserFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            flex: "1",
            minWidth: "200px",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        />

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        />

        <button
          onClick={loadChats}
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

        <button
          onClick={handleExportCSV}
          style={{
            padding: "10px 20px",
            background: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Export CSV
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
          <p>Loading chats...</p>
        </div>
      ) : (
        <>
          {/* Chats Table */}
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
                  <th style={tableHeaderStyle}>User</th>
                  <th style={tableHeaderStyle}>Message</th>
                  <th style={tableHeaderStyle}>Language</th>
                  <th style={tableHeaderStyle}>Timestamp</th>
                  <th style={tableHeaderStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!chats || chats.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      style={{ textAlign: "center", padding: "40px" }}
                    >
                      No chats found
                    </td>
                  </tr>
                ) : (
                  chats.map((chat) => (
                    <tr
                      key={chat.id}
                      style={{ borderBottom: "1px solid #eee" }}
                    >
                      <td style={tableCellStyle}>
                        <div>
                          <div style={{ fontWeight: "500" }}>
                            {chat.user_name || "Unknown"}
                          </div>
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            {chat.user_email}
                          </div>
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ maxWidth: "400px" }}>
                          {truncateText(chat.user_message)}
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            background:
                              chat.language === "id" ? "#e3f2fd" : "#fff3cd",
                            color:
                              chat.language === "id" ? "#1976d2" : "#856404",
                          }}
                        >
                          {chat.language === "id" ? " ID" : " EN"}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        {new Date(chat.created_at).toLocaleString()}
                      </td>
                      <td style={tableCellStyle}>
                        <button
                          onClick={() => handleViewDetail(chat)}
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
                          ️ View
                        </button>
                        <button
                          onClick={() => openDeleteModal(chat)}
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

      {/* Chat Detail Modal */}
      {showDetailModal && selectedChat && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: "700px" }}>
            <h2>Chat Details</h2>

            <div style={{ marginBottom: "20px" }}>
              <strong>User:</strong> {selectedChat.user_name} (
              {selectedChat.user_email})
              <br />
              <strong>Language:</strong> {selectedChat.language}
              <br />
              <strong>Timestamp:</strong>{" "}
              {new Date(selectedChat.created_at).toLocaleString()}
            </div>

            <div
              style={{
                background: "#f5f5f5",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "15px",
              }}
            >
              <strong>User Message:</strong>
              <p style={{ marginTop: "10px", whiteSpace: "pre-wrap" }}>
                {selectedChat.user_message}
              </p>
            </div>

            <div
              style={{
                background: "#e3f2fd",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "15px",
              }}
            >
              <strong>AI Response:</strong>
              <p style={{ marginTop: "10px", whiteSpace: "pre-wrap" }}>
                {selectedChat.ai_response}
              </p>
            </div>

            {selectedChat.sources && selectedChat.sources.length > 0 && (
              <div style={{ marginBottom: "15px" }}>
                <strong>Sources ({selectedChat.sources.length}):</strong>
                <ul style={{ marginTop: "10px", paddingLeft: "20px" }}>
                  {selectedChat.sources.map((source, idx) => (
                    <li key={idx} style={{ marginBottom: "5px" }}>
                      {source.filename || "Unknown"} (Score:{" "}
                      {source.score?.toFixed(3) || "N/A"})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedChat(null);
                }}
                style={{
                  padding: "10px 20px",
                  background: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && chatToDelete && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2>Delete Chat</h2>
            <p>
              Are you sure you want to delete this chat from{" "}
              <strong>{chatToDelete.user_name}</strong>? This action cannot be
              undone.
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
                  setChatToDelete(null);
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
                onClick={handleDeleteChat}
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
const statCardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "8px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  textAlign: "center",
};

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
