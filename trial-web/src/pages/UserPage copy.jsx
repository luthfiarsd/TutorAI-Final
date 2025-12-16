//UserPage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { chatAPI } from "../lib/api";
import { getUser, logout } from "../utils/auth";
import Avatar3D from "../components/Avatar3D";
import MarkdownMessage from "../components/MarkdownMessage";
import { ELEVENLABS_CONFIG, ELEVENLABS_VOICES } from "../config/elevenlabs";
import "./UserPage.css";

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
  const [interimTranscript, setInterimTranscript] = useState("");

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const userDropdownRef = useRef(null);
  const voiceDropdownRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const audioRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const conversationModeRef = useRef(false);
  const isSpeakingRef = useRef(false);
  
  const [feedbackStates, setFeedbackStates] = useState({});

  useEffect(() => {
    conversationModeRef.current = conversationMode;
  }, [conversationMode]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    const userData = getUser();
    if (!userData) {
      navigate("/login");
      return;
    }
    setUser(userData);
    loadChatHistory();
    
    audioRef.current = new Audio();
    
    audioRef.current.addEventListener('ended', () => {
      console.log('Audio ended');
      setIsSpeaking(false);
      setIsAvatarSpeaking(false);
      isSpeakingRef.current = false;
      
      if (conversationModeRef.current) {
        startListening();
      }
    });

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
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
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
    
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'id-ID';

    recognitionRef.current.onresult = (event) => {
      if (isSpeakingRef.current) {
        console.log('User interrupted AI');
        interruptAI();
      }
      
      let interim = '';
      let final = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      
      if (final) {
        finalTranscriptRef.current += final;
      }
      
      const displayText = finalTranscriptRef.current + interim;
      setInterimTranscript(displayText);
      setMessage(displayText);
      
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      
      if (conversationModeRef.current && finalTranscriptRef.current.trim()) {
        silenceTimerRef.current = setTimeout(() => {
          const textToSend = finalTranscriptRef.current.trim();
          if (textToSend) {
            console.log('VAD triggered - sending:', textToSend);
            finalTranscriptRef.current = '';
            setInterimTranscript('');
            setMessage('');
            handleSendMessage(null, textToSend);
          }
        }, 1500);
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'no-speech') {
        if (conversationModeRef.current && !isSpeakingRef.current) {
          console.log('No speech detected, restarting...');
          setTimeout(() => startListening(), 500);
        }
      } else if (event.error !== 'aborted') {
        setIsListening(false);
        toast.error("Voice recognition failed. Please try again.");
      }
    };

    recognitionRef.current.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
      
      if (conversationModeRef.current && !isSpeakingRef.current) {
        console.log('Auto-restarting speech recognition');
        setTimeout(() => startListening(), 100);
      }
    };
  };

  const interruptAI = () => {
    console.log('Interrupting AI...');
    stopSpeaking();
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
  };

  const detectLanguage = (text) => {
    const indonesianPattern = /[a-z]*(nya|kan|lah|kah|an|yang|dengan|untuk|dari|ke|di|pada)\b/i;
    return indonesianPattern.test(text) ? "id-ID" : "en-US";
  };

  const startListening = () => {
    if (recognitionRef.current && !isSpeakingRef.current) {
      try {
        finalTranscriptRef.current = '';
        setInterimTranscript('');
        
        recognitionRef.current.start();
        setIsListening(true);
        console.log('Started listening');
      } catch (error) {
        if (error.name === 'InvalidStateError') {
          console.log('Recognition already running');
          setIsListening(true);
        } else {
          console.error("Failed to start listening:", error);
        }
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
      setIsListening(false);
      console.log('Stopped listening');
    }
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
  };

  const speakWithElevenLabs = async (text) => {
    if (!audioRef.current) {
      console.error('Audio ref not available');
      return;
    }
    
    try {
      stopSpeaking();
      
      const cleanText = text.replace(/[\[\]\(\)\*\#\>\`]/g, '').substring(0, 5000);
      
      const voiceToUse = selectedVoice || ELEVENLABS_CONFIG.voiceId;
      console.log('Generating speech with ElevenLabs');
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceToUse}`, {
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
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      
      if (audioBlob.size === 0) {
        throw new Error('Empty audio response from ElevenLabs');
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      
      audioRef.current.onplay = () => {
        console.log('Audio started playing');
        setIsSpeaking(true);
        setIsAvatarSpeaking(true);
        isSpeakingRef.current = true;
        
        if (conversationModeRef.current) {
          stopListening();
        }
      };

      audioRef.current.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsSpeaking(false);
        setIsAvatarSpeaking(false);
        isSpeakingRef.current = false;
        toast.error('Audio playback failed');
      };

      audioRef.current.onended = () => {
        console.log('Audio ended naturally');
        setIsSpeaking(false);
        setIsAvatarSpeaking(false);
        isSpeakingRef.current = false;
        
        if (conversationModeRef.current) {
          startListening();
        }
      };
      
      await audioRef.current.play();
      
    } catch (error) {
      console.error("ElevenLabs TTS failed:", error);
      toast.error(`ElevenLabs failed. Using browser TTS.`);
      speakWithBrowser(text);
    }
  };

  const speakWithBrowser = (text) => {
    if (!("speechSynthesis" in window)) {
      toast.error("Text-to-speech not supported in your browser");
      return;
    }
    
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[\[\]\(\)\*\#\>\`]/g, '');
    
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
        isSpeakingRef.current = true;
        if (conversationModeRef.current) stopListening();
      };

      utterance.onend = () => {
        console.log('Browser TTS ended');
        setIsSpeaking(false);
        setIsAvatarSpeaking(false);
        isSpeakingRef.current = false;
        if (conversationModeRef.current) startListening();
      };

      utterance.onerror = (event) => {
        console.error('Browser TTS error:', event);
        setIsSpeaking(false);
        setIsAvatarSpeaking(false);
        isSpeakingRef.current = false;
      };

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.includes('en') || voice.lang.includes('id')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = speak;
    } else {
      speak();
    }
  };

  const speak = (text) => {
    if (!text || text.trim().length === 0) {
      console.warn('No text to speak');
      return;
    }
    
    if (ELEVENLABS_CONFIG.apiKey) {
      speakWithElevenLabs(text);
    } else {
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
    isSpeakingRef.current = false;
  };

  const toggleConversationMode = () => {
    const newMode = !conversationMode;
    setConversationMode(newMode);
    conversationModeRef.current = newMode;
    
    if (newMode) {
      setVoiceEnabled(true);
      toast.success("Conversation mode enabled - speak naturally!");
      setTimeout(() => startListening(), 500);
    } else {
      stopListening();
      stopSpeaking();
      finalTranscriptRef.current = '';
      setInterimTranscript('');
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

    if (conversationModeRef.current) stopListening();

    setMessage("");
    setInterimTranscript("");
    setIsUserTyping(false);
    setChats((prev) => [...prev, { type: "user", content: textToSend, timestamp: new Date() }]);
    setLoading(true);
    setIsProcessing(true);

    try {
      const response = await chatAPI.sendMessage(textToSend, currentSessionId);
      const data = response.data?.data || response.data || response;

      if (!data) throw new Error("No response data received");
      if (data.session_id && !currentSessionId) setCurrentSessionId(data.session_id);

      setIsProcessing(false);
      
      const aiMessage = {
        type: "ai",
        content: data.reply || data.message || data.content || "Maaf, saya tidak bisa memproses permintaan tersebut.",
        sources: data.sources || [],
        timestamp: new Date(data.created_at || new Date()),
        context_used: data.context_used,
        history_used: data.history_used,
        chat_id: data.chat_id || data.id,
      };
      
      setChats((prev) => [...prev, aiMessage]);
      
      if (conversationModeRef.current) {
        console.log('Auto-speaking in conversation mode');
        speak(aiMessage.content);
      }
      
      loadChatHistory();
      
    } catch (error) {
      console.error('Send message error:', error);
      setIsProcessing(false);
      
      const errorMessage = {
        type: "ai",
        content: "Maaf, terjadi kesalahan. Server sedang sibuk, silakan coba lagi.",
        isError: true,
        timestamp: new Date(),
      };
      setChats((prev) => [...prev, errorMessage]);
      
      if (conversationModeRef.current) {
        speak("Maaf, terjadi kesalahan. Silakan coba lagi.");
      }
      
      toast.error("Gagal mendapatkan response");
    } finally {
      setLoading(false);
      if (!conversationModeRef.current) inputRef.current?.focus();
    }
  };

  const handleFeedback = async (chatIndex, rating) => {
    const chat = chats[chatIndex];
    if (!chat.chat_id) {
      toast.error("Cannot submit feedback for this message");
      return;
    }

    try {
      const currentFeedback = feedbackStates[chatIndex];

      if (currentFeedback?.rating === rating) {
        if (currentFeedback?.feedbackId) {
          await chatAPI.deleteFeedback(currentFeedback.feedbackId);
          setFeedbackStates((prev) => {
            const newState = { ...prev };
            delete newState[chatIndex];
            return newState;
          });
          toast.success("Feedback removed");
        }
        return;
      }

      let response;
      let feedbackId;

      if (currentFeedback?.feedbackId) {
        response = await chatAPI.updateFeedback(currentFeedback.feedbackId, rating);
        feedbackId = currentFeedback.feedbackId;
        toast.success(rating === 1 ? "Changed to like" : "Changed to dislike");
      } else {
        response = await chatAPI.submitFeedback(chat.chat_id, rating);
        feedbackId = response.data?.data?.feedback?.id || response.data?.feedback?.id;
        toast.success(rating === 1 ? "Thanks for the feedback!" : "Thanks for letting us know");
      }

      setFeedbackStates((prev) => ({
        ...prev,
        [chatIndex]: { rating, feedbackId },
      }));
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      toast.error("Failed to submit feedback");
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
          { type: "ai", content: msg.reply, sources: msg.sources || [], timestamp: new Date(msg.created_at), chat_id: msg.id },
        ]);
        setChats(formattedChats);
        
        const newFeedbackStates = {};
        sessionData.messages.forEach((msg, idx) => {
          if (msg.feedback) {
            const aiMessageIndex = (idx * 2) + 1;
            newFeedbackStates[aiMessageIndex] = {
              rating: msg.feedback.rating,
              feedbackId: msg.feedback.id
            };
          }
        });
        setFeedbackStates(newFeedbackStates);

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
    <div className="user-page-container">
      <div className="background-layer">
        <div className="gradient-overlay"></div>
        {chats.length > 0 && (
          <div className="background-avatar-container">
            <Avatar3D 
              isSpeaking={isAvatarSpeaking} 
              isUserTyping={isProcessing} 
              size={2000} 
            />
          </div>
        )}      
      </div>

      <div className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <button onClick={startNewChat} className="new-chat-button">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            New Chat
          </button>
        </div>

        <div className="history-list">
          {Object.entries(groupedHistory).map(([period, chats]) =>
            chats.length > 0 && (
              <div key={period} className="history-group">
                <div className="history-group-label">{period}</div>
                {chats.map((chat) => (
                  <div 
                    key={chat.id} 
                    className={`history-item-wrapper ${currentSessionId === chat.id ? 'active' : ''}`}
                  >
                    <button onClick={() => loadChat(chat.id)} className="history-item-button">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M14 11C14 11.55 13.55 12 13 12H5L2 15V4C2 3.45 2.45 3 3 3H13C13.55 3 14 3.45 14 4V11Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span className="history-item-text">{chat.title}</span>
                    </button>
                    <button onClick={(e) => deleteChat(chat.id, e)} className="delete-button" title="Delete conversation">
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

        <div className="sidebar-footer">
          <div className="user-info" ref={userDropdownRef}>
            <button onClick={() => setShowUserDropdown(!showUserDropdown)} className="user-button">
              <div className="user-avatar-sidebar">{user?.name?.charAt(0).toUpperCase()}</div>
              <div className="user-details">
                <div className="user-name">{user?.name}</div>
                <div className="user-email">{user?.email}</div>
              </div>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 16 16" 
                fill="none" 
                className={`dropdown-arrow ${showUserDropdown ? 'rotated' : ''}`}
              >
                <path d="M4 6L8 10L12 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            {showUserDropdown && (
              <div className="user-dropdown">
                <button onClick={handleLogout} className="logout-button">
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

      <div className={`main-content ${isSidebarOpen ? 'with-sidebar' : ''}`}>
        <div className="header">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="menu-button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          
          <div className="header-title">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" fill="url(#headerGradient)" />
              <path d="M10 10L14 14L18 10M10 14L14 18L18 14" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <defs>
                <linearGradient id="headerGradient" x1="0" y1="0" x2="28" y2="28">
                  <stop offset="0%" stopColor="#153C30" />
                  <stop offset="100%" stopColor="#2D7A5F" />
                </linearGradient>
              </defs>
            </svg>
            <span>TutorAI</span>
          </div>
          
          <div className="header-actions">
            <div className="voice-selector" ref={voiceDropdownRef}>
              <button 
                onClick={() => setShowVoiceOptions(!showVoiceOptions)} 
                className="voice-selector-button"
                title="Change voice"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2C8.34 2 7 3.34 7 5V10C7 11.66 8.34 13 10 13C11.66 13 13 11.66 13 10V5C13 3.34 11.66 2 10 2Z" stroke="#153C30" strokeWidth="1.5" />
                  <path d="M16 10C16 13.31 13.31 16 10 16C6.69 16 4 13.31 4 10M10 16V18" stroke="#153C30" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              {showVoiceOptions && (
                <div className="voice-dropdown">
                  {Object.entries(ELEVENLABS_VOICES).map(([key, voice]) => (
                    <button
                      key={voice.id}
                      onClick={() => handleVoiceSelect(voice.id, voice.name)}
                      className={`voice-option ${selectedVoice === voice.id ? 'selected' : ''}`}
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

            <button 
              onClick={toggleConversationMode} 
              className={`icon-button ${conversationMode ? 'conversation-active' : ''}`}
              title={conversationMode ? "Conversation mode active" : "Enable conversation mode"}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke={conversationMode ? "#153C30" : "#94A3B8"} strokeWidth="1.5" />
                <path d="M7 9L10 12L14 8" stroke={conversationMode ? "#153C30" : "#94A3B8"} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            
            <button 
              onClick={() => setVoiceEnabled(!voiceEnabled)} 
              className={`icon-button ${voiceEnabled ? 'voice-enabled' : ''}`}
              title={voiceEnabled ? "Voice enabled" : "Voice disabled"}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C8.34 2 7 3.34 7 5V10C7 11.66 8.34 13 10 13C11.66 13 13 11.66 13 10V5C13 3.34 11.66 2 10 2Z" stroke={voiceEnabled ? "#153C30" : "#94A3B8"} strokeWidth="1.5" />
                <path d="M16 10C16 13.31 13.31 16 10 16C6.69 16 4 13.31 4 10M10 16V18" stroke={voiceEnabled ? "#153C30" : "#94A3B8"} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="chat-container">
          {chats.length === 0 ? (
            <div className="empty-state">
              <div className="avatar-container">
                <Avatar3D 
                  isSpeaking={isAvatarSpeaking} 
                  isUserTyping={isUserTyping} 
                  size={400} 
                />
              </div>
            
              <h2 className="empty-title">Welcome to TutorAI</h2>
              <p className="empty-text">Your intelligent learning companion. Ask me anything or try conversation mode!</p>
              
              {conversationMode && (
                <div className="conversation-badge">
                  <div className="pulse-indicator"></div>
                  <span>Conversation mode active - speak now</span>
                </div>
              )}
              
              {conversationMode && isListening && interimTranscript && (
                <div className="realtime-transcript">
                  <span className="transcript-text">"{interimTranscript}"</span>
                </div>
              )}
              
              {isUserTyping && !conversationMode && (
                <div className="conversation-badge user-typing">
                  <div className="pulse-indicator user-pulse"></div>
                  <span>Listening to your input...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="chat-messages">
              {chats.map((chat, index) => (
                <div key={index} className={chat.type === "user" ? "user-message-wrapper" : "ai-message-wrapper"}>
                  {chat.type === "ai" && (
                    <div className="ai-avatar">
                      <Avatar3D isSpeaking={isAvatarSpeaking && index === chats.length - 1} size={36} />
                    </div>
                  )}
                  <div className="message-group">
                    <div className={`message ${chat.type}-message ${chat.isError ? 'error-message' : ''}`}>
                      {chat.type === "ai" ? (
                        <MarkdownMessage content={chat.content} />
                      ) : (
                        <div className="message-content">{chat.content}</div>
                      )}
                    </div>
                    
                    {chat.type === "ai" && chat.history_used && (
                      <div className="context-badge">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        <span>Using conversation context</span>
                      </div>
                    )}
                    
                    {chat.sources?.length > 0 && (
                      <div className="sources-container">
                        <button onClick={() => toggleSources(index)} className="sources-toggle">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 2H11C11.55 2 12 2.45 12 3V11C12 11.55 11.55 12 11 12H3C2.45 12 2 11.55 2 11V3C2 2.45 2.45 2 3 2Z" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                          <span>{chat.sources.length} Source{chat.sources.length > 1 ? "s" : ""}</span>
                          <svg 
                            width="12" 
                            height="12" 
                            viewBox="0 0 12 12" 
                            fill="none" 
                            className={`chevron ${expandedSources[index] ? 'rotated' : ''}`}
                          >
                            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                        {expandedSources[index] && (
                          <div className="sources-list">
                            {chat.sources.map((source, idx) => (
                              <div key={idx} className="source-item">
                                <div className="source-number">[{idx + 1}]</div>
                                <div className="source-content">
                                  <div className="source-text">
                                    "{source.text?.substring(0, 200) || source.preview || "No preview available"}..."
                                  </div>
                                  <div className="source-metadata">
                                    {source.document_id} • {(source.similarity * 100).toFixed(1)}% match
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {chat.type === "ai" && !conversationMode && !chat.isError && (
                      <div className="message-actions">
                        <button 
                          onClick={() => {
                            if (isSpeaking) {
                              stopSpeaking();
                            } else {
                              speak(chat.content);
                            }
                          }} 
                          disabled={isTyping} 
                          className="action-button" 
                          title={isSpeaking ? "Stop speaking" : "Read aloud"}
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M8 3L11 7L8 11M2 5H6V9H2V5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => handleFeedback(index, 1)}
                          className={`action-button feedback-button ${feedbackStates[index]?.rating === 1 ? 'liked' : ''}`}
                          title="Like this response"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path 
                              d="M3 7V12H5V7H3ZM12 7C12 6.45 11.55 6 11 6H8.5L9 3.5V3.35C9 3.15 8.925 2.975 8.8 2.85L8.15 2.2L4.575 5.775C4.35 6 4.25 6.275 4.25 6.5V11C4.25 11.55 4.7 12 5.25 12H10C10.45 12 10.85 11.725 11.025 11.325L12.75 7.825C12.825 7.675 12.85 7.5 12.85 7.35V7.1C12.85 7.05 12.85 7 12.85 6.95L12 7Z" 
                              fill={feedbackStates[index]?.rating === 1 ? 'currentColor' : 'none'}
                              stroke="currentColor" 
                              strokeWidth="1"
                            />
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => handleFeedback(index, -1)}
                          className={`action-button feedback-button ${feedbackStates[index]?.rating === -1 ? 'disliked' : ''}`}
                          title="Dislike this response"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path 
                              d="M11 7V2H9V7H11ZM2 7C2 7.55 2.45 8 3 8H5.5L5 10.5V10.65C5 10.85 5.075 11.025 5.2 11.15L5.85 11.8L9.425 8.225C9.65 8 9.75 7.725 9.75 7.5V3C9.75 2.45 9.3 2 8.75 2H4C3.55 2 3.15 2.275 2.975 2.675L1.25 6.175C1.175 6.325 1.15 6.5 1.15 6.65V6.9C1.15 6.95 1.15 7 1.15 7.05L2 7Z" 
                              fill={feedbackStates[index]?.rating === -1 ? 'currentColor' : 'none'}
                              stroke="currentColor" 
                              strokeWidth="1"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                    
                    <span className="timestamp">
                      {new Date(chat.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {chat.type === "user" && (
                    <div className="user-avatar-small">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="ai-message-wrapper">
                  <div className="ai-avatar">
                    <Avatar3D isSpeaking={true} size={36} />
                  </div>
                  <div className="message-group">
                    <div className="typing-indicator">
                      <span className="typing-dot"></span>
                      <span className="typing-dot delay-1"></span>
                      <span className="typing-dot delay-2"></span>
                    </div>
                  </div>
                </div>
              )}
              
              {isProcessing && (
                <div className="ai-message-wrapper">
                  <div className="ai-avatar">
                    <Avatar3D isSpeaking={false} isProcessing={true} size={36} />
                  </div>
                  <div className="message-group">
                    <div className="processing-indicator">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="8" stroke="#153C30" strokeWidth="2" opacity="0.3"/>
                        <path d="M10 2 A 8 8 0 0 1 18 10" stroke="#153C30" strokeWidth="2" strokeLinecap="round">
                          <animateTransform 
                            attributeName="transform" 
                            type="rotate" 
                            from="0 10 10" 
                            to="360 10 10" 
                            dur="1s" 
                            repeatCount="indefinite"
                          />
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
          <div className="input-container">
            <div className="input-wrapper">
              <form onSubmit={handleSendMessage} className="input-form">
                <button 
                  type="button" 
                  onClick={isListening ? stopListening : startListening} 
                  disabled={loading} 
                  className={`voice-button ${isListening ? 'listening' : ''}`}
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
                  placeholder={isListening ? "Listening..." : "Ask me anything..."} 
                  className="input-field" 
                  disabled={loading || isListening} 
                />
                <button 
                  type="submit" 
                  disabled={loading || !message.trim() || isListening} 
                  className="send-button"
                >
                  {loading ? (
                    <div className="spinner"></div>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M2 10L18 2L10 18L8 12L2 10Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {conversationMode && (
          <div className="conversation-mode-bar">
            <div className="conversation-status">
              {isListening && (
                <>
                  <div className="listening-indicator"></div>
                  <div className="transcript-container">
                    <span className="status-label">Listening...</span>
                    {interimTranscript && (
                      <span className="live-transcript">"{interimTranscript}"</span>
                    )}
                  </div>
                </>
              )}
              {isSpeaking && (
                <>
                  <div className="speaking-indicator"></div>
                  <span>Speaking...</span>
                  <button 
                    onClick={interruptAI} 
                    className="interrupt-button"
                    title="Interrupt AI"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor"/>
                    </svg>
                    Stop
                  </button>
                </>
              )}
              {isProcessing && (
                <>
                  <div className="processing-dot"></div>
                  <span>Processing your message...</span>
                </>
              )}
              {!isListening && !isSpeaking && !isProcessing && (
                <span className="waiting-text">Ready to listen - start speaking</span>
              )}
            </div>
            
            <button 
              onClick={toggleConversationMode} 
              className="exit-conversation-button"
              title="Exit conversation mode"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
