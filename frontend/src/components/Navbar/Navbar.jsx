import React, { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { RoleSwitcher } from '../RoleSwitcher';
import styles from './Navbar.module.css';

const Navbar = ({ sections = [], portalName = "Portal" }) => {
  const { isAuthenticated, user, logout, activeRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayRole = activeRole || user?.role?.toLowerCase();

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

  const navLinks = [
    { label: 'Journals', path: '/journals' }
  ];

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          {/* Left: Brand */}
          <div className={styles.headerLeft}>
            <Link className={styles.brand} to="/">
              <img src="/logo.png" alt="BPI" className={styles.logo} />
              <span className={styles.brandText}>Breakthrough Publishers India</span>
              <span className={styles.brandTextCompact}>BPI</span>
            </Link>
            {sections.length > 0 && (
              <span className={styles.portalBadge}>{portalName}</span>
            )}
          </div>

          {/* Center: Nav links */}
          <nav className={styles.headerNav}>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                className={`${styles.navLink} ${isActive(link.path) ? styles.navLinkActive : ''}`}
                to={link.path}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && displayRole && (
              <Link className={`${styles.navLink} ${isActive(getDashboardPath()) ? styles.navLinkActive : ''}`} to={getDashboardPath()}>Dashboard</Link>
            )}
          </nav>

          {/* Right: Actions */}
          <div className={styles.headerRight}>
            {isAuthenticated && (
              <Link to="/submit" className={styles.submitBtn}>Submit Paper</Link>
            )}

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
                    <div className={styles.avatar}>
                      {user?.profile_picture ? (
                        <img src={user.profile_picture} alt={getInitials()} className={styles.avatarImg} />
                      ) : (
                        getInitials()
                      )}
                    </div>
                    <span className="material-symbols-rounded">
                      {menuOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                  {menuOpen && (
                    <div className={styles.dropdown}>
                      <div className={styles.dropdownHeader}>
                        <span className={styles.userName}>{user?.fname} {user?.lname}</span>
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
                <Link to="/login" className={styles.loginBtn}>Log In</Link>
                <Link to="/register" className={styles.signupBtn}>Sign Up</Link>
              </div>
            )}

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

        {mobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <nav className={styles.mobileNav}>
              <Link className={styles.mobileNavLink} to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
              {navLinks.map((link) => (
                <Link key={link.path} className={styles.mobileNavLink} to={link.path} onClick={() => setMobileMenuOpen(false)}>{link.label}</Link>
              ))}
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
