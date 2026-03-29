import { useAuth } from './useAuth';

/**
 * Custom hook to check user roles and permissions
 */
export const useRole = () => {
  const { user } = useAuth();

  const hasRole = (role) => {
    if (!user || !user.role) return false;
    return user.role.toLowerCase() === role.toLowerCase();
  };

  const hasAnyRole = (roles) => {
    if (!user || !user.role) return false;
    return roles.some(r => r.toLowerCase() === user.role.toLowerCase());
  };

  const isAdmin = () => hasRole('admin');
  const isAuthor = () => hasRole('author');
  const isEditor = () => hasRole('editor');
  const isReviewer = () => hasRole('reviewer');

  const canSubmitPaper = () => hasRole('author');
  const canReviewPaper = () => hasRole('reviewer') || hasRole('editor');
  const canManageUsers = () => hasRole('admin');
  const canManageJournals = () => hasRole('admin') || hasRole('editor');

  return {
    user,
    hasRole,
    hasAnyRole,
    isAdmin,
    isAuthor,
    isEditor,
    isReviewer,
    canSubmitPaper,
    canReviewPaper,
    canManageUsers,
    canManageJournals,
  };
};

export default useRole;
