import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footerWrapper}>
      <div className={styles.footerContainer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerCompany}>
            <h4 className={styles.footerBrand}>BreakThrough Publishers India</h4>
            <p className={styles.footerDescription}>
              Empowering researchers globally through excellence in academic publishing. Our platform ensures rigorous peer review and maximum visibility for your work.
            </p>
          </div>
          <div className={styles.footerLinks}>
            <h5 className={styles.footerLinksTitle}>Resources</h5>
            <ul className={styles.footerLinksList}>
              <li><Link to="/author-guidelines">For Authors</Link></li>
              <li><Link to="/reviewer-guidelines">For Reviewers</Link></li>
              <li><Link to="/libraries">For Libraries</Link></li>
              <li><Link to="/open-access">Open Access</Link></li>
            </ul>
          </div>
          <div className={styles.footerLinks}>
            <h5 className={styles.footerLinksTitle}>Legal</h5>
            <ul className={styles.footerLinksList}>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service">Terms of Service</Link></li>
              <li><Link to="/cookie-policy">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© 2024 BreakThrough Publishers India. All rights reserved.</p>
          <div className={styles.footerSocial}>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;