import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { adminStatsAPI } from "../../lib/api";
import Navbar from "../../components/Navbar";
import AdminNav from "../../components/AdminNav";

export default function AdminPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await adminStatsAPI.getOverview();
      setStats(response.data.data);
    } catch (error) {
      console.error("Load stats error:", error);
      toast.error("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.backgroundLayer}>
          <div style={styles.floatingCircle1}></div>
          <div style={styles.floatingCircle2}></div>
          <div style={styles.floatingCircle3}></div>
          <div style={styles.gradientOverlay}></div>
        </div>
        <Navbar isAdmin={true} />
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Animated Background */}
      <div style={styles.backgroundLayer}>
        <div style={styles.floatingCircle1}></div>
        <div style={styles.floatingCircle2}></div>
        <div style={styles.floatingCircle3}></div>
        <div style={styles.gradientOverlay}></div>
      </div>

      <Navbar isAdmin={true} />
      <AdminNav />

      <div style={styles.content}>
        {/* Welcome Section */}
        <div style={styles.welcomeSection}>
          <div>
            <h1 style={styles.pageTitle}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={styles.titleIcon}>
                <rect width="32" height="32" rx="8" fill="url(#dashboardGradient)" />
                <path d="M10 12H22M10 16H22M10 20H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="dashboardGradient" x1="0" y1="0" x2="32" y2="32">
                    <stop offset="0%" stopColor="#153C30"/>
                    <stop offset="100%" stopColor="#2D7A5F"/>
                  </linearGradient>
                </defs>
              </svg>
              Admin Dashboard
            </h1>
            <p style={styles.welcomeText}>
              Overview of your TutorAI platform performance and metrics
            </p>
          </div>
          <div style={styles.lastUpdated}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="#64748B" strokeWidth="1.5"/>
              <path d="M8 4V8L11 11" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={styles.statsGrid}>
          {/* Total Users Card */}
          <div style={{...styles.statCard, ...styles.statCardPrimary}}>
            <div style={styles.statHeader}>
              <div style={{...styles.statIcon, background: 'linear-gradient(135deg, #153C30 0%, #2D7A5F 100%)'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={styles.statBadge}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 10V2M2 6L6 2L10 6" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Total Users</div>
              <div style={styles.statValue}>{stats?.total_users || 0}</div>
              <div style={styles.statChange}>
                <span style={styles.statChangePositive}>+{stats?.active_users || 0} active</span>
              </div>
            </div>
          </div>

          {/* Active Users Card */}
          <div style={styles.statCard}>
            <div style={styles.statHeader}>
              <div style={{...styles.statIcon, background: 'linear-gradient(135deg, #0891B2 0%, #06B6D4 100%)'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="18" cy="8" r="3" fill="#10B981"/>
                </svg>
              </div>
            </div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Active Users</div>
              <div style={styles.statValue}>{stats?.active_users || 0}</div>
              <div style={styles.statChange}>
                <span style={styles.statChangePositive}>
                  {stats?.total_users ? Math.round((stats.active_users / stats.total_users) * 100) : 0}% of total
                </span>
              </div>
            </div>
          </div>

          {/* Total Chats Card */}
          <div style={styles.statCard}>
            <div style={styles.statHeader}>
              <div style={{...styles.statIcon, background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Total Chats</div>
              <div style={styles.statValue}>{stats?.total_chats || 0}</div>
              <div style={styles.statChange}>
                <span style={styles.statChangeNeutral}>All time conversations</span>
              </div>
            </div>
          </div>

          {/* Chats Today Card */}
          <div style={styles.statCard}>
            <div style={styles.statHeader}>
              <div style={{...styles.statIcon, background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Chats Today</div>
              <div style={styles.statValue}>{stats?.chats_today || 0}</div>
              <div style={styles.statChange}>
                <span style={styles.statChangePositive}>Current activity</span>
              </div>
            </div>
          </div>

          {/* Total Documents Card */}
          <div style={styles.statCard}>
            <div style={styles.statHeader}>
              <div style={{...styles.statIcon, background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12H15M9 16H15M17 21H7C6.46957 21 5.96086 20.7893 5.58579 20.4142C5.21071 20.0391 5 19.5304 5 19V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H12.586C12.8512 3.00006 13.1055 3.10545 13.293 3.293L18.707 8.707C18.8946 8.89449 18.9999 9.14881 19 9.414V19C19 19.5304 18.7893 20.0391 18.4142 20.4142C18.0391 20.7893 17.5304 21 17 21Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Total Documents</div>
              <div style={styles.statValue}>{stats?.total_documents || 0}</div>
              <div style={styles.statChange}>
                <span style={styles.statChangeNeutral}>Knowledge base</span>
              </div>
            </div>
          </div>

          {/* Indexed Docs Card */}
          <div style={styles.statCard}>
            <div style={styles.statHeader}>
              <div style={{...styles.statIcon, background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12H15M9 16H15M17 21H7C6.46957 21 5.96086 20.7893 5.58579 20.4142C5.21071 20.0391 5 19.5304 5 19V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H12.586C12.8512 3.00006 13.1055 3.10545 13.293 3.293L18.707 8.707C18.8946 8.89449 18.9999 9.14881 19 9.414V19C19 19.5304 18.7893 20.0391 18.4142 20.4142C18.0391 20.7893 17.5304 21 17 21Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="18" cy="18" r="4" fill="#10B981"/>
                  <path d="M16.5 18L17.5 19L19.5 17" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Indexed Documents</div>
              <div style={styles.statValue}>{stats?.completed_documents || 0}</div>
              <div style={styles.statChange}>
                <span style={styles.statChangePositive}>
                  {stats?.total_documents ? Math.round((stats.completed_documents / stats.total_documents) * 100) : 0}% complete
                </span>
              </div>
            </div>
          </div>
        </div>

                {/* Quick Actions */}
        <div style={styles.quickActions}>
          <h3 style={styles.sectionTitle}>Quick Actions</h3>
          <div style={styles.actionsGrid}>
            <button 
              style={styles.actionCard}
              onClick={() => handleNavigation("/admin/documents")}
            >
              <div style={styles.actionIcon}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 5V15M5 10H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={styles.actionContent}>
                <div style={styles.actionTitle}>Upload Document</div>
                <div style={styles.actionDesc}>Add new knowledge base</div>
              </div>
            </button>

            <button 
              style={styles.actionCard}
              onClick={() => handleNavigation("/admin/chats")}
            >
              <div style={styles.actionIcon}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M17 17L13 13M15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1C11.866 1 15 4.13401 15 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={styles.actionContent}>
                <div style={styles.actionTitle}>Search Chats</div>
                <div style={styles.actionDesc}>Monitor conversations</div>
              </div>
            </button>

            <button 
              style={styles.actionCard}
              onClick={() => handleNavigation("/admin/chats")}
            >
              <div style={styles.actionIcon}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M14 6V4C14 3.46957 13.7893 2.96086 13.4142 2.58579C13.0391 2.21071 12.5304 2 12 2H4C3.46957 2 2.96086 2.21071 2.58579 2.58579C2.21071 2.96086 2 3.46957 2 4V12C2 12.5304 2.21071 13.0391 2.58579 13.4142C2.96086 13.7893 3.46957 14 4 14H6M8 18H16C16.5304 18 17.0391 17.7893 17.4142 17.4142C17.7893 17.0391 18 16.5304 18 16V8C18 7.46957 17.7893 6.96086 17.4142 6.58579C17.0391 6.21071 16.5304 6 16 6H8C7.46957 6 6.96086 6.21071 6.58579 6.58579C6.21071 6.96086 6 7.46957 6 8V16C6 16.5304 6.21071 17.0391 6.58579 17.4142C6.96086 17.7893 7.46957 18 8 18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={styles.actionContent}>
                <div style={styles.actionTitle}>Export Data</div>
                <div style={styles.actionDesc}>Download reports</div>
              </div>
            </button>

            <button 
              style={styles.actionCard}
              onClick={() => handleNavigation("/admin/users")}
            >
              <div style={styles.actionIcon}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M10 6V10L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={styles.actionContent}>
                <div style={styles.actionTitle}>View Activity</div>
                <div style={styles.actionDesc}>Recent system logs</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#F8FAFB",
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
    background: "linear-gradient(135deg, rgba(21, 60, 48, 0.02) 0%, rgba(45, 122, 95, 0.03) 100%)",
  },
  floatingCircle1: {
    position: "absolute",
    width: "600px",
    height: "600px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(21, 60, 48, 0.08) 0%, rgba(21, 60, 48, 0) 70%)",
    top: "-200px",
    right: "-200px",
    animation: "float 25s ease-in-out infinite",
  },
  floatingCircle2: {
    position: "absolute",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(45, 122, 95, 0.06) 0%, rgba(45, 122, 95, 0) 70%)",
    bottom: "-150px",
    left: "-150px",
    animation: "float 20s ease-in-out infinite 5s",
  },
  floatingCircle3: {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(21, 60, 48, 0.04) 0%, rgba(21, 60, 48, 0) 70%)",
    top: "40%",
    right: "20%",
    animation: "float 30s ease-in-out infinite 10s",
  },
  content: {
    padding: "32px 24px",
    maxWidth: "1400px",
    margin: "0 auto",
    position: "relative",
    zIndex: 1,
  },
  welcomeSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "32px",
    flexWrap: "wrap",
    gap: "16px",
  },
  pageTitle: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#153C30",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  titleIcon: {
    filter: "drop-shadow(0 4px 12px rgba(21, 60, 48, 0.2))",
  },
  welcomeText: {
    fontSize: "16px",
    color: "#64748B",
    fontWeight: "400",
  },
  lastUpdated: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "#64748B",
    background: "white",
    padding: "10px 16px",
    borderRadius: "12px",
    border: "1px solid #E5E7EB",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "60vh",
    gap: "20px",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid rgba(21, 60, 48, 0.1)",
    borderTop: "4px solid #153C30",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    fontSize: "16px",
    color: "#64748B",
    fontWeight: "500",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
    marginBottom: "40px",
  },
  statCard: {
    background: "white",
    borderRadius: "16px",
    border: "1px solid #E5E7EB",
    padding: "24px",
    transition: "all 0.3s ease",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
  },
  statCardPrimary: {
    background: "linear-gradient(135deg, rgba(21, 60, 48, 0.03) 0%, rgba(45, 122, 95, 0.05) 100%)",
    border: "1px solid rgba(21, 60, 48, 0.1)",
  },
  statHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
  },
  statIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  },
  statBadge: {
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    background: "#ECFDF5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statContent: {
    marginTop: "8px",
  },
  statLabel: {
    fontSize: "13px",
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "8px",
  },
  statValue: {
    fontSize: "36px",
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: "8px",
    lineHeight: "1",
  },
  statChange: {
    marginTop: "8px",
  },
  statChangePositive: {
    fontSize: "13px",
    color: "#10B981",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  statChangeNeutral: {
    fontSize: "13px",
    color: "#64748B",
    fontWeight: "500",
  },
  quickActions: {
    marginTop: "40px",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#153C30",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  actionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "16px",
  },
  actionCard: {
    background: "white",
    border: "1px solid #E5E7EB",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    textAlign: "left",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
  },
  actionIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, rgba(21, 60, 48, 0.08) 0%, rgba(45, 122, 95, 0.12) 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#153C30",
    flexShrink: 0,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: "4px",
  },
  actionDesc: {
    fontSize: "13px",
    color: "#64748B",
  },
};

// CSS Animations
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes float {
      0%, 100% { transform: translateY(0px) translateX(0px); }
      33% { transform: translateY(-30px) translateX(20px); }
      66% { transform: translateY(20px) translateX(-20px); }
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    [style*="statCard"]:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(21, 60, 48, 0.12) !important;
      border-color: #153C30 !important;
    }

    [style*="actionCard"]:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(21, 60, 48, 0.1) !important;
      border-color: #153C30 !important;
    }

    [style*="actionCard"]:hover [style*="actionIcon"] {
      background: linear-gradient(135deg, #153C30 0%, #2D7A5F 100%) !important;
      color: white !important;
    }

    @media (max-width: 768px) {
      [style*="statsGrid"] {
        grid-template-columns: 1fr !important;
      }
      
      [style*="actionsGrid"] {
        grid-template-columns: 1fr !important;
      }

      [style*="welcomeSection"] {
        flex-direction: column;
      }

      [style*="pageTitle"] {
        font-size: 24px !important;
      }

      [style*="content"] {
        padding: 20px 16px !important;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}