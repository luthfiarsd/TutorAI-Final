import { Router } from "express";
import { authenticateUser, requireAdmin } from "../middleware/auth.js";
import pool from "../utils/db.js";

const router = Router();

// All routes require authentication and admin role
router.use(authenticateUser, requireAdmin);

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
router.get("/", async (req, res) => {
  try {
    // Total users
    const usersResult = await pool.query(
      "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM profiles"
    );
    const { total: totalUsers, active: activeUsers } = usersResult.rows[0];

    // Total chats
    const chatsResult = await pool.query(
      "SELECT COUNT(*) as total FROM chat_history"
    );
    const totalChats = parseInt(chatsResult.rows[0].total);

    // Total documents
    const docsResult = await pool.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'processing') as processing,
         COUNT(*) FILTER (WHERE status = 'failed') as failed
       FROM documents`
    );
    const documents = docsResult.rows[0];

    // Chats today
    const chatsTodayResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM chat_history 
       WHERE DATE(created_at) = CURRENT_DATE`
    );
    const chatsToday = parseInt(chatsTodayResult.rows[0].count);

    // Top users (most active)
    const topUsersResult = await pool.query(
      `SELECT 
         p.id, p.name, p.email,
         COUNT(ch.id) as chat_count,
         MAX(ch.created_at) as last_chat
       FROM profiles p
       LEFT JOIN chat_history ch ON p.id = ch.user_id
       GROUP BY p.id, p.name, p.email
       ORDER BY chat_count DESC
       LIMIT 10`
    );
    const topUsers = topUsersResult.rows;

    // Chats per day (last 7 days)
    const chatsPerDayResult = await pool.query(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) as count
       FROM chat_history
       WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    );
    const chatsPerDay = chatsPerDayResult.rows;

    // Language distribution
    const languageResult = await pool.query(
      `SELECT 
         language,
         COUNT(*) as count
       FROM chat_history
       GROUP BY language
       ORDER BY count DESC`
    );
    const languageDistribution = languageResult.rows;

    // Recent registrations (last 7 days)
    const recentRegistrationsResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM profiles
       WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`
    );
    const recentRegistrations = parseInt(
      recentRegistrationsResult.rows[0].count
    );

    res.json({
      success: true,
      data: {
        users: {
          total: parseInt(totalUsers),
          active: parseInt(activeUsers),
          recent_registrations: recentRegistrations,
        },
        chats: {
          total: totalChats,
          today: chatsToday,
          per_day: chatsPerDay,
        },
        documents: {
          total: parseInt(documents.total),
          completed: parseInt(documents.completed),
          processing: parseInt(documents.processing),
          failed: parseInt(documents.failed),
        },
        language_distribution: languageDistribution,
        top_users: topUsers,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get statistics",
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/stats/overview
 * Get simple overview stats (for dashboard cards)
 */
router.get("/overview", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         (SELECT COUNT(*) FROM profiles) as total_users,
         (SELECT COUNT(*) FROM profiles WHERE is_active = true) as active_users,
         (SELECT COUNT(*) FROM chat_history) as total_chats,
         (SELECT COUNT(*) FROM chat_history WHERE DATE(created_at) = CURRENT_DATE) as chats_today,
         (SELECT COUNT(*) FROM documents) as total_documents,
         (SELECT COUNT(*) FROM documents WHERE status = 'completed') as completed_documents,
         (SELECT COUNT(*) FROM chunks) as total_chunks`
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get overview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get overview",
      error: error.message,
    });
  }
});

export default router;
