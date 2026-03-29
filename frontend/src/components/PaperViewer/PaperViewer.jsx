import React from 'react';
import { formatDateIST } from '../../utils/dateUtils';
import { API_BASE_URL } from '../../api/axios';
import styles from './PaperViewer.module.css';

const PaperViewer = ({ paper, reviewId }) => {
  if (!paper) {
    return (
      <div className={styles.paperViewer}>
        <div className={styles.noContent}>
          <span className="material-symbols-rounded">description</span>
          <p>No paper information available</p>
        </div>
      </div>
    );
  }

  const getAuthToken = () => localStorage.getItem('authToken');
  const baseUrl = API_BASE_URL;

  const handleViewPaper = () => {
    const token = getAuthToken();
    if (reviewId && token) {
      const viewUrl = `${baseUrl}/api/v1/reviewer/assignments/${reviewId}/view-paper?token=${token}`;
      window.open(viewUrl, '_blank');
    } else if (!token) {
      alert('Please log in to view the paper');
    }
  };

  const handleViewTrackChanges = () => {
    const token = getAuthToken();
    if (reviewId && token) {
      const viewUrl = `${baseUrl}/api/v1/reviewer/assignments/${reviewId}/view-track-changes?token=${token}`;
      window.open(viewUrl, '_blank');
    }
  };

  const handleViewCleanManuscript = () => {
    const token = getAuthToken();
    if (reviewId && token) {
      const viewUrl = `${baseUrl}/api/v1/reviewer/assignments/${reviewId}/view-clean-manuscript?token=${token}`;
      window.open(viewUrl, '_blank');
    }
  };

  const handleViewResponseToReviewer = () => {
    const token = getAuthToken();
    if (reviewId && token) {
      const viewUrl = `${baseUrl}/api/v1/reviewer/assignments/${reviewId}/view-response-to-reviewer?token=${token}`;
      window.open(viewUrl, '_blank');
    }
  };

  const isResubmission = paper.is_resubmission || paper.version_number > 1;

  return (
    <div className={styles.paperViewer}>
      {/* Paper Header */}
      <div className={styles.paperHeader}>
        <h2 className={styles.title}>{paper.title || 'Untitled Paper'}</h2>
        <div className={styles.metadata}>
          <div className={styles.metaItem}>
            <span className="material-symbols-rounded">book</span>
            <div>
              <p className={styles.metaLabel}>Journal</p>
              <p className={styles.metaValue}>{paper.journal || 'Unknown'}</p>
            </div>
          </div>
          <div className={styles.metaItem}>
            <span className="material-symbols-rounded">calendar_today</span>
            <div>
              <p className={styles.metaLabel}>Submitted</p>
              <p className={styles.metaValue}>{formatDateIST(paper.submitted_date)}</p>
            </div>
          </div>
        </div>

        {/* Document Actions */}
        <div className={styles.documentActions}>
          {reviewId && (
            <button className={styles.downloadBtn} onClick={handleViewPaper} title="View paper in new tab">
              <span className="material-symbols-rounded">open_in_new</span>
              View Paper
            </button>
          )}
          
          {/* Resubmission Files - only shown for revised papers */}
          {isResubmission && reviewId && (
            <div className={styles.revisionFiles}>
              <h4 className={styles.revisionFilesTitle}>
                <span className="material-symbols-rounded">replay</span>
                Revision Documents
              </h4>
              <div className={styles.revisionButtons}>
                {paper.revised_track_changes && (
                  <button className={styles.revisionBtn} onClick={handleViewTrackChanges} title="View manuscript with track changes">
                    <span className="material-symbols-rounded">track_changes</span>
                    Track Changes
                  </button>
                )}
                {paper.revised_clean && (
                  <button className={styles.revisionBtn} onClick={handleViewCleanManuscript} title="View clean revised manuscript">
                    <span className="material-symbols-rounded">article</span>
                    Clean Manuscript
                  </button>
                )}
                {paper.response_to_reviewer && (
                  <button className={styles.revisionBtn} onClick={handleViewResponseToReviewer} title="View author's response to reviewer comments">
                    <span className="material-symbols-rounded">rate_review</span>
                    Response Letter
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Paper Content */}
      <div className={styles.paperContent}>
        {/* Abstract */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Abstract</h3>
          <p className={styles.sectionContent}>
            {paper.abstract || 'No abstract provided'}
          </p>
        </section>

        {/* Keywords */}
        {paper.keywords && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Keywords</h3>
            <div className={styles.keywords}>
              {paper.keywords.split(',').map((keyword, idx) => (
                <span key={idx} className={styles.keyword}>
                  {keyword.trim()}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default PaperViewer;
