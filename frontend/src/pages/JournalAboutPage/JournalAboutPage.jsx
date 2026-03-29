/**
 * JournalAboutPage Component
 * 
 * About page for journal pages (accessed via /j/:shortForm route).
 * Displays journal details, scope, aim, editorial board, etc.
 */

import React from 'react';
import { useJournalContext } from '../../contexts/JournalContext';
import './JournalAboutPage.css';

const JournalAboutPage = () => {
  const { currentJournal, journalDetails, loading } = useJournalContext();

  // Render HTML content safely
  const renderHtml = (html) => {
    if (!html) return null;
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // Strip HTML for plain text display
  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  };

  if (loading) {
    return (
      <div className="journal-about-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!currentJournal) {
    return (
      <div className="journal-about-error">
        <h2>Journal not found</h2>
      </div>
    );
  }

  return (
    <div className="journal-about-page">
      {/* Page Header */}
      <header className="about-page-header">
        <div className="about-header-content">
          <h1>About {currentJournal.short_form}</h1>
          <p>{currentJournal.name}</p>
        </div>
      </header>

      <div className="about-content-container">
        {/* Journal Info Card */}
        <aside className="journal-info-sidebar">
          <div className="info-card">
            <h3>Journal Information</h3>
            <dl className="info-list">
              {currentJournal.issn_online && (
                <>
                  <dt>ISSN (Online)</dt>
                  <dd>{currentJournal.issn_online}</dd>
                </>
              )}
              {currentJournal.issn_print && (
                <>
                  <dt>ISSN (Print)</dt>
                  <dd>{currentJournal.issn_print}</dd>
                </>
              )}
              {currentJournal.frequency && (
                <>
                  <dt>Frequency</dt>
                  <dd>{currentJournal.frequency}</dd>
                </>
              )}
              {currentJournal.chief_editor && (
                <>
                  <dt>Editor-in-Chief</dt>
                  <dd>{currentJournal.chief_editor}</dd>
                </>
              )}
              {currentJournal.co_editor && (
                <>
                  <dt>Co-Editor</dt>
                  <dd>{currentJournal.co_editor}</dd>
                </>
              )}
            </dl>
          </div>

          {currentJournal.abstract_indexing && (
            <div className="info-card">
              <h3>Indexing</h3>
              <p className="indexing-text">{currentJournal.abstract_indexing}</p>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="about-main-content">
          {/* About Journal Section */}
          <section id="about" className="about-section">
            <h2>About the Journal</h2>
            <div className="section-content">
              {journalDetails?.about_journal ? (
                renderHtml(journalDetails.about_journal)
              ) : currentJournal.description ? (
                renderHtml(currentJournal.description)
              ) : (
                <p>Information about this journal is being updated.</p>
              )}
            </div>
          </section>

          {/* Aim & Objectives Section */}
          {journalDetails?.aim_objective && (
            <section id="aim" className="about-section">
              <h2>Aim &amp; Objectives</h2>
              <div className="section-content">
                {renderHtml(journalDetails.aim_objective)}
              </div>
            </section>
          )}

          {/* Scope Section */}
          {journalDetails?.scope && (
            <section id="scope" className="about-section">
              <h2>Scope</h2>
              <div className="section-content">
                {renderHtml(journalDetails.scope)}
              </div>
            </section>
          )}

          {/* Criteria Section */}
          {journalDetails?.criteria && (
            <section id="criteria" className="about-section">
              <h2>Submission Criteria</h2>
              <div className="section-content">
                {renderHtml(journalDetails.criteria)}
              </div>
            </section>
          )}

          {/* Chief's Say Section */}
          {journalDetails?.chief_say && (
            <section id="chief-say" className="about-section">
              <h2>From the Editor's Desk</h2>
              <div className="section-content chief-say">
                {renderHtml(journalDetails.chief_say)}
                {currentJournal.chief_editor && (
                  <p className="chief-signature">— {currentJournal.chief_editor}, Editor-in-Chief</p>
                )}
              </div>
            </section>
          )}

          {/* Recommended Readings */}
          {journalDetails?.readings && (
            <section id="readings" className="about-section">
              <h2>Recommended Readings</h2>
              <div className="section-content">
                {renderHtml(journalDetails.readings)}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default JournalAboutPage;
