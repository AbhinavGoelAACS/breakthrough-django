import axios from 'axios';
import toast from '../utils/toast';

// Export base URL for use in other parts of the app
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL, // FastAPI backend URL
  timeout: 300000, // 5 minutes timeout for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to add authentication token if available
apiClient.interceptors.request.use(
  (config) => {
    // Check if skipAuth flag is set
    if (!config.skipAuth) {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else {
      // Preserve skipAuth info for response interceptor
      config._skipAuth = true;
    }
    // Remove the skipAuth flag from config before sending
    delete config.skipAuth;
    
    // Let axios handle Content-Type for multipart/form-data (remove default JSON header)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Define public routes where we shouldn't redirect to login
    const publicRoutes = ['/', '/journals', '/login', '/signup', '/article'];
    const isPublicRoute = publicRoutes.some(route => 
      window.location.pathname === route || 
      window.location.pathname.startsWith('/j/') ||
      window.location.pathname.startsWith('/article/')
    );
    
    // Check if the original request was meant to skip auth
    const wasPublicRequest = originalRequest?._skipAuth;
    
    // If 401 error and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip refresh for login/signup/refresh endpoints or public requests
      const skipRefreshUrls = ['/api/v1/auth/login', '/api/v1/auth/signup', '/api/v1/auth/refresh'];
      if (skipRefreshUrls.some(url => originalRequest.url?.includes(url)) || wasPublicRequest) {
        return Promise.reject(error);
      }
      
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        // No refresh token, clear everything
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        isRefreshing = false;
        
        // Only redirect to login if NOT on a public route
        if (!isPublicRoute) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
      
      try {
        // Attempt to refresh the token
        const response = await axios.post(
          `${apiClient.defaults.baseURL}/api/v1/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        const { access_token, refresh_token: newRefreshToken } = response.data;
        
        // Store new tokens
        localStorage.setItem('authToken', access_token);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }
        
        // Update authorization header
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        
        processQueue(null, access_token);
        
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // Refresh failed, clear tokens
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        // Only redirect to login if NOT on a public route
        if (!isPublicRoute && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;