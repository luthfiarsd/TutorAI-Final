import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { chatAPI } from "../lib/api";
import { clearAuth } from "../utils/auth";

export default function History() {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadHistory();
  }, [page]);

  const loadHistory = async () => {
    try {
      const response = await chatAPI.getHistory(page, 20);
      setChats(response.data.data.chats);
      setTotalPages(response.data.data.pagination.total_pages);
    } catch (error) {
      console.error("Load history error:", error);
      toast.error("Failed to load chat history");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this chat?")) return;

    try {
      await chatAPI.deleteChat(id);
      toast.success("Chat deleted");
      loadHistory();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete chat");
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.logo}>Chat History</h1>
        <div style={styles.headerRight}>
          <Link to="/home" style={styles.linkButton}>
            Home
          </Link>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {chats.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No chat history yet</p>
            <Link to="/home" style={styles.startButton}>
              Start Chatting
            </Link>
          </div>
        ) : (
          <div style={styles.chatList}>
            {chats.map((chat) => (
              <div key={chat.id} style={styles.chatCard}>
                <div style={styles.chatHeader}>
                  <span style={styles.timestamp}>
                    {new Date(chat.created_at).toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleDelete(chat.id)}
                    style={styles.deleteButton}
                  >
                    Delete
                  </button>
                </div>
                <div style={styles.chatBody}>
                  <div style={styles.message}>
                    <strong>You:</strong> {chat.message}
                  </div>
                  <div style={styles.reply}>
                    <strong>AI:</strong> {chat.reply.substring(0, 200)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={styles.pageButton}
            >
              Previous
            </button>
            <span style={styles.pageInfo}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={styles.pageButton}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f5f5f5",
  },
  header: {
    background: "white",
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  logo: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#4f46e5",
  },
  headerRight: {
    display: "flex",
    gap: "16px",
  },
  linkButton: {
    padding: "8px 16px",
    background: "#4f46e5",
    color: "white",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "14px",
    transition: "background-color 0.2s",
  },
  logoutButton: {
    padding: "8px 16px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
  },
  content: {
    padding: "24px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontSize: "18px",
    color: "#666",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#666",
  },
  startButton: {
    display: "inline-block",
    marginTop: "16px",
    padding: "12px 24px",
    background: "#4f46e5",
    color: "white",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "600",
    transition: "background-color 0.2s",
  },
  chatList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  chatCard: {
    background: "white",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  chatHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  timestamp: {
    fontSize: "14px",
    color: "#666",
  },
  deleteButton: {
    padding: "4px 12px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
  chatBody: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  message: {
    fontSize: "14px",
    color: "#333",
  },
  reply: {
    fontSize: "14px",
    color: "#555",
    paddingLeft: "16px",
    borderLeft: "3px solid #4f46e5",
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "16px",
    marginTop: "24px",
  },
  pageButton: {
    padding: "8px 16px",
    background: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "background-color 0.2s",
  },
  pageInfo: {
    fontSize: "14px",
    color: "#666",
  },
};
