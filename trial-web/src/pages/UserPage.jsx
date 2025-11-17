// UserPage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { chatAPI } from "../lib/api";
import { getUser, logout } from "../utils/auth";
import Avatar3D from "../components/Avatar3D";
import MarkdownMessage from "../components/MarkdownMessage";

export default function UserPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null); // Changed from currentChatId
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [expandedSources, setExpandedSources] = useState({}); // Track which message sources are expanded

  // Speech states
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);

  // User typing state untuk avatar
  const [isUserTyping, setIsUserTyping] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const userDropdownRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const userData = getUser();
    if (!userData) {
      navigate("/login");
      return;
    }
    setUser(userData);
    loadChatHistory();
  }, [navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [chats, isTyping]);

  useEffect(() => {
    initializeSpeechRecognition();

    const handleClickOutside = (event) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target)
      ) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initializeSpeechRecognition = () => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
        setIsListening(false);

        if (conversationMode) {
          handleSendMessage(null, transcript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error !== "no-speech") {
          toast.error("Voice recognition failed. Please try again.");
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (conversationMode && !isSpeaking) {
          setTimeout(() => startListening(), 500);
        }
      };
    } else {
      console.warn("Speech recognition not supported");
    }
  };

  const detectLanguage = (text) => {
    const indonesianPattern =
      /[a-z]*(nya|kan|lah|kah|an|yang|dengan|untuk|dari|ke|di|pada)\b/i;
    return indonesianPattern.test(text) ? "id-ID" : "en-US";
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        const lastChat = chats[chats.length - 1];
        const lang = lastChat ? detectLanguage(lastChat.content) : "id-ID";
        recognitionRef.current.lang = lang;

        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Failed to start listening:", error);
        toast.error("Failed to start voice input");
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speak = (text) => {
  // ✅ Biar bisa speak kapan saja, tidak harus voiceEnabled
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const lang = detectLanguage(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (conversationMode) {
        stopListening();
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      if (conversationMode) {
        setTimeout(() => startListening(), 500);
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      toast.error("Text-to-speech failed");
    };

    window.speechSynthesis.speak(utterance);
  } else {
    toast.error("Text-to-speech not supported in your browser");
  }
};

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleConversationMode = () => {
    const newMode = !conversationMode;
    setConversationMode(newMode);

    if (newMode) {
      setVoiceEnabled(true);
      toast.success("Conversation mode enabled - speak naturally!");
      setTimeout(() => startListening(), 500);
    } else {
      stopListening();
      stopSpeaking();
      toast.success("Conversation mode disabled");
    }
  };

  // Handle user typing untuk animasi avatar
  const handleInputChange = (e) => {
    setMessage(e.target.value);

    // Set user is typing
    setIsUserTyping(true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsUserTyping(false);
    }, 1000);
  };

  const loadChatHistory = async () => {
    stopSpeaking();
    try {
      const response = await chatAPI.getSessions();
      console.log("Chat sessions response:", response);

      const sessions =
        response.data?.data?.sessions || response.data?.sessions || [];

      const formattedHistory = sessions.map((session) => ({
        id: session.id,
        title: session.title || "Untitled conversation",
        timestamp: new Date(session.last_message_at || session.created_at),
        message_count: session.message_count || 0,
      }));

      setChatHistory(formattedHistory);
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  };

  const handleSendMessage = async (e, textOverride = null) => {
    if (e) e.preventDefault();

    const textToSend = textOverride || message.trim();
    if (!textToSend) return;

    setMessage("");
    setIsUserTyping(false); // Stop typing indicator

    const newUserChat = {
      type: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setChats((prev) => [...prev, newUserChat]);
    setLoading(true);
    setIsTyping(true);

    try {
      console.log(
        "Sending message:",
        textToSend,
        "Session ID:",
        currentSessionId
      );

      // Send message with session_id for conversation context
      const response = await chatAPI.sendMessage(textToSend, currentSessionId);
      console.log("Chat API response:", response);

      const data = response.data?.data || response.data || response;

      if (!data) {
        throw new Error("No response data received");
      }

      // Update current session ID if new session was created
      if (data.session_id && !currentSessionId) {
        setCurrentSessionId(data.session_id);
      }

      setTimeout(() => {
        setIsTyping(false);
        const newAiChat = {
          type: "ai",
          content:
            data.reply ||
            data.message ||
            data.content ||
            "I'm sorry, I couldn't process that request.",
          sources: data.sources || [],
          timestamp: new Date(data.created_at || new Date()),
          context_used: data.context_used,
          history_used: data.history_used, // Show if conversation context was used
        };

        setChats((prev) => [...prev, newAiChat]);

        if (voiceEnabled || conversationMode) {
          speak(newAiChat.content);
        }

        loadChatHistory();
      }, 500);
    } catch (error) {
      console.error("Chat error details:", error);
      setIsTyping(false);

      let errorMessage = "Failed to process chat";

      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);

        if (error.response.status === 401) {
          errorMessage = "Session expired. Please login again.";
          setTimeout(() => {
            logout();
            navigate("/login");
          }, 2000);
        } else if (error.response.status === 429) {
          errorMessage = "Too many requests. Please wait a moment.";
        } else if (error.response.status >= 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage =
            error.response.data?.message ||
            error.response.data?.error ||
            errorMessage;
        }
      } else if (error.request) {
        console.error("No response received:", error.request);
        errorMessage = "Network error. Please check your connection.";
      } else {
        errorMessage = error.message || errorMessage;
      }

      toast.error(errorMessage);

      const errorChat = {
        type: "ai",
        content:
          "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date(),
        isError: true,
      };
      setChats((prev) => [...prev, errorChat]);
    } finally {
      setLoading(false);
      if (!conversationMode) {
        inputRef.current?.focus();
      }
    }
  };

  const startNewChat = () => {
    stopSpeaking();
    setChats([]);
    setCurrentSessionId(null); // Reset session ID for new conversation
    setIsUserTyping(false);
    setExpandedSources({}); // Reset expanded sources
    if (conversationMode) {
      toggleConversationMode();
    }
    toast.success("New chat started");
  };

  const loadChat = async (sessionId) => {
    try {
      setCurrentSessionId(sessionId);

      // Load session with all messages
      const response = await chatAPI.getSession(sessionId);
      console.log("Session response:", response);

      const sessionData = response.data?.data || response.data;

      if (sessionData && sessionData.messages) {
        const formattedChats = sessionData.messages.flatMap((msg) => [
          {
            type: "user",
            content: msg.message,
            timestamp: new Date(msg.created_at),
          },
          {
            type: "ai",
            content: msg.reply,
            sources: msg.sources || [],
            timestamp: new Date(msg.created_at),
          },
        ]);
        setChats(formattedChats);
        setIsSidebarOpen(false);
        toast.success("Conversation loaded - you can continue chatting!");
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      toast.error("Failed to load conversation");
    }
  };

  const deleteChat = async (sessionId, e) => {
    e.stopPropagation(); // Prevent triggering loadChat

    if (!confirm("Are you sure you want to delete this conversation?")) {
      return;
    }

    try {
      await chatAPI.deleteSession(sessionId);

      // If deleting current session, clear chat
      if (currentSessionId === sessionId) {
        setChats([]);
        setCurrentSessionId(null);
        setExpandedSources({}); // Reset expanded sources
      }

      // Reload history
      await loadChatHistory();
      toast.success("Conversation deleted successfully");
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast.error("Failed to delete conversation");
    }
  };

  const toggleSources = (index) => {
    setExpandedSources((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  const groupHistoryByDate = (history) => {
    const groups = { Today: [], Yesterday: [], "Last 7 Days": [], Older: [] };
    const now = new Date();

    history.forEach((chat) => {
      const diff = now - chat.timestamp;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) groups.Today.push(chat);
      else if (days === 1) groups.Yesterday.push(chat);
      else if (days <= 7) groups["Last 7 Days"].push(chat);
      else groups.Older.push(chat);
    });

    return groups;
  };

  const groupedHistory = groupHistoryByDate(chatHistory);

  return (
    <div style={styles.container}>
      {/* Animated Background with Large Interactive Avatar */}
      <div style={styles.backgroundLayer}>
        <div style={styles.floatingCircle1}></div>
        <div style={styles.floatingCircle2}></div>
        <div style={styles.floatingCircle3}></div>
        <div style={styles.gradientOverlay}></div>

        {/* Avatar Background yang Besar - BISA DIINTERAKSI & OPACITY TINGGI */}
        <div style={styles.backgroundAvatarContainer}>
          <Avatar3D
            align ="center"
            isSpeaking={isSpeaking || isTyping}
            isUserTyping={isUserTyping}
            background={false}
            size={400}
          />
        </div>
      </div>

      {/* Sidebar */}
      <div
        style={{
          ...styles.sidebar,
          transform: isSidebarOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <div style={styles.sidebarHeader}>
          <button onClick={startNewChat} style={styles.newChatButton}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 4V16M4 10H16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            New Chat
          </button>
        </div>

        <div style={styles.historyList}>
          {Object.entries(groupedHistory).map(
            ([period, chats]) =>
              chats.length > 0 && (
                <div key={period} style={styles.historyGroup}>
                  <div style={styles.historyGroupLabel}>{period}</div>
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className="history-item-wrapper"
                      style={{
                        ...styles.historyItemWrapper,
                        background:
                          currentSessionId === chat.id
                            ? "rgba(255,255,255,0.1)"
                            : "transparent",
                      }}
                    >
                      <button
                        onClick={() => loadChat(chat.id)}
                        style={styles.historyItemButton}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M14 11C14 11.55 13.55 12 13 12H5L2 15V4C2 3.45 2.45 3 3 3H13C13.55 3 14 3.45 14 4V11Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span style={styles.historyItemText}>{chat.title}</span>
                      </button>
                      <button
                        onClick={(e) => deleteChat(chat.id, e)}
                        className="delete-button"
                        style={styles.deleteButton}
                        title="Delete conversation"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <path
                            d="M3 4H11M5 4V3C5 2.45 5.45 2 6 2H8C8.55 2 9 2.45 9 3V4M10 4V11C10 11.55 9.55 12 9 12H5C4.45 12 4 11.55 4 11V4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )
          )}
        </div>

        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo} ref={userDropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              style={styles.userButton}
            >
              <div style={styles.userAvatar}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div style={styles.userDetails}>
                <div style={styles.userName}>{user?.name}</div>
                <div style={styles.userEmail}>{user?.email}</div>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{
                  transform: showUserDropdown
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {showUserDropdown && (
              <div style={styles.userDropdown}>
                <button onClick={handleLogout} style={styles.logoutButton}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M6 14H3C2.45 14 2 13.55 2 13V3C2 2.45 2.45 2 3 2H6M11 11L14 8M14 8L11 5M14 8H6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Header */}
        <div style={styles.header}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={styles.menuButton}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6H20M4 12H20M4 18H20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div style={styles.headerTitle}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" fill="url(#gradient)" />
              <path
                d="M10 10L14 14L18 10M10 14L14 18L18 14"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="28" y2="28">
                  <stop offset="0%" stopColor="#153C30" />
                  <stop offset="100%" stopColor="#2D7A5F" />
                </linearGradient>
              </defs>
            </svg>
            <span>TutorAI</span>
          </div>

          <div style={styles.headerActions}>
            <button
              onClick={toggleConversationMode}
              style={{
                ...styles.iconButton,
                background: conversationMode
                  ? "rgba(21, 60, 48, 0.15)"
                  : "transparent",
                border: conversationMode
                  ? "2px solid #153C30"
                  : "1px solid #E5E7EB",
              }}
              title={
                conversationMode
                  ? "Conversation mode active"
                  : "Enable conversation mode"
              }
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  stroke={conversationMode ? "#153C30" : "#94A3B8"}
                  strokeWidth="1.5"
                />
                <path
                  d="M7 9L10 12L14 8"
                  stroke={conversationMode ? "#153C30" : "#94A3B8"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              style={{
                ...styles.iconButton,
                background: voiceEnabled
                  ? "rgba(21, 60, 48, 0.1)"
                  : "transparent",
              }}
              title={voiceEnabled ? "Voice enabled" : "Voice disabled"}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 2C8.34 2 7 3.34 7 5V10C7 11.66 8.34 13 10 13C11.66 13 13 11.66 13 10V5C13 3.34 11.66 2 10 2Z"
                  stroke={voiceEnabled ? "#153C30" : "#94A3B8"}
                  strokeWidth="1.5"
                />
                <path
                  d="M16 10C16 13.31 13.31 16 10 16C6.69 16 4 13.31 4 10M10 16V18"
                  stroke={voiceEnabled ? "#153C30" : "#94A3B8"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div style={styles.chatContainer}>
          {chats.length === 0 ? (
            <div style={styles.emptyState}>
              {/* Avatar kecil di center untuk empty state */}
              <div style={styles.avatarContainer}>
                <Avatar3D
                  isSpeaking={isSpeaking}
                  isUserTyping={isUserTyping}
                  size={140}
                />
              </div>
              <h2 style={styles.emptyTitle}>Welcome to TutorAI</h2>
              <p style={styles.emptyText}>
                Your intelligent learning companion. Ask me anything or try
                conversation mode!
              </p>

              {conversationMode && (
                <div style={styles.conversationBadge}>
                  <div style={styles.pulseIndicator}></div>
                  <span>Conversation mode active - speak now</span>
                </div>
              )}

              {isUserTyping && !conversationMode && (
                <div
                  style={{
                    ...styles.conversationBadge,
                    background: "rgba(45, 122, 95, 0.1)",
                    border: "2px solid #2D7A5F",
                  }}
                >
                  <div
                    style={{
                      ...styles.pulseIndicator,
                      background: "#2D7A5F",
                    }}
                  ></div>
                  <span style={{ color: "#2D7A5F" }}>
                    Listening to your input...
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.chatMessages}>
              {chats.map((chat, index) => (
                <div
                  key={index}
                  style={
                    chat.type === "user"
                      ? styles.userMessageWrapper
                      : styles.aiMessageWrapper
                  }
                >
                  {chat.type === "ai" && (
                    <div style={styles.aiAvatar}>
                      {/* Avatar kecil untuk AI messages */}
                      <Avatar3D
                        isSpeaking={isSpeaking && index === chats.length - 1}
                        size={36}
                      />
                    </div>
                  )}

                  <div style={styles.messageGroup}>
                    <div
                      style={{
                        ...(chat.type === "user"
                          ? styles.userMessage
                          : styles.aiMessage),
                        ...(chat.isError ? styles.errorMessage : {}),
                      }}
                    >
                      {chat.type === "ai" ? (
                        <MarkdownMessage content={chat.content} />
                      ) : (
                        <div style={styles.messageContent}>{chat.content}</div>
                      )}
                    </div>

                    {/* Conversation Context Indicator */}
                    {chat.type === "ai" && chat.history_used && (
                      <div style={styles.contextBadge}>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M6 1V11M1 6H11"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <circle
                            cx="6"
                            cy="6"
                            r="5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        </svg>
                        <span>Using conversation context</span>
                      </div>
                    )}

                    {/* Document Sources/Citations */}
                    {chat.sources && chat.sources.length > 0 && (
                      <div style={styles.sourcesContainer}>
                        <button
                          onClick={() => toggleSources(index)}
                          style={styles.sourcesToggle}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                          >
                            <path
                              d="M3 2H11C11.55 2 12 2.45 12 3V11C12 11.55 11.55 12 11 12H3C2.45 12 2 11.55 2 11V3C2 2.45 2.45 2 3 2Z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                          </svg>
                          <span>
                            {chat.sources.length} Source
                            {chat.sources.length > 1 ? "s" : ""}
                          </span>
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            style={{
                              marginLeft: "auto",
                              transform: expandedSources[index]
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                              transition: "transform 0.2s ease",
                            }}
                          >
                            <path
                              d="M3 4.5L6 7.5L9 4.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>

                        {expandedSources[index] && (
                          <div style={styles.sourcesList}>
                            {chat.sources.map((source, idx) => (
                              <div key={idx} style={styles.sourceItem}>
                                <div style={styles.sourceNumber}>
                                  [{idx + 1}]
                                </div>
                                <div style={styles.sourceContent}>
                                  <div style={styles.sourceText}>
                                    "
                                    {source.text?.substring(0, 200) ||
                                      source.preview ||
                                      "No preview available"}
                                    ..."
                                  </div>
                                  <div style={styles.sourceMetadata}>
                                    {source.document_id} •
                                    {(source.similarity * 100).toFixed(1)}%
                                    match
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {chat.type === "ai" &&
                      !conversationMode &&
                      !chat.isError && (
                        <div style={styles.messageActions}>
                          <button
                            onClick={() => {
                              if (isSpeaking) {
                                stopSpeaking(); // jika lagi bicara → stop
                              } else {
                                speak(chat.content); // else → play
                              }
                            }}
                            disabled={isTyping}
                            style={styles.actionButton}
                            title="Read aloud"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 14 14"
                              fill="none"
                            >
                              <path
                                d="M8 3L11 7L8 11M2 5H6V9H2V5Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </div>
                      )}

                    <span style={styles.timestamp}>
                      {new Date(chat.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {chat.type === "user" && (
                    <div style={styles.userAvatar}>
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div style={styles.aiMessageWrapper}>
                  <div style={styles.aiAvatar}>
                    <Avatar3D isSpeaking={true} size={36} />
                  </div>
                  <div style={styles.messageGroup}>
                    <div style={styles.typingIndicator}>
                      <span style={styles.typingDot}></span>
                      <span
                        style={{ ...styles.typingDot, animationDelay: "0.2s" }}
                      ></span>
                      <span
                        style={{ ...styles.typingDot, animationDelay: "0.4s" }}
                      ></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        {!conversationMode && (
          <div style={styles.inputContainer}>
            <div style={styles.inputWrapper}>
              <form onSubmit={handleSendMessage} style={styles.inputForm}>
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={loading}
                  style={{
                    ...styles.voiceButton,
                    background: isListening ? "#EF4444" : "transparent",
                  }}
                  title={isListening ? "Stop listening" : "Start voice input"}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M10 2C8.34 2 7 3.34 7 5V10C7 11.66 8.34 13 10 13C11.66 13 13 11.66 13 10V5C13 3.34 11.66 2 10 2Z"
                      stroke={isListening ? "white" : "#64748B"}
                      strokeWidth="1.5"
                    />
                    <path
                      d="M16 10C16 13.31 13.31 16 10 16C6.69 16 4 13.31 4 10M10 16V18"
                      stroke={isListening ? "white" : "#64748B"}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={handleInputChange}
                  placeholder={
                    isListening ? "Listening..." : "Ask me anything..."
                  }
                  style={styles.input}
                  disabled={loading || isListening}
                />

                <button
                  type="submit"
                  disabled={loading || !message.trim() || isListening}
                  style={{
                    ...styles.sendButton,
                    opacity:
                      loading || !message.trim() || isListening ? 0.5 : 1,
                  }}
                >
                  {loading ? (
                    <div style={styles.spinner}></div>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M2 10L18 2L10 18L8 12L2 10Z"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {conversationMode && (
          <div style={styles.conversationModeBar}>
            <div style={styles.conversationStatus}>
              {isListening && (
                <>
                  <div style={styles.listeningIndicator}></div>
                  <span>Listening...</span>
                </>
              )}
              {isSpeaking && (
                <>
                  <div style={styles.speakingIndicator}></div>
                  <span>Speaking...</span>
                </>
              )}
              {!isListening && !isSpeaking && (
                <span style={styles.waitingText}>Ready to listen</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    background: "#F8FAFB",
    position: "relative",
    overflow: "hidden",
  },
  backgroundLayer: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    overflow: "hidden",
  },
  backgroundAvatarContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "75vh",
    height: "75vh",
    maxWidth: "900px",
    maxHeight: "900px",
    zIndex: 0,
    pointerEvents: "auto", // TETAP "auto" - ini udah bener
  },
  gradientOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(135deg, rgba(21, 60, 48, 0.02) 0%, rgba(45, 122, 95, 0.03) 100%)",
    zIndex: 1,
  },
  floatingCircle1: {
    display: "none", // Sembunyikan lingkaran pertama untuk tampilan yang lebih bersih
  },
  floatingCircle2: {
    display: "none", // Sembunyikan lingkaran pertama untuk tampilan yang lebih bersih
  },
  floatingCircle3: {
    display: "none", // Sembunyikan lingkaran pertama untuk tampilan yang lebih bersih
  },
  sidebar: {
    width: "280px",
    background: "linear-gradient(180deg, #153C30 0%, #1A4D3C 100%)",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.3s ease",
    zIndex: 10,
    boxShadow: "2px 0 12px rgba(0, 0, 0, 0.1)",
  },
  sidebarHeader: {
    padding: "20px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  },
  newChatButton: {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "8px",
    color: "white",
    fontSize: "14px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  historyList: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
  },
  historyGroup: {
    marginBottom: "20px",
  },
  historyGroupLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "8px 12px",
    marginBottom: "4px",
  },
  historyItem: {
    width: "100%",
    padding: "10px 12px",
    background: "transparent",
    border: "none",
    borderRadius: "6px",
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "left",
    marginBottom: "2px",
  },
  historyItemWrapper: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    borderRadius: "6px",
    transition: "all 0.2s ease",
    marginBottom: "2px",
  },
  historyItemButton: {
    flex: 1,
    padding: "10px 12px",
    background: "transparent",
    border: "none",
    color: "rgba(255, 255, 255, 0.9)",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "13px",
    borderRadius: "6px",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    overflow: "hidden",
  },
  deleteButton: {
    padding: "6px",
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.5)",
    cursor: "pointer",
    borderRadius: "4px",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
    flexShrink: 0,
  },
  historyItemText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  sidebarFooter: {
    padding: "16px",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
  },
  userInfo: {
    position: "relative",
  },
  userButton: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "8px",
    transition: "all 0.2s",
  },
  userAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #2D7A5F 0%, #3A9B78 100%)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "700",
    flexShrink: 0,
  },
  userDetails: {
    flex: 1,
    overflow: "hidden",
    textAlign: "left",
  },
  userName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "white",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  userEmail: {
    fontSize: "12px",
    color: "rgba(255, 255, 255, 0.6)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  userDropdown: {
    position: "absolute",
    bottom: "100%",
    left: "8px",
    right: "8px",
    marginBottom: "8px",
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    overflow: "hidden",
    animation: "slideUp 0.2s ease",
  },
  logoutButton: {
    width: "100%",
    padding: "12px 16px",
    background: "transparent",
    border: "none",
    color: "#EF4444",
    fontSize: "14px",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    position: "relative",
    zIndex: 2, // Lebih tinggi dari background avatar
  },
  header: {
    height: "64px",
    background: "white",
    borderBottom: "1px solid #E5E7EB",
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    gap: "16px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
  },
  menuButton: {
    width: "40px",
    height: "40px",
    borderRadius: "8px",
    background: "transparent",
    border: "none",
    color: "#153C30",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "18px",
    fontWeight: "700",
    color: "#153C30",
  },
  headerActions: {
    marginLeft: "auto",
    display: "flex",
    gap: "8px",
  },
  iconButton: {
    width: "40px",
    height: "40px",
    borderRadius: "8px",
    border: "1px solid #E5E7EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    background: "transparent",
  },
  chatContainer: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    zIndex: 2,
  },
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    position: "relative",
    zIndex: 2,
  },
  avatarContainer: {
    marginBottom: "24px",
    animation: "float 3s ease-in-out infinite",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    zIndex: 2,
  },
  emptyTitle: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#153C30",
    marginBottom: "12px",
  },
  emptyText: {
    fontSize: "15px",
    color: "#64748B",
    marginBottom: "24px",
    textAlign: "center",
    maxWidth: "400px",
  },
  conversationBadge: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 20px",
    background: "rgba(21, 60, 48, 0.1)",
    border: "2px solid #153C30",
    borderRadius: "12px",
    color: "#153C30",
    fontSize: "14px",
    fontWeight: "600",
    marginTop: "8px",
  },
  pulseIndicator: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: "#EF4444",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  chatMessages: {
    flex: 1,
    overflowY: "auto",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  userMessageWrapper: {
    display: "flex",
    alignItems: "flex-end",
    gap: "12px",
    justifyContent: "flex-end",
  },
  aiMessageWrapper: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  aiAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  messageGroup: {
    maxWidth: "70%",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  userMessage: {
    background: "linear-gradient(135deg, #153C30 0%, #2D7A5F 100%)",
    color: "white",
    padding: "14px 18px",
    borderRadius: "18px 18px 4px 18px",
    boxShadow: "0 2px 12px rgba(21, 60, 48, 0.2)",
  },
  aiMessage: {
    background: "white",
    padding: "14px 18px",
    borderRadius: "18px 18px 18px 4px",
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)",
    border: "1px solid #E5E7EB",
  },
  errorMessage: {
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#DC2626",
    padding: "14px 18px",
    borderRadius: "18px 18px 18px 4px",
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)",
  },
  messageContent: {
    fontSize: "15px",
    lineHeight: "1.6",
  },
  sources: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#64748B",
    paddingLeft: "4px",
  },
  contextBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    color: "#2D7A5F",
    background: "rgba(45, 122, 95, 0.08)",
    padding: "4px 10px",
    borderRadius: "12px",
    width: "fit-content",
    border: "1px solid rgba(45, 122, 95, 0.2)",
  },
  messageActions: {
    display: "flex",
    gap: "4px",
    paddingLeft: "4px",
  },
  actionButton: {
    padding: "4px 8px",
    background: "transparent",
    border: "1px solid #E5E7EB",
    borderRadius: "6px",
    color: "#64748B",
    cursor: "pointer",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    transition: "all 0.2s",
  },
  timestamp: {
    fontSize: "11px",
    color: "#94A3B8",
    paddingLeft: "4px",
  },
  typingIndicator: {
    background: "white",
    padding: "14px 18px",
    borderRadius: "18px 18px 18px 4px",
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)",
    display: "flex",
    gap: "4px",
    alignItems: "center",
  },
  typingDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#153C30",
    animation: "typing 1.4s infinite",
  },
  inputContainer: {
    background: "white",
    padding: "20px 24px",
    borderTop: "1px solid #E5E7EB",
    boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.05)",
  },
  inputWrapper: {
    maxWidth: "1000px",
    margin: "0 auto",
  },
  inputForm: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  voiceButton: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    border: "2px solid #E5E7EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.3s",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: "14px 20px",
    border: "2px solid #E5E7EB",
    borderRadius: "24px",
    fontSize: "15px",
    outline: "none",
    color: "#1E293B",
    backgroundColor: "#F8FAFB",
    transition: "all 0.3s ease",
  },
  sendButton: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #153C30 0%, #2D7A5F 100%)",
    color: "white",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 12px rgba(21, 60, 48, 0.3)",
    cursor: "pointer",
    flexShrink: 0,
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderTop: "2px solid white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  conversationModeBar: {
    background: "linear-gradient(135deg, #153C30 0%, #2D7A5F 100%)",
    padding: "20px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  conversationStatus: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: "white",
    fontSize: "16px",
    fontWeight: "600",
  },
  listeningIndicator: {
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    background: "#EF4444",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  speakingIndicator: {
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    background: "#10B981",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  waitingText: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  sourcesContainer: {
    marginTop: "8px",
    background: "rgba(45, 122, 95, 0.05)",
    borderRadius: "8px",
    border: "1px solid rgba(45, 122, 95, 0.15)",
    overflow: "hidden",
  },
  sourcesToggle: {
    width: "100%",
    padding: "10px 12px",
    background: "transparent",
    border: "none",
    color: "#2D7A5F",
    fontSize: "13px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  sourcesList: {
    padding: "8px 12px 12px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    animation: "slideDown 0.2s ease",
  },
  sourceItem: {
    display: "flex",
    gap: "10px",
    padding: "10px",
    background: "white",
    borderRadius: "6px",
    border: "1px solid rgba(45, 122, 95, 0.1)",
  },
  sourceNumber: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#2D7A5F",
    flexShrink: 0,
  },
  sourceContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  sourceText: {
    fontSize: "12px",
    lineHeight: "1.5",
    color: "#475569",
    fontStyle: "italic",
  },
  sourceMetadata: {
    fontSize: "11px",
    color: "#94A3B8",
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
};

// CSS Animations
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes float {
      0%, 100% { transform: translateY(0px) translateX(0px); }
      33% { transform: translateY(-30px) translateX(20px); }
      66% { transform: translateY(20px) translateX(-20px); }
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes typing {
      0%, 60%, 100% { transform: scale(0.8); opacity: 0.5; }
      30% { transform: scale(1.2); opacity: 1; }
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.7; }
    }
    
    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(10px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    input:focus {
      border-color: #153C30 !important;
      background-color: white !important;
      box-shadow: 0 0 0 3px rgba(21, 60, 48, 0.1) !important;
    }
    
    button:hover:not(:disabled) {
      transform: scale(1.05);
    }
    
    [style*="newChatButton"]:hover {
      background: rgba(255, 255, 255, 0.15) !important;
    }
    
    [style*="historyItem"]:hover {
      background: rgba(255, 255, 255, 0.1) !important;
    }
    
    [style*="userButton"]:hover {
      background: rgba(255, 255, 255, 0.05) !important;
    }
    
    [style*="logoutButton"]:hover {
      background: rgba(239, 68, 68, 0.1) !important;
    }
    
    [style*="menuButton"]:hover {
      background: rgba(21, 60, 48, 0.05) !important;
    }
    
    [style*="iconButton"]:hover {
      background: rgba(21, 60, 48, 0.05) !important;
      border-color: #153C30 !important;
    }
    
    [style*="voiceButton"]:hover:not(:disabled) {
      border-color: #153C30 !important;
      box-shadow: 0 2px 8px rgba(21, 60, 48, 0.15) !important;
    }
    
    [style*="sendButton"]:hover:not(:disabled) {
      box-shadow: 0 6px 16px rgba(21, 60, 48, 0.4) !important;
    }
    
    [style*="actionButton"]:hover {
      background: rgba(21, 60, 48, 0.05) !important;
      border-color: #153C30 !important;
      color: #153C30 !important;
    }
    
    [style*="sourcesToggle"]:hover {
      background: rgba(45, 122, 95, 0.08) !important;
    }
    
    /* Scrollbar Styling */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: #F1F5F9;
    }
    
    ::-webkit-scrollbar-thumb {
      background: #CBD5E1;
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: #94A3B8;
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
      [style*="sidebar"] {
        position: fixed !important;
        left: 0 !important;
        top: 0 !important;
        bottom: 0 !important;
        z-index: 100 !important;
      }
      
      [style*="messageGroup"] {
        max-width: 85% !important;
      }
      
      [style*="avatarContainer"] {
        transform: scale(0.8);
      }
      
      [style*="backgroundAvatarContainer"] {
        width: 60vh !important;
        height: 60vh !important;
      }
    }
    
    @media (max-width: 480px) {
      [style*="header"] {
        padding: 0 12px !important;
      }
      
      [style*="chatMessages"] {
        padding: 16px !important;
      }
      
      [style*="inputContainer"] {
        padding: 16px !important;
      }
      
      [style*="messageGroup"] {
        max-width: 90% !important;
      }
      
      [style*="avatarContainer"] {
        transform: scale(0.7);
      }
      
      [style*="backgroundAvatarContainer"] {
        width: 50vh !important;
        height: 50vh !important;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}
