import axios from 'axios';

// Access environmental variable or default to local Flask dev port
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to append JWT token if it exists in local storage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('finwise_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiry / redirection
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and reload if unauthorized, except on registration/login pages
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
      if (!isAuthPage) {
        localStorage.removeItem('finwise_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
