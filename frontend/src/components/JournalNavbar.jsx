import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './JournalNavbar.module.css';

const JournalNavbar = ({ journal }) => {
  const { isAuthenticated, user, logout, activeRole } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const journalBasePath = `/j/${journal?.short_form}`;
  const displayRole = activeRole || user?.role?.toLowerCase();

  const isActive = (path) => {
    const fullPath = path === '/' ? journalBasePath : `${journalBasePath}${path}`;
    return location.pathname === fullPath;
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

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/archives', label: 'Archives' },
    { path: '/editorial-board', label: 'Editorial Board' },
    { path: '/guidelines', label: 'Guidelines' },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        {/* Left: Journal brand + nav */}
        <div className={styles.headerLeft}>
          <Link to={journalBasePath} className={styles.brand}>
            {journal?.name
              ? journal.name.split(/\s+/).map(w => w[0]).join('').toUpperCase()
              : journal?.short_form}
          </Link>
          <nav className={styles.headerNav}>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path === '/' ? journalBasePath : `${journalBasePath}${link.path}`}
                className={`${styles.navLink} ${isActive(link.path) ? styles.navLinkActive : ''}`}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && displayRole && (
              <Link className={styles.navLink} to={getDashboardPath()}>Dashboard</Link>
            )}
            <Link className={styles.navLink} to="/">BPI Home</Link>
          </nav>
        </div>

        {/* Right: Submit button + auth */}
        <div className={styles.headerRight}>
          <Link to={`${journalBasePath}/submit`} className={styles.submitBtn}>
            Submit Paper
          </Link>
          {isAuthenticated ? (
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
                    {displayRole && <span className={styles.userRole}>{displayRole}</span>}
                  </div>
                  <div className={styles.dropdownDivider}></div>
                  <button className={styles.dropdownItem} onClick={handleLogout}>
                    <span className="material-symbols-rounded">logout</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.personIcon}>
              <Link to="/login">
                <span className="material-symbols-rounded">person</span>
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
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
            {navLinks.map((link) => (
              <Link
                key={link.path}
                className={styles.mobileNavLink}
                to={link.path === '/' ? journalBasePath : `${journalBasePath}${link.path}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              className={styles.mobileNavLink}
              to={`${journalBasePath}/submit`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Submit Paper
            </Link>
            {isAuthenticated && displayRole && (
              <Link className={styles.mobileNavLink} to={getDashboardPath()} onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
            )}
          </nav>
          <div className={styles.mobileFooter}>
            <Link to="/" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>home</span>
              Breakthrough Publishers India
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default JournalNavbar;
