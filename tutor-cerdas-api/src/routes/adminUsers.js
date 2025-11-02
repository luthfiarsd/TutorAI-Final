import { Router } from "express";
import { query, body, param, validationResult } from "express-validator";
import { authenticateUser, requireAdmin } from "../middleware/auth.js";
import pool from "../utils/db.js";

const router = Router();

// All routes require authentication and admin role
router.use(authenticateUser, requireAdmin);

/**
 * GET /api/admin/users
 * List all users with search and pagination
 */
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("search").optional().trim(),
    query("role").optional().isIn(["user", "admin"]),
    query("is_active").optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search || "";
      const role = req.query.role;
      const isActive = req.query.is_active;

      // Build WHERE clause
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      if (search) {
        whereConditions.push(
          `(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`
        );
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (role) {
        whereConditions.push(`role = $${paramIndex}`);
        queryParams.push(role);
        paramIndex++;
      }

      if (isActive !== undefined) {
        whereConditions.push(`is_active = $${paramIndex}`);
        queryParams.push(isActive === "true");
        paramIndex++;
      }

      const whereClause =
        whereConditions.length > 0
          ? "WHERE " + whereConditions.join(" AND ")
          : "";

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM profiles ${whereClause}`,
        queryParams
      );
      const totalUsers = parseInt(countResult.rows[0].count);

      // Get users
      const result = await pool.query(
        `SELECT id, email, name, role, is_active, created_at, updated_at
       FROM profiles
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, limit, offset]
      );

      res.json({
        success: true,
        data: {
          users: result.rows,
          pagination: {
            page,
            limit,
            total: totalUsers,
            total_pages: Math.ceil(totalUsers / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get users",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/admin/users/:id
 * Get user details
 */
router.get("/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const result = await pool.query(
      `SELECT id, email, name, role, is_active, created_at, updated_at
       FROM profiles
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get user stats
    const statsResult = await pool.query(
      `SELECT 
         COUNT(*) as total_chats,
         MAX(created_at) as last_chat
       FROM chat_history
       WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        user: result.rows[0],
        stats: statsResult.rows[0],
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user",
      error: error.message,
    });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update user (role or is_active)
 */
router.patch(
  "/:id",
  [
    param("id").isInt(),
    body("role").optional().isIn(["user", "admin"]),
    body("is_active").optional().isBoolean(),
    body("name").optional().trim().isLength({ min: 2 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userId = parseInt(req.params.id);
      const { role, is_active, name } = req.body;

      // Build update query
      let updateFields = [];
      let queryParams = [];
      let paramIndex = 1;

      if (role !== undefined) {
        updateFields.push(`role = $${paramIndex}`);
        queryParams.push(role);
        paramIndex++;
      }

      if (is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex}`);
        queryParams.push(is_active);
        paramIndex++;
      }

      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex}`);
        queryParams.push(name);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields to update",
        });
      }

      updateFields.push(`updated_at = NOW()`);
      queryParams.push(userId);

      const result = await pool.query(
        `UPDATE profiles
       SET ${updateFields.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING id, email, name, role, is_active, updated_at`,
        queryParams
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        message: "User updated successfully",
        data: {
          user: result.rows[0],
        },
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update user",
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /api/admin/users/:id
 * Delete user (cascade deletes chats)
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // Prevent self-deletion
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    const result = await pool.query(
      "DELETE FROM profiles WHERE id = $1 RETURNING id, email",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
      data: {
        deleted_user: result.rows[0],
      },
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
});

export default router;
