import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Custom hook to access auth context
 * Usage: const { user, isAuthenticated, login, logout } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  // Return default values if context is not available (during HMR or outside provider)
  if (!context) {
    // Return safe default values instead of throwing
    return {
      user: null,
      isAuthenticated: false,
      loading: true,
      error: null,
      roles: [],
      activeRole: null,
      pendingRoleRequests: [],
      availableRoles: [],
      login: () => Promise.reject(new Error('Auth not initialized')),
      logout: () => {},
      signup: () => Promise.reject(new Error('Auth not initialized')),
      switchRole: () => Promise.reject(new Error('Auth not initialized')),
      requestRole: () => Promise.reject(new Error('Auth not initialized')),
      refreshRoles: () => Promise.reject(new Error('Auth not initialized')),
    };
  }

  return context;
};
