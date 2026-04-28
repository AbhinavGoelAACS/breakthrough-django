/**
 * JournalArchivesPage Component
 * 
 * Archives page for journal pages (accessed via /j/:shortForm route).
 * Displays volumes, issues, and published articles.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useJournalContext } from '../../contexts/JournalContext';
import { acsApi } from '../../api/apiService';
import './JournalArchivesPage.css';

const JournalArchivesPage = () => {
  const { currentJournal, loading: contextLoading } = useJournalContext();
  const [searchParams] = useSearchParams();

  const [volumes, setVolumes] = useState([]);
  const [selectedVolume, setSelectedVolume] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedVolumes, setExpandedVolumes] = useState({});

  useEffect(() => {
    if (currentJournal?.id) {
      fetchVolumes();
    }
  }, [currentJournal]);

  useEffect(() => {
    const volumeParam = searchParams.get('volume');
    if (volumeParam && volumes.length > 0) {
      const vol = volumes.find(v => v.volume_no === parseInt(volumeParam));
      if (vol) {
        setSelectedVolume(vol);
        toggleVolume(vol.volume_no);
      }
    }
  }, [searchParams, volumes]);

  const fetchVolumes = async () => {
    try {
      setLoading(true);
      const response = await acsApi.journals.getVolumes(currentJournal.id);
      setVolumes(response.volumes || []);
      if (response.volumes?.length > 0) {
        const latestVolume = response.volumes[0];
        setExpandedVolumes({ [latestVolume.volume_no]: true });
        fetchIssuesForVolume(latestVolume.volume_no);
      }
    } catch (err) {
      console.error('Failed to fetch volumes:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchIssuesForVolume = async (volumeNo) => {
    try {
      const response = await acsApi.journals.getVolumeIssues(currentJournal.id, volumeNo);
      setIssues(prev => ({
        ...prev,
        [volumeNo]: response.issues || []
      }));
    } catch (err) {
      console.error('Failed to fetch issues:', err);
      setIssues(prev => ({
        ...prev,
        [volumeNo]: []
      }));
    }
  };

  const toggleVolume = (volumeNo) => {
    const isExpanded = expandedVolumes[volumeNo];
    setExpandedVolumes(prev => ({
      ...prev,
      [volumeNo]: !isExpanded
    }));
    if (!isExpanded && !issues[volumeNo]) {
      fetchIssuesForVolume(volumeNo);
    }
  };

  const totalArticles = useMemo(() => {
    let count = 0;
    Object.values(issues).forEach(issueList => {
      if (Array.isArray(issueList)) {
        issueList.forEach(issue => {
          count += issue.paper_count || 0;
        });
      }
    });
    return count;
  }, [issues]);

  const journalBasePath = `/j/${currentJournal?.short_form || ''}`;

  if (contextLoading || loading) {
    return (
      <div className="archives-loading">
        <div className="spinner"></div>
        <p>Loading archives...</p>
      </div>
    );
  }

  if (!currentJournal) {
    return (
      <div className="archives-error">
        <h2>Journal not found</h2>
      </div>
    );
  }

  return (
    <div className="journal-archives-page">

      {/* ── Hero Header ── */}
      <section className="archives-hero">
        <div className="archives-hero-grid">
          <div className="archives-hero-left">
            <h1 className="archives-hero-title">
              The Records of <span className="archives-hero-italic">Scholarship</span>
            </h1>
            <p className="archives-hero-subtitle">
              Explore our growing collection of open-access research, preserved for the future of {currentJournal.name || currentJournal.short_form}.
            </p>
          </div>
          <div className="archives-hero-right">
            <div className="archives-stat-card">
              <span className="archives-stat-number">{totalArticles}</span>
              <span className="archives-stat-label">Articles Published</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Content: Empty State or Volumes ── */}
      <section className="archives-body">
        {volumes.length === 0 ? (
          <div className="archives-empty">
            {/* Decorative blurs */}
            <div className="archives-empty-blur archives-empty-blur-1" />
            <div className="archives-empty-blur archives-empty-blur-2" />

            <div className="archives-empty-content">
              <div className="archives-empty-icon-wrap">
                <span className="material-symbols-rounded archives-empty-icon">folder_open</span>
              </div>
              <h2 className="archives-empty-title">No Archives Yet</h2>
              <p className="archives-empty-text">
                Our digital ink is still drying. We are currently curating the inaugural issue of <em>{currentJournal.name || currentJournal.short_form}</em>. Be among the first to preserve your research in our collection.
              </p>
              <div className="archives-empty-buttons">
                <Link to={`${journalBasePath}/submit`} className="archives-empty-btn-primary">
                  Start Your Submission
                </Link>
                <Link to={`${journalBasePath}/guidelines`} className="archives-empty-btn-outline">
                  Author Guidelines
                </Link>
              </div>
            </div>

            <div className="archives-empty-quote">
              <p className="archives-empty-quote-text">"The archive is not a quiet place of rest; it is the living memory of the future."</p>
              <span className="archives-empty-quote-attr">— Curatorial Statement v.1.0</span>
            </div>
          </div>
        ) : (
          <div className="volumes-list">
            {volumes.map((volume) => (
              <div key={volume.volume_no} className="volume-accordion">
                <button
                  className={`volume-header ${expandedVolumes[volume.volume_no] ? 'expanded' : ''}`}
                  onClick={() => toggleVolume(volume.volume_no)}
                >
                  <div className="volume-info">
                    <span className="volume-title">Volume {volume.volume_no}</span>
                    {volume.year && <span className="volume-year">({volume.year})</span>}
                    {volume.issue_count && (
                      <span className="volume-issue-count">{volume.issue_count} Issues</span>
                    )}
                  </div>
                  <span className="material-symbols-rounded expand-icon">
                    {expandedVolumes[volume.volume_no] ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {expandedVolumes[volume.volume_no] && (
                  <div className="volume-content">
                    {!issues[volume.volume_no] ? (
                      <div className="issues-loading">
                        <div className="spinner-small"></div>
                        <span>Loading issues...</span>
                      </div>
                    ) : issues[volume.volume_no].length === 0 ? (
                      <p className="no-issues">No issues available for this volume.</p>
                    ) : (
                      <div className="issues-grid">
                        {issues[volume.volume_no].map((issue) => (
                          <Link
                            key={issue.issue_no}
                            to={`../volume/${volume.volume_no}/issue/${issue.issue_no}`}
                            className="issue-card"
                          >
                            <div className="issue-accent" />
                            <div className="issue-body">
                              <div className="issue-header-row">
                                <h4 className="issue-title">Issue {issue.issue_no}</h4>
                                {issue.month && <span className="issue-period">{issue.month}</span>}
                              </div>
                              <div className="issue-meta-row">
                                <span className="issue-badge">{issue.paper_count ?? 0} Articles Published</span>
                                <span className="material-symbols-rounded issue-arrow">chevron_right</span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Bento Feature Grid ── */}
      <section className="archives-bento">
        <div className="archives-bento-grid">
          <div className="bento-card bento-card-light">
            <div className="bento-icon bento-icon-secondary">
              <span className="material-symbols-rounded">menu_book</span>
            </div>
            <h3 className="bento-title">Open Access</h3>
            <p className="bento-text">
              All research is licensed under Creative Commons, ensuring permanent global accessibility without barriers.
            </p>
          </div>
          <div className="bento-card bento-card-dim">
            <div className="bento-icon bento-icon-primary">
              <span className="material-symbols-rounded">history_edu</span>
            </div>
            <h3 className="bento-title">Rigorous Review</h3>
            <p className="bento-text">
              Our double-blind peer review process ensures that every archival entry meets the highest academic standards.
            </p>
          </div>
          <div className="bento-card bento-card-light">
            <div className="bento-icon bento-icon-tertiary">
              <span className="material-symbols-rounded">database</span>
            </div>
            <h3 className="bento-title">Digital Longevity</h3>
            <p className="bento-text">
              We use resilient digital preservation strategies to ensure your research outlives the platforms that hold it.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="archives-footer">
        <div className="archives-footer-inner">
          <div className="archives-footer-brand">
            <span className="archives-footer-name">{currentJournal.name || currentJournal.short_form}</span>
            <p className="archives-footer-copy">
              &copy; {new Date().getFullYear()} {currentJournal.name || currentJournal.short_form}. All research licensed under Creative Commons.
            </p>
          </div>
          <div className="archives-footer-links">
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-of-service">Terms of Service</Link>
            <a href="#">Contact Us</a>
            <a href="#">Open Access Policy</a>
          </div>
          <div className="archives-footer-icons">
            <span className="material-symbols-rounded">language</span>
            <span className="material-symbols-rounded">share</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default JournalArchivesPage;
