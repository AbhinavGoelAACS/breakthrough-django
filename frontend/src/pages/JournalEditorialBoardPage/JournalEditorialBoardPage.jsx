import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useJournalContext } from '../../contexts/JournalContext';
import { acsApi } from '../../api/apiService';
import './JournalEditorialBoardPage.css';

const JournalEditorialBoardPage = () => {
  const { currentJournal, journalShortForm, loading: contextLoading } = useJournalContext();
  const [editorialBoard, setEditorialBoard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (journalShortForm) {
      fetchEditorialBoard();
    }
  }, [journalShortForm]);

  const fetchEditorialBoard = async () => {
    try {
      setLoading(true);
      const response = await acsApi.journals.getEditorialBoard(journalShortForm);
      setEditorialBoard(response);
    } catch (err) {
      console.error('Failed to fetch editorial board:', err);
    } finally {
      setLoading(false);
    }
  };

  if (contextLoading || loading) {
    return (
      <div className="eb-page-loading">
        <div className="spinner"></div>
        <p>Loading editorial board...</p>
      </div>
    );
  }

  const hasBoard = editorialBoard && (
    editorialBoard.chief_editor ||
    editorialBoard.co_editors?.length > 0 ||
    editorialBoard.section_editors?.length > 0
  );

  const journalBasePath = `/j/${currentJournal?.short_form || ''}`;

  /* Merge co-editors + section editors for the grid */
  const associateEditors = [
    ...(editorialBoard?.co_editors || []).map(e => ({ ...e, _role: 'Co-Editor' })),
    ...(editorialBoard?.section_editors || []).map(e => ({ ...e, _role: 'Section Editor' })),
  ];

  const chiefEditor = editorialBoard?.chief_editor;

  return (
    <div className="eb-page">

      {/* ── Hero Header ── */}
      <section className="eb-hero">
        <h1 className="eb-hero-title">Editorial Board</h1>
        <p className="eb-hero-subtitle">
          Guided by excellence, our board members curate and oversee the preservation of digital scholarship for future generations.
        </p>
      </section>

      {!hasBoard ? (
        /* ── Empty State ── */
        <div className="eb-empty-state">
          <div className="eb-empty-icon-wrap">
            <span className="material-symbols-rounded">groups</span>
          </div>
          <h3>Editorial board information is not available yet.</h3>
          <p>Please check back later.</p>
        </div>
      ) : (
        <>
          {/* ── Editor-in-Chief Featured ── */}
          {chiefEditor && (
            <section className="eb-chief-section">
              <div className="eb-chief-grid">
                <div className="eb-chief-main">
                  <div className="eb-chief-blur" />
                  <div className="eb-chief-layout">
                    {/* Portrait */}
                    <div className="eb-chief-portrait">
                      {chiefEditor.profile_picture ? (
                        <img src={chiefEditor.profile_picture} alt={chiefEditor.name} />
                      ) : (
                        <div className="eb-chief-portrait-fallback">
                          <span className="material-symbols-rounded">person</span>
                        </div>
                      )}
                    </div>

                    {/* Bio */}
                    <div className="eb-chief-bio">
                      <span className="eb-chief-badge">Editor-in-Chief</span>
                      <h2 className="eb-chief-name">{chiefEditor.name}</h2>
                      {chiefEditor.designation && (
                        <p className="eb-chief-designation">{chiefEditor.designation}</p>
                      )}
                      <div className="eb-chief-details">
                        {chiefEditor.department && <p>{chiefEditor.department}</p>}
                        {(chiefEditor.organisation || chiefEditor.affiliation) && (
                          <p>{chiefEditor.organisation || chiefEditor.affiliation}</p>
                        )}
                      </div>
                      <div className="eb-chief-actions">
                        <span className="eb-chief-email">
                          <span className="material-symbols-rounded">mail</span>
                          <span>{chiefEditor.email || 'breakthroughpublishers@gmail.com'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Margin Meta Sidebar */}
                <div className="eb-chief-sidebar">
                  <div className="eb-sidebar-block">
                    <h4 className="eb-sidebar-label">Editorial Philosophy</h4>
                    <p className="eb-sidebar-quote">"Precision in preservation. Clarity in communication. Excellence in inquiry."</p>
                  </div>
                  <div className="eb-sidebar-block">
                    <h4 className="eb-sidebar-label">Journal</h4>
                    <p className="eb-sidebar-value">{currentJournal?.name || currentJournal?.short_form}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Associate Editors Grid ── */}
          {associateEditors.length > 0 && (
            <section className="eb-associates-section">
              <div className="eb-associates-header">
                <h3 className="eb-associates-title">Associate Editors</h3>
                <span className="eb-associates-meta">{associateEditors.length} Members</span>
              </div>
              <div className="eb-associates-grid">
                {associateEditors.map((member, idx) => (
                  <div className="eb-assoc-card" key={`${member._role}-${member.name}-${idx}`}>
                    <div className="eb-assoc-img-wrap">
                      {member.profile_picture ? (
                        <img src={member.profile_picture} alt={member.name} className="eb-assoc-img" />
                      ) : (
                        <div className="eb-assoc-img-fallback">
                          <span className="material-symbols-rounded">person</span>
                        </div>
                      )}
                      <div className="eb-assoc-img-overlay" />
                    </div>
                    <h4 className="eb-assoc-name">{member.name}</h4>
                    <p className="eb-assoc-role">{member._role}</p>
                    <p className="eb-assoc-affiliation">
                      {[member.department, member.organisation || member.affiliation]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── Call to Action ── */}
      <section className="eb-cta">
        <div className="eb-cta-gradient" />
        <div className="eb-cta-content">
          <h3 className="eb-cta-title">Join the Board</h3>
          <p className="eb-cta-text">
            We are currently accepting nominations for associate editorial positions. If you are a specialist in the fields covered by this journal, we invite your application.
          </p>
          <p className="eb-cta-contact">
            Contact us at{' '}
            <a href={`mailto:${chiefEditor?.email || 'breakthroughpublishers@gmail.com'}`}>
              {chiefEditor?.email || 'breakthroughpublishers@gmail.com'}
            </a>
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="eb-footer">
        <div className="eb-footer-inner">
          <div className="eb-footer-brand">
            <span className="eb-footer-name">{currentJournal?.name || currentJournal?.short_form}</span>
            <p className="eb-footer-copy">
              &copy; {new Date().getFullYear()} {currentJournal?.name || currentJournal?.short_form}. All research licensed under Creative Commons.
            </p>
          </div>
          <div className="eb-footer-links">
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-of-service">Terms of Service</Link>
            <a href="#">Contact Us</a>
            <a href="#">Open Access Policy</a>
          </div>
          <div className="eb-footer-icons">
            <span className="material-symbols-rounded">language</span>
            <span className="material-symbols-rounded">share</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default JournalEditorialBoardPage;
