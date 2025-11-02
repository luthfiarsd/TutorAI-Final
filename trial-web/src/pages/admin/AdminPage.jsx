import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { adminStatsAPI } from "../../lib/api";
import { clearAuth } from "../../utils/auth";

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

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.logo}>TutorAI Admin</h1>
        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </div>

      <div style={styles.content}>
        <div style={styles.nav}>
          <Link to="/admin" style={styles.navItemActive}>
            Dashboard
          </Link>
          <Link to="/admin/users" style={styles.navItem}>
            Users
          </Link>
          <Link to="/admin/documents" style={styles.navItem}>
            Documents
          </Link>
          <Link to="/admin/chats" style={styles.navItem}>
            Chats
          </Link>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Users</div>
            <div style={styles.statValue}>{stats?.total_users || 0}</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>Active Users</div>
            <div style={styles.statValue}>{stats?.active_users || 0}</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Chats</div>
            <div style={styles.statValue}>{stats?.total_chats || 0}</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>Chats Today</div>
            <div style={styles.statValue}>{stats?.chats_today || 0}</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Documents</div>
            <div style={styles.statValue}>{stats?.total_documents || 0}</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>Indexed Docs</div>
            <div style={styles.statValue}>
              {stats?.completed_documents || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f5f5f5",
  },
  header: {
    background: "white",
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  logo: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#4f46e5",
  },
  logoutButton: {
    padding: "8px 16px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  content: {
    padding: "24px",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
  },
  nav: {
    display: "flex",
    gap: "8px",
    marginBottom: "24px",
    background: "white",
    padding: "16px",
    borderRadius: "12px",
  },
  navItem: {
    padding: "12px 24px",
    borderRadius: "8px",
    textDecoration: "none",
    color: "#666",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
  navItemActive: {
    padding: "12px 24px",
    borderRadius: "8px",
    textDecoration: "none",
    color: "white",
    fontSize: "14px",
    fontWeight: "500",
    background: "#4f46e5",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "20px",
  },
  statCard: {
    background: "white",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  statLabel: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "12px",
    fontWeight: "500",
  },
  statValue: {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#333",
  },
};
