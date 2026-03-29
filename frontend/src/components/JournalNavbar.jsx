/**
 * JournalNavbar Component
 * 
 * Navigation bar for journal-specific pages.
 * Displays journal branding and navigation links.
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './JournalNavbar.css';

const JournalNavbar = ({ journal }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  // Get the base path for this journal
  const journalBasePath = `/j/${journal?.short_form}`;

  const isActive = (path) => {
    const fullPath = path === '/' ? journalBasePath : `${journalBasePath}${path}`;
    return location.pathname === fullPath;
  };

  const handleLogout = async () => {
    await logout();
  };

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/archives', label: 'Archives' },
    { path: '/guidelines', label: 'Guidelines' },
    { path: '/submit', label: 'Submit Paper' },
  ];

  return (
    <nav className="journal-navbar">
      <div className="journal-navbar-container">
        {/* Journal Logo and Name */}
        <div className="journal-navbar-brand">
          <Link to={journalBasePath} className="journal-logo-link">
            {journal?.journal_logo && (
              <img 
                src={`https://static.aacsjournals.com/images/${journal.journal_logo}`} 
                alt={journal.name}
                className="journal-logo-img"
              />
            )}
            <div className="journal-brand-text">
              <span className="journal-short-form">{journal?.short_form}</span>
              <span className="journal-full-name">{journal?.name}</span>
            </div>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="journal-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation"
        >
          <span className="material-symbols-rounded">
            {mobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>

        {/* Navigation Links */}
        <div className={`journal-navbar-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <ul className="journal-nav-links">
            {navLinks.map((link) => (
              <li key={link.path}>
                <Link 
                  to={link.path === '/' ? journalBasePath : `${journalBasePath}${link.path}`}
                  className={`journal-nav-link ${isActive(link.path) ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Auth Section */}
          <div className="journal-navbar-auth">
            {isAuthenticated ? (
              <div className="journal-user-menu">
                <span className="journal-user-name">{user?.fname || user?.email}</span>
                <button onClick={handleLogout} className="journal-logout-btn">
                  Logout
                </button>
              </div>
            ) : (
              <div className="journal-auth-links">
                <Link to="/login" className="journal-login-link">Login</Link>
                <Link to="/signup" className="journal-signup-link">Sign Up</Link>
              </div>
            )}
          </div>

          {/* Main Site Link */}
          <Link 
            to="/" 
            className="main-site-link"
          >
            <span className="material-symbols-rounded">home</span>
            Breakthrough Publishers India
          </Link>
        </div>
      </div>

      {/* Journal Info Bar */}
      <div className="journal-info-bar">
        <div className="journal-info-container">
          {journal?.issn_online && (
            <span className="journal-issn">ISSN (Online): {journal.issn_online}</span>
          )}
          {journal?.issn_print && (
            <span className="journal-issn">ISSN (Print): {journal.issn_print}</span>
          )}
          {journal?.chief_editor && (
            <span className="journal-editor">Editor-in-Chief: {journal.chief_editor}</span>
          )}
        </div>
      </div>
    </nav>
  );
};

export default JournalNavbar;
