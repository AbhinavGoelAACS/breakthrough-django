import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import acsApi from '../../api/apiService';
import { API_BASE_URL } from '../../api/axios';
import StatusChips from '../../components/StatusChips/StatusChips';
import { formatDateTimeIST } from '../../utils/dateUtils';
import styles from './SubmissionHistoryPage.module.css';

const SubmissionHistoryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { info } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await acsApi.editor.getSubmissionHistory(id);
        setData(response);
      } catch (err) {
        console.error('Failed to fetch submission history:', err);
        const msg = err.response?.data?.detail || 'Failed to load submission history';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [id]);

  const handleViewVersionFile = (paperId, versionId) => {
    const token = localStorage.getItem('authToken');
    const url = `${API_BASE_URL}/api/v1/editor/papers/${paperId}/versions/${versionId}/view?token=${token}`;
    window.open(url, '_blank');
    info('Opening file in new tab...', 2000);
  };

  const handleViewCurrentFile = (fileType) => {
    const token = localStorage.getItem('authToken');
    const url = `${API_BASE_URL}/api/v1/editor/papers/${id}/view-${fileType}?token=${token}`;
    window.open(url, '_blank');
    info('Opening file in new tab...', 2000);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const goBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <span className="material-symbols-rounded">hourglass_empty</span>
          <p>Loading submission history...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <span className="material-symbols-rounded">error</span>
          <p>{error || 'Failed to load data'}</p>
          <button className={styles.backBtn} onClick={goBack}>Go Back</button>
        </div>
      </div>
    );
  }

  const { paper_id, paper_title, paper_status, current_version, revision_count, versions } = data;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <button className={styles.backLink} onClick={goBack}>
            <span className="material-symbols-rounded">arrow_back</span>
            <span>Back to Paper</span>
          </button>

          <div className={styles.headerMain}>
            <div className={styles.headerLeft}>
              <h1 className={styles.pageTitle}>Submission History</h1>
              <StatusChips status={paper_status} />
            </div>
            <div className={styles.headerMeta}>
              <span className={styles.versionInfo}>
                <span className="material-symbols-rounded">layers</span>
                Current Version: <strong>V{current_version || 1}</strong>
              </span>
              {revision_count > 0 && (
                <span className={styles.revisionInfo}>
                  <span className="material-symbols-rounded">replay</span>
                  {revision_count} Revision{revision_count !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <p className={styles.paperTitle}>{paper_title}</p>
        </div>
      </header>

      {/* Current Version Files */}
      <div className={styles.content}>
        <section className={styles.currentFilesSection}>
          <h2 className={styles.sectionTitle}>
            <span className="material-symbols-rounded">folder_open</span>
            Current Version Files
          </h2>
          <div className={styles.fileGrid}>
            <button className={styles.fileCard} onClick={() => handleViewCurrentFile('title-page')}>
              <span className={`material-symbols-rounded ${styles.fileIcon}`}>article</span>
              <span className={styles.fileLabel}>Title Page</span>
              <span className={`material-symbols-rounded ${styles.openIcon}`}>open_in_new</span>
            </button>
            <button className={styles.fileCard} onClick={() => handleViewCurrentFile('blinded-manuscript')}>
              <span className={`material-symbols-rounded ${styles.fileIcon}`}>description</span>
              <span className={styles.fileLabel}>Blinded Manuscript</span>
              <span className={`material-symbols-rounded ${styles.openIcon}`}>open_in_new</span>
            </button>
            {current_version > 1 && (
              <>
                <button className={styles.fileCard} onClick={() => handleViewCurrentFile('track-changes')}>
                  <span className={`material-symbols-rounded ${styles.fileIcon}`}>track_changes</span>
                  <span className={styles.fileLabel}>Track Changes</span>
                  <span className={`material-symbols-rounded ${styles.openIcon}`}>open_in_new</span>
                </button>
                <button className={styles.fileCard} onClick={() => handleViewCurrentFile('clean-revision')}>
                  <span className={`material-symbols-rounded ${styles.fileIcon}`}>edit_document</span>
                  <span className={styles.fileLabel}>Clean Revision</span>
                  <span className={`material-symbols-rounded ${styles.openIcon}`}>open_in_new</span>
                </button>
                <button className={styles.fileCard} onClick={() => handleViewCurrentFile('response-to-reviewer')}>
                  <span className={`material-symbols-rounded ${styles.fileIcon}`}>reply</span>
                  <span className={styles.fileLabel}>Response to Reviewer</span>
                  <span className={`material-symbols-rounded ${styles.openIcon}`}>open_in_new</span>
                </button>
              </>
            )}
          </div>
        </section>

        {/* Version Timeline */}
        <section className={styles.timelineSection}>
          <h2 className={styles.sectionTitle}>
            <span className="material-symbols-rounded">timeline</span>
            Version Timeline
          </h2>

          {versions.length === 0 ? (
            <div className={styles.emptyState}>
              <span className="material-symbols-rounded">inventory_2</span>
              <p>No version history recorded. This is the original submission.</p>
            </div>
          ) : (
            <div className={styles.timeline}>
              {versions.map((version, idx) => (
                <div key={version.id} className={styles.timelineItem}>
                  <div className={styles.timelineConnector}>
                    <div className={`${styles.timelineDot} ${idx === 0 ? styles.dotCurrent : ''}`} />
                    {idx < versions.length - 1 && <div className={styles.timelineLine} />}
                  </div>

                  <div className={styles.versionCard}>
                    <div className={styles.versionHeader}>
                      <span className={`${styles.versionBadge} ${idx === 0 ? styles.badgeCurrent : ''}`}>
                        V{version.version_number}
                      </span>
                      <span className={styles.versionDate}>
                        {version.uploaded_on ? formatDateTimeIST(version.uploaded_on) : 'Date unknown'}
                      </span>
                      {idx === 0 && <span className={styles.currentTag}>Current</span>}
                    </div>

                    {version.uploaded_by && (
                      <div className={styles.versionMeta}>
                        <span className="material-symbols-rounded">person</span>
                        Uploaded by: {version.uploaded_by}
                      </div>
                    )}

                    {version.revision_reason && (
                      <div className={styles.versionDetail}>
                        <strong>Revision Reason:</strong>
                        <p>{version.revision_reason}</p>
                      </div>
                    )}

                    {version.change_summary && (
                      <div className={styles.versionDetail}>
                        <strong>Change Summary:</strong>
                        <p>{version.change_summary}</p>
                      </div>
                    )}

                    <div className={styles.versionActions}>
                      {version.file_size && (
                        <span className={styles.fileSize}>
                          <span className="material-symbols-rounded">description</span>
                          {formatFileSize(version.file_size)}
                        </span>
                      )}
                      {version.file && (
                        <button
                          className={styles.viewFileBtn}
                          onClick={() => handleViewVersionFile(paper_id, version.id)}
                        >
                          <span className="material-symbols-rounded">visibility</span>
                          View File
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SubmissionHistoryPage;
