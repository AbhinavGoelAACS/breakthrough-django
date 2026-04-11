import React from 'react';
import { Link } from 'react-router-dom';
import { useJournalContext } from '../../contexts/JournalContext';
import './JournalAboutPage.css';

const JournalAboutPage = () => {
  const { currentJournal, journalDetails, loading } = useJournalContext();

  const renderHtml = (html) => {
    if (!html) return null;
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  };

  if (loading) {
    return (
      <div className="jap-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!currentJournal) {
    return (
      <div className="jap-error">
        <h2>Journal not found</h2>
      </div>
    );
  }

  const journalBasePath = `/j/${currentJournal?.short_form}`;
  const imageUrl = currentJournal.journal_image
    ? (currentJournal.journal_image.startsWith('http')
      ? currentJournal.journal_image
      : `${import.meta.env.VITE_API_BASE_URL || ''}${currentJournal.journal_image}`)
    : null;

  return (
    <div className="jap-page">
      <main className="jap-main">

        {/* ── Hero Section ── */}
        <section className="jap-hero">
          <div className="jap-hero-text">
            <h1 className="jap-hero-title">
              {currentJournal.name}
            </h1>
            <p className="jap-hero-subtitle">
              {currentJournal.description
                ? stripHtml(currentJournal.description).slice(0, 200)
                : 'An open-access, peer-reviewed journal dedicated to rigorous research and scholarly discourse.'}
            </p>
          </div>
          <div className="jap-hero-image-wrap">
            {imageUrl ? (
              <div className="jap-hero-image-box">
                <img src={imageUrl} alt={currentJournal.name} className="jap-hero-image" />
              </div>
            ) : (
              <div className="jap-hero-image-box jap-hero-placeholder" />
            )}
            <div className="jap-hero-overlay-card">
              <span className="jap-hero-overlay-label">Peer-Reviewed Journal</span>
              <p className="jap-hero-overlay-quote">
                {journalDetails?.chief_say
                  ? stripHtml(journalDetails.chief_say).slice(0, 120) + (stripHtml(journalDetails.chief_say).length > 120 ? '…' : '')
                  : 'Advancing knowledge through rigorous scholarship and open access.'}
              </p>
            </div>
          </div>
        </section>

        {/* ── Journal Information Bento Grid ── */}
        <section className="jap-info">
          <h2 className="jap-section-label">
            Journal Information <span className="jap-label-line" />
          </h2>
          <div className="jap-info-grid">
            {/* Editor Card */}
            <div className="jap-info-card jap-info-card--editor">
              <span className="jap-info-card-header">Editor-in-Chief</span>
              <h3 className="jap-info-card-title">{currentJournal.chief_editor || 'TBA'}</h3>
              {currentJournal.co_editor && (
                <p className="jap-info-card-body">Co-Editor: {currentJournal.co_editor}</p>
              )}
            </div>
            {/* Frequency Card */}
            <div className="jap-info-card jap-info-card--freq">
              <span className="jap-info-card-header">Publication Frequency</span>
              <h3 className="jap-info-card-title">{currentJournal.frequency || 'Not specified'}</h3>
              <p className="jap-info-card-body">Published on a regular schedule throughout the calendar year.</p>
            </div>
            {/* Access Model Card */}
            <div className="jap-info-card jap-info-card--access">
              <span className="jap-info-card-header">Access Model</span>
              <h3 className="jap-info-card-title">Open Access</h3>
              <p className="jap-info-card-body">
                {currentJournal.issn_online ? `ISSN (Online): ${currentJournal.issn_online}` : 'Free to read and publish.'}
              </p>
            </div>
          </div>
        </section>

        {/* ── About the Journal – Asymmetric Content ── */}
        <section className="jap-content">
          {/* Sticky sidebar */}
          <div className="jap-content-sidebar">
            <h2 className="jap-content-heading">About the Journal.</h2>
            <div className="jap-content-badges">
              {journalDetails?.scope && <span className="jap-badge">Scope</span>}
              {journalDetails?.aim_objective && <span className="jap-badge">Aims</span>}
              {journalDetails?.criteria && <span className="jap-badge">Criteria</span>}
              {journalDetails?.readings && <span className="jap-badge">Readings</span>}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="jap-content-main">
            {/* About / Scope */}
            {(journalDetails?.about_journal || currentJournal.description) && (
              <div className="jap-content-block">
                <h3 className="jap-content-block-title">Our Scope</h3>
                <div className="jap-content-block-body">
                  {journalDetails?.about_journal
                    ? renderHtml(journalDetails.about_journal)
                    : renderHtml(currentJournal.description)}
                </div>
              </div>
            )}

            {/* Editorial Philosophy / Chief Say */}
            {journalDetails?.chief_say && (
              <div className="jap-content-quote">
                <h3 className="jap-content-quote-title">Editorial Philosophy</h3>
                <div className="jap-content-quote-body">
                  {renderHtml(journalDetails.chief_say)}
                </div>
                {currentJournal.chief_editor && (
                  <cite className="jap-content-quote-cite">— {currentJournal.chief_editor}, Editor-in-Chief</cite>
                )}
              </div>
            )}

            {/* Aim & Objectives */}
            {journalDetails?.aim_objective && (
              <div className="jap-content-block">
                <h3 className="jap-content-block-title">Aim &amp; Objectives</h3>
                <div className="jap-content-block-body">
                  {renderHtml(journalDetails.aim_objective)}
                </div>
              </div>
            )}

            {/* Scope */}
            {journalDetails?.scope && (
              <div className="jap-content-block">
                <h3 className="jap-content-block-title">Scope</h3>
                <div className="jap-content-block-body">
                  {renderHtml(journalDetails.scope)}
                </div>
              </div>
            )}

            {/* Criteria */}
            {journalDetails?.criteria && (
              <div className="jap-content-block">
                <h3 className="jap-content-block-title">Submission Criteria</h3>
                <div className="jap-content-block-body">
                  {renderHtml(journalDetails.criteria)}
                </div>
              </div>
            )}

            {/* Readings */}
            {journalDetails?.readings && (
              <div className="jap-content-block">
                <h3 className="jap-content-block-title">Recommended Readings</h3>
                <div className="jap-content-block-body">
                  {renderHtml(journalDetails.readings)}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Stats / Impact Strip ── */}
        <section className="jap-stats">
          {currentJournal.issn_online && (
            <div className="jap-stat">
              <span className="jap-stat-value">{currentJournal.issn_online}</span>
              <span className="jap-stat-label">ISSN Online</span>
            </div>
          )}
          {currentJournal.issn_print && (
            <div className="jap-stat">
              <span className="jap-stat-value">{currentJournal.issn_print}</span>
              <span className="jap-stat-label">ISSN Print</span>
            </div>
          )}
          {currentJournal.frequency && (
            <div className="jap-stat">
              <span className="jap-stat-value">{currentJournal.frequency}</span>
              <span className="jap-stat-label">Frequency</span>
            </div>
          )}
          {currentJournal.abstract_indexing && (
            <div className="jap-stat">
              <span className="jap-stat-value">{currentJournal.abstract_indexing}</span>
              <span className="jap-stat-label">Indexing</span>
            </div>
          )}
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="jap-footer">
        <div className="jap-footer-inner">
          <div className="jap-footer-brand">
            <span className="jap-footer-name">{currentJournal.name}</span>
            <p className="jap-footer-copyright">
              &copy; {new Date().getFullYear()} {currentJournal.name}. All rights reserved.
            </p>
          </div>
          <nav className="jap-footer-nav">
            <Link to={`${journalBasePath}`}>Home</Link>
            <Link to={`${journalBasePath}/guidelines`}>Guidelines</Link>
            <Link to={`${journalBasePath}/archives`}>Archives</Link>
            <Link to={`${journalBasePath}/editorial-board`}>Editorial Board</Link>
          </nav>
          <div className="jap-footer-icons">
            <button className="jap-footer-icon-btn">
              <span className="material-symbols-outlined">alternate_email</span>
            </button>
            <button className="jap-footer-icon-btn">
              <span className="material-symbols-outlined">rss_feed</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default JournalAboutPage;
