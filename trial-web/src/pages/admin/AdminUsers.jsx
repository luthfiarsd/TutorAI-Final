import { useState, useEffect } from "react";
import { adminUsersAPI } from "../../lib/api";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Modals
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Load users
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
      setUsers(response.data.users || []);
      setTotalPages(Math.ceil((response.data.total || 0) / limit));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      await adminUsersAPI.updateUser(editingUser.id, {
        role: editingUser.role,
        is_active: editingUser.is_active,
      });
      setShowEditModal(false);
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update user");
    }
  };

  const handleDeleteUser = async () => {
    try {
      await adminUsersAPI.deleteUser(userToDelete.id);
      setShowDeleteModal(false);
      setUserToDelete(null);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete user");
    }
  };

  const openEditModal = (user) => {
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ color: "#333" }}>User Management</h1>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder=" Search by name or email..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            flex: "1",
            minWidth: "200px",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        />

        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        >
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button
          onClick={loadUsers}
          style={{
            padding: "10px 20px",
            background: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: "15px",
            background: "#fee",
            color: "#c33",
            borderRadius: "4px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>Loading users...</p>
        </div>
      ) : (
        <>
          {/* Users Table */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th style={tableHeaderStyle}>Name</th>
                  <th style={tableHeaderStyle}>Email</th>
                  <th style={tableHeaderStyle}>Role</th>
                  <th style={tableHeaderStyle}>Status</th>
                  <th style={tableHeaderStyle}>Joined</th>
                  <th style={tableHeaderStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!users || users.length === 0 ? (
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
                    <tr
                      key={user.id}
                      style={{ borderBottom: "1px solid #eee" }}
                    >
                      <td style={tableCellStyle}>{user.full_name}</td>
                      <td style={tableCellStyle}>{user.email}</td>
                      <td style={tableCellStyle}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            background:
                              user.role === "admin" ? "#e3f2fd" : "#f5f5f5",
                            color: user.role === "admin" ? "#1976d2" : "#666",
                          }}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            background: user.is_active ? "#e8f5e9" : "#ffebee",
                            color: user.is_active ? "#2e7d32" : "#c62828",
                          }}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td style={tableCellStyle}>
                        <button
                          onClick={() => openEditModal(user)}
                          style={{
                            padding: "5px 10px",
                            marginRight: "5px",
                            background: "#2196F3",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          ️ Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          style={{
                            padding: "5px 10px",
                            background: "#f44336",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
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
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "8px 15px",
                  background: currentPage === 1 ? "#ccc" : "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                }}
              >
                ← Previous
              </button>

              <span>
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                style={{
                  padding: "8px 15px",
                  background: currentPage === totalPages ? "#ccc" : "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    currentPage === totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2>Edit User</h2>
            <form onSubmit={handleEditUser}>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>
                  Name: {editingUser.full_name}
                </label>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>
                  Email: {editingUser.email}
                </label>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>
                  Role:
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      role: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <input
                    type="checkbox"
                    checked={editingUser.is_active}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        is_active: e.target.checked,
                      })
                    }
                  />
                  Active
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  style={{
                    padding: "10px 20px",
                    background: "#ccc",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "10px 20px",
                    background: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2>Delete User</h2>
            <p>
              Are you sure you want to delete user{" "}
              <strong>{userToDelete.full_name}</strong>? This action cannot be
              undone.
            </p>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                style={{
                  padding: "10px 20px",
                  background: "#ccc",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                style={{
                  padding: "10px 20px",
                  background: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const tableHeaderStyle = {
  padding: "12px",
  textAlign: "left",
  borderBottom: "2px solid #ddd",
  fontWeight: "600",
};

const tableCellStyle = {
  padding: "12px",
  textAlign: "left",
};

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalContentStyle = {
  background: "white",
  padding: "30px",
  borderRadius: "8px",
  maxWidth: "500px",
  width: "90%",
  maxHeight: "90vh",
  overflow: "auto",
};
