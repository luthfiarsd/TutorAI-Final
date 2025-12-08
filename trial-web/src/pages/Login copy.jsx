import { useState } from "react";

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

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
      // Actual API call implementation
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Invalid credentials');
      }

      const data = await response.json();
      const { user, token } = data.data;

      // Save authentication data
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);

      // Navigate based on user role
      if (user.role === "admin") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/home";
      }
    } catch (error) {
      console.error("Login error:", error);
      alert(error.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!resetEmail) {
      alert("Please enter your email address");
      return;
    }

    setResetLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send reset email');
      }

      alert("Password reset link has been sent to your email!");
      setShowResetModal(false);
      setResetEmail("");
    } catch (error) {
      console.error("Reset password error:", error);
      alert(error.message || "Failed to send reset email. Please try again.");
    } finally {
      setResetLoading(false);
    }
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
        <div style={styles.modalOverlay} onClick={() => setShowResetModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Reset Password</h3>
              <button
                style={styles.closeButton}
                onClick={() => setShowResetModal(false)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <p style={styles.modalDescription}>
              Enter your email address and we'll send you a link to reset your password.
            </p>
            <div style={styles.modalForm}>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="name@example.com"
                style={styles.input}
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
                    <span>Sending...</span>
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Panel */}
      <div style={styles.leftPanel}>
        <div style={styles.brandSection}>
          <div style={styles.logoMark}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path
                d="M14 14L24 24L34 14M14 24L24 34L34 24"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 style={styles.brandName}>TutorAI</h1>
          <p style={styles.brandTagline}>
            Advanced AI-powered learning platform designed for the next generation of learners
          </p>
        </div>

        <div style={styles.featuresList}>
          <div style={styles.featureItem}>
            <div style={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div style={styles.featureTitle}>AI-Powered Insights</div>
              <div style={styles.featureDesc}>Get personalized learning recommendations</div>
            </div>
          </div>

          <div style={styles.featureItem}>
            <div style={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                  stroke="white" strokeWidth="2"/>
                <path d="M12 6V12L16 14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={styles.featureTitle}>24/7 Availability</div>
              <div style={styles.featureDesc}>Learn anytime, anywhere at your pace</div>
            </div>
          </div>

          <div style={styles.featureItem}>
            <div style={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 19H20M4 15H20M4 11H20M4 7H12"
                  stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={styles.featureTitle}>Document-Based Learning</div>
              <div style={styles.featureDesc}>Access curated educational materials</div>
            </div>
          </div>
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

          <div style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={styles.labelIcon}>
                  <path d="M2 4H14M2 8H14M2 12H14"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Email Address
              </label>
              <input
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
                <label style={styles.label}>
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
              onClick={handleSubmit}
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
          </div>

          <div style={styles.divider}>
            <div style={styles.dividerLine}></div>
            <span style={styles.dividerText}>or</span>
            <div style={styles.dividerLine}></div>
          </div>

          <div style={styles.footer}>
            <span style={styles.footerText}>Don't have an account?</span>
            <a href="/register" style={styles.footerLink}>
              Create account
            </a>
          </div>
        </div>

        <div style={styles.bottomNote}>
          <p style={styles.noteText}>
            By signing in, you agree to our{" "}
            <a href="#" style={styles.noteLink}>Terms of Service</a>
            {" "}and{" "}
            <a href="#" style={styles.noteLink}>Privacy Policy</a>
          </p>
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
    width: "600px",
    height: "600px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(21, 60, 48, 0.15) 0%, rgba(21, 60, 48, 0) 70%)",
    top: "-200px",
    right: "-200px",
    animation: "float 25s ease-in-out infinite",
  },
  floatingCircle2: {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(45, 122, 95, 0.1) 0%, rgba(45, 122, 95, 0) 70%)",
    bottom: "-100px",
    left: "-100px",
    animation: "float 20s ease-in-out infinite 5s",
  },
  floatingCircle3: {
    position: "absolute",
    width: "350px",
    height: "350px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(21, 60, 48, 0.08) 0%, rgba(21, 60, 48, 0) 70%)",
    top: "50%",
    left: "40%",
    animation: "float 30s ease-in-out infinite 10s",
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
  },
  modalContent: {
    background: "white",
    borderRadius: "16px",
    padding: "32px",
    maxWidth: "440px",
    width: "90%",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
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
  leftPanel: {
    flex: "0 0 50%",
    background: "linear-gradient(135deg, #153C30 0%, #1A4D3C 50%, #2D7A5F 100%)",
    padding: "60px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
    zIndex: 1,
  },
  brandSection: {
    marginBottom: "40px",
  },
  logoMark: {
    width: "80px",
    height: "80px",
    background: "rgba(255, 255, 255, 0.1)",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "24px",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },
  brandName: {
    fontSize: "48px",
    fontWeight: "800",
    color: "white",
    marginBottom: "16px",
    letterSpacing: "-0.03em",
  },
  brandTagline: {
    fontSize: "18px",
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: "1.7",
    maxWidth: "450px",
  },
  featuresList: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    marginBottom: "40px",
  },
  featureItem: {
    display: "flex",
    gap: "16px",
    alignItems: "flex-start",
  },
  featureIcon: {
    width: "48px",
    height: "48px",
    background: "rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backdropFilter: "blur(10px)",
  },
  featureTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "white",
    marginBottom: "4px",
  },
  featureDesc: {
    fontSize: "14px",
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: "1.5",
  },
  testimonial: {
    background: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(10px)",
    padding: "32px",
    borderRadius: "16px",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },
  quoteIcon: {
    marginBottom: "16px",
  },
  quote: {
    fontSize: "16px",
    color: "rgba(255, 255, 255, 0.95)",
    lineHeight: "1.7",
    marginBottom: "24px",
    fontStyle: "italic",
  },
  author: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  authorAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontSize: "16px",
    fontWeight: "700",
    border: "2px solid rgba(255, 255, 255, 0.3)",
  },
  authorName: {
    fontSize: "15px",
    fontWeight: "600",
    color: "white",
    marginBottom: "2px",
  },
  authorTitle: {
    fontSize: "13px",
    color: "rgba(255, 255, 255, 0.7)",
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
    marginBottom: "40px",
  },
  title: {
    fontSize: "36px",
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
    gap: "24px",
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
    padding: "14px 16px",
    fontSize: "15px",
    border: "2px solid #E5E7EB",
    borderRadius: "10px",
    outline: "none",
    transition: "all 0.2s",
    color: "#1E293B",
    background: "white",
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
    padding: "16px",
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
    margin: "32px 0",
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
  bottomNote: {
    marginTop: "48px",
    textAlign: "center",
  },
  noteText: {
    fontSize: "13px",
    color: "#94A3B8",
    lineHeight: "1.6",
  },
  noteLink: {
    color: "#153C30",
    textDecoration: "none",
    fontWeight: "600",
    transition: "color 0.2s",
  },
};

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
    
    [style*="noteLink"]:hover {
      color: #2D7A5F !important;
      text-decoration: underline !important;
    }

    [style*="closeButton"]:hover {
      color: #153C30 !important;
    }
    
    @media (max-width: 1024px) {
      [style*="leftPanel"] {
        display: none !important;
      }
      [style*="rightPanel"] {
        flex: 1 !important;
        padding: 40px 24px !important;
      }
    }
    
    @media (max-width: 480px) {
      [style*="formContainer"] {
        padding: 0 !important;
      }
      [style*="title"] {
        font-size: 28px !important;
      }
      [style*="modalContent"] {
        padding: 24px !important;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}