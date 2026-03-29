import React, { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { RoleSwitcher } from '../RoleSwitcher';
import styles from './Navbar.module.css';

/**
 * Navbar - Combined header and sidebar navigation component
 * 
 * @param {Object} props
 * @param {Array} props.sections - Navigation sections with items for sidebar
 * @param {string} props.portalName - Name of the current portal (e.g., "Admin Portal")
 */
const Navbar = ({ sections = [], portalName = "Portal" }) => {
  const { isAuthenticated, user, logout, activeRole, roles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Use activeRole for display, fall back to user.role
  const displayRole = activeRole || user?.role?.toLowerCase();

  // Check if user has a specific role
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

  const getDashboardPath = () => {
    switch (displayRole) {
      case 'admin': return '/admin';
      case 'editor': return '/editor';
      case 'reviewer': return '/reviewer';
      case 'author': return '/author';
      default: return '/author';
    }
  };

  const isActive = (path) => {
    if (path === location.pathname) return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          {/* Left: Logo */}
          <div className={styles.headerLeft}>
            <Link className={styles.brand} to="/">
              <span className={styles.logoText}>Breakthrough Publishers India</span>
              <span className={styles.logoTextShort}>BPI</span>
            </Link>
            {sections.length > 0 && (
              <span className={styles.portalBadge}>{portalName}</span>
            )}
          </div>

          {/* Center: Main nav links */}
          <nav className={styles.headerNav}>
            <Link className={styles.navLink} to="/">Home</Link>
            <Link className={styles.navLink} to="/journals">Journals</Link>
            <Link className={styles.navLink} to="/submit">Submit Paper</Link>
            {isAuthenticated && displayRole && (
              <Link className={styles.navLink} to={getDashboardPath()}>Dashboard</Link>
            )}
          </nav>

          {/* Right: User menu */}
          <div className={styles.headerRight}>
            {isAuthenticated ? (
              <>
                <div className={styles.desktopOnly}>
                  <RoleSwitcher />
                </div>
                <div className={styles.userMenu}>
                  <button 
                    className={styles.userButton}
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-expanded={menuOpen}
                  >
                    <div className={styles.avatar}>{getInitials()}</div>
                    <span className="material-symbols-rounded">
                      {menuOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                  {menuOpen && (
                    <div className={styles.dropdown}>
                      <div className={styles.dropdownHeader}>
                        <span className={styles.userName}>
                          {user?.fname} {user?.lname}
                        </span>
                        <span className={styles.userEmail}>{user?.email}</span>
                        <span className={styles.userRole}>{displayRole}</span>
                      </div>
                      <div className={styles.dropdownDivider}></div>
                      <button className={styles.dropdownItem} onClick={handleLogout}>
                        <span className="material-symbols-rounded">logout</span>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.authButtons}>
                <Link to="/login" className={styles.loginBtn}>Login</Link>
                <Link to="/signup" className={styles.signupBtn}>Sign Up</Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button 
              className={styles.mobileMenuBtn}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span className="material-symbols-rounded">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <nav className={styles.mobileNav}>
              <Link className={styles.mobileNavLink} to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
              <Link className={styles.mobileNavLink} to="/journals" onClick={() => setMobileMenuOpen(false)}>Journals</Link>
              <Link className={styles.mobileNavLink} to="/submit" onClick={() => setMobileMenuOpen(false)}>Submit Paper</Link>
              {isAuthenticated && displayRole && (
                <Link className={styles.mobileNavLink} to={getDashboardPath()} onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
              )}
            </nav>
            {isAuthenticated && (
              <div className={styles.mobileRoleSwitcher}>
                <RoleSwitcher />
              </div>
            )}
          </div>
        )}
      </header>

      {/* Sidebar - Icon only with tooltips */}
      {sections.length > 0 && (
        <aside className={styles.sidebar}>
          <nav className={styles.sidebarNav}>
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className={styles.sidebarSection}>
                {section.items.map((item, itemIndex) => (
                  <NavLink
                    key={itemIndex}
                    to={item.path}
                    className={({ isActive }) => 
                      `${styles.sidebarItem} ${isActive ? styles.active : ''}`
                    }
                    data-tooltip={item.label}
                  >
                    <span className="material-symbols-rounded">{item.icon}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </aside>
      )}
    </>
  );
};

export default Navbar;
