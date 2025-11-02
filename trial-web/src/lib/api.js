import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
};

// Chat API
export const chatAPI = {
  sendMessage: (message) => api.post("/chat", { message }),
  getHistory: (page = 1, limit = 20) =>
    api.get("/chat/history", { params: { page, limit } }),
  getChat: (id) => api.get(`/chat/history/${id}`),
  deleteChat: (id) => api.delete(`/chat/history/${id}`),
  deleteAllChats: () => api.delete("/chat/history"),
};

// Admin - Users API
export const adminUsersAPI = {
  getUsers: (params) => api.get("/admin/users", { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

// Admin - Documents API
export const adminDocumentsAPI = {
  uploadDocument: (formData) =>
    api.post("/admin/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getDocuments: (params) => api.get("/admin/documents", { params }),
  getDocument: (id) => api.get(`/admin/documents/${id}`),
  deleteDocument: (id) => api.delete(`/admin/documents/${id}`),
  reindexDocument: (id) => api.post(`/admin/documents/${id}/reindex`),
  embedDocument: (id) => api.post(`/admin/documents/${id}/embed`),
};

// Admin - Chats API
export const adminChatsAPI = {
  getChats: (params) => api.get("/admin/chats", { params }),
  getChat: (id) => api.get(`/admin/chats/${id}`),
  deleteChat: (id) => api.delete(`/admin/chats/${id}`),
  exportChats: (data) =>
    api.post("/admin/chats/export", data, {
      responseType: "blob",
    }),
};

// Admin - Stats API
export const adminStatsAPI = {
  getStats: () => api.get("/admin/stats"),
  getOverview: () => api.get("/admin/stats/overview"),
};

export default api;
