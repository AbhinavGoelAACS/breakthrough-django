/**
 * JournalHomePage Component
 * 
 * Landing page for journal pages (accessed via /j/:shortForm route).
 * Displays journal overview, latest articles, and key information.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useJournalContext } from '../../contexts/JournalContext';
import { acsApi } from '../../api/apiService';
import './JournalHomePage.css';

const JournalHomePage = () => {
  const { currentJournal, journalDetails, loading: contextLoading } = useJournalContext();
  const [latestArticles, setLatestArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(true);

  useEffect(() => {
    if (currentJournal?.id) {
      fetchLatestArticles();
    }
  }, [currentJournal?.id, fetchLatestArticles]);

  const fetchLatestArticles = useCallback(async () => {
    try {
      setArticlesLoading(true);
      const response = await acsApi.articles.getByJournal(currentJournal.id, 0, 3);
      setLatestArticles(response || []);
    } catch (err) {
      console.error('Failed to fetch latest articles:', err);
    } finally {
      setArticlesLoading(false);
    }
  }, [currentJournal?.id]);

  // Strip HTML tags from description
  const stripHtmlTags = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  };

  const journalBasePath = `/j/${currentJournal?.short_form}`;

  if (contextLoading) {
    return (
      <div className="journal-home-loading">
        <div className="spinner"></div>
        <p>Loading journal information...</p>
      </div>
    );
  }

  if (!currentJournal) {
    return (
      <div className="journal-home-error">
        <h2>Journal not found</h2>
        <p>The requested journal could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="journal-home-page">
      {/* Hero Section */}
      <section className="jhp-hero">
        <div className="jhp-hero-bg-panel"></div>
        <div className="jhp-hero-content">
          <h1 className="jhp-hero-title">{currentJournal.name}</h1>
          <p className="jhp-hero-subtitle">
            {currentJournal.short_form} &mdash; A Peer-Reviewed Academic Journal
          </p>
          <div className="jhp-hero-buttons">
            <Link to={`${journalBasePath}/submit`} className="jhp-btn-solid">
              Submit Manuscript
            </Link>
            <Link to={`${journalBasePath}/archives`} className="jhp-btn-outline">
              Browse Archives
            </Link>
          </div>
        </div>
        <div className="jhp-hero-stats">
          {currentJournal.issn_online && (
            <div className="jhp-stat">
              <span className="jhp-stat-label">ISSN Online</span>
              <p className="jhp-stat-value">{currentJournal.issn_online}</p>
            </div>
          )}
          {currentJournal.issn_print && (
            <div className="jhp-stat">
              <span className="jhp-stat-label">ISSN Print</span>
              <p className="jhp-stat-value">{currentJournal.issn_print}</p>
            </div>
          )}
          {currentJournal.frequency && (
            <div className="jhp-stat">
              <span className="jhp-stat-label">Frequency</span>
              <p className="jhp-stat-value">{currentJournal.frequency}</p>
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section className="jhp-about">
        <div className="jhp-about-text">
          <h2 className="jhp-section-title">About the Journal</h2>
          <div className="jhp-about-body">
            <p>
              {journalDetails?.about_journal
                ? stripHtmlTags(journalDetails.about_journal).substring(0, 600)
                : stripHtmlTags(currentJournal.description)?.substring(0, 600)
              }
            </p>
            <Link to={`${journalBasePath}/about`} className="jhp-about-link">
              Read Our Full Statement
              <span className="material-symbols-rounded">arrow_forward</span>
            </Link>
          </div>
        </div>
        <div className="jhp-about-image-wrapper">
          {currentJournal.journal_image ? (
            <div className="jhp-about-image-container">
              <img
                src={currentJournal.journal_image}
                alt={currentJournal.name}
                className="jhp-about-image"
              />
            </div>
          ) : (
            <div className="jhp-about-image-container jhp-about-image-placeholder">
              <span className="material-symbols-rounded">menu_book</span>
            </div>
          )}
          <div className="jhp-about-quote">
            <p className="jhp-about-quote-text">
              "Advancing knowledge through rigorous peer review and open scholarly discourse."
            </p>
            <p className="jhp-about-quote-attribution">&mdash; Editorial Board</p>
          </div>
        </div>
      </section>

      {/* Latest Articles Section */}
      <section className="jhp-latest">
        <div className="jhp-latest-header">
          <div className="jhp-latest-header-text">
            <h2 className="jhp-section-title">Latest Articles</h2>
            <p className="jhp-latest-subtitle">Explore our most recent contributions to scholarly research.</p>
          </div>
          <Link to={`${journalBasePath}/archives`} className="jhp-archive-link">
            View Volume Archive
            <span className="material-symbols-rounded">north_east</span>
          </Link>
        </div>

        {articlesLoading ? (
          <div className="jhp-articles-loading">
            <div className="spinner-small"></div>
            <p>Loading articles...</p>
          </div>
        ) : latestArticles.length > 0 ? (
          <div className="jhp-bento-grid">
            {/* Featured large card */}
            <div className="jhp-bento-featured">
              <div className="jhp-bento-featured-overlay"></div>
              <div className="jhp-bento-featured-content">
                {latestArticles[0].volume && (
                  <span className="jhp-bento-badge">
                    Volume {latestArticles[0].volume}{latestArticles[0].issue ? `, Issue ${latestArticles[0].issue}` : ''}
                  </span>
                )}
                <h3 className="jhp-bento-featured-title">
                  {stripHtmlTags(latestArticles[0].title)}
                </h3>
                <p className="jhp-bento-featured-abstract">
                  {stripHtmlTags(latestArticles[0].abstract)?.substring(0, 200)}
                </p>
                <Link to={`${journalBasePath}/article/${latestArticles[0].id}`} className="jhp-bento-featured-btn">
                  Read Article
                </Link>
              </div>
            </div>

            {/* Smaller cards */}
            {latestArticles.slice(1, 3).map((article) => (
              <div key={article.id} className="jhp-bento-card">
                <div>
                  <span className="jhp-bento-card-type">Research Article</span>
                  <h4 className="jhp-bento-card-title">
                    {stripHtmlTags(article.title)}
                  </h4>
                  <p className="jhp-bento-card-abstract">
                    {stripHtmlTags(article.abstract)?.substring(0, 120)}
                  </p>
                </div>
                <div className="jhp-bento-card-footer">
                  <div className="jhp-bento-card-icon">
                    <span className="material-symbols-rounded">description</span>
                  </div>
                  <Link to={`${journalBasePath}/article/${article.id}`} className="jhp-bento-card-link">
                    Read Article
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="jhp-no-articles">
            <span className="material-symbols-rounded">description</span>
            <p>No articles published yet.</p>
          </div>
        )}
      </section>

      {/* Call for Papers Section */}
      <section className="jhp-cfp">
        <div className="jhp-cfp-inner">
          <div className="jhp-cfp-content">
            <h2 className="jhp-cfp-title">Call for Papers</h2>
            <p className="jhp-cfp-body">
              We are seeking original research, methodological papers, and literature reviews.
              Submit your best work for peer review and publication in {currentJournal.short_form}.
            </p>
            <div className="jhp-cfp-buttons">
              <Link to={`${journalBasePath}/submit`} className="jhp-cfp-btn-solid">Submit Now</Link>
              <Link to={`${journalBasePath}/guidelines`} className="jhp-cfp-btn-outline">Submission Guidelines</Link>
            </div>
          </div>
          <div className="jhp-cfp-words">
            <span>Authenticity</span>
            <span>Longevity</span>
            <span>Accessibility</span>
            <span>Rigor</span>
          </div>
          <div className="jhp-cfp-grain"></div>
        </div>
      </section>

      {/* Footer */}
      <footer className="jhp-footer">
        <div className="jhp-footer-inner">
          <div className="jhp-footer-brand">
            <span className="jhp-footer-name">{currentJournal.name}</span>
            <p className="jhp-footer-copyright">
              &copy; {new Date().getFullYear()} {currentJournal.name}. All rights reserved.
            </p>
          </div>
          <nav className="jhp-footer-nav">
            <Link to={`${journalBasePath}/about`}>About</Link>
            <Link to={`${journalBasePath}/guidelines`}>Guidelines</Link>
            <Link to={`${journalBasePath}/archives`}>Archives</Link>
            <Link to={`${journalBasePath}/editorial-board`}>Editorial Board</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default JournalHomePage;
