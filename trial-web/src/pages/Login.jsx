import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { authAPI } from "../lib/api";
import { saveAuth } from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Reset Password States
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const response = await authAPI.login(formData);
    const { user, token } = response.data.data;

    saveAuth(user, token);
    toast.success("Welcome back!");

    setTimeout(() => {
      if (user.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    }, 500);
    
  } catch (error) {
    console.error("Login error:", error);
    const errorMessage = error.response?.data?.message || "Login failed";
    const statusCode = error.response?.status;
    
    console.log("Error message:", errorMessage); // Debug
    console.log("Status code:", statusCode); // Debug
    
    // Cek berdasarkan error message yang lebih fleksibel
    const lowerMessage = errorMessage.toLowerCase();
    
    if (lowerMessage.includes("user not found") || 
        lowerMessage.includes("email not found") ||
        lowerMessage.includes("email does not exist")) {
      toast.error("Email not registered. Please check your email or sign up.");
    } 
    else if (lowerMessage.includes("incorrect password") || 
             lowerMessage.includes("wrong password") ||
             lowerMessage.includes("invalid password") ||
             lowerMessage.includes("password is incorrect")) {
      toast.error("Incorrect password. Please try again.");
    }
    else if (lowerMessage.includes("invalid credentials") || 
             lowerMessage.includes("invalid email or password")) {
      // Jika backend gabung error email & password jadi satu
      toast.error("Invalid email or password. Please try again.");
    }
    else if (lowerMessage.includes("deactivated") || 
             lowerMessage.includes("account disabled")) {
      toast.error("Your account has been deactivated. Please contact support.");
    }
    else {
      // Fallback: tampilkan error message dari backend
      toast.error(errorMessage);
    }
  } finally {
    setLoading(false);
  }
};
  const handleRequestReset = async (e) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error("Please enter your email address");
      return;
    }

    setResetLoading(true);

    try {
      const response = await authAPI.forgotPassword({ email: resetEmail });
      
      if (response.data.data.resetToken) {
        setGeneratedToken(response.data.data.resetToken);
      }
      
      toast.success("Reset code has been generated! Check the code below.");
      setResetStep(2);
    } catch (error) {
      console.error("Reset password error:", error);
      const errorMessage = error.response?.data?.message;
      
      if (errorMessage && errorMessage.includes("not registered")) {
        toast.error("Email not registered. Please check your email or sign up.");
      } else {
        toast.error(errorMessage || "Failed to send reset code. Please try again.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyToken = async (e) => {
    e.preventDefault();
    
    if (!resetToken) {
      toast.error("Please enter the reset code");
      return;
    }

    setResetLoading(true);

    try {
      await authAPI.verifyResetToken({ email: resetEmail, token: resetToken });
      toast.success("Code verified! Now set your new password.");
      setResetStep(3);
    } catch (error) {
      console.error("Verify token error:", error);
      const errorMessage = error.response?.data?.message;
      
      if (errorMessage && errorMessage.includes("expired")) {
        toast.error("Reset code has expired. Please request a new one.");
        setResetStep(1);
        setResetToken("");
        setGeneratedToken("");
      } else if (errorMessage && errorMessage.includes("Invalid")) {
        toast.error("Invalid reset code. Please check and try again.");
      } else {
        toast.error(errorMessage || "Failed to verify code.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setResetLoading(true);

    try {
      await authAPI.resetPassword({ 
        email: resetEmail, 
        token: resetToken, 
        newPassword 
      });
      
      toast.success("Password reset successfully! You can now login.");
      
      setShowResetModal(false);
      setResetStep(1);
      setResetEmail("");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
      setGeneratedToken("");
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error(error.response?.data?.message || "Failed to reset password.");
    } finally {
      setResetLoading(false);
    }
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetStep(1);
    setResetEmail("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setGeneratedToken("");
  };

  return (
    <div style={styles.container}>
      {/* Animated Background */}
      <div style={styles.backgroundLayer}>
        <div style={styles.floatingCircle1}></div>
        <div style={styles.floatingCircle2}></div>
        <div style={styles.floatingCircle3}></div>
        <div style={styles.gradientOverlay}></div>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div style={styles.modalOverlay} onClick={closeResetModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Reset Password</h3>
              <button style={styles.closeButton} onClick={closeResetModal} aria-label="Close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {resetStep === 1 && (
              <>
                <p style={styles.modalDescription}>
                  Enter your email address and we'll send you a reset code.
                </p>
                <div style={styles.modalForm}>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@example.com"
                    style={styles.input}
                    autoComplete="email"
                  />
                  <button
                    onClick={handleRequestReset}
                    disabled={resetLoading}
                    style={{
                      ...styles.submitButton,
                      opacity: resetLoading ? 0.7 : 1,
                      cursor: resetLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {resetLoading ? (
                      <>
                        <span style={styles.spinner}></span>
                        <span>Sending...</span>
                      </>
                    ) : (
                      "Send Reset Code"
                    )}
                  </button>
                </div>
              </>
            )}

            {resetStep === 2 && (
              <>
                <p style={styles.modalDescription}>
                  Enter the 6-digit reset code we sent to <strong>{resetEmail}</strong>
                </p>
                
                {generatedToken && (
                  <div style={styles.devToken}>
                    <strong>Development Mode - Your reset code:</strong>
                    <div style={styles.tokenDisplay}>{generatedToken}</div>
                  </div>
                )}
                
                <div style={styles.modalForm}>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength="6"
                    style={styles.input}
                    autoComplete="one-time-code"
                  />
                  <button
                    onClick={handleVerifyToken}
                    disabled={resetLoading}
                    style={{
                      ...styles.submitButton,
                      opacity: resetLoading ? 0.7 : 1,
                      cursor: resetLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {resetLoading ? (
                      <>
                        <span style={styles.spinner}></span>
                        <span>Verifying...</span>
                      </>
                    ) : (
                      "Verify Code"
                    )}
                  </button>
                  <button
                    onClick={() => setResetStep(1)}
                    style={styles.backButton}
                    type="button"
                  >
                    Back
                  </button>
                </div>
              </>
            )}

            {resetStep === 3 && (
              <>
                <p style={styles.modalDescription}>
                  Create your new password
                </p>
                <div style={styles.modalForm}>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min. 6 characters)"
                    style={styles.input}
                    autoComplete="new-password"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    style={styles.input}
                    autoComplete="new-password"
                  />
                  <button
                    onClick={handleResetPassword}
                    disabled={resetLoading}
                    style={{
                      ...styles.submitButton,
                      opacity: resetLoading ? 0.7 : 1,
                      cursor: resetLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {resetLoading ? (
                      <>
                        <span style={styles.spinner}></span>
                        <span>Resetting...</span>
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Left Panel */}
      <div style={styles.leftPanel}>
        <div style={styles.brandSection}>
          <div style={styles.logoContainer}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path
                d="M12 12L20 20L28 12M12 20L20 28L28 20"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 style={styles.brandName}>TutorAI</h1>
          <p style={styles.brandTagline}>
            Advanced AI-powered Master of Agriculture learning platform
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div style={styles.rightPanel}>
        <div style={styles.formContainer}>
          <div style={styles.header}>
            <h2 style={styles.title}>Welcome back</h2>
            <p style={styles.subtitle}>
              Sign in to continue your learning journey
            </p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label} htmlFor="email">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={styles.labelIcon}>
                  <rect x="2" y="4" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M2 6L8 9L14 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                style={styles.input}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </div>

            <div style={styles.inputGroup}>
              <div style={styles.labelRow}>
                <label style={styles.label} htmlFor="password">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={styles.labelIcon}>
                    <rect x="3" y="6" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M5 6V4C5 2.34 6.34 1 8 1C9.66 1 11 2.34 11 4V6"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Password
                </label>
                <button
                  type="button"
                  style={styles.forgotLink}
                  onClick={() => setShowResetModal(true)}
                >
                  Forgot password?
                </button>
              </div>
              <div style={styles.passwordWrapper}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  style={styles.input}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M2 10C2 10 5 4 10 4C15 4 18 10 18 10C18 10 15 16 10 16C5 16 2 10 2 10Z"
                        stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M3 3L17 17M10 7C11.66 7 13 8.34 13 10C13 10.34 12.94 10.66 12.84 10.97M10 13C8.34 13 7 11.66 7 10C7 9.66 7.06 9.34 7.16 9.03M2 10C2.93 8.31 4.38 6.93 6.13 6.13M18 10C17.07 11.69 15.62 13.07 13.87 13.87"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitButton,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <>
                  <span style={styles.spinner}></span>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 9H15M15 9L10 4M15 9L10 14"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          <div style={styles.divider}>
            <div style={styles.dividerLine}></div>
            <span style={styles.dividerText}>or</span>
            <div style={styles.dividerLine}></div>
          </div>

          <div style={styles.footer}>
            <span style={styles.footerText}>Don't have an account?</span>
            <Link to="/register" style={styles.footerLink}>
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  backgroundLayer: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    pointerEvents: "none",
  },
  gradientOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(135deg, rgba(21, 60, 48, 0.03) 0%, rgba(45, 122, 95, 0.05) 100%)",
  },
  floatingCircle1: {
    position: "absolute",
    width: "550px",
    height: "550px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(21, 60, 48, 0.15) 0%, rgba(21, 60, 48, 0) 70%)",
    top: "-180px",
    right: "-180px",
    animation: "float 22s ease-in-out infinite",
  },
  floatingCircle2: {
    position: "absolute",
    width: "420px",
    height: "420px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(45, 122, 95, 0.1) 0%, rgba(45, 122, 95, 0) 70%)",
    bottom: "-120px",
    left: "-120px",
    animation: "float 18s ease-in-out infinite 5s",
  },
  floatingCircle3: {
    position: "absolute",
    width: "320px",
    height: "320px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(21, 60, 48, 0.08) 0%, rgba(21, 60, 48, 0) 70%)",
    top: "50%",
    left: "40%",
    animation: "float 28s ease-in-out infinite 10s",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(4px)",
    padding: "20px",
  },
  modalContent: {
    background: "white",
    borderRadius: "16px",
    padding: "32px",
    maxWidth: "440px",
    width: "100%",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  modalTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#153C30",
    margin: 0,
  },
  closeButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#94A3B8",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    transition: "color 0.2s",
  },
  modalDescription: {
    fontSize: "15px",
    color: "#64748B",
    marginBottom: "24px",
    lineHeight: "1.6",
  },
  modalForm: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  devToken: {
    background: "rgba(251, 191, 36, 0.1)",
    border: "1px solid rgba(251, 191, 36, 0.3)",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "16px",
    fontSize: "14px",
    color: "#92400E",
  },
  tokenDisplay: {
    fontSize: "28px",
    fontWeight: "700",
    letterSpacing: "4px",
    textAlign: "center",
    marginTop: "8px",
    color: "#153C30",
  },
  backButton: {
    padding: "12px",
    background: "#F8FAFB",
    color: "#153C30",
    border: "1px solid #E5E7EB",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  leftPanel: {
    flex: "0 0 48%",
    background: "linear-gradient(135deg, #153C30 0%, #1A4D3C 50%, #2D7A5F 100%)",
    padding: "60px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    position: "relative",
    zIndex: 1,
  },
  brandSection: {
    marginBottom: "32px",
  },
  logoContainer: {
    width: "68px",
    height: "68px",
    background: "rgba(255, 255, 255, 0.1)",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },
  brandName: {
    fontSize: "42px",
    fontWeight: "800",
    color: "white",
    marginBottom: "12px",
    letterSpacing: "-0.03em",
  },
  brandTagline: {
    fontSize: "17px",
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: "1.7",
    maxWidth: "400px",
  },
  rightPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "60px",
    background: "#FAFBFC",
    position: "relative",
    zIndex: 1,
  },
  formContainer: {
    maxWidth: "440px",
    width: "100%",
    margin: "0 auto",
  },
  header: {
    marginBottom: "36px",
  },
  title: {
    fontSize: "34px",
    fontWeight: "800",
    color: "#153C30",
    marginBottom: "8px",
    letterSpacing: "-0.03em",
  },
  subtitle: {
    fontSize: "16px",
    color: "#64748B",
    lineHeight: "1.6",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#153C30",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  labelIcon: {
    opacity: 0.7,
  },
  forgotLink: {
    fontSize: "14px",
    color: "#2D7A5F",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
    transition: "color 0.2s",
  },
  input: {
    width: "100%",
    padding: "13px 16px",
    fontSize: "15px",
    border: "2px solid #E5E7EB",
    borderRadius: "10px",
    outline: "none",
    transition: "all 0.2s",
    color: "#1E293B",
    background: "white",
    boxSizing: "border-box",
  },
  passwordWrapper: {
    position: "relative",
  },
  eyeButton: {
    position: "absolute",
    right: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#94A3B8",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    transition: "color 0.2s",
  },
  submitButton: {
    padding: "15px",
    background: "linear-gradient(135deg, #153C30 0%, #2D7A5F 100%)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.3s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginTop: "8px",
    boxShadow: "0 4px 12px rgba(21, 60, 48, 0.2)",
  },
  spinner: {
    width: "18px",
    height: "18px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderTop: "2px solid white",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    margin: "28px 0",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "#E5E7EB",
  },
  dividerText: {
    fontSize: "14px",
    color: "#94A3B8",
    fontWeight: "500",
  },
  footer: {
    textAlign: "center",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  footerText: {
    fontSize: "15px",
    color: "#64748B",
  },
  footerLink: {
    fontSize: "15px",
    color: "#2D7A5F",
    textDecoration: "none",
    fontWeight: "700",
    transition: "color 0.2s",
  },
};

// CSS Animations & Media Queries
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0px) translateX(0px); }
      33% { transform: translateY(-30px) translateX(20px); }
      66% { transform: translateY(20px) translateX(-20px); }
    }
    
    input:focus {
      border-color: #153C30 !important;
      box-shadow: 0 0 0 3px rgba(21, 60, 48, 0.1) !important;
    }
    
    button:hover:not(:disabled) {
      transform: translateY(-2px);
    }
    
    [style*="submitButton"]:hover:not(:disabled) {
      box-shadow: 0 8px 20px rgba(21, 60, 48, 0.3) !important;
    }
    
    [style*="forgotLink"]:hover {
      color: #153C30 !important;
    }
    
    [style*="eyeButton"]:hover {
      color: #153C30 !important;
    }
    
    [style*="footerLink"]:hover {
      color: #153C30 !important;
      text-decoration: underline !important;
    }

    [style*="closeButton"]:hover {
      color: #153C30 !important;
    }
    
    [style*="backButton"]:hover {
      background: #E5E7EB !important;
    }
    
    /* Tablet */
    @media (max-width: 1024px) {
      [style*="leftPanel"] {
        display: none !important;
      }
      [style*="rightPanel"] {
        flex: 1 !important;
        padding: 40px 32px !important;
      }
      [style*="container"] {
        flex-direction: column !important;
      }
    }
    
    /* Mobile Large */
    @media (max-width: 640px) {
      [style*="rightPanel"] {
        padding: 32px 20px !important;
      }
      [style*="formContainer"] {
        padding: 0 !important;
      }
      [style*="title"] {
        font-size: 28px !important;
      }
      [style*="subtitle"] {
        font-size: 14px !important;
      }
      [style*="modalContent"] {
        padding: 24px 20px !important;
        margin: 10px !important;
      }
      [style*="modalTitle"] {
        font-size: 20px !important;
      }
      [style*="brandName"] {
        font-size: 36px !important;
      }
      [style*="input"] {
        font-size: 16px !important;
      }
      [style*="submitButton"] {
        font-size: 15px !important;
        padding: 14px !important;
      }
    }
    
    /* Mobile Small */
    @media (max-width: 380px) {
      [style*="rightPanel"] {
        padding: 24px 16px !important;
      }
      [style*="title"] {
        font-size: 24px !important;
      }
      [style*="header"] {
        margin-bottom: 24px !important;
      }
      [style*="form"] {
        gap: 16px !important;
      }
      [style*="modalContent"] {
        padding: 20px 16px !important;
      }
      [style*="tokenDisplay"] {
        font-size: 24px !important;
        letter-spacing: 2px !important;
      }
      [style*="footerText"], [style*="footerLink"] {
        font-size: 14px !important;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}
