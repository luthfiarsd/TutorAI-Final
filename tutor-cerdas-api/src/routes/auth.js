import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import pool from "../utils/db.js";

const router = Router();

// Validation middleware
const registerValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("name")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),
];

const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password required"),
];

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post("/register", registerValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM profiles WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      `INSERT INTO profiles (email, password_hash, name, role) 
       VALUES ($1, $2, $3, 'user') 
       RETURNING id, email, name, role, created_at`,
      [email, passwordHash, name]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/login
 * Login user and return JWT token
 */
router.post("/login", loginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      "SELECT id, email, password_hash, name, role, is_active FROM profiles WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact administrator.",
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires auth)
 */
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      "SELECT id, email, name, role, created_at FROM profiles WHERE id = $1 AND is_active = true",
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        user: result.rows[0],
      },
    });
  } catch (error) {
    console.error("Get user error:", error);

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to get user info",
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset (simple version without email)
 */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if user exists
    const result = await pool.query(
      "SELECT id, email, name FROM profiles WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Email not registered. Please check your email or sign up.",
      });
    }

    const user = result.rows[0];

    // Generate reset token (6-digit code)
    const resetToken = crypto.randomInt(100000, 999999).toString();
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset token in database
    await pool.query(
      `UPDATE profiles 
       SET reset_token = $1, reset_token_expiry = $2 
       WHERE id = $3`,
      [resetToken, resetTokenExpiry, user.id]
    );

    // In production, you would send this via email
    // For now, return it in response (ONLY FOR DEVELOPMENT)
    res.json({
      success: true,
      message: "Reset code generated successfully",
      data: {
        resetToken, // Remove this in production!
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process password reset request",
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/verify-reset-token
 * Verify reset token
 */
router.post("/verify-reset-token", async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({
        success: false,
        message: "Email and reset code are required",
      });
    }

    const result = await pool.query(
      `SELECT id, email, reset_token, reset_token_expiry 
       FROM profiles 
       WHERE email = $1 AND reset_token = $2`,
      [email.toLowerCase(), token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset code",
      });
    }

    const user = result.rows[0];

    // Check if token expired
    if (new Date() > new Date(user.reset_token_expiry)) {
      return res.status(400).json({
        success: false,
        message: "Reset code has expired. Please request a new one.",
      });
    }

    res.json({
      success: true,
      message: "Reset code verified",
      data: {
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Verify reset token error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify reset code",
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, reset code, and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Verify token
    const result = await pool.query(
      `SELECT id, reset_token, reset_token_expiry 
       FROM profiles 
       WHERE email = $1 AND reset_token = $2`,
      [email.toLowerCase(), token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset code",
      });
    }

    const user = result.rows[0];

    // Check if token expired
    if (new Date() > new Date(user.reset_token_expiry)) {
      return res.status(400).json({
        success: false,
        message: "Reset code has expired. Please request a new one.",
      });
    }

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    await pool.query(
      `UPDATE profiles 
       SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL 
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    res.json({
      success: true,
      message: "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
});

export default router;
