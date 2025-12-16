import { useState, useEffect } from "react";
import { adminUsersAPI } from "../../lib/api";
import AdminLayout from "../../components/AdminLayout";
import CustomSelect from "../../components/CustomSelect";
import "./AdminUsers.css";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [currentPage, roleFilter, statusFilter, searchTerm]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit,
        search: searchTerm || undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        is_active:
          statusFilter !== "all" ? statusFilter === "active" : undefined,
      };

      const response = await adminUsersAPI.getUsers(params);
      console.log("API Response:", response.data); // Debug log
      
      setUsers(response.data.data.users || []);
      setTotalPages(
        Math.ceil((response.data.data.pagination.total || 0) / limit)
      );
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
      console.error("Load users error:", err);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user) => {
    console.log("Opening edit modal for user:", user); // Debug log
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setShowEditModal(false);
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setUserToDelete(null);
    setShowDeleteModal(false);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      setIsSubmitting(true);
      
      // Prepare data sesuai dengan struktur database
      const updateData = {
        name: editingUser.name, 
        email: editingUser.email,
        role: editingUser.role,
        is_active: editingUser.is_active,
      };

      console.log("Updating user with data:", updateData); // Debug log
      
      const response = await adminUsersAPI.updateUser(editingUser.id, updateData);
      console.log("Update response:", response); // Debug log

      // Reload users after successful update
      await loadUsers();
      closeEditModal();
      
      // Show success message
      setError(null);
      alert("✅ User updated successfully!");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to update user";
      setError(errorMsg);
      alert("❌ " + errorMsg);
      console.error("Update error:", err.response || err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsSubmitting(true);
      console.log("Deleting user:", userToDelete.id); // Debug log
      
      const response = await adminUsersAPI.deleteUser(userToDelete.id);
      console.log("Delete response:", response); // Debug log

      // Reload users after successful delete
      await loadUsers();
      closeDeleteModal();
      
      setError(null);
      alert("✅ User deleted successfully!");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to delete user";
      setError(errorMsg);
      alert("❌ " + errorMsg);
      console.error("Delete error:", err.response || err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditChange = (field, value) => {
    setEditingUser((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <AdminLayout title="User Management">
      <div style={styles.filterContainer}>
        <input
          type="text"
          placeholder="Search by name or email here"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={styles.searchInput}
        />

        <CustomSelect
          value={roleFilter}
          onChange={(val) => {
            setRoleFilter(val);
            setCurrentPage(1);
          }}
          options={[
            { value: "all", label: "All Roles" },
            { value: "user", label: "User" },
            { value: "admin", label: "Admin" },
          ]}
        />

        <CustomSelect
          value={statusFilter}
          onChange={(val) => {
            setStatusFilter(val);
            setCurrentPage(1);
          }}
          options={[
            { value: "all", label: "All Status" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />

        <button style={styles.refreshButton} onClick={loadUsers}>
         Refresh
        </button>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>Loading users...</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.tableHeader}>Name</th>
                  <th style={styles.tableHeader}>Email</th>
                  <th style={styles.tableHeader}>Role</th>
                  <th style={styles.tableHeader}>Status</th>
                  <th style={styles.tableHeader}>Joined</th>
                  <th style={styles.tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      style={{ textAlign: "center", padding: "40px" }}
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>{user.name || "N/A"}</td>
                      <td style={styles.tableCell}>{user.email}</td>
                      <td style={styles.tableCell}>
                        <span
                          style={{
                            ...styles.badge,
                            background:
                              user.role === "admin" ? "#eaf5f0" : "#f5f5f5",
                            color: user.role === "admin" ? "#153C30" : "#666",
                          }}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span
                          style={{
                            ...styles.badge,
                            background: user.is_active ? "#d8f3dc" : "#ffe3e3",
                            color: user.is_active ? "#1b4332" : "#c1121f",
                          }}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td style={styles.tableCell}>
                        <button
                          style={styles.editButton}
                          onClick={() => openEditModal(user)}
                        >
                          Edit
                        </button>
                        <button
                          style={styles.deleteButton}
                          onClick={() => openDeleteModal(user)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.paginationContainer}>
              <button
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === 1 ? styles.paginationButtonDisabled : {}),
                }}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>

              <span style={styles.paginationInfo}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === totalPages
                    ? styles.paginationButtonDisabled
                    : {}),
                }}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div style={styles.modalOverlay} onClick={closeEditModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>✏️ Edit User</h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>Name *</label>
              <input
                type="text"
                value={editingUser.name || ""}
                onChange={(e) => handleEditChange("name", e.target.value)}
                style={styles.input}
                placeholder="Enter full name"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email *</label>
              <input
                type="email"
                value={editingUser.email || ""}
                onChange={(e) => handleEditChange("email", e.target.value)}
                style={styles.input}
                placeholder="Enter email address"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Role *</label>
              <select
                value={editingUser.role || "user"}
                onChange={(e) => handleEditChange("role", e.target.value)}
                style={styles.select}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Status *</label>
              <select
                value={editingUser.is_active ? "active" : "inactive"}
                onChange={(e) =>
                  handleEditChange("is_active", e.target.value === "active")
                }
                style={styles.select}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div style={styles.infoBox}>
              <p style={styles.infoText}>
                <strong>User ID:</strong> {editingUser.id}
              </p>
              <p style={styles.infoText}>
                <strong>Created:</strong>{" "}
                {new Date(editingUser.created_at).toLocaleString()}
              </p>
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={closeEditModal}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                style={styles.saveButton}
                onClick={handleUpdateUser}
                disabled={isSubmitting || !editingUser.name || !editingUser.email}
              >
                {isSubmitting ? "⏳ Saving..." : "💾 Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div style={styles.modalOverlay} onClick={closeDeleteModal}>
          <div
            style={styles.modalContentSmall}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={styles.modalTitle}>⚠️ Confirm Delete</h2>
            <p style={styles.deleteMessage}>
              Are you sure you want to delete user{" "}
              <strong>{userToDelete.name || userToDelete.email}</strong>?
            </p>
            <p style={styles.deleteWarning}>
              ⚠️ This action cannot be undone. All user data will be permanently removed.
            </p>

            <div style={styles.infoBox}>
              <p style={styles.infoText}>
                <strong>Email:</strong> {userToDelete.email}
              </p>
              <p style={styles.infoText}>
                <strong>Role:</strong> {userToDelete.role}
              </p>
              <p style={styles.infoText}>
                <strong>Status:</strong>{" "}
                {userToDelete.is_active ? "Active" : "Inactive"}
              </p>
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={closeDeleteModal}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                style={styles.deleteConfirmButton}
                onClick={handleDeleteUser}
                disabled={isSubmitting}
              >
                {isSubmitting ? "⏳ Deleting..." : "🗑️ Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// Inline Styles
const styles = {
  filterContainer: {
    display: "flex",
    gap: "15px",
    marginBottom: "20px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  searchInput: {
    flex: "0 1 860px",
    padding: "10px 14px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    fontSize: "14px",
  },
  refreshButton: {
  background: "linear-gradient(135deg, #153C30, #2D7A5F)",
  color: "#fff",
  padding: "10px 20px",
  borderRadius: "12px",
  border: "none",
  cursor: "pointer",
  transition: "transform 0.3s ease",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "white",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    borderRadius: "10px",
    overflow: "hidden",
  },
  tableHeaderRow: {
    background: "#153C30",
    color: "#fff",
  },
  tableHeader: {
    padding: "12px",
    textAlign: "left",
    fontWeight: "600",
    fontSize: "14px",
  },
  tableRow: {
    borderBottom: "1px solid #f0f0f0",
    transition: "background 0.2s",
  },
  tableCell: {
    padding: "12px",
    fontSize: "14px",
    color: "#333",
  },
  badge: {
    padding: "5px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "500",
    display: "inline-block",
  },
  editButton: {
    padding: "6px 12px",
    background: "#e0f2e9",
    color: "#153C30",
    border: "1px solid #c8e6c9",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    marginRight: "6px",
    transition: "all 0.2s",
  },
  deleteButton: {
    padding: "6px 12px",
    background: "#ffebee",
    color: "#c62828",
    border: "1px solid #ffcdd2",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    transition: "all 0.2s",
  },
  errorBox: {
    padding: "15px",
    background: "#fee",
    color: "#c33",
    borderRadius: "6px",
    marginBottom: "20px",
    border: "1px solid #fcc",
  },
  paginationContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "20px",
    marginTop: "30px",
    padding: "20px",
  },
  paginationButton: {
    padding: "10px 20px",
    background: "#153C30",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px",
    transition: "background 0.2s",
  },
  paginationButtonDisabled: {
    background: "#ccc",
    cursor: "not-allowed",
    opacity: 0.6,
  },
  paginationInfo: {
    fontSize: "14px",
    color: "#333",
    fontWeight: "500",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    backdropFilter: "blur(4px)",
  },
  modalContent: {
    background: "white",
    padding: "30px",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "500px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  modalContentSmall: {
    background: "white",
    padding: "30px",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "450px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
  },
  modalTitle: {
    margin: "0 0 20px 0",
    fontSize: "24px",
    color: "#153C30",
    fontWeight: "600",
  },
  formGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box",
    transition: "border 0.2s",
  },
  select: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box",
    cursor: "pointer",
    background: "white",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "25px",
  },
  cancelButton: {
    padding: "10px 20px",
    background: "#f5f5f5",
    color: "#333",
    border: "1px solid #ddd",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px",
    transition: "background 0.2s",
  },
  saveButton: {
    padding: "10px 20px",
    background: "#153C30",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px",
    transition: "background 0.2s",
  },
  deleteConfirmButton: {
    padding: "10px 20px",
    background: "#c62828",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px",
    transition: "background 0.2s",
  },
  deleteMessage: {
    fontSize: "15px",
    color: "#333",
    marginBottom: "10px",
    lineHeight: "1.5",
  },
  deleteWarning: {
    fontSize: "13px",
    color: "#c62828",
    fontWeight: "500",
    marginBottom: "15px",
    padding: "10px",
    background: "#fff3f3",
    borderRadius: "6px",
    border: "1px solid #ffcdd2",
  },
  infoBox: {
    background: "#f9f9f9",
    padding: "12px",
    borderRadius: "8px",
    marginTop: "15px",
    border: "1px solid #e0e0e0",
  },
  infoText: {
    fontSize: "13px",
    color: "#666",
    margin: "5px 0",
  },
};