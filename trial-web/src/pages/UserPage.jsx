import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { chatAPI } from "../lib/api";
import { getUser, clearAuth } from "../utils/auth";

export default function UserPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const userData = getUser();
    setUser(userData);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chats]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage("");

    // Add user message to chat
    setChats((prev) => [
      ...prev,
      {
        type: "user",
        content: userMessage,
        timestamp: new Date(),
      },
    ]);

    setLoading(true);

    try {
      const response = await chatAPI.sendMessage(userMessage);
      const data = response.data.data;

      // Add AI response to chat
      setChats((prev) => [
        ...prev,
        {
          type: "ai",
          content: data.reply,
          sources: data.sources,
          timestamp: new Date(data.created_at),
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error.response?.data?.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.logo}>TutorAI</h1>
        <div style={styles.headerRight}>
          <span style={styles.userName}>{user?.name}</span>
          <Link to="/history" style={styles.linkButton}>
            History
          </Link>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div style={styles.chatContainer}>
        {chats.length === 0 ? (
          <div style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>Welcome to TutorAI</h2>
            <p style={styles.emptyText}>
              Ask me anything about your study materials.
            </p>
          </div>
        ) : (
          <div style={styles.chatMessages}>
            {chats.map((chat, index) => (
              <div
                key={index}
                style={
                  chat.type === "user" ? styles.userMessage : styles.aiMessage
                }
              >
                <div style={styles.messageContent}>{chat.content}</div>
                {chat.sources && chat.sources.length > 0 && (
                  <div style={styles.sources}>
                    Sources: {chat.sources.length} documents
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={styles.aiMessage}>
                <div style={styles.messageContent}>Thinking...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={styles.inputContainer}>
        <form onSubmit={handleSendMessage} style={styles.inputForm}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask me anything..."
            style={styles.input}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !message.trim()}
            style={styles.sendButton}
          >
            {loading ? "..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
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
    alignItems: "center",
  },
  userName: {
    fontWeight: "500",
    color: "#333",
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
  chatContainer: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
  },
  emptyTitle: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#333",
    marginBottom: "8px",
  },
  emptyText: {
    fontSize: "16px",
    color: "#666",
  },
  chatMessages: {
    flex: 1,
    overflowY: "auto",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  userMessage: {
    alignSelf: "flex-end",
    maxWidth: "70%",
  },
  aiMessage: {
    alignSelf: "flex-start",
    maxWidth: "70%",
  },
  messageContent: {
    padding: "12px 16px",
    borderRadius: "12px",
    background: "white",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    lineHeight: "1.5",
    color: "#333",
  },
  sources: {
    fontSize: "12px",
    color: "#666",
    marginTop: "8px",
    paddingLeft: "16px",
  },
  inputContainer: {
    background: "white",
    padding: "16px 24px",
    boxShadow: "0 -2px 8px rgba(0,0,0,0.1)",
  },
  inputForm: {
    display: "flex",
    gap: "12px",
  },
  input: {
    flex: 1,
    padding: "12px 16px",
    border: "1px solid #ddd",
    borderRadius: "24px",
    fontSize: "16px",
    outline: "none",
    color: "#333",
    backgroundColor: "white",
  },
  sendButton: {
    padding: "12px 24px",
    background: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "24px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "background-color 0.2s",
  },
};
