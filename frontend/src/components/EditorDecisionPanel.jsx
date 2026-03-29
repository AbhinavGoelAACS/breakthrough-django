import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import acsApi from '../api/apiService.js';
import { formatDateUS } from '../utils/dateUtils';
import styles from './EditorDecisionPanel.module.css';

const DECISIONS = [
  { value: 'accepted', label: 'Accept', color: 'success', icon: '✓' },
  { value: 'correction', label: 'Request Revisions', color: 'warning', icon: '⟳' },
  { value: 'rejected', label: 'Reject', color: 'danger', icon: '✗' }
];

const REVISION_TYPES = [
  { value: 'minor', label: 'Minor Revisions' },
  { value: 'major', label: 'Major Revisions' }
];

export default function EditorDecisionPanel() {
  const { paperId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [paperDetails, setPaperDetails] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [statistics, setStatistics] = useState(null);

  const [selectedDecision, setSelectedDecision] = useState(null);
  const [revisionType, setRevisionType] = useState('minor');
  const [editorComments, setEditorComments] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const [expandedReview, setExpandedReview] = useState(null);

  useEffect(() => {
    loadPaperReviews();
  }, [paperId]);

  const loadPaperReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await acsApi.editor.getPaperReviews(paperId);
      setPaperDetails({
        paper_id: response.paper_id,
        paper_name: response.paper_name,
        author: response.author,
        abstract: response.abstract,
        keywords: response.keywords,
        status: response.status,
        submitted_date: response.submitted_date
      });
      setReviews(response.reviews);
      setStatistics(response.statistics);
    } catch (err) {
      setError(
        err.response?.status === 404
          ? 'Paper or reviews not found'
          : err.message || 'Failed to load paper reviews'
      );
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!selectedDecision) {
      errors.decision = 'Please select a decision';
    }

    if (!editorComments.trim()) {
      errors.editorComments = 'Editor comments are required';
    } else if (editorComments.length < 50) {
      errors.editorComments = 'Comments must be at least 50 characters';
    }

    if (selectedDecision === 'correction' && !revisionType) {
      errors.revisionType = 'Please specify revision type';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitDecision = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const decisionPayload = {
        decision: selectedDecision,
        editor_comments: editorComments.trim()
      };

      if (selectedDecision === 'correction') {
        decisionPayload.revision_type = revisionType;
      }

      const response = await acsApi.editor.makePaperDecision(paperId, decisionPayload);

      setSuccess(true);
      setSuccessMessage(`Decision recorded: ${response.decision.toUpperCase()}`);
      
      setTimeout(() => {
        navigate(-1); // Go back to previous page (works for both admin and editor)
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Failed to record decision'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <span className="material-symbols-rounded">hourglass_empty</span>
          <h3>Loading Paper Details</h3>
          <p>Please wait while we fetch the paper and reviews...</p>
        </div>
      </div>
    );
  }

  if (error && !paperDetails) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <span className="material-symbols-rounded">error</span>
          <h3>Error Loading Paper</h3>
          <p>{error}</p>
          <button onClick={loadPaperReviews} className={styles.retryBtn}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.successState}>
          <span className="material-symbols-rounded">check_circle</span>
          <h3>Decision Recorded Successfully</h3>
          <p>{successMessage}</p>
          <p>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1>
            <span className="material-symbols-rounded">gavel</span>
            Editorial Decision Panel
          </h1>
        </div>
        <button onClick={() => navigate(-1)} className={styles.backBtn}>
          <span className="material-symbols-rounded">arrow_back</span>
          Back
        </button>
      </header>

      {/* Paper Details Card */}
      <div className={styles.paperCard}>
        <div className={styles.paperHeader}>
          <h2 className={styles.paperTitle}>{paperDetails?.paper_name || 'Untitled Paper'}</h2>
          <div className={styles.paperMeta}>
            <div className={styles.metaItem}>
              <span className="material-symbols-rounded">person</span>
              {paperDetails?.author || 'Unknown Author'}
            </div>
            <div className={styles.metaItem}>
              <span className="material-symbols-rounded">calendar_today</span>
              {formatDateUS(paperDetails?.submitted_date)}
            </div>
            <span className={`${styles.statusBadge} ${styles[paperDetails?.status] || ''}`}>
              {paperDetails?.status?.replace(/_/g, ' ') || 'Unknown'}
            </span>
          </div>
        </div>

        {paperDetails?.abstract && (
          <div className={styles.abstractSection}>
            <p className={styles.abstractLabel}>Abstract</p>
            <p className={styles.abstractText}>{paperDetails.abstract}</p>
          </div>
        )}

        {paperDetails?.keywords && (
          <div className={styles.keywordsSection}>
            <p className={styles.abstractLabel}>Keywords</p>
            <div className={styles.keywordsList}>
              {paperDetails.keywords.split(',').map((kw, idx) => (
                <span key={idx} className={styles.keyword}>{kw.trim()}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Review Statistics */}
      {statistics && (
        <section className={styles.statsSection}>
          <h3 className={styles.sectionTitle}>
            <span className="material-symbols-rounded">analytics</span>
            Review Summary
          </h3>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{statistics.total_reviews || 0}</div>
              <div className={styles.statLabel}>Total Reviews</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{statistics.average_rating?.toFixed(1) || '0.0'}</div>
              <div className={styles.statLabel}>Avg Rating</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statValue} ${styles.success}`}>{statistics.accept_count || 0}</div>
              <div className={styles.statLabel}>Accept</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statValue} ${styles.warning}`}>{statistics.minor_revisions_count || 0}</div>
              <div className={styles.statLabel}>Minor Rev.</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statValue} ${styles.orange}`}>{statistics.major_revisions_count || 0}</div>
              <div className={styles.statLabel}>Major Rev.</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statValue} ${styles.danger}`}>{statistics.reject_count || 0}</div>
              <div className={styles.statLabel}>Reject</div>
            </div>
          </div>
        </section>
      )}

      {/* Reviews List */}
      {reviews && reviews.length > 0 && (
        <section className={styles.reviewsSection}>
          <h3 className={styles.sectionTitle}>
            <span className="material-symbols-rounded">rate_review</span>
            Reviewer Feedback ({reviews.length})
          </h3>
          <div className={styles.reviewsList}>
            {reviews.map((review, index) => (
              <div key={review.review_id || index} className={styles.reviewCard}>
                <div
                  className={styles.reviewHeader}
                  onClick={() => setExpandedReview(expandedReview === index ? null : index)}
                >
                  <div className={styles.reviewMeta}>
                    <span className={styles.reviewerName}>{review.reviewer_name || review.reviewer_email || 'Reviewer'}</span>
                    {review.rating && (
                      <span className={styles.ratingBadge}>★ {review.rating}/5</span>
                    )}
                    {review.recommendation && (
                      <span className={`${styles.recommendationBadge} ${styles[review.recommendation]}`}>
                        {review.recommendation.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <button className={styles.expandBtn}>
                    <span className="material-symbols-rounded">
                      {expandedReview === index ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                </div>

                {expandedReview === index && (
                  <div className={styles.reviewBody}>
                    <div className={styles.reviewComments}>
                      <strong>Comments to Author</strong>
                      <p>{review.author_comments || 'No comments provided'}</p>
                    </div>
                    {review.editor_comments && (
                      <div className={styles.reviewComments}>
                        <strong>Confidential Comments to Editor</strong>
                        <p>{review.editor_comments}</p>
                      </div>
                    )}
                    <div className={styles.reviewDate}>
                      Submitted: {formatDateUS(review.submitted_date)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Decision Section */}
      <div className={styles.decisionSection}>
        <h3 className={styles.sectionTitle}>
          <span className="material-symbols-rounded">how_to_vote</span>
          Make Your Decision
        </h3>

        {error && (
          <div className={styles.errorMessage}>
            <span className="material-symbols-rounded">warning</span>
            {error}
          </div>
        )}

        {/* Decision Selection */}
        <div className={styles.decisionButtons}>
          {DECISIONS.map(decision => (
            <button
              key={decision.value}
              className={`${styles.decisionBtn} ${styles[decision.color]} ${selectedDecision === decision.value ? styles.selected : ''}`}
              onClick={() => {
                setSelectedDecision(decision.value);
                setValidationErrors(prev => ({ ...prev, decision: null }));
              }}
              disabled={submitting}
            >
              <span className={styles.decisionIcon}>{decision.icon}</span>
              <span className={styles.decisionLabel}>{decision.label}</span>
            </button>
          ))}
        </div>

        {validationErrors.decision && (
          <div className={styles.validationError}>{validationErrors.decision}</div>
        )}

        {/* Revision Type (if correction selected) */}
        {selectedDecision === 'correction' && (
          <div className={styles.revisionTypeSection}>
            <label>Revision Type:</label>
            <div className={styles.revisionOptions}>
              {REVISION_TYPES.map(type => (
                <label key={type.value} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="revision_type"
                    value={type.value}
                    checked={revisionType === type.value}
                    onChange={(e) => setRevisionType(e.target.value)}
                    disabled={submitting}
                  />
                  <span>{type.label}</span>
                </label>
              ))}
            </div>
            {validationErrors.revisionType && (
              <div className={styles.validationError}>{validationErrors.revisionType}</div>
            )}
          </div>
        )}

        {/* Editor Comments */}
        <div className={styles.commentsSection}>
          <label>
            Editor Comments
            <span className={styles.required}>*</span>
            <span className={styles.hint}>(Minimum 50 characters)</span>
          </label>
          {validationErrors.editorComments && (
            <div className={styles.validationError}>{validationErrors.editorComments}</div>
          )}
          <textarea
            className={styles.textarea}
            value={editorComments}
            onChange={(e) => {
              setEditorComments(e.target.value);
              setValidationErrors(prev => ({ ...prev, editorComments: null }));
            }}
            placeholder="Provide detailed feedback for the author. Include specific comments based on the reviewer recommendations and your own evaluation of the paper."
            disabled={submitting}
          />
          <div className={styles.charCount}>
            {editorComments.length} characters (minimum 50)
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button
            className={styles.cancelBtn}
            onClick={() => navigate('/editor-dashboard')}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmitDecision}
            disabled={submitting || !selectedDecision}
          >
            {submitting ? 'Recording Decision...' : 'Record Decision'}
          </button>
        </div>
      </div>
    </div>
  );
}
