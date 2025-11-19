// ElevenLabs Configuration dengan API key Anda
export const ELEVENLABS_CONFIG = {
  apiKey: 'sk_410cf548129218e50e1adae1f438e0c7c4eba86c6b3d0a72',
  voiceId: 'IKne3meq5aSn9XLyUdCD', // Rachel - voice clear untuk edukasi
  modelId: "eleven_multilingual_v2",
  voiceSettings: {
    stability: 0.5,
    similarity_boost: 0.5,
    style: 0.3,
    use_speaker_boost: true
  }
};

// Voice options untuk pilihan berbeda
export const ELEVENLABS_VOICES = {
  RACHEL: { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel - Professional' },
  DOMI: { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi - Expressive' },
  BELLA: { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella - Friendly' },
  ANTONI: { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni - Clear' },
  JESSICA: { id: 'IKne3meq5aSn9XLyUdCD', name: 'Jessica - Multilingual' },
  BRIAN: { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian - Professional' }
};

// Set global variable untuk akses mudah
window.elevenLabsApiKey = ELEVENLABS_CONFIG.apiKey;
window.elevenLabsVoiceId = ELEVENLABS_CONFIG.voiceId;