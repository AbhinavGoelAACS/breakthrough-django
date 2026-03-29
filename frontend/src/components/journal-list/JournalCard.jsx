import React from 'react';
import { Link } from 'react-router-dom';
import './JournalCard.css';

const JournalCard = ({ journal }) => {
  if (!journal) return null;

  // Function to strip HTML tags from description
  const stripHtmlTags = (html) => {
    if (!html) return 'No description available';
    // Remove HTML tags
    const stripped = html.replace(/<[^>]*>/g, '');
    // Decode HTML entities
    const decoded = new DOMParser().parseFromString(stripped, 'text/html').body.textContent || stripped;
    return decoded.trim();
  };

  // Get the route URL for this journal
  const journalUrl = `/j/${journal.short_form}`;

  return (
    <div className="journal-card">
      <div className="journal-card-header">
        {journal.journal_logo && (
          <img
            src={journal.journal_logo}
            alt={journal.short_form || journal.name}
            className="journal-card-logo"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}
        <div className="journal-card-title">
          <h3>{journal.name}</h3>
          {journal.short_form && (
            <span className="journal-short-form">({journal.short_form})</span>
          )}
        </div>
      </div>

      <div className="journal-card-content">
        <div className="journal-card-editor">
          <strong>Chief Editor:</strong>
          <p>{journal.chief_editor || 'Not specified'}</p>
        </div>

        <div className="journal-card-issn">
          <div className="issn-item">
            <strong>ISSN Online:</strong>
            <p>{journal.issn_online || 'N/A'}</p>
          </div>
          <div className="issn-item">
            <strong>ISSN Print:</strong>
            <p>{journal.issn_print || 'N/A'}</p>
          </div>
        </div>

        <div className="journal-card-description">
          <p>{stripHtmlTags(journal.description)}</p>
        </div>
      </div>

      <div className="journal-card-footer">
        <Link
          to={journalUrl}
          className="journal-card-btn journal-visit-btn"
        >
          Visit Journal <span className="material-symbols-rounded">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
};

export default JournalCard;
