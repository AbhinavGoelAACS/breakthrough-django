/**
 * JournalHomePage Component
 * 
 * Landing page for journal pages (accessed via /j/:shortForm route).
 * Displays journal overview, latest articles, and key information.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useJournalContext } from '../../contexts/JournalContext';
import { acsApi } from '../../api/apiService';
import './JournalHomePage.css';

const JournalHomePage = () => {
  const { currentJournal, journalDetails, loading: contextLoading } = useJournalContext();
  const [latestArticles, setLatestArticles] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(true);

  useEffect(() => {
    if (currentJournal?.id) {
      fetchLatestArticles();
      fetchVolumes();
    }
  }, [currentJournal]);

  const fetchLatestArticles = async () => {
    try {
      setArticlesLoading(true);
      const response = await acsApi.articles.getByJournal(currentJournal.id, 0, 6);
      setLatestArticles(response || []);
    } catch (err) {
      console.error('Failed to fetch latest articles:', err);
    } finally {
      setArticlesLoading(false);
    }
  };

  const fetchVolumes = async () => {
    try {
      const response = await acsApi.journals.getVolumes(currentJournal.id);
      setVolumes(response.volumes || []);
    } catch (err) {
      console.error('Failed to fetch volumes:', err);
    }
  };

  // Strip HTML tags from description
  const stripHtmlTags = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  };

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
      <section className="journal-hero">
        <div className="journal-hero-content">
          <div className="journal-hero-text">
            <h1 className="journal-title">{currentJournal.name}</h1>
            <p className="journal-tagline">
              {currentJournal.short_form} - A Peer-Reviewed Academic Journal
            </p>
            <div className="journal-meta">
              {currentJournal.issn_online && (
                <span className="meta-item">
                  <strong>ISSN Online:</strong> {currentJournal.issn_online}
                </span>
              )}
              {currentJournal.issn_print && (
                <span className="meta-item">
                  <strong>ISSN Print:</strong> {currentJournal.issn_print}
                </span>
              )}
              {currentJournal.frequency && (
                <span className="meta-item">
                  <strong>Frequency:</strong> {currentJournal.frequency}
                </span>
              )}
            </div>
            <div className="journal-hero-actions">
              <Link to="/submit" className="btn-primary">Submit Manuscript</Link>
              <Link to="/archives" className="btn-secondary">Browse Archives</Link>
            </div>
          </div>
          {currentJournal.journal_image && (
            <div className="journal-hero-image">
              <img 
                src={`https://static.aacsjournals.com/images/${currentJournal.journal_image}`}
                alt={currentJournal.name}
              />
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section className="journal-about-section">
        <div className="section-container">
          <h2 className="section-title">About the Journal</h2>
          <div className="about-content">
            <p>
              {journalDetails?.about_journal 
                ? stripHtmlTags(journalDetails.about_journal).substring(0, 500) + '...'
                : stripHtmlTags(currentJournal.description)?.substring(0, 500) + '...'
              }
            </p>
            <Link to="/about" className="read-more-link">
              Read More <span className="material-symbols-rounded">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Scope Section */}
      {journalDetails?.scope && (
        <section className="journal-scope-section">
          <div className="section-container">
            <h2 className="section-title">Scope &amp; Topics</h2>
            <div className="scope-content">
              <p>{stripHtmlTags(journalDetails.scope).substring(0, 400)}...</p>
              <Link to="/about#scope" className="read-more-link">
                View Full Scope <span className="material-symbols-rounded">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Latest Articles Section */}
      <section className="journal-articles-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Latest Articles</h2>
            <Link to="/archives" className="view-all-link">View All</Link>
          </div>
          
          {articlesLoading ? (
            <div className="articles-loading">
              <div className="spinner-small"></div>
              <p>Loading articles...</p>
            </div>
          ) : latestArticles.length > 0 ? (
            <div className="articles-grid">
              {latestArticles.map((article) => (
                <article key={article.id} className="article-card">
                  <h3 className="article-title">
                    <Link to={`/article/${article.id}`}>
                      {stripHtmlTags(article.title)}
                    </Link>
                  </h3>
                  <p className="article-authors">{article.author}</p>
                  <p className="article-abstract">
                    {stripHtmlTags(article.abstract)?.substring(0, 150)}...
                  </p>
                  <div className="article-meta">
                    {article.volume && <span>Vol. {article.volume}</span>}
                    {article.issue && <span>Issue {article.issue}</span>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="no-articles">
              <p>No articles published yet. Be the first to submit!</p>
              <Link to="/submit" className="btn-primary">Submit Manuscript</Link>
            </div>
          )}
        </div>
      </section>

      {/* Volume Browser Section */}
      {volumes.length > 0 && (
        <section className="journal-volumes-section">
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">Browse by Volume</h2>
              <Link to="/archives" className="view-all-link">All Volumes</Link>
            </div>
            <div className="volumes-grid">
              {volumes.slice(0, 6).map((volume) => (
                <Link 
                  key={volume.volume_no}
                  to={`/archives?volume=${volume.volume_no}`}
                  className="volume-card"
                >
                  <span className="volume-number">Volume {volume.volume_no}</span>
                  <span className="volume-year">{volume.year}</span>
                  {volume.issue_count && (
                    <span className="volume-issues">{volume.issue_count} Issues</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Editorial Board Section */}
      {currentJournal.chief_editor && (
        <section className="journal-editorial-section">
          <div className="section-container">
            <h2 className="section-title">Editorial Leadership</h2>
            <div className="editorial-cards">
              <div className="editorial-card">
                <h3>Editor-in-Chief</h3>
                <p className="editor-name">{currentJournal.chief_editor}</p>
              </div>
              {currentJournal.co_editor && (
                <div className="editorial-card">
                  <h3>Co-Editor</h3>
                  <p className="editor-name">{currentJournal.co_editor}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Call to Action */}
      <section className="journal-cta-section">
        <div className="section-container">
          <div className="cta-content">
            <h2>Ready to Contribute?</h2>
            <p>Submit your research to {currentJournal.short_form} and join our community of scholars.</p>
            <div className="cta-actions">
              <Link to="/submit" className="btn-primary">Submit Manuscript</Link>
              <Link to="/guidelines" className="btn-outline">View Guidelines</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default JournalHomePage;
