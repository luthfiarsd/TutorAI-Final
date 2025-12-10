import { Router } from "express";
import { body, query, validationResult } from "express-validator";
import { authenticateUser } from "../middleware/auth.js";
import { generateResponse } from "../services/ragService.js";
import pool from "../utils/db.js";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

/**
 * POST /api/chat
 * Send a message to AI and get response with RAG
 * Supports conversation context from previous messages
 */
router.post(
  "/",
  [
    body("message")
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage("Message required (1-2000 characters)"),
    body("session_id")
      .optional({ nullable: true })
      .custom((value) => {
        if (value === null || value === undefined) return true;
        if (Number.isInteger(value) && value > 0) return true;
        throw new Error("Session ID must be a positive integer or null");
      }),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { message, session_id } = req.body;
      const userId = req.user.id;

      let sessionId = session_id;

      // If no session_id provided, create a new session
      if (!sessionId) {
        const newSession = await pool.query(
          `INSERT INTO chat_sessions (user_id, title, last_message_at)
           VALUES ($1, $2, NOW())
           RETURNING id`,
          [userId, message.substring(0, 100)]
        );
        sessionId = newSession.rows[0].id;
      } else {
        // Verify session belongs to user
        const sessionCheck = await pool.query(
          "SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2",
          [sessionId, userId]
        );

        if (sessionCheck.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: "Session not found",
          });
        }

        // Update session's last message time
        await pool.query(
          "UPDATE chat_sessions SET last_message_at = NOW() WHERE id = $1",
          [sessionId]
        );
      }

      // Get recent chat history from this session (last 5 messages for context)
      const historyResult = await pool.query(
        `SELECT message, reply
         FROM chat_history
         WHERE session_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [sessionId]
      );

      // Reverse to get chronological order (oldest first)
      const chatHistory = historyResult.rows.reverse();

      // Generate AI response with RAG and chat history context
      const aiResponse = await generateResponse(message, null, chatHistory);

      // Save to chat history
      const result = await pool.query(
        `INSERT INTO chat_history (user_id, session_id, message, reply, language, sources, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, message, reply, language, sources, created_at`,
        [
          userId,
          sessionId,
          message,
          aiResponse.reply,
          aiResponse.language,
          JSON.stringify(aiResponse.sources),
        ]
      );

      const chat = result.rows[0];

      res.json({
        success: true,
        data: {
          chat_id: chat.id,
          session_id: sessionId,
          message: chat.message,
          reply: chat.reply,
          language: chat.language,
          sources: chat.sources,
          context_used: aiResponse.context_used,
          history_used: aiResponse.history_used,
          created_at: chat.created_at,
        },
      });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process chat",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/chat/sessions
 * Get user's chat sessions
 */
router.get("/sessions", async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        cs.id,
        cs.title,
        cs.last_message_at,
        cs.created_at,
        COUNT(ch.id) as message_count
       FROM chat_sessions cs
       LEFT JOIN chat_history ch ON cs.id = ch.session_id
       WHERE cs.user_id = $1
       GROUP BY cs.id, cs.title, cs.last_message_at, cs.created_at
       ORDER BY cs.last_message_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        sessions: result.rows,
      },
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get sessions",
      error: error.message,
    });
  }
});

/**
 * GET /api/chat/sessions/:id
 * Get specific session with all messages and feedback
 */
router.get("/sessions/:id", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    // Check session ownership
    const sessionResult = await pool.query(
      `SELECT id, title, created_at, last_message_at
       FROM chat_sessions
       WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Get all messages in this session WITH feedback
    const messagesResult = await pool.query(
      `SELECT 
        ch.id,
        ch.message,
        ch.reply,
        ch.language,
        ch.sources,
        ch.created_at,
        f.id as feedback_id,
        f.rating as feedback_rating,
        f.comment as feedback_comment
       FROM chat_history ch
       LEFT JOIN feedback f ON f.chat_id = ch.id AND f.user_id = $2
       WHERE ch.session_id = $1
       ORDER BY ch.created_at ASC`,
      [sessionId, userId]
    );

    // Format messages with feedback
    const messages = messagesResult.rows.map((row) => ({
      id: row.id,
      message: row.message,
      reply: row.reply,
      language: row.language,
      sources: row.sources,
      created_at: row.created_at,
      feedback: row.feedback_id
        ? {
            id: row.feedback_id,
            rating: row.feedback_rating,
            comment: row.feedback_comment,
          }
        : null,
    }));

    res.json({
      success: true,
      data: {
        session: sessionResult.rows[0],
        messages: messages,
      },
    });
  } catch (error) {
    console.error("Get session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get session",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/chat/sessions/:id
 * Delete a chat session and all its messages
 */
router.delete("/sessions/:id", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    const result = await pool.query(
      "DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2 RETURNING id",
      [sessionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    res.json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error) {
    console.error("Delete session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete session",
      error: error.message,
    });
  }
});

/**
 * GET /api/chat/history
 * Get user's chat history with pagination
 */
router.get(
  "/history",
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be 1-100"),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await pool.query(
        "SELECT COUNT(*) FROM chat_history WHERE user_id = $1",
        [userId]
      );
      const totalChats = parseInt(countResult.rows[0].count);

      // Get chats with pagination
      const result = await pool.query(
        `SELECT id, message, reply, language, sources, created_at
       FROM chat_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      res.json({
        success: true,
        data: {
          chats: result.rows,
          pagination: {
            page,
            limit,
            total: totalChats,
            total_pages: Math.ceil(totalChats / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get history error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get chat history",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/chat/history/:id
 * Get specific chat by ID
 */
router.get("/history/:id", async (req, res) => {
  try {
    const chatId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID",
      });
    }

    const result = await pool.query(
      `SELECT id, message, reply, language, sources, created_at
       FROM chat_history
       WHERE id = $1 AND user_id = $2`,
      [chatId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    res.json({
      success: true,
      data: {
        chat: result.rows[0],
      },
    });
  } catch (error) {
    console.error("Get chat error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get chat",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/chat/history/:id
 * Delete a specific chat
 */
router.delete("/history/:id", async (req, res) => {
  try {
    const chatId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID",
      });
    }

    const result = await pool.query(
      "DELETE FROM chat_history WHERE id = $1 AND user_id = $2 RETURNING id",
      [chatId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    res.json({
      success: true,
      message: "Chat deleted successfully",
    });
  } catch (error) {
    console.error("Delete chat error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete chat",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/chat/history
 * Delete all user's chat history
 */
router.delete("/history", async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      "DELETE FROM chat_history WHERE user_id = $1 RETURNING COUNT(*)",
      [userId]
    );

    res.json({
      success: true,
      message: "All chats deleted successfully",
    });
  } catch (error) {
    console.error("Delete all chats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete chats",
      error: error.message,
    });
  }
});

export default router;
