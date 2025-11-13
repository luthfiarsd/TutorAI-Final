import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { authAPI } from "../lib/api";
import { saveAuth } from "../utils/auth";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi client-side
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!formData.name || !formData.email) {
      toast.error("Please fill in all fields");
      return;
    }

    // Validasi email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      // Siapkan data untuk register (exclude confirmPassword)
      const { confirmPassword, ...registerData } = formData;
      
      console.log("Sending register request:", registerData);
      
      const response = await authAPI.register(registerData);
      console.log("Register response:", response);
      
      const { user, token } = response.data.data;

      // Save authentication data
      saveAuth(user, token);
      toast.success("Registration successful! Welcome to TutorAI.");

      // Navigate based on user role
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/home");
      }
    } catch (error) {
      console.error("Register error details:", error);
      
      if (error.response) {
        // Server responded with error status
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
        
        if (error.response.status === 400) {
          toast.error(error.response.data?.message || "Invalid registration data");
        } else if (error.response.status === 409) {
          toast.error("Email already exists. Please use a different email.");
        } else if (error.response.status === 500) {
          toast.error("Server error. Please try again later.");
        } else {
          toast.error(error.response.data?.message || "Registration failed");
        }
      } else if (error.request) {
        // Request was made but no response received
        console.error("No response received:", error.request);
        toast.error("Network error. Please check your connection.");
      } else {
        // Something else happened
        toast.error(error.message || "An unexpected error occurred");
      }
    } finally {
      setLoading(false);
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
            Join thousands of students learning smarter with AI-powered education
          </p>
        </div>

        <div style={styles.benefitsList}>
          <div style={styles.benefitItem}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16 6L7.5 14.5L4 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Personalized AI Learning Assistant</span>
          </div>
          <div style={styles.benefitItem}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16 6L7.5 14.5L4 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Unlimited Questions & Answers</span>
          </div>
          <div style={styles.benefitItem}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16 6L7.5 14.5L4 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Document-Based Learning Resources</span>
          </div>
          <div style={styles.benefitItem}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16 6L7.5 14.5L4 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Multi-Language Support (ID & EN)</span>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={styles.rightPanel}>
        <div style={styles.formWrapper}>
          <div style={styles.header}>
            <h2 style={styles.title}>Create your account</h2>
            <p style={styles.subtitle}>
              Start your personalized learning journey today
            </p>
          </div>

          <form onSubmit={handleSubmit} style={styles.formArea}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={styles.labelIcon}>
                  <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M2 13C2 11 4 9 8 9C12 9 14 11 14 13"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                style={styles.input}
                placeholder="John Doe"
                autoComplete="name"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={styles.labelIcon}>
                  <rect x="2" y="4" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M2 6L8 9L14 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
              <label style={styles.label}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={styles.labelIcon}>
                  <rect x="3" y="6" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5 6V4C5 2.34 6.34 1 8 1C9.66 1 11 2.34 11 4V6"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Password
              </label>
              <div style={styles.passwordWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  style={styles.input}
                  placeholder="Create a secure password"
                  autoComplete="new-password"
                  minLength="6"
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
              <p style={styles.hint}>Minimum 6 characters</p>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={styles.labelIcon}>
                  <path d="M8 2L11 6L8 10M5 8L8 12L11 8"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Confirm Password
              </label>
              <div style={styles.passwordWrapper}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  style={styles.input}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
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
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 3V15M3 9H15"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
            <span style={styles.footerText}>Already have an account?</span>
            <Link to="/login" style={styles.footerLink}>
              Sign in
            </Link>
          </div>
        </div>

        <div style={styles.legal}>
          By creating an account, you agree to our{" "}
          <a href="#" style={styles.legalLink}>Terms of Service</a>
          {" "}and{" "}
          <a href="#" style={styles.legalLink}>Privacy Policy</a>
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
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
    background: "radial-gradient(circle, rgba(21, 60, 48, 0.12) 0%, rgba(21, 60, 48, 0) 70%)",
    top: "-180px",
    right: "-180px",
    animation: "float 22s ease-in-out infinite",
  },
  floatingCircle2: {
    position: "absolute",
    width: "420px",
    height: "420px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(45, 122, 95, 0.09) 0%, rgba(45, 122, 95, 0) 70%)",
    bottom: "-120px",
    left: "-120px",
    animation: "float 18s ease-in-out infinite 5s",
  },
  floatingCircle3: {
    position: "absolute",
    width: "320px",
    height: "320px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(21, 60, 48, 0.07) 0%, rgba(21, 60, 48, 0) 70%)",
    top: "45%",
    left: "35%",
    animation: "float 28s ease-in-out infinite 10s",
  },
  leftPanel: {
    flex: "0 0 48%",
    background: "linear-gradient(135deg, #153C30 0%, #1A4D3C 50%, #2D7A5F 100%)",
    padding: "60px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
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
    lineHeight: "1.6",
    maxWidth: "400px",
  },
  benefitsList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  benefitItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: "15px",
    fontWeight: "500",
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
  formWrapper: {
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
  formArea: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
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
  hint: {
    fontSize: "13px",
    color: "#94A3B8",
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
  legal: {
    marginTop: "40px",
    textAlign: "center",
    fontSize: "13px",
    color: "#94A3B8",
    lineHeight: "1.7",
  },
  legalLink: {
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
    
    [style*="eyeButton"]:hover {
      color: #153C30 !important;
    }
    
    [style*="footerLink"]:hover {
      color: #153C30 !important;
      text-decoration: underline !important;
    }
    
    [style*="legalLink"]:hover {
      color: #2D7A5F !important;
      text-decoration: underline !important;
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
      [style*="formWrapper"] {
        padding: 0 !important;
      }
      [style*="title"] {
        font-size: 28px !important;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}