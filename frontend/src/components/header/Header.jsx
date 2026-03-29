import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { RoleSwitcher } from '../RoleSwitcher';
import styles from './Header.module.css';

const Header = () => {
  const { isAuthenticated, user, logout, activeRole, roles } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Use activeRole for display, fall back to user.role
  const displayRole = activeRole || user?.role?.toLowerCase();
  
  // Check if user has a specific role (either active or in roles list)
  const hasRoleAccess = (role) => {
    if (displayRole === role) return true;
    return roles?.some(r => r.role?.toLowerCase() === role && r.status === 'approved');
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const getInitials = () => {
    if (user?.fname && user?.lname) {
      return `${user.fname[0]}${user.lname[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  // Get dashboard link based on active role
  const getDashboardPath = () => {
    switch (displayRole) {
      case 'admin': return '/admin';
      case 'editor': return '/editor';
      case 'reviewer': return '/reviewer';
      case 'author': return '/author';
      default: return '/author';
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link className={styles.brand} to="/">
          <span className={styles.logoText}>Breakthrough Publishers India</span>
        </Link>
        
        <ul className={styles.navList}>
          <li><Link className={styles.navLink} to="/">Home</Link></li>
          <li><Link className={styles.navLink} to="/journals">Journals</Link></li>
          <li><Link className={styles.navLink} to="/submit">Submit Paper</Link></li>
          
          {/* Show dashboard link based on active role */}
          {isAuthenticated && displayRole && (
            <li><Link className={styles.navLink} to={getDashboardPath()}>Dashboard</Link></li>
          )}

          {isAuthenticated ? (
            <li className={styles.userMenu}>
              {/* Role Switcher - shows when user has multiple roles */}
              <RoleSwitcher />
              
              <button 
                className={styles.userToggle}
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <span className={styles.avatar}>{getInitials()}</span>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user?.fname} {user?.lname}</span>
                  <span className={styles.userRole}>{displayRole}</span>
                </div>
              </button>
              {menuOpen && (
                <div className={styles.dropdown}>
                  {/* Show links for all roles user has access to */}
                  {hasRoleAccess('admin') && (
                    <Link to="/admin" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>Admin Dashboard</Link>
                  )}
                  {hasRoleAccess('author') && (
                    <Link to="/author" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>My Submissions</Link>
                  )}
                  {hasRoleAccess('editor') && (
                    <Link to="/editor" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>Editor Panel</Link>
                  )}
                  {hasRoleAccess('reviewer') && (
                    <Link to="/reviewer" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>Review Panel</Link>
                  )}
                  <Link to="/profile" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>Profile</Link>
                  <button 
                    onClick={handleLogout} 
                    className={`${styles.dropdownItem} ${styles.logout}`}
                  >
                    Logout
                  </button>
                </div>
              )}
            </li>
          ) : (
            <>
              <li><Link className={styles.navLink} to="/login">Login</Link></li>
              <li>
                <Link className={`${styles.navLink} ${styles.signupBtn}`} to="/signup">
                  Sign Up
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Header;