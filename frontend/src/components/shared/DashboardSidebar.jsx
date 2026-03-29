import React from 'react';
import { Link } from 'react-router-dom';
import styles from './DashboardSidebar.module.css';

export const DashboardSidebar = ({ 
  quickLinks = [],
  statusItems = [],
  showStatus = false,
  showQuickLinks = false 
}) => {
  return (
    <div className={styles.dashboardSidebar}>
      {/* Status Card */}
      {showStatus && statusItems.length > 0 && (
        <div className={styles.dashboardCard}>
          <h3 className={styles.cardTitle}>Status Overview</h3>
          <div className={styles.statusItems}>
            {statusItems.map((item, index) => (
              <div key={index} className={styles.statusItem}>
                <div className={`${styles.statusIndicator} ${styles[`status${item.color}`]}`}></div>
                <div>
                  <p className={styles.statusLabel}>{item.label}</p>
                  <p className={styles.statusValue}>{item.value || 0}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links Card */}
      {showQuickLinks && quickLinks.length > 0 && (
        <div className={styles.dashboardCard}>
          <h3 className={styles.cardTitle}>Quick Actions</h3>
          <div className={styles.quickLinksGrid}>
            {quickLinks.map((link, index) => (
              <Link key={index} to={link.to} className={styles.quickLink}>
                <span className={`material-symbols-rounded ${styles[`quickLink${link.color}`]}`}>
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardSidebar;
