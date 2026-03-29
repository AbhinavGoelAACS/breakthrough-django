import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import styles from './CollapsibleSidebar.module.css';

/**
 * CollapsibleSidebar - Modern icon-only sidebar that expands on hover
 * 
 * @param {Object} props
 * @param {Array} props.sections - Navigation sections with items
 * @param {Function} props.onLogout - Logout callback
 * @param {Object} props.user - Current user object with name, email, avatar
 * @param {string} props.portalName - Name to display when expanded (e.g., "Author Portal")
 */
const CollapsibleSidebar = ({ sections = [], onLogout, user, portalName = "Portal" }) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => {
    if (path === location.pathname) return true;
    // Handle nested routes
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const toggleMobile = () => setMobileOpen(!mobileOpen);
  const closeMobile = () => setMobileOpen(false);

  const renderNavItems = (isMobile = false) => (
    <>
      {sections.map((section, sectionIdx) => (
        <div key={sectionIdx} className={styles.section}>
          {section.title && (
            <span className={styles.sectionTitle}>{section.title}</span>
          )}
          {section.items.map((item, itemIdx) => (
            <NavLink
              key={itemIdx}
              to={item.path}
              className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
              onClick={isMobile ? closeMobile : undefined}
              title={item.label}
            >
              <span className="material-symbols-rounded">{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
              {item.badge && (
                <span className={styles.badge}>{item.badge}</span>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button 
        className={styles.hamburger} 
        onClick={toggleMobile}
        aria-label="Toggle navigation"
      >
        <span className="material-symbols-rounded">
          {mobileOpen ? 'close' : 'menu'}
        </span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className={styles.overlay} onClick={closeMobile} />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.mobileOpen : ''}`}>
        {/* Logo / Brand */}
        <div className={styles.brand}>
          <div className={styles.logoIcon}>
            <span className="material-symbols-rounded">science</span>
          </div>
          <span className={styles.portalName}>{portalName}</span>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {renderNavItems(mobileOpen)}
        </nav>

        {/* User section */}
        <div className={styles.userSection}>
          {onLogout && (
            <button className={styles.logoutBtn} onClick={onLogout} title="Logout">
              <span className="material-symbols-rounded">logout</span>
              <span className={styles.label}>Logout</span>
            </button>
          )}
          {user && (
            <div className={styles.userInfo}>
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name || 'User'} 
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  <span className="material-symbols-rounded">person</span>
                </div>
              )}
              <div className={styles.userDetails}>
                <span className={styles.userName}>{user.name || 'User'}</span>
                <span className={styles.userEmail}>{user.email || ''}</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile drawer */}
      <div className={`${styles.mobileDrawer} ${mobileOpen ? styles.open : ''}`}>
        <div className={styles.mobileHeader}>
          <div className={styles.brand}>
            <div className={styles.logoIcon}>
              <span className="material-symbols-rounded">science</span>
            </div>
            <span className={styles.portalName}>{portalName}</span>
          </div>
          <button className={styles.closeBtn} onClick={closeMobile}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
        <nav className={styles.mobileNav}>
          {renderNavItems(true)}
        </nav>
        <div className={styles.mobileUserSection}>
          {user && (
            <div className={styles.mobileUserInfo}>
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className={styles.avatar} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  <span className="material-symbols-rounded">person</span>
                </div>
              )}
              <div className={styles.userDetails}>
                <span className={styles.userName}>{user.name || 'User'}</span>
                <span className={styles.userEmail}>{user.email || ''}</span>
              </div>
            </div>
          )}
          {onLogout && (
            <button className={styles.mobileLogoutBtn} onClick={onLogout}>
              <span className="material-symbols-rounded">logout</span>
              Logout
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default CollapsibleSidebar;
