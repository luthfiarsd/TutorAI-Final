import { useState, useEffect, useRef, useCallback } from "react";
import { ELEVENLABS_CONFIG } from "../config/elevenlabs";

export const useVoiceAssistant = ({
  enabled = false,
  conversationMode = false,
  onSpeechResult = () => {},
  selectedVoice = ELEVENLABS_CONFIG.voiceId,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = conversationMode;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          onSpeechResult(finalTranscript.trim());
          if (!conversationMode) {
            setIsListening(false);
          }
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };
    }
  }, [conversationMode, onSpeechResult]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const speak = useCallback(
    async (text) => {
      if (!enabled) return;

      setIsSpeaking(true);
      try {
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}/stream`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "xi-api-key": ELEVENLABS_CONFIG.apiKey,
            },
            body: JSON.stringify({
              text: text,
              model_id: "eleven_monolingual_v1",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
              },
            }),
          }
        );

        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          
          if (!audioRef.current) {
            audioRef.current = new Audio();
          }
          
          audioRef.current.src = audioUrl;
          await audioRef.current.play();

          audioRef.current.onended = () => {
            setIsSpeaking(false);
            if (conversationMode) {
              setTimeout(() => startListening(), 500);
            }
          };
        }
      } catch (error) {
        console.error("Text-to-speech error:", error);
        setIsSpeaking(false);
      }
    },
    [enabled, selectedVoice, conversationMode, startListening]
  );

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    stopSpeaking,
    speak,
  };
};