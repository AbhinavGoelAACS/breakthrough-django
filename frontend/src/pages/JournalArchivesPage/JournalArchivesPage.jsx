/**
 * JournalArchivesPage Component
 * 
 * Archives page for journal pages (accessed via /j/:shortForm route).
 * Displays volumes, issues, and published articles.
 */

import React, { useState, useEffect } from 'react';
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
    // Check URL params for pre-selected volume
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
      
      // Auto-expand latest volume
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
      // Set empty array on error to show "No issues available" instead of infinite loader
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
      {/* Page Header */}
      <header className="archives-page-header">
        <div className="archives-header-content">
          <h1>Archives</h1>
          <p>Browse all published volumes and issues of {currentJournal.short_form}</p>
        </div>
      </header>

      <div className="archives-content">
        {volumes.length === 0 ? (
          <div className="no-archives">
            <span className="material-symbols-rounded">folder_open</span>
            <h3>No Archives Yet</h3>
            <p>No volumes have been published yet. Check back soon!</p>
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
                            to={`/volume/${volume.volume_no}/issue/${issue.issue_no}`}
                            className="issue-card"
                          >
                            <div className="issue-cover">
                              <span className="material-symbols-rounded">menu_book</span>
                            </div>
                            <div className="issue-info">
                              <h4>Issue {issue.issue_no}</h4>
                              {issue.month && <p className="issue-month">{issue.month}</p>}
                              {issue.paper_count !== undefined && (
                                <p className="issue-papers">{issue.paper_count} Articles</p>
                              )}
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
      </div>
    </div>
  );
};

export default JournalArchivesPage;
