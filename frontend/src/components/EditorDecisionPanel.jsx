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

  // Reviewer pre-assignment state
  const [previousReviewers, setPreviousReviewers] = useState([]);
  const [previousReviewerActions, setPreviousReviewerActions] = useState({});
  const [loadingReviewers, setLoadingReviewers] = useState(false);
  const [newReviewers, setNewReviewers] = useState([]);
  const [showAddReviewerForm, setShowAddReviewerForm] = useState(false);
  const [newReviewerEmail, setNewReviewerEmail] = useState('');
  const [newReviewerName, setNewReviewerName] = useState('');
  const [newReviewerDueDays, setNewReviewerDueDays] = useState(14);
  const [newReviewerIsExternal, setNewReviewerIsExternal] = useState(false);

  useEffect(() => {
    loadPaperReviews();
  }, [paperId]);

  // Fetch previous reviewers when "correction" is selected
  useEffect(() => {
    if (selectedDecision === 'correction' && previousReviewers.length === 0) {
      loadPreviousReviewers();
    }
  }, [selectedDecision]);

  const loadPreviousReviewers = async () => {
    try {
      setLoadingReviewers(true);
      const response = await acsApi.editor.getPreviousReviewers(paperId);
      const reviewers = response.previous_reviewers || [];
      setPreviousReviewers(reviewers);
      // Default all to "reinvite"
      const actions = {};
      reviewers.forEach(r => { actions[r.reviewer_id] = 'reinvite'; });
      setPreviousReviewerActions(actions);
    } catch {
      // Non-critical — panel still works without previous reviewers
    } finally {
      setLoadingReviewers(false);
    }
  };

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

        // Include reviewer pre-assignments
        decisionPayload.previous_reviewers = previousReviewers.map(r => ({
          reviewer_id: r.reviewer_id,
          reviewer_email: r.reviewer_email,
          reviewer_name: r.reviewer_name,
          is_external: r.is_external,
          action: previousReviewerActions[r.reviewer_id] || 'skip'
        }));

        decisionPayload.new_reviewers = newReviewers.map(r => ({
          reviewer_email: r.email,
          reviewer_name: r.name,
          due_days: r.dueDays,
          is_external: r.isExternal
        }));
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

  const handlePreviousReviewerAction = (reviewerId, action) => {
    setPreviousReviewerActions(prev => ({ ...prev, [reviewerId]: action }));
  };

  const handleBulkAction = (action) => {
    const actions = {};
    previousReviewers.forEach(r => { actions[r.reviewer_id] = action; });
    setPreviousReviewerActions(actions);
  };

  const handleAddNewReviewer = () => {
    if (!newReviewerEmail.trim()) return;
    // Prevent duplicates
    if (newReviewers.some(r => r.email === newReviewerEmail.trim())) return;
    setNewReviewers(prev => [...prev, {
      email: newReviewerEmail.trim(),
      name: newReviewerName.trim(),
      dueDays: newReviewerDueDays,
      isExternal: newReviewerIsExternal
    }]);
    setNewReviewerEmail('');
    setNewReviewerName('');
    setNewReviewerDueDays(14);
    setNewReviewerIsExternal(false);
    setShowAddReviewerForm(false);
  };

  const handleRemoveNewReviewer = (email) => {
    setNewReviewers(prev => prev.filter(r => r.email !== email));
  };

  const getRecommendationLabel = (rec) => {
    const map = { accept: 'Accept', minor_revisions: 'Minor Revisions', major_revisions: 'Major Revisions', reject: 'Reject' };
    return map[rec] || rec || 'N/A';
  };

  const getRecommendationColor = (rec) => {
    const map = { accept: '#22c55e', minor_revisions: '#f59e0b', major_revisions: '#ea580c', reject: '#ef4444' };
    return map[rec] || '#94a3b8';
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

        {/* Reviewer Management for Revision */}
        {selectedDecision === 'correction' && (
          <div className={styles.reviewerManagementSection}>
            <h4 className={styles.reviewerSectionTitle}>
              <span className="material-symbols-rounded">group</span>
              Reviewer Assignment for Revision
              <span className={styles.queuedNote}>Invitations will be sent after author submits revision</span>
            </h4>

            {/* Previous Reviewers */}
            {loadingReviewers ? (
              <div className={styles.reviewerLoading}>
                <span className="material-symbols-rounded">hourglass_empty</span>
                Loading previous reviewers...
              </div>
            ) : previousReviewers.length > 0 ? (
              <div className={styles.previousReviewersBlock}>
                <div className={styles.previousReviewersHeader}>
                  <span className={styles.prevLabel}>Previous Reviewers ({previousReviewers.length})</span>
                  <div className={styles.bulkActions}>
                    <button type="button" className={styles.bulkBtn} onClick={() => handleBulkAction('reinvite')}>Re-invite All</button>
                    <button type="button" className={styles.bulkBtn} onClick={() => handleBulkAction('auto_assign')}>Auto-assign All</button>
                    <button type="button" className={`${styles.bulkBtn} ${styles.bulkSkip}`} onClick={() => handleBulkAction('skip')}>Skip All</button>
                  </div>
                </div>
                <div className={styles.prevReviewerCards}>
                  {previousReviewers.map(reviewer => {
                    const action = previousReviewerActions[reviewer.reviewer_id] || 'reinvite';
                    return (
                      <div key={reviewer.reviewer_id} className={`${styles.prevReviewerCard} ${action === 'skip' ? styles.skippedCard : ''}`}>
                        <div className={styles.prevReviewerInfo}>
                          <div className={styles.prevAvatar}>
                            {(reviewer.reviewer_name || reviewer.reviewer_email || '?')[0].toUpperCase()}
                          </div>
                          <div className={styles.prevDetails}>
                            <span className={styles.prevName}>{reviewer.reviewer_name || 'Unknown Reviewer'}</span>
                            <span className={styles.prevEmail}>{reviewer.reviewer_email}</span>
                            {reviewer.recommendation && (
                              <span
                                className={styles.prevRecommendation}
                                style={{ color: getRecommendationColor(reviewer.recommendation) }}
                              >
                                {getRecommendationLabel(reviewer.recommendation)}
                                {reviewer.overall_rating ? ` (★ ${reviewer.overall_rating}/5)` : ''}
                              </span>
                            )}
                            {reviewer.is_external && <span className={styles.externalBadge}>External</span>}
                          </div>
                        </div>
                        <div className={styles.actionToggle}>
                          <button
                            type="button"
                            className={`${styles.toggleBtn} ${action === 'reinvite' ? styles.toggleActive : ''}`}
                            onClick={() => handlePreviousReviewerAction(reviewer.reviewer_id, 'reinvite')}
                            title="Send a fresh invitation email after author resubmits"
                          >
                            <span className="material-symbols-rounded">mail</span>
                            Re-invite
                          </button>
                          <button
                            type="button"
                            className={`${styles.toggleBtn} ${action === 'auto_assign' ? styles.toggleActiveAssign : ''}`}
                            onClick={() => handlePreviousReviewerAction(reviewer.reviewer_id, 'auto_assign')}
                            title="Automatically assign without invitation step"
                          >
                            <span className="material-symbols-rounded">assignment_turned_in</span>
                            Auto-assign
                          </button>
                          <button
                            type="button"
                            className={`${styles.toggleBtn} ${action === 'skip' ? styles.toggleActiveSkip : ''}`}
                            onClick={() => handlePreviousReviewerAction(reviewer.reviewer_id, 'skip')}
                            title="Do not include this reviewer for the revision"
                          >
                            <span className="material-symbols-rounded">person_off</span>
                            Skip
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className={styles.noPrevReviewers}>No previous reviewers found for this paper.</p>
            )}

            {/* Invite New Reviewers */}
            <div className={styles.newReviewersBlock}>
              <div className={styles.newReviewersHeader}>
                <span className={styles.prevLabel}>Invite Additional Reviewers</span>
                {!showAddReviewerForm && (
                  <button type="button" className={styles.addReviewerBtn} onClick={() => setShowAddReviewerForm(true)}>
                    <span className="material-symbols-rounded">person_add</span>
                    Add Reviewer
                  </button>
                )}
              </div>

              {showAddReviewerForm && (
                <div className={styles.addReviewerForm}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Email <span className={styles.required}>*</span></label>
                      <input
                        type="email"
                        value={newReviewerEmail}
                        onChange={e => setNewReviewerEmail(e.target.value)}
                        placeholder="reviewer@example.com"
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Name</label>
                      <input
                        type="text"
                        value={newReviewerName}
                        onChange={e => setNewReviewerName(e.target.value)}
                        placeholder="Reviewer name"
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.formGroupSmall}>
                      <label>Due Days</label>
                      <input
                        type="number"
                        value={newReviewerDueDays}
                        onChange={e => setNewReviewerDueDays(parseInt(e.target.value) || 14)}
                        min={1}
                        max={60}
                        className={styles.formInput}
                      />
                    </div>
                  </div>
                  <div className={styles.formRowBottom}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={newReviewerIsExternal}
                        onChange={e => setNewReviewerIsExternal(e.target.checked)}
                      />
                      External reviewer (not in system)
                    </label>
                    <div className={styles.formActions}>
                      <button type="button" className={styles.cancelFormBtn} onClick={() => setShowAddReviewerForm(false)}>Cancel</button>
                      <button type="button" className={styles.addToQueueBtn} onClick={handleAddNewReviewer} disabled={!newReviewerEmail.trim()}>
                        Add to Queue
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {newReviewers.length > 0 && (
                <div className={styles.queuedNewReviewers}>
                  {newReviewers.map(r => (
                    <div key={r.email} className={styles.queuedReviewerItem}>
                      <div className={styles.queuedReviewerInfo}>
                        <span className={styles.queuedName}>{r.name || r.email}</span>
                        {r.name && <span className={styles.queuedEmail}>{r.email}</span>}
                        {r.isExternal && <span className={styles.externalBadge}>External</span>}
                        <span className={styles.queuedDays}>{r.dueDays} days</span>
                      </div>
                      <button type="button" className={styles.removeBtn} onClick={() => handleRemoveNewReviewer(r.email)} title="Remove">
                        <span className="material-symbols-rounded">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
