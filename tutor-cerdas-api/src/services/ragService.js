import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { franc } from "franc";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const INDEXER_URL = process.env.INDEXER_URL || "http://localhost:8000";

/**
 * Detect language of the input text
 * @param {string} text - Input text
 * @returns {string} - Language code ('id' for Indonesian, 'en' for English, etc.)
 */
export function detectLanguage(text) {
  const langCode = franc(text, { minLength: 3 });

  // Map franc codes to our codes
  const langMap = {
    ind: "id", // Indonesian
    eng: "en", // English
    und: "id", // Undefined defaults to Indonesian
  };

  return langMap[langCode] || "id";
}

/**
 * Retrieve relevant context from indexed documents
 * @param {string} query - User query
 * @param {number} topK - Number of chunks to retrieve
 * @returns {Promise<Array>} - Array of relevant chunks
 */
export async function retrieveContext(query, topK = 5) {
  try {
    const response = await axios.post(`${INDEXER_URL}/retrieve`, {
      query,
      top_k: topK,
    });

    if (response.data.success) {
      return response.data.results;
    }

    return [];
  } catch (error) {
    console.error("Error retrieving context:", error.message);
    return [];
  }
}

/**
 * Format context chunks for the prompt
 * @param {Array} chunks - Retrieved chunks
 * @returns {string} - Formatted context
 */
function formatContext(chunks) {
  if (!chunks || chunks.length === 0) {
    return "Tidak ada konteks khusus yang tersedia.";
  }

  return chunks
    .map((chunk, index) => `[${index + 1}] ${chunk.content}`)
    .join("\n\n");
}

/**
 * Build prompt for Gemini with RAG context
 * @param {string} userMessage - User's question
 * @param {Array} context - Retrieved context chunks
 * @param {string} language - Detected language
 * @returns {string} - Complete prompt
 */
function buildPrompt(userMessage, context, language) {
  const contextText = formatContext(context);

  const languageInstructions = {
    id: "Jawab dalam Bahasa Indonesia yang jelas dan mudah dipahami.",
    en: "Answer in clear and easy-to-understand English.",
  };

  const instruction =
    languageInstructions[language] || languageInstructions["id"];

  return `Kamu adalah TutorAI, asisten pembelajaran yang cerdas dan membantu. ${instruction}

KONTEKS DARI DOKUMEN:
${contextText}

PERTANYAAN PENGGUNA:
${userMessage}

INSTRUKSI:
1. Gunakan informasi dari konteks di atas jika relevan
2. Jika konteks tidak cukup, berikan jawaban umum berdasarkan pengetahuanmu
3. Berikan penjelasan yang jelas, terstruktur, dan mudah dipahami
4. Jika perlu, berikan contoh untuk memperjelas
5. Jika tidak tahu jawabannya, jujur katakan dan berikan saran alternatif

JAWABAN:`;
}

/**
 * Generate AI response using Gemini with RAG
 * @param {string} userMessage - User's message
 * @param {Array} context - Retrieved context chunks (optional)
 * @returns {Promise<Object>} - Response object with reply and sources
 */
export async function generateResponse(userMessage, context = null) {
  try {
    // Detect language
    const language = detectLanguage(userMessage);

    // Retrieve context if not provided
    if (!context) {
      context = await retrieveContext(userMessage, 5);
    }

    // Build prompt
    const prompt = buildPrompt(userMessage, context, language);

    // Generate response with Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const reply = response.text();

    // Format sources
    const sources = context.map((chunk) => ({
      chunk_id: chunk.chunk_id,
      document_id: chunk.document_id,
      similarity: chunk.similarity,
      preview: chunk.content.substring(0, 150) + "...",
    }));

    return {
      reply,
      language,
      sources,
      context_used: context.length > 0,
    };
  } catch (error) {
    console.error("Error generating response:", error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

/**
 * Generate response without RAG (direct Gemini)
 * @param {string} userMessage - User's message
 * @returns {Promise<string>} - AI response
 */
export async function generateDirectResponse(userMessage) {
  try {
    const language = detectLanguage(userMessage);

    const languageInstructions = {
      id: "Jawab dalam Bahasa Indonesia yang jelas dan mudah dipahami.",
      en: "Answer in clear and easy-to-understand English.",
    };

    const instruction =
      languageInstructions[language] || languageInstructions["id"];

    const prompt = `Kamu adalah TutorAI, asisten pembelajaran yang cerdas dan membantu. ${instruction}

PERTANYAAN: ${userMessage}

JAWABAN:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return {
      reply: response.text(),
      language,
    };
  } catch (error) {
    console.error("Error generating direct response:", error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}
