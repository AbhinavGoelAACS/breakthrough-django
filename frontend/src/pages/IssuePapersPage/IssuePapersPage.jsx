import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useJournalContext } from '../../contexts/JournalContext';
import { acsApi, apiService } from '../../api/apiService';
import { formatDateIST } from '../../utils/dateUtils';
import './IssuePapersPage.css';

const parseCoAuthorsJson = (jsonString) => {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
};

const parseAuthors = (authorString) => {
  if (!authorString) return [];
  return authorString.split(',').map(a => a.trim()).filter(a => a);
};

const AuthorChips = ({ structuredAuthors, fallbackAuthor }) => {
  if (structuredAuthors && structuredAuthors.length > 0) {
    return (
      <div className="author-chips">
        {structuredAuthors.map((author, idx) => (
          <span key={idx} className="author-chip" onClick={(e) => e.preventDefault()}>
            <span className="author-number">{idx + 1}</span>
            <span className="author-name-text">{author.name}</span>
            {author.is_corresponding && (
              <span className="corr-star" title="Corresponding Author">*</span>
            )}
            <span className="author-detail">
              <span className="detail-name">{author.name}</span>
              {author.email && (
                <span className="detail-row">
                  <span className="material-symbols-rounded">email</span>
                  <a href={`mailto:${author.email}`} onClick={(e) => e.stopPropagation()}>{author.email}</a>
                </span>
              )}
              {author.affiliation && (
                <span className="detail-row">
                  <span className="material-symbols-rounded">business</span>
                  {author.affiliation}
                </span>
              )}
              {author.is_corresponding && (
                <span className="detail-corr">Corresponding Author</span>
              )}
            </span>
          </span>
        ))}
      </div>
    );
  }

  const authors = parseAuthors(fallbackAuthor);
  if (authors.length > 0) {
    return (
      <div className="author-chips">
        {authors.map((author, idx) => (
          <span key={idx} className="author-chip" onClick={(e) => e.preventDefault()}>
            <span className="author-number">{idx + 1}</span>
            <span className="author-name-text">{author}</span>
          </span>
        ))}
      </div>
    );
  }

  return null;
};

const IssuePapersPage = () => {
  const { id: urlJournalId, volumeNo, issueNo } = useParams();
  const { currentJournal, isJournalSite } = useJournalContext();
  const navigate = useNavigate();
  
  // Use journal ID from URL params, or from context if on journal page route
  const journalId = urlJournalId || currentJournal?.id;
  
  const [journal, setJournal] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!journalId) {
      setError('Journal not found');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Use current journal from context if available, otherwise fetch
      if (isJournalSite && currentJournal) {
        setJournal(currentJournal);
      } else {
        const journalData = await acsApi.journals.getDetail(journalId);
        setJournal(journalData);
      }

      // Fetch papers for this issue - using correct API path (public, no auth required)
      const papersResponse = await apiService.get(
        `/api/v1/journals/${journalId}/issues/${volumeNo}/${issueNo}/papers`,
        { skipAuth: true }
      );
      setPapers(papersResponse.papers || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load issue papers');
    } finally {
      setLoading(false);
    }
  }, [journalId, currentJournal, isJournalSite, volumeNo, issueNo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="issue-papers-page">
        <div className="issue-papers-loading">
          <div className="spinner"></div>
          <p>Loading papers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="issue-papers-page">
        <div className="issue-papers-error">
          <p>{error}</p>
          <button className="btn-back" onClick={() => navigate(isJournalSite ? '/archives' : `/journal/${journalId}`)}>
            {isJournalSite ? 'Back to Archives' : 'Back to Journal'}
          </button>
        </div>
      </div>
    );
  }

  // Get display name, handling different field names
  const journalName = journal?.name || journal?.fld_journal_name || journal?.short_form || 'Journal';

  return (
    <div className="issue-papers-page">
      {/* Header */}
      <div className="issue-papers-header">
        <div className="issue-papers-header-content">
          <h1>{journalName}</h1>
          <div className="issue-info">
            <span className="volume-badge">Volume {volumeNo}</span>
            <span className="issue-badge">Issue {issueNo}</span>
          </div>
        </div>
      </div>

      {/* Papers List */}
      <div className="issue-papers-container">
        <div className="issue-papers-main">
          <div className="papers-header">
            <h2>Published Papers</h2>
            <span className="papers-count">{papers.length} {papers.length === 1 ? 'Paper' : 'Papers'}</span>
          </div>

          {papers.length === 0 ? (
            <div className="no-papers">
              <span className="material-symbols-rounded">article</span>
              <p>No papers published in this issue yet.</p>
            </div>
          ) : (
            <div className="papers-list">
              {papers.map((paper, index) => (
                <Link 
                  key={paper.id} 
                  to={`/article/${paper.id}`}
                  className="paper-card"
                >
                  <div className="paper-number">{index + 1}</div>
                  <div className="paper-content">
                    <h3 className="paper-title">{paper.title}</h3>
                    <AuthorChips
                      structuredAuthors={parseCoAuthorsJson(paper.co_authors_json)}
                      fallbackAuthor={paper.author || paper.authors}
                    />
                    <div className="paper-meta">
                      {paper.pages && (
                        <span className="paper-pages">
                          <span className="material-symbols-rounded">menu_book</span>
                          Pages: {paper.pages}
                        </span>
                      )}
                      {paper.doi && (
                        <span className="paper-doi">
                          <span className="material-symbols-rounded">link</span>
                          DOI: {paper.doi}
                        </span>
                      )}
                      {paper.published_date && (
                        <span className="paper-date">
                          <span className="material-symbols-rounded">calendar_today</span>
                          {formatDateIST(paper.published_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="paper-arrow">
                    <span className="material-symbols-rounded">chevron_right</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssuePapersPage;
