// UserPage.jsx ((yang baru))
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { chatAPI } from "../lib/api";
import { getUser, logout } from "../utils/auth";
import Avatar3D from "../components/Avatar3D";
import MarkdownMessage from "../components/MarkdownMessage";
import { ELEVENLABS_CONFIG, ELEVENLABS_VOICES } from "../config/elevenlabs";
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";

// --- Sub-Components (Bisa dipisah ke file lain jika mau) ---
const ChatMessage = ({ msg, isSpeaking, onSpeak }) => (
  <div style={msg.type === "user" ? styles.userMessageWrapper : styles.aiMessageWrapper}>
    {msg.type === "ai" && (
      <div style={styles.aiAvatar}>
        <Avatar3D isSpeaking={isSpeaking} size={36} />
      </div>
    )}
    <div style={styles.messageGroup}>
      <div style={msg.type === "user" ? styles.userMessage : styles.aiMessage}>
        {msg.type === "ai" ? <MarkdownMessage content={msg.content} /> : msg.content}
      </div>
      {msg.type === "ai" && !msg.isError && (
        <button onClick={() => onSpeak(msg.content)} style={styles.actionButton} title="Read aloud">
           🔊
        </button>
      )}
    </div>
  </div>
);

export default function UserPage() {
  const navigate = useNavigate();
  // State Utama
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  
  // Voice State
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(ELEVENLABS_CONFIG.voiceId);
  const [showVoiceOptions, setShowVoiceOptions] = useState(false);

  const chatEndRef = useRef(null);

  // --- Auth & History Check ---
  useEffect(() => {
    const userData = getUser();
    if (!userData) {
      navigate("/login");
      return;
    }
    setUser(userData);
    loadHistory();
  }, [navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, loading]);

  // --- API Functions ---
  const loadHistory = async () => {
    try {
      const res = await chatAPI.getSessions();
      setChatHistory(res.data?.data?.sessions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadChatSession = async (sessionId) => {
    try {
      setLoading(true);
      setCurrentSessionId(sessionId);
      const res = await chatAPI.getSession(sessionId);
      const msgs = (res.data?.data?.messages || []).flatMap(m => [
        { type: "user", content: m.message, timestamp: m.created_at },
        { type: "ai", content: m.reply, timestamp: m.created_at }
      ]);
      setChats(msgs);
      setIsSidebarOpen(false);
    } catch (err) {
      toast.error("Failed to load chat");
    } finally {
      setLoading(false);
    }
  };

  // --- Integrasi Custom Hook Voice ---
  // Fungsi ini dipanggil otomatis ketika user selesai bicara di mic
  const handleVoiceInput = useCallback((text) => {
    setMessage(text);
    handleSendMessage(null, text);
  }, [currentSessionId]); // Add dependencies as needed

  const { 
    isListening, 
    isSpeaking, 
    startListening, 
    stopListening,
    stopSpeaking,
    speak 
  } = useVoiceAssistant({
    enabled: voiceEnabled || conversationMode,
    conversationMode: conversationMode,
    onSpeechResult: handleVoiceInput,
    selectedVoice
  });

  // --- Send Message Logic ---
  const handleSendMessage = async (e, overrideText = null) => {
    if (e) e.preventDefault();
    const textToSend = overrideText || message;
    if (!textToSend.trim()) return;

    // UI Updates immediately
    setMessage("");
    setChats(prev => [...prev, { type: "user", content: textToSend, timestamp: new Date() }]);
    setLoading(true);

    try {
      const res = await chatAPI.sendMessage(textToSend, currentSessionId);
      const data = res.data?.data || res.data;

      if (!currentSessionId && data.session_id) {
        setCurrentSessionId(data.session_id);
        loadHistory(); // Refresh sidebar logic
      }

      const aiText = data.reply || data.message || "No response";
      
      // Tambahkan pesan AI
      setChats(prev => [...prev, { type: "ai", content: aiText, timestamp: new Date() }]);

      // Trigger Voice jika enabled
      if (voiceEnabled || conversationMode) {
        speak(aiText);
      }

    } catch (error) {
      toast.error("Failed to send message");
      setChats(prev => [...prev, { type: "ai", content: "Error connecting to AI.", isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers UI ---
  const toggleConversationMode = () => {
    const newState = !conversationMode;
    setConversationMode(newState);
    if (newState) {
      setVoiceEnabled(true);
      toast.success("Conversation Mode On! Speak now.");
      setTimeout(startListening, 1000);
    } else {
      stopListening();
      stopSpeaking();
    }
  };

  const handleNewChat = () => {
    setChats([]);
    setCurrentSessionId(null);
    stopSpeaking();
    setIsSidebarOpen(true);
  };

  // --- RENDER ---
  return (
    <div style={styles.container}>
      {/* Background & Avatar Layer */}
      <div style={styles.backgroundLayer}>
         {/* Avatar hanya muncul jika ada chat atau sedang loading, posisinya fixed */}
         {(chats.length > 0 || loading) && (
            <div style={styles.backgroundAvatarContainer}>
              <Avatar3D 
                isSpeaking={isSpeaking} 
                isUserTyping={loading} 
                size={400} 
              />
            </div>
         )}
      </div>

      {/* Sidebar */}
      <div style={{ ...styles.sidebar, transform: isSidebarOpen ? "translateX(0)" : "translateX(-100%)" }}>
        <div style={styles.sidebarHeader}>
          <button onClick={handleNewChat} style={styles.newChatButton}>+ New Chat</button>
        </div>
        <div style={styles.historyList}>
          {chatHistory.map(chat => (
            <div key={chat.id} style={styles.historyItemWrapper}>
              <button onClick={() => loadChatSession(chat.id)} style={styles.historyItemButton}>
                {chat.title || "Conversation"}
              </button>
            </div>
          ))}
        </div>
        <div style={styles.sidebarFooter}>
            <div style={styles.userInfo}>
                <div style={styles.userAvatar}>{user?.name?.charAt(0)}</div>
                <div style={styles.userName}>{user?.name}</div>
                <button onClick={() => { logout(); navigate('/login'); }} style={styles.logoutBtn}>Logout</button>
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ ...styles.mainContent, marginLeft: isSidebarOpen ? "0px" : "-280px" }}>
        {/* Header */}
        <div style={styles.header}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.iconButton}>☰</button>
          <div style={styles.headerTitle}>TutorAI</div>
          
          <div style={styles.headerActions}>
             {/* Voice Selector */}
             <div style={{position: 'relative'}}>
                <button onClick={() => setShowVoiceOptions(!showVoiceOptions)} style={styles.iconButton}>🗣️</button>
                {showVoiceOptions && (
                    <div style={styles.voiceDropdown}>
                        {Object.values(ELEVENLABS_VOICES).map(v => (
                            <div key={v.id} onClick={() => { setSelectedVoice(v.id); setShowVoiceOptions(false); }} style={styles.voiceOption}>
                                {v.name}
                            </div>
                        ))}
                    </div>
                )}
             </div>

             <button 
                onClick={toggleConversationMode} 
                style={{...styles.iconButton, background: conversationMode ? "#dcfce7" : "transparent"}}
                title="Conversation Mode"
             >
                🎙️ Auto
             </button>
             
             <button 
                onClick={() => setVoiceEnabled(!voiceEnabled)} 
                style={{...styles.iconButton, opacity: voiceEnabled ? 1 : 0.5}}
                title="Toggle TTS"
             >
                🔊
             </button>
          </div>
        </div>

        {/* Chat Area */}
        <div style={styles.chatContainer}>
            {chats.length === 0 ? (
                <div style={styles.emptyState}>
                    <Avatar3D size={1000} isSpeaking={isSpeaking} />
                    <h2>Hello, {user?.name}</h2>
                    <p>Ask me anything!</p>
                </div>
            ) : (
                <div style={styles.chatMessages}>
                    {chats.map((msg, i) => (
                        <ChatMessage 
                            key={i} 
                            msg={msg} 
                            isSpeaking={isSpeaking && i === chats.length - 1} 
                            onSpeak={speak}
                        />
                    ))}
                    {loading && (
                        <div style={styles.aiMessageWrapper}>
                             <div style={styles.processingIndicator}>Thinking...</div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            )}
        </div>

        {/* Input Area (Hidden in Conversation Mode if desired, or keep both) */}
        <div style={styles.inputContainer}>
            {conversationMode && (
                <div style={styles.statusBadge}>
                    {isListening ? "🔴 Listening..." : isSpeaking ? "🟢 Speaking..." : "Waiting..."}
                </div>
            )}
            
            <form onSubmit={(e) => handleSendMessage(e)} style={styles.inputForm}>
                <button 
                    type="button" 
                    onClick={isListening ? stopListening : startListening}
                    style={{...styles.voiceButton, background: isListening ? "#ef4444" : "white"}}
                >
                    🎤
                </button>
                <input 
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Type or speak..."
                    style={styles.input}
                    disabled={loading || isListening}
                />
                <button type="submit" disabled={!message || loading} style={styles.sendButton}>➤</button>
            </form>
        </div>
      </div>
    </div>
  );
}

// --- STYLES (Disederhanakan untuk keterbacaan, copy semua dari file lama jika butuh persis sama) ---
// Saya telah memperbaiki properti z-index di sini.
const styles = {
  container: { height: "100vh", display: "flex", background: "#F8FAFB", position: "relative", overflow: "hidden" },
  backgroundLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: "none" }, // zIndex 0 agar di belakang
  backgroundAvatarContainer: { position: "absolute", top: "50%", right: "5%", transform: "translateY(-50%)", zIndex: 0, opacity: 0.5 },
  
  sidebar: { width: "280px", background: "#153C30", display: "flex", flexDirection: "column", zIndex: 20, transition: "transform 0.3s" }, // zIndex tinggi
  sidebarHeader: { padding: "20px", borderBottom: "1px solid rgba(255,255,255,0.1)" },
  newChatButton: { width: "100%", padding: "12px", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", cursor: "pointer" },
  historyList: { flex: 1, overflowY: "auto", padding: "10px" },
  historyItemWrapper: { marginBottom: "5px" },
  historyItemButton: { width: "100%", background: "transparent", border: "none", color: "#ddd", textAlign: "left", padding: "10px", cursor: "pointer" },
  sidebarFooter: { padding: "16px", borderTop: "1px solid rgba(255,255,255,0.1)", color: "white" },
  
  mainContent: { flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1, width: "100%", transition: "margin-left 0.3s" },
  header: { height: "60px", background: "white", display: "flex", alignItems: "center", padding: "0 20px", borderBottom: "1px solid #eee", justifyContent: "space-between" },
  headerTitle: { fontWeight: "bold", color: "#153C30", fontSize: "18px" },
  headerActions: { display: "flex", gap: "10px" },
  iconButton: { padding: "8px", borderRadius: "8px", border: "1px solid #eee", background: "white", cursor: "pointer" },
  
  chatContainer: { flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column" },
  emptyState: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#888" },
  chatMessages: { display: "flex", flexDirection: "column", gap: "20px" },
  
  userMessageWrapper: { display: "flex", justifyContent: "flex-end" },
  aiMessageWrapper: { display: "flex", justifyContent: "flex-start", gap: "10px" },
  userMessage: { background: "#153C30", color: "white", padding: "12px 16px", borderRadius: "16px 16px 0 16px", maxWidth: "70%" },
  aiMessage: { background: "white", border: "1px solid #eee", padding: "12px 16px", borderRadius: "16px 16px 16px 0", maxWidth: "70%", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" },
  
  inputContainer: { background: "white", padding: "20px", borderTop: "1px solid #eee" },
  inputForm: { display: "flex", gap: "10px", maxWidth: "800px", margin: "0 auto" },
  input: { flex: 1, padding: "12px", borderRadius: "20px", border: "1px solid #ccc" },
  voiceButton: { width: "45px", height: "45px", borderRadius: "50%", border: "1px solid #ccc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  sendButton: { padding: "10px 20px", background: "#153C30", color: "white", border: "none", borderRadius: "20px", cursor: "pointer" },
  
  voiceDropdown: { position: "absolute", top: "100%", right: 0, background: "white", border: "1px solid #eee", borderRadius: "8px", padding: "5px", width: "150px", boxShadow: "0 5px 10px rgba(0,0,0,0.1)", zIndex: 100 },
  voiceOption: { padding: "8px", cursor: "pointer", fontSize: "14px" },
  
  statusBadge: { textAlign: "center", marginBottom: "10px", fontSize: "12px", fontWeight: "bold", color: "#153C30" },
  userInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
  userAvatar: { width: 30, height: 30, borderRadius: '50%', background: '#2D7A5F', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoutBtn: { marginLeft: 'auto', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }
};