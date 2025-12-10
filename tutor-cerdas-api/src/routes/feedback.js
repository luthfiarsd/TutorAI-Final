import { Router } from "express";
import { body, validationResult } from "express-validator";
import { authenticateUser } from "../middleware/auth.js";
import pool from "../utils/db.js";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

/**
 * POST /api/feedback
 * Submit feedback for a chat message
 */
router.post(
  "/",
  [
    body("chat_id")
      .isInt({ min: 1 })
      .withMessage("Chat ID must be a positive integer"),
    body("rating")
      .isInt()
      .custom((value) => value === 1 || value === -1)
      .withMessage("Rating must be 1 (like) or -1 (dislike)"),
    body("comment")
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 500 })
      .withMessage("Comment must be less than 500 characters"),
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

      const { chat_id, rating, comment } = req.body;
      const userId = req.user.id;

      // Verify chat belongs to user
      const chatCheck = await pool.query(
        "SELECT id FROM chat_history WHERE id = $1 AND user_id = $2",
        [chat_id, userId]
      );

      if (chatCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Chat not found",
        });
      }

      // Check if feedback already exists
      const existingFeedback = await pool.query(
        "SELECT id FROM feedback WHERE chat_id = $1 AND user_id = $2",
        [chat_id, userId]
      );

      let result;
      if (existingFeedback.rows.length > 0) {
        // Update existing feedback
        result = await pool.query(
          `UPDATE feedback 
           SET rating = $1, comment = $2, created_at = NOW() 
           WHERE id = $3 
           RETURNING id, chat_id, user_id, rating, comment, created_at`,
          [rating, comment, existingFeedback.rows[0].id]
        );
      } else {
        // Insert new feedback
        result = await pool.query(
          `INSERT INTO feedback (chat_id, user_id, rating, comment) 
           VALUES ($1, $2, $3, $4) 
           RETURNING id, chat_id, user_id, rating, comment, created_at`,
          [chat_id, userId, rating, comment]
        );
      }

      res.json({
        success: true,
        data: {
          feedback: result.rows[0],
        },
      });
    } catch (error) {
      console.error("Feedback submission error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to submit feedback",
        error: error.message,
      });
    }
  }
);

/**
 * PUT /api/feedback/:id
 * Update existing feedback
 */
router.put(
  "/:id",
  [
    body("rating")
      .isInt()
      .custom((value) => value === 1 || value === -1)
      .withMessage("Rating must be 1 (like) or -1 (dislike)"),
    body("comment")
      .optional({ nullable: true })
      .isString()
      .isLength({ max: 500 })
      .withMessage("Comment must be less than 500 characters"),
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

      const feedbackId = parseInt(req.params.id);
      const { rating, comment } = req.body;
      const userId = req.user.id;

      if (isNaN(feedbackId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid feedback ID",
        });
      }

      const result = await pool.query(
        `UPDATE feedback 
         SET rating = $1, comment = $2, created_at = NOW() 
         WHERE id = $3 AND user_id = $4 
         RETURNING id, chat_id, user_id, rating, comment, created_at`,
        [rating, comment, feedbackId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Feedback not found",
        });
      }

      res.json({
        success: true,
        data: {
          feedback: result.rows[0],
        },
      });
    } catch (error) {
      console.error("Feedback update error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update feedback",
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /api/feedback/:id
 * Delete feedback
 */
router.delete("/:id", async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(feedbackId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedback ID",
      });
    }

    const result = await pool.query(
      "DELETE FROM feedback WHERE id = $1 AND user_id = $2 RETURNING id",
      [feedbackId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    res.json({
      success: true,
      message: "Feedback deleted successfully",
    });
  } catch (error) {
    console.error("Feedback deletion error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete feedback",
      error: error.message,
    });
  }
});

/**
 * GET /api/feedback/chat/:chatId
 * Get feedback for a specific chat
 */
router.get("/chat/:chatId", async (req, res) => {
  try {
    const chatId = parseInt(req.params.chatId);
    const userId = req.user.id;

    if (isNaN(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID",
      });
    }

    const result = await pool.query(
      `SELECT f.id, f.chat_id, f.rating, f.comment, f.created_at
       FROM feedback f
       JOIN chat_history ch ON f.chat_id = ch.id
       WHERE f.chat_id = $1 AND ch.user_id = $2`,
      [chatId, userId]
    );

    res.json({
      success: true,
      data: {
        feedback: result.rows[0] || null,
      },
    });
  } catch (error) {
    console.error("Get feedback error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get feedback",
      error: error.message,
    });
  }
});

export default router;