import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { formatApiError } from '../utils/errorFormatter';
import acsApi from '../api/apiService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Multi-role state
  const [roles, setRoles] = useState([]); // All approved roles
  const [activeRole, setActiveRole] = useState(null); // Currently active role
  const [pendingRoleRequests, setPendingRoleRequests] = useState([]); // Pending role requests
  const [availableRoles, setAvailableRoles] = useState([]); // Roles user can request

  // Fetch user roles from API
  const fetchUserRoles = useCallback(async () => {
    try {
      const response = await acsApi.roles.getMyRoles();
      setRoles(response.approved_roles || []);
      setActiveRole(response.active_role || null);
      setPendingRoleRequests(response.pending_requests || []);
      setAvailableRoles(response.available_roles || []);
      return response;
    } catch (err) {
      console.error('Error fetching user roles:', err);
      // Don't throw - roles API might not be available during initial load
      return null;
    }
  }, []);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = authService.getToken();
        const storedUser = authService.getStoredUser();

        // Only consider user authenticated if BOTH token AND user data exist
        if (token && storedUser) {
          // Validate token by making an API call before setting authenticated
          try {
            const rolesResponse = await fetchUserRoles();
            // Token is valid - set authenticated state
            setUser(storedUser);
            setIsAuthenticated(true);
            setActiveRole(storedUser.role?.toLowerCase() || null);
          } catch (err) {
            // If we get a 401, token is invalid - clear auth state
            if (err?.response?.status === 401) {
              console.log('Token expired or invalid, clearing auth state');
              authService.logout();
              setUser(null);
              setIsAuthenticated(false);
              setActiveRole(null);
              setRoles([]);
            } else {
              // Network error - use stored auth but mark as potentially stale
              console.warn('Could not validate token (network error), using stored auth');
              setUser(storedUser);
              setIsAuthenticated(true);
              setActiveRole(storedUser.role?.toLowerCase() || null);
            }
          }
        } else {
          // Clear any stale/partial auth data if token is missing
          if (storedUser && !token) {
            authService.logout(); // Clean up stale user data
          }
          setUser(null);
          setIsAuthenticated(false);
          setActiveRole(null);
          setRoles([]);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setUser(null);
        setIsAuthenticated(false);
        setActiveRole(null);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [fetchUserRoles]);

  // Login function
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.login(email, password);

      // Store user data
      const userData = {
        id: response.id || response.user?.id,
        email: response.email || response.user?.email,
        role: response.role || response.user?.role,
        fname: response.fname || response.user?.fname,
        lname: response.lname || response.user?.lname,
      };

      authService.storeUser(userData);
      setUser(userData);
      setIsAuthenticated(true);
      setActiveRole(userData.role?.toLowerCase() || null);
      
      // Fetch user's roles after login
      await fetchUserRoles();

      return userData;
    } catch (err) {
      const formattedError = formatApiError(err);
      setError(formattedError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchUserRoles]);

  // Signup function
  const signup = useCallback(async (formData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.signup(formData);

      // Store user data
      const userData = {
        id: response.id || response.user?.id,
        email: response.email || response.user?.email,
        role: response.role || response.user?.role,
        fname: response.fname || response.user?.fname,
        lname: response.lname || response.user?.lname,
      };

      authService.storeUser(userData);
      setUser(userData);
      setIsAuthenticated(true);

      return userData;
    } catch (err) {
      const formattedError = formatApiError(err);
      setError(formattedError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    try {
      authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      // Clear multi-role state
      setRoles([]);
      setActiveRole(null);
      setPendingRoleRequests([]);
      setAvailableRoles([]);
    } catch (err) {
      console.error('Error during logout:', err);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Refresh user data (sync with server)
  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authService.getCurrentUser();
      
      const userData = {
        id: response.id,
        email: response.email,
        role: response.role,
        fname: response.fname,
        lname: response.lname,
      };

      authService.storeUser(userData);
      setUser(userData);
      setActiveRole(userData.role?.toLowerCase() || activeRole);
      
      // Also refresh roles
      await fetchUserRoles();

      return userData;
    } catch (err) {
      console.error('Error refreshing user:', err);
      // If refresh fails, logout user
      logout();
      throw err;
    } finally {
      setLoading(false);
    }
  }, [logout, activeRole, fetchUserRoles]);

  // Switch active role
  const switchRole = useCallback(async (newRole) => {
    try {
      setLoading(true);
      const response = await acsApi.roles.switchRole(newRole);
      
      if (response.success) {
        setActiveRole(response.active_role);
        
        // Update user object with new active role
        const updatedUser = { ...user, role: response.active_role };
        setUser(updatedUser);
        authService.storeUser(updatedUser);
        
        return response;
      }
    } catch (err) {
      console.error('Error switching role:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Request a new role
  const requestRole = useCallback(async (role, reason = '') => {
    try {
      const response = await acsApi.roles.requestRole(role, reason);
      // Refresh roles to update pending requests
      await fetchUserRoles();
      return response;
    } catch (err) {
      console.error('Error requesting role:', err);
      throw err;
    }
  }, [fetchUserRoles]);

  // Check if user has a specific role
  const hasRole = useCallback((role) => {
    if (!role) return false;
    const roleLower = role.toLowerCase();
    
    // Check active role
    if (activeRole?.toLowerCase() === roleLower) return true;
    
    // Check approved roles
    return roles.some(r => r.role?.toLowerCase() === roleLower);
  }, [activeRole, roles]);

  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    signup,
    logout,
    clearError,
    refreshUser,
    // Multi-role exports
    roles,
    activeRole,
    pendingRoleRequests,
    availableRoles,
    switchRole,
    requestRole,
    hasRole,
    fetchUserRoles,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
