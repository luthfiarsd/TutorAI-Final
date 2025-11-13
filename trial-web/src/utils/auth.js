// Get user from localStorage
export const getUser = () => {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
};

// Get token from localStorage
export const getToken = () => {
  return localStorage.getItem("token");
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getToken();
};

// Check if user is admin
export const isAdmin = () => {
  const user = getUser();
  return user?.role === "admin";
};

// Save auth data to localStorage
export const saveAuth = (user, token) => {
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("token", token);
};

// Clear auth data from localStorage
export const clearAuth = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};