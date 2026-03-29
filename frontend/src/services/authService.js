import { apiService } from '../api/apiService';
import { AUTH_ENDPOINTS, STORAGE_KEYS } from '../constants/authConstants';

/**
 * Authentication API service
 * Handles all authentication-related API calls
 */
export const authService = {
  /**
   * User login
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<object>} - User and token data
   */
  login: async (email, password) => {
    try {
      const response = await apiService.post(AUTH_ENDPOINTS.LOGIN, {
        email,
        password,
      });

      // Store tokens in localStorage
      if (response.access_token) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.access_token);
      }
      if (response.refresh_token) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refresh_token);
      }

      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * User signup/registration
   * @param {object} userData - User registration data
   * @returns {Promise<object>} - User and token data
   */
  signup: async (userData) => {
    try {
      const response = await apiService.post(AUTH_ENDPOINTS.SIGNUP, userData);

      // Store tokens in localStorage
      if (response.access_token) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.access_token);
      }
      if (response.refresh_token) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refresh_token);
      }

      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get current user info
   * @returns {Promise<object>} - Current user data
   */
  getCurrentUser: async () => {
    try {
      const response = await apiService.get(AUTH_ENDPOINTS.ME);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<object>} - New tokens
   */
  refreshToken: async (refreshToken) => {
    try {
      const response = await apiService.post(AUTH_ENDPOINTS.REFRESH, {
        refresh_token: refreshToken,
      });

      // Store new tokens
      if (response.access_token) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.access_token);
      }
      if (response.refresh_token) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refresh_token);
      }

      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout: () => {
    // Clear all auth data from localStorage
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
  },

  /**
   * Get stored refresh token from localStorage
   */
  getRefreshToken: () => {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  /**
   * Get stored auth token from localStorage
   */
  getToken: () => {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  /**
   * Get stored user data from localStorage
   */
  getStoredUser: () => {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    try {
      return user ? JSON.parse(user) : null;
    } catch (e) {
      console.error('Error parsing stored user:', e);
      return null;
    }
  },

  /**
   * Store user data in localStorage
   */
  storeUser: (user) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: () => {
    return Boolean(localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN));
  },
};
