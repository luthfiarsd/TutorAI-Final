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
 */
router.post(
  "/",
  [
    body("message")
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage("Message required (1-2000 characters)"),
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

      const { message } = req.body;
      const userId = req.user.id;

      // Generate AI response with RAG
      const aiResponse = await generateResponse(message);

      // Save to chat history
      const result = await pool.query(
        `INSERT INTO chat_history (user_id, message, reply, language, sources, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, message, reply, language, sources, created_at`,
        [
          userId,
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
          message: chat.message,
          reply: chat.reply,
          language: chat.language,
          sources: chat.sources,
          context_used: aiResponse.context_used,
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
