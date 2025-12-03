//UserPage.jsx ((yang lama))
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { chatAPI } from "../lib/api";
import { getUser, logout } from "../utils/auth";
import Avatar3D from "../components/Avatar3D";
import MarkdownMessage from "../components/MarkdownMessage";
import { ELEVENLABS_CONFIG, ELEVENLABS_VOICES } from "../config/elevenlabs";

export default function UserPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [expandedSources, setExpandedSources] = useState({});
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(ELEVENLABS_CONFIG.voiceId);
  const [showVoiceOptions, setShowVoiceOptions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const userDropdownRef = useRef(null);
  const voiceDropdownRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const userData = getUser();
    if (!userData) {
      navigate("/login");
      return;
    }
    setUser(userData);
    loadChatHistory();
    
    // Initialize audio element
    audioRef.current = new Audio();
    audioRef.current.addEventListener('ended', () => {
      console.log('Audio ended');
      setIsSpeaking(false);
      setIsAvatarSpeaking(false);
      if (conversationMode) setTimeout(() => startListening(), 1000);
    });

    // Handle click outside
    const handleClickOutside = (event) => {
      if (voiceDropdownRef.current && !voiceDropdownRef.current.contains(event.target)) {
        setShowVoiceOptions(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [chats, isTyping]);

  useEffect(() => {
    initializeSpeechRecognition();
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initializeSpeechRecognition = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      console.warn("Speech recognition not supported");
      return;
    }
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'id-ID';

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMessage(transcript);
      setIsListening(false);
      if (conversationMode) handleSendMessage(null, transcript);
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error !== "no-speech") {
        toast.error("Voice recognition failed. Please try again.");
      }
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      if (conversationMode && !isSpeaking) {
        setTimeout(() => startListening(), 1000);
      }
    };
  };

  const detectLanguage = (text) => {
    const indonesianPattern = /[a-z]*(nya|kan|lah|kah|an|yang|dengan|untuk|dari|ke|di|pada)\b/i;
    return indonesianPattern.test(text) ? "id-ID" : "en-US";
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isSpeaking) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        console.log('Started listening');
      } catch (error) {
        console.error("Failed to start listening:", error);
        toast.error("Failed to start voice input");
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      console.log('Stopped listening');
    }
  };

  // ElevenLabs Text-to-Speech dengan error handling yang better
  const speakWithElevenLabs = async (text) => {
    if (!audioRef.current) {
      console.error('Audio ref not available');
      return;
    }
    
    try {
      stopSpeaking();
      
      // Clean text
      const cleanText = text.replace(/[\[\]\(\)\*\#\>\`]/g, '').substring(0, 5000);
      
      console.log('Generating speech with ElevenLabs for text:', cleanText.substring(0, 100));
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_CONFIG.apiKey
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: ELEVENLABS_CONFIG.modelId,
          voice_settings: ELEVENLABS_CONFIG.voiceSettings
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', response.status, errorText);
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      
      if (audioBlob.size === 0) {
        throw new Error('Empty audio response from ElevenLabs');
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Reset audio element
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      
      audioRef.current.onplay = () => {
        console.log('Audio started playing');
        setIsSpeaking(true);
        setIsAvatarSpeaking(true);
        if (conversationMode) stopListening();
      };

      audioRef.current.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsSpeaking(false);
        setIsAvatarSpeaking(false);
        toast.error('Audio playback failed');
      };

      audioRef.current.onended = () => {
        console.log('Audio ended naturally');
        setIsSpeaking(false);
        setIsAvatarSpeaking(false);
        if (conversationMode) setTimeout(() => startListening(), 1000);
      };
      
      // Play audio
      await audioRef.current.play();
      console.log('ElevenLabs speech started successfully');
      
    } catch (error) {
      console.error("ElevenLabs TTS failed:", error);
      // Fallback ke browser TTS
      toast.error(`ElevenLabs failed. Using browser TTS.`);
      speakWithBrowser(text);
    }
  };

  // Browser TTS fallback
  const speakWithBrowser = (text) => {
    if (!("speechSynthesis" in window)) {
      toast.error("Text-to-speech not supported in your browser");
      return;
    }
    
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[\[\]\(\)\*\#\>\`]/g, '');
    
    // Wait for voices to load
    const speak = () => {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = detectLanguage(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

      utterance.onstart = () => {
        console.log('Browser TTS started');
        setIsSpeaking(true);
        setIsAvatarSpeaking(true);
        if (conversationMode) stopListening();
      };

      utterance.onend = () => {
        console.log('Browser TTS ended');
        setIsSpeaking(false);
        setIsAvatarSpeaking(false);
        if (conversationMode) setTimeout(() => startListening(), 1000);
      };

      utterance.onerror = (event) => {
        console.error('Browser TTS error:', event);
        setIsSpeaking(false);
        setIsAvatarSpeaking(false);
        toast.error("Text-to-speech failed");
      };

      // Try to find a good voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.includes('en') || voice.lang.includes('id')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    };

    // If voices aren't loaded yet, wait for them
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = speak;
    } else {
      speak();
    }
  };

  // Speak function - pastikan selalu dipanggil dengan kondisi yang benar
  const speak = (text) => {
    if (!text || text.trim().length === 0) {
      console.warn('No text to speak');
      return;
    }
    
    console.log('Speak called with voiceEnabled:', voiceEnabled, 'conversationMode:', conversationMode);
    
    // Gunakan ElevenLabs jika voice enabled DAN kita punya API key
    if (voiceEnabled && ELEVENLABS_CONFIG.apiKey) {
      speakWithElevenLabs(text);
    } else {
      // Fallback ke browser TTS
      speakWithBrowser(text);
    }
  };

  const stopSpeaking = () => {
    console.log('Stopping speech');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsAvatarSpeaking(false);
  };

  const toggleConversationMode = () => {
    const newMode = !conversationMode;
    setConversationMode(newMode);
    if (newMode) {
      setVoiceEnabled(true);
      toast.success("Conversation mode enabled - speak naturally!");
      setTimeout(() => startListening(), 1000);
    } else {
      stopListening();
      stopSpeaking();
      toast.success("Conversation mode disabled");
    }
  };

  const handleVoiceSelect = (voiceId, voiceName) => {
    setSelectedVoice(voiceId);
    setShowVoiceOptions(false);
    toast.success(`Voice changed to ${voiceName}`);
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    setIsUserTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsUserTyping(false), 1000);
  };

  const loadChatHistory = async () => {
    stopSpeaking();
    try {
      const response = await chatAPI.getSessions();
      const sessions = response.data?.data?.sessions || response.data?.sessions || [];
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
  setIsUserTyping(false);
  setChats((prev) => [...prev, { type: "user", content: textToSend, timestamp: new Date() }]);
  setLoading(true);
  setIsProcessing(true); // Set processing true saat mulai
  setIsTyping(false); // Typing false dulu

  try {
    const response = await chatAPI.sendMessage(textToSend, currentSessionId);
    const data = response.data?.data || response.data || response;

    if (!data) throw new Error("No response data received");
    if (data.session_id && !currentSessionId) setCurrentSessionId(data.session_id);

    // Setelah dapat response, set processing false dan typing true
    setIsProcessing(false);
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      const aiMessage = {
        type: "ai",
        content: data.reply || data.message || data.content || "I'm sorry, I couldn't process that request.",
        sources: data.sources || [],
        timestamp: new Date(data.created_at || new Date()),
        context_used: data.context_used,
        history_used: data.history_used,
      };
      setChats((prev) => [...prev, aiMessage]);
      
      console.log('Should speak?', { voiceEnabled, conversationMode, content: aiMessage.content });
      if (voiceEnabled || conversationMode) {
        console.log('Calling speak function');
        speak(aiMessage.content);
      }
      
      loadChatHistory();
    }, 500);
  } catch (error) {
    setIsTyping(false);
    setIsProcessing(false);
  } finally {
    setLoading(false);
    if (!conversationMode) inputRef.current?.focus();
  }
};

  const startNewChat = () => {
    stopSpeaking();
    setChats([]);
    setCurrentSessionId(null);
    setIsUserTyping(false);
    setExpandedSources({});
    if (conversationMode) toggleConversationMode();
    toast.success("New chat started");
  };

  const loadChat = async (sessionId) => {
    try {
      setCurrentSessionId(sessionId);
      const response = await chatAPI.getSession(sessionId);
      const sessionData = response.data?.data || response.data;

      if (sessionData?.messages) {
        const formattedChats = sessionData.messages.flatMap((msg) => [
          { type: "user", content: msg.message, timestamp: new Date(msg.created_at) },
          { type: "ai", content: msg.reply, sources: msg.sources || [], timestamp: new Date(msg.created_at) },
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
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this conversation?")) return;

    try {
      await chatAPI.deleteSession(sessionId);
      if (currentSessionId === sessionId) {
        setChats([]);
        setCurrentSessionId(null);
        setExpandedSources({});
      }
      await loadChatHistory();
      toast.success("Conversation deleted successfully");
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast.error("Failed to delete conversation");
    }
  };

  const toggleSources = (index) => {
    setExpandedSources((prev) => ({ ...prev, [index]: !prev[index] }));
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
      const days = Math.floor((now - chat.timestamp) / (1000 * 60 * 60 * 24));
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
      <div style={styles.backgroundLayer}>
        <div style={styles.gradientOverlay}></div>
        {/* Avatar background dengan deteksi typing dan speaking */}
        {chats.length > 0 && (
          <div style={styles.backgroundAvatarContainer}>
            <Avatar3D 
              align="center" 
              isSpeaking={isAvatarSpeaking} 
              isUserTyping={isUserTyping} 
              background={false} 
              size={400} 
            />
          </div>
        )}      
       </div>

      <div style={{ ...styles.sidebar, transform: isSidebarOpen ? "translateX(0)" : "translateX(-100%)" }}>
        <div style={styles.sidebarHeader}>
          <button onClick={startNewChat} style={styles.newChatButton}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            New Chat
          </button>
        </div>

        <div style={styles.historyList}>
          {Object.entries(groupedHistory).map(([period, chats]) =>
            chats.length > 0 && (
              <div key={period} style={styles.historyGroup}>
                <div style={styles.historyGroupLabel}>{period}</div>
                {chats.map((chat) => (
                  <div key={chat.id} style={{ ...styles.historyItemWrapper, background: currentSessionId === chat.id ? "rgba(255,255,255,0.1)" : "transparent" }}>
                    <button onClick={() => loadChat(chat.id)} style={styles.historyItemButton}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M14 11C14 11.55 13.55 12 13 12H5L2 15V4C2 3.45 2.45 3 3 3H13C13.55 3 14 3.45 14 4V11Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span style={styles.historyItemText}>{chat.title}</span>
                    </button>
                    <button onClick={(e) => deleteChat(chat.id, e)} style={styles.deleteButton} title="Delete conversation">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 4H11M5 4V3C5 2.45 5.45 2 6 2H8C8.55 2 9 2.45 9 3V4M10 4V11C10 11.55 9.55 12 9 12H5C4.45 12 4 11.55 4 11V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
            <button onClick={() => setShowUserDropdown(!showUserDropdown)} style={styles.userButton}>
              <div style={styles.userAvatar}>{user?.name?.charAt(0).toUpperCase()}</div>
              <div style={styles.userDetails}>
                <div style={styles.userName}>{user?.name}</div>
                <div style={styles.userEmail}>{user?.email}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: showUserDropdown ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                <path d="M4 6L8 10L12 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            {showUserDropdown && (
              <div style={styles.userDropdown}>
                <button onClick={handleLogout} style={styles.logoutButton}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 14H3C2.45 14 2 13.55 2 13V3C2 2.45 2.45 2 3 2H6M11 11L14 8M14 8L11 5M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ ...styles.mainContent, marginLeft: isSidebarOpen ? "280px" : "0", transition: "margin-left 0.3s ease" }}>
        <div style={styles.header}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.menuButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div style={styles.headerTitle}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" fill="url(#gradient)" />
              <path d="M10 10L14 14L18 10M10 14L14 18L18 14" stroke="white" strokeWidth="2" strokeLinecap="round" />
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
            {/* Voice Selector Dropdown */}
            <div style={styles.voiceSelector} ref={voiceDropdownRef}>
              <button 
                onClick={() => setShowVoiceOptions(!showVoiceOptions)} 
                style={styles.voiceSelectorButton}
                title="Change voice"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2C8.34 2 7 3.34 7 5V10C7 11.66 8.34 13 10 13C11.66 13 13 11.66 13 10V5C13 3.34 11.66 2 10 2Z" stroke="#153C30" strokeWidth="1.5" />
                  <path d="M16 10C16 13.31 13.31 16 10 16C6.69 16 4 13.31 4 10M10 16V18" stroke="#153C30" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              {showVoiceOptions && (
                <div style={styles.voiceDropdown}>
                  {Object.entries(ELEVENLABS_VOICES).map(([key, voice]) => (
                    <button
                      key={voice.id}
                      onClick={() => handleVoiceSelect(voice.id, voice.name)}
                      style={{
                        ...styles.voiceOption,
                        background: selectedVoice === voice.id ? 'rgba(21, 60, 48, 0.1)' : 'transparent'
                      }}
                    >
                      {voice.name}
                      {selectedVoice === voice.id && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M13 5L6 12L3 9" stroke="#153C30" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={toggleConversationMode} style={{ ...styles.iconButton, background: conversationMode ? "rgba(21, 60, 48, 0.15)" : "transparent", border: conversationMode ? "2px solid #153C30" : "1px solid #E5E7EB" }} title={conversationMode ? "Conversation mode active" : "Enable conversation mode"}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke={conversationMode ? "#153C30" : "#94A3B8"} strokeWidth="1.5" />
                <path d="M7 9L10 12L14 8" stroke={conversationMode ? "#153C30" : "#94A3B8"} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <button onClick={() => setVoiceEnabled(!voiceEnabled)} style={{ ...styles.iconButton, background: voiceEnabled ? "rgba(21, 60, 48, 0.1)" : "transparent" }} title={voiceEnabled ? "Voice enabled" : "Voice disabled"}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C8.34 2 7 3.34 7 5V10C7 11.66 8.34 13 10 13C11.66 13 13 11.66 13 10V5C13 3.34 11.66 2 10 2Z" stroke={voiceEnabled ? "#153C30" : "#94A3B8"} strokeWidth="1.5" />
                <path d="M16 10C16 13.31 13.31 16 10 16C6.69 16 4 13.31 4 10M10 16V18" stroke={voiceEnabled ? "#153C30" : "#94A3B8"} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div style={styles.chatContainer}>
          {chats.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.avatarContainer}>
                <Avatar3D 
                  isSpeaking={isAvatarSpeaking} 
                  isUserTyping={isUserTyping} 
                  size={400} 
                />
              </div>
            
              <h2 style={styles.emptyTitle}>Welcome to TutorAI</h2>
              <p style={styles.emptyText}>Your intelligent learning companion. Ask me anything or try conversation mode!</p>
              {conversationMode && <div style={styles.conversationBadge}><div style={styles.pulseIndicator}></div><span>Conversation mode active - speak now</span></div>}
              {isUserTyping && !conversationMode && <div style={{ ...styles.conversationBadge, background: "rgba(45, 122, 95, 0.1)", border: "2px solid #2D7A5F" }}><div style={{ ...styles.pulseIndicator, background: "#2D7A5F" }}></div><span style={{ color: "#2D7A5F" }}>Listening to your input...</span></div>}
            </div>
          ) : (
            <div style={styles.chatMessages}>
              {chats.map((chat, index) => (
                <div key={index} style={chat.type === "user" ? styles.userMessageWrapper : styles.aiMessageWrapper}>
                  {chat.type === "ai" && <div style={styles.aiAvatar}><Avatar3D isSpeaking={isAvatarSpeaking && index === chats.length - 1} size={36} /></div>}
                  <div style={styles.messageGroup}>
                    <div style={{ ...(chat.type === "user" ? styles.userMessage : styles.aiMessage), ...(chat.isError ? styles.errorMessage : {}) }}>
                      {chat.type === "ai" ? <MarkdownMessage content={chat.content} /> : <div style={styles.messageContent}>{chat.content}</div>}
                    </div>
                    {chat.type === "ai" && chat.history_used && <div style={styles.contextBadge}><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" /></svg><span>Using conversation context</span></div>}
                    {chat.sources?.length > 0 && (
                      <div style={styles.sourcesContainer}>
                        <button onClick={() => toggleSources(index)} style={styles.sourcesToggle}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 2H11C11.55 2 12 2.45 12 3V11C12 11.55 11.55 12 11 12H3C2.45 12 2 11.55 2 11V3C2 2.45 2.45 2 3 2Z" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                          <span>{chat.sources.length} Source{chat.sources.length > 1 ? "s" : ""}</span>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: "auto", transform: expandedSources[index] ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
                            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                        {expandedSources[index] && (
                          <div style={styles.sourcesList}>
                            {chat.sources.map((source, idx) => (
                              <div key={idx} style={styles.sourceItem}>
                                <div style={styles.sourceNumber}>[{idx + 1}]</div>
                                <div style={styles.sourceContent}>
                                  <div style={styles.sourceText}>"{source.text?.substring(0, 200) || source.preview || "No preview available"}..."</div>
                                  <div style={styles.sourceMetadata}>{source.document_id} • {(source.similarity * 100).toFixed(1)}% match</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {chat.type === "ai" && !conversationMode && !chat.isError && (
                      <div style={styles.messageActions}>
                        <button 
                          onClick={() => {
                            console.log('Manual speak triggered');
                            if (isSpeaking) {
                              stopSpeaking();
                            } else {
                              speak(chat.content);
                            }
                          }} 
                          disabled={isTyping} 
                          style={styles.actionButton} 
                          title={isSpeaking ? "Stop speaking" : "Read aloud"}
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M8 3L11 7L8 11M2 5H6V9H2V5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <span style={styles.timestamp}>{new Date(chat.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {chat.type === "user" && <div style={styles.userAvatar}>{user?.name?.charAt(0).toUpperCase()}</div>}
                </div>
              ))}
              {isTyping && (
                <div style={styles.aiMessageWrapper}>
                  <div style={styles.aiAvatar}><Avatar3D isSpeaking={true} size={36} /></div>
                  <div style={styles.messageGroup}>
                    <div style={styles.typingIndicator}>
                      <span style={styles.typingDot}></span>
                      <span style={{ ...styles.typingDot, animationDelay: "0.2s" }}></span>
                      <span style={{ ...styles.typingDot, animationDelay: "0.4s" }}></span>
                    </div>
                  </div>
                </div>
              )}
              {isProcessing && (
                <div style={styles.aiMessageWrapper}>
                  <div style={styles.aiAvatar}>
                    <Avatar3D isSpeaking={false} isProcessing={true} size={36} />
                  </div>
                  <div style={styles.messageGroup}>
                    <div style={styles.processingIndicator}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="8" stroke="#153C30" strokeWidth="2" opacity="0.3"/>
                        <path d="M10 2 A 8 8 0 0 1 18 10" stroke="#153C30" strokeWidth="2" strokeLinecap="round">
                          <animateTransform attributeName="transform" type="rotate" from="0 10 10" to="360 10 10" dur="1s" repeatCount="indefinite"/>
                        </path>
                      </svg>
                      <span>Processing...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {!conversationMode && (
          <div style={styles.inputContainer}>
            <div style={styles.inputWrapper}>
              <form onSubmit={handleSendMessage} style={styles.inputForm}>
                <button type="button" onClick={isListening ? stopListening : startListening} disabled={loading} style={{ ...styles.voiceButton, background: isListening ? "#EF4444" : "transparent" }} title={isListening ? "Stop listening" : "Start voice input"}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2C8.34 2 7 3.34 7 5V10C7 11.66 8.34 13 10 13C11.66 13 13 11.66 13 10V5C13 3.34 11.66 2 10 2Z" stroke={isListening ? "white" : "#64748B"} strokeWidth="1.5" />
                    <path d="M16 10C16 13.31 13.31 16 10 16C6.69 16 4 13.31 4 10M10 16V18" stroke={isListening ? "white" : "#64748B"} strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                <input ref={inputRef} type="text" value={message} onChange={handleInputChange} placeholder={isListening ? "Listening..." : "Ask me anything..."} style={styles.input} disabled={loading || isListening} />
                <button type="submit" disabled={loading || !message.trim() || isListening} style={{ ...styles.sendButton, opacity: loading || !message.trim() || isListening ? 0.5 : 1 }}>
                  {loading ? <div style={styles.spinner}></div> : <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 10L18 2L10 18L8 12L2 10Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" /></svg>}
                </button>
              </form>
            </div>
          </div>
        )}

        {conversationMode && (
          <div style={styles.conversationModeBar}>
            <div style={styles.conversationStatus}>
              {isListening && (<><div style={styles.listeningIndicator}></div><span>Listening...</span></>)}
              {isSpeaking && (<><div style={styles.speakingIndicator}></div><span>Speaking...</span></>)}
              {!isListening && !isSpeaking && <span style={styles.waitingText}>Ready to listen</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { height: "100vh", display: "flex", background: "#F8FAFB", position: "relative", overflow: "hidden" },
  backgroundLayer: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, overflow: "hidden" },
  backgroundAvatarContainer: { 
  position: "absolute", 
  top: "50%", 
  right: "10%", // Ubah dari left: "50%" jadi right: "10%"
  transform: "translateY(-50%)", // Hapus translate X
  width: "65vh", 
  height: "65vh", 
  maxWidth: "800px", 
  maxHeight: "800px", 
  zIndex: 0, 
  pointerEvents: "none",
  filter: "drop-shadow(0 0 30px rgba(171, 63, 63, 0.1))" 
},
  gradientOverlay: { position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(21, 60, 48, 0.02) 0%, rgba(45, 122, 95, 0.03) 100%)", zIndex: 1 },
  sidebar: { width: "280px",margin: "0 -280px 0 0", background: "linear-gradient(180deg, #153C30 0%, #1A4D3C 100%)", display: "flex", flexDirection: "column", transition: "transform 0.3s ease", zIndex: 10, boxShadow: "2px 0 12px rgba(0, 0, 0, 0.1)" },
  sidebarHeader: { padding: "20px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" },
  newChatButton: { width: "100%", padding: "12px 16px", background: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: "8px", color: "white", fontSize: "14px", fontWeight: "600", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", transition: "all 0.2s" },
  historyList: { flex: 1, overflowY: "auto", padding: "12px" },
  historyGroup: { marginBottom: "20px" },
  historyGroupLabel: { fontSize: "11px", fontWeight: "600", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "8px 12px", marginBottom: "4px" },
  historyItemWrapper: { width: "100%", display: "flex", alignItems: "center", gap: "4px", borderRadius: "6px", transition: "all 0.2s ease", marginBottom: "2px" },
  historyItemButton: { flex: 1, padding: "10px 12px", background: "transparent", border: "none", color: "rgba(255, 255, 255, 0.9)", cursor: "pointer", textAlign: "left", fontSize: "13px", borderRadius: "6px", transition: "all 0.2s ease", display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" },
  deleteButton: { padding: "6px", background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", borderRadius: "4px", transition: "all 0.2s ease", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, flexShrink: 0 },
  historyItemText: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  sidebarFooter: { padding: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.1)" },
  userInfo: { position: "relative" },
  userButton: { width: "100%", display: "flex", alignItems: "center", gap: "12px", background: "transparent", border: "none", cursor: "pointer", padding: "8px", borderRadius: "8px", transition: "all 0.2s" },
  userAvatar: { width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #2D7A5F 0%, #3A9B78 100%)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "700", flexShrink: 0 },
  userDetails: { flex: 1, overflow: "hidden", textAlign: "left" },
  userName: { fontSize: "14px", fontWeight: "600", color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  userEmail: { fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  userDropdown: { position: "absolute", bottom: "100%", left: "8px", right: "8px", marginBottom: "8px", background: "white", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)", overflow: "hidden", animation: "slideUp 0.2s ease" },
  logoutButton: { width: "100%", padding: "12px 16px", background: "transparent", border: "none", color: "#EF4444", fontSize: "14px", fontWeight: "500", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", transition: "all 0.2s" },
  mainContent: { 
  flex: 1, 
  display: "flex", 
  flexDirection: "column", 
  position: "relative", 
  zIndex: 1,
  width: "100%",
  minWidth: 0,
  transition: "margin-left 0.3s ease"  // ← Tambah ini
  },
  header: { height: "64px", background: "white", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", padding: "0 20px", gap: "16px", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)" },
  menuButton: { width: "40px", height: "40px", borderRadius: "8px", background: "transparent", border: "none", color: "#153C30", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" },
  headerTitle: { display: "flex", alignItems: "center", gap: "12px", fontSize: "18px", fontWeight: "700", color: "#153C30" },
  headerActions: { marginLeft: "auto", display: "flex", gap: "8px" },
  iconButton: { width: "40px", height: "40px", borderRadius: "8px", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", background: "transparent" },
  voiceSelector: { position: 'relative', display: 'inline-block' },
  voiceSelectorButton: { width: "40px", height: "40px", borderRadius: "8px", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", background: "transparent" },
  voiceDropdown: { position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', border: '1px solid #E5E7EB', minWidth: '180px', zIndex: 1, animation: 'slideDown 0.2s ease' },
  voiceOption: { width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: '#153C30', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s', borderBottom: '1px solid #F1F5F9' },
  chatContainer: { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", zIndex: 2 },
  emptyState: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", position: "relative", zIndex: 2 },
  avatarContainer: { 
  marginBottom: "24px", 
  display: "flex", 
  justifyContent: "center", 
  alignItems: "center", 
  position: "relative", 
  zIndex: 2,
  width: "100%",
  height: "auto"
  },
  emptyTitle: { fontSize: "28px", fontWeight: "700", color: "#153C30", marginBottom: "12px" },
  emptyText: { fontSize: "15px", color: "#64748B", marginBottom: "24px", textAlign: "center", maxWidth: "400px" },
  conversationBadge: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", background: "rgba(21, 60, 48, 0.1)", border: "2px solid #153C30", borderRadius: "12px", color: "#153C30", fontSize: "14px", fontWeight: "600", marginTop: "8px" },
  pulseIndicator: { width: "12px", height: "12px", borderRadius: "50%", background: "#EF4444", animation: "pulse 1.5s ease-in-out infinite" },
  chatMessages: { flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" },
  userMessageWrapper: { display: "flex", alignItems: "flex-end", gap: "12px", justifyContent: "flex-end" },
  aiMessageWrapper: { 
  display: "flex", 
  alignItems: "flex-start", 
  gap: "12px",
  position: "relative",
  zIndex: 1 // Tambahkan ini
},
  aiAvatar: { width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" },
  messageGroup: { maxWidth: "70%", display: "flex", flexDirection: "column", gap: "8px" },
  userMessage: { background: "linear-gradient(135deg, #153C30 0%, #2D7A5F 100%)", color: "white", padding: "14px 18px", borderRadius: "18px 18px 4px 18px", boxShadow: "0 2px 12px rgba(21, 60, 48, 0.2)" },
  aiMessage: { 
  background: "white", 
  padding: "14px 18px", 
  borderRadius: "18px 18px 18px 4px", 
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)", // Shadow lebih tebal
  border: "1px solid #E5E7EB",
  position: "relative",
  zIndex: 1 // Tambahkan ini
},
processingIndicator: { 
  background: "white", 
  padding: "14px 18px", 
  borderRadius: "18px 18px 18px 4px", 
  boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)", 
  display: "flex", 
  gap: "10px", 
  alignItems: "center",
  border: "1px solid #E5E7EB",
  color: "#153C30",
  fontSize: "14px",
  fontWeight: "500"
},
  errorMessage: { background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", padding: "14px 18px", borderRadius: "18px 18px 18px 4px", boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)" },
  messageContent: { fontSize: "15px", lineHeight: "1.6" },
  contextBadge: { display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#2D7A5F", background: "rgba(45, 122, 95, 0.08)", padding: "4px 10px", borderRadius: "12px", width: "fit-content", border: "1px solid rgba(45, 122, 95, 0.2)" },
  messageActions: { display: "flex", gap: "4px", paddingLeft: "4px" },
  actionButton: { padding: "4px 8px", background: "transparent", border: "1px solid #E5E7EB", borderRadius: "6px", color: "#64748B", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", transition: "all 0.2s" },
  timestamp: { fontSize: "11px", color: "#94A3B8", paddingLeft: "4px" },
  typingIndicator: { background: "white", padding: "14px 18px", borderRadius: "18px 18px 18px 4px", boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)", display: "flex", gap: "4px", alignItems: "center" },
  typingDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#153C30", animation: "typing 1.4s infinite" },
  inputContainer: { background: "white", padding: "20px 24px", borderTop: "1px solid #E5E7EB", boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.05)", zIndex: 11 },
  inputWrapper: { maxWidth: "1000px", margin: "0 auto" },
  inputForm: { display: "flex", gap: "12px", alignItems: "center" },
  voiceButton: { width: "44px", height: "44px", borderRadius: "50%", border: "2px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.3s", flexShrink: 0 },
  input: { flex: 1, padding: "14px 20px", border: "2px solid #E5E7EB", borderRadius: "24px", fontSize: "15px", outline: "none", color: "#1E293B", backgroundColor: "#F8FAFB", transition: "all 0.3s ease" },
  sendButton: { width: "44px", height: "44px", borderRadius: "50%", background: "linear-gradient(135deg, #153C30 0%, #2D7A5F 100%)", color: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s ease", boxShadow: "0 4px 12px rgba(21, 60, 48, 0.3)", cursor: "pointer", flexShrink: 0 },
  spinner: { width: "20px", height: "20px", border: "2px solid rgba(255, 255, 255, 0.3)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  conversationModeBar: { background: "linear-gradient(135deg, #153C30 0%, #2D7A5F 100%)", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "center" },
  conversationStatus: { display: "flex", alignItems: "center", gap: "12px", color: "white", fontSize: "16px", fontWeight: "600" },
  listeningIndicator: { width: "16px", height: "16px", borderRadius: "50%", background: "#EF4444", animation: "pulse 1.5s ease-in-out infinite" },
  speakingIndicator: { width: "16px", height: "16px", borderRadius: "50%", background: "#10B981", animation: "pulse 1.5s ease-in-out infinite" },
  waitingText: { color: "rgba(255, 255, 255, 0.8)" },
  sourcesContainer: { marginTop: "8px", background: "rgba(45, 122, 95, 0.05)", borderRadius: "8px", border: "1px solid rgba(45, 122, 95, 0.15)", overflow: "hidden" },
  sourcesToggle: { width: "100%", padding: "10px 12px", background: "transparent", border: "none", color: "#2D7A5F", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", transition: "all 0.2s" },
  sourcesList: { padding: "8px 12px 12px 12px", display: "flex", flexDirection: "column", gap: "8px", animation: "slideDown 0.2s ease" },
  sourceItem: { display: "flex", gap: "10px", padding: "10px", background: "white", borderRadius: "6px", border: "1px solid rgba(45, 122, 95, 0.1)" },
  sourceNumber: { fontSize: "12px", fontWeight: "700", color: "#2D7A5F", flexShrink: 0 },
  sourceContent: { flex: 1, display: "flex", flexDirection: "column", gap: "4px" },
  sourceText: { fontSize: "12px", lineHeight: "1.5", color: "#475569", fontStyle: "italic" },
  sourceMetadata: { fontSize: "11px", color: "#94A3B8", display: "flex", gap: "8px", alignItems: "center" },
};
