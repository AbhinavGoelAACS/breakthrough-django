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
  const [loadingReviewers, setLoadingReviewers] = useState(false);
  const [newReviewers, setNewReviewers] = useState([]);
  const [showAddReviewerForm, setShowAddReviewerForm] = useState(false);
  const [addReviewerMode, setAddReviewerMode] = useState('internal'); // 'internal' | 'external'

  // Internal reviewer dropdown state
  const [availableReviewers, setAvailableReviewers] = useState([]);
  const [filteredReviewers, setFilteredReviewers] = useState([]);
  const [searchReviewers, setSearchReviewers] = useState('');
  const [showReviewerDropdown, setShowReviewerDropdown] = useState(false);
  const [loadingAvailableReviewers, setLoadingAvailableReviewers] = useState(false);
  const [selectedInternalReviewer, setSelectedInternalReviewer] = useState(null);
  const [internalDueDays, setInternalDueDays] = useState(14);

  // External reviewer fields
  const [newReviewerEmail, setNewReviewerEmail] = useState('');
  const [newReviewerName, setNewReviewerName] = useState('');
  const [newReviewerDueDays, setNewReviewerDueDays] = useState(14);

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
    } catch {
      // Non-critical — panel still works without previous reviewers
    } finally {
      setLoadingReviewers(false);
    }
  };

  const fetchAvailableReviewers = async () => {
    try {
      setLoadingAvailableReviewers(true);
      setShowReviewerDropdown(true);
      const response = await acsApi.editor.listReviewers(0, 100, '', parseInt(paperId));
      const reviewersList = Array.isArray(response) ? response : (response?.reviewers || []);
      setAvailableReviewers(reviewersList);
      setFilteredReviewers(reviewersList);
    } catch {
      // Non-critical
    } finally {
      setLoadingAvailableReviewers(false);
    }
  };

  // Client-side filtering of available reviewers
  useEffect(() => {
    if (searchReviewers.trim()) {
      const filtered = availableReviewers.filter(reviewer =>
        (reviewer.name || '').toLowerCase().includes(searchReviewers.toLowerCase()) ||
        (reviewer.email || '').toLowerCase().includes(searchReviewers.toLowerCase())
      );
      setFilteredReviewers(filtered);
    } else {
      setFilteredReviewers(availableReviewers);
    }
  }, [searchReviewers, availableReviewers]);

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
          action: 'reinvite'
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

  const handleSelectInternalReviewer = (reviewer) => {
    setSelectedInternalReviewer(reviewer);
    setSearchReviewers(reviewer.name || reviewer.email);
    setShowReviewerDropdown(false);
  };

  const handleAddInternalReviewer = () => {
    if (!selectedInternalReviewer) return;
    // Prevent duplicates
    if (newReviewers.some(r => r.email === selectedInternalReviewer.email)) return;
    setNewReviewers(prev => [...prev, {
      email: selectedInternalReviewer.email,
      name: selectedInternalReviewer.name || '',
      dueDays: internalDueDays,
      isExternal: false
    }]);
    setSelectedInternalReviewer(null);
    setSearchReviewers('');
    setInternalDueDays(14);
  };

  const handleAddExternalReviewer = () => {
    if (!newReviewerEmail.trim()) return;
    // Prevent duplicates
    if (newReviewers.some(r => r.email === newReviewerEmail.trim())) return;
    setNewReviewers(prev => [...prev, {
      email: newReviewerEmail.trim(),
      name: newReviewerName.trim(),
      dueDays: newReviewerDueDays,
      isExternal: true
    }]);
    setNewReviewerEmail('');
    setNewReviewerName('');
    setNewReviewerDueDays(14);
  };

  const handleRemoveNewReviewer = (email) => {
    setNewReviewers(prev => prev.filter(r => r.email !== email));
  };

  const handleReinvitePreviousReviewer = (reviewer) => {
    // Add to new reviewers queue with reinvite intent
    if (newReviewers.some(r => r.email === reviewer.reviewer_email)) return;
    setNewReviewers(prev => [...prev, {
      email: reviewer.reviewer_email,
      name: reviewer.reviewer_name || '',
      dueDays: 14,
      isExternal: reviewer.is_external || false
    }]);
  };

  const handleRemovePreviousReviewer = (reviewerId) => {
    setPreviousReviewers(prev => prev.filter(r => r.reviewer_id !== reviewerId));
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

            {/* Invite New Reviewers - Tabbed Interface */}
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
                  {/* Tabs */}
                  <div className={styles.reviewerTypeTabs}>
                    <button
                      type="button"
                      className={`${styles.reviewerTypeTab} ${addReviewerMode === 'internal' ? styles.reviewerTypeTabActive : ''}`}
                      onClick={() => setAddReviewerMode('internal')}
                    >
                      <span className="material-symbols-rounded">group</span>
                      Internal Reviewer
                    </button>
                    <button
                      type="button"
                      className={`${styles.reviewerTypeTab} ${addReviewerMode === 'external' ? styles.reviewerTypeTabActive : ''}`}
                      onClick={() => setAddReviewerMode('external')}
                    >
                      <span className="material-symbols-rounded">person_add</span>
                      External Reviewer
                    </button>
                  </div>

                  {/* Internal Reviewer - Dropdown Search */}
                  {addReviewerMode === 'internal' && (
                    <div className={styles.internalReviewerPane}>
                      <div className={styles.formRow}>
                        <div className={`${styles.formGroup} ${styles.reviewerSearchGroup}`}>
                          <label>Search Reviewer <span className={styles.required}>*</span></label>
                          <input
                            type="text"
                            value={searchReviewers}
                            onChange={e => {
                              setSearchReviewers(e.target.value);
                              setSelectedInternalReviewer(null);
                              if (!showReviewerDropdown) setShowReviewerDropdown(true);
                            }}
                            onFocus={() => {
                              if (availableReviewers.length === 0) fetchAvailableReviewers();
                              else setShowReviewerDropdown(true);
                            }}
                            placeholder="Search by name or email..."
                            className={styles.formInput}
                            autoComplete="off"
                          />
                          {showReviewerDropdown && (
                            <div className={styles.reviewerDropdown}>
                              {loadingAvailableReviewers ? (
                                <div className={styles.dropdownLoading}>
                                  <span className="material-symbols-rounded">hourglass_empty</span>
                                  Loading reviewers...
                                </div>
                              ) : filteredReviewers.length > 0 ? (
                                filteredReviewers.map(reviewer => (
                                  <div
                                    key={reviewer.id || reviewer.email}
                                    className={`${styles.dropdownItem} ${selectedInternalReviewer?.email === reviewer.email ? styles.dropdownItemSelected : ''}`}
                                    onClick={() => handleSelectInternalReviewer(reviewer)}
                                  >
                                    <div className={styles.dropdownItemInfo}>
                                      <span className={styles.dropdownItemName}>
                                        {reviewer.name || 'Unknown'}
                                        {reviewer.is_recommended && (
                                          <span className={styles.recommendedBadge}>★ Recommended</span>
                                        )}
                                      </span>
                                      <span className={styles.dropdownItemEmail}>{reviewer.email}</span>
                                      {reviewer.specialization && (
                                        <span className={styles.dropdownItemSpec}>{reviewer.specialization}</span>
                                      )}
                                    </div>
                                    {reviewer.match_reason && (
                                      <span className={styles.dropdownItemReason}>{reviewer.match_reason}</span>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className={styles.dropdownEmpty}>No reviewers found</div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className={styles.formGroupSmall}>
                          <label>Due Days</label>
                          <input
                            type="number"
                            value={internalDueDays}
                            onChange={e => setInternalDueDays(parseInt(e.target.value) || 14)}
                            min={1}
                            max={60}
                            className={styles.formInput}
                          />
                        </div>
                      </div>
                      <div className={styles.formRowBottom}>
                        <div />
                        <div className={styles.formActions}>
                          <button type="button" className={styles.cancelFormBtn} onClick={() => { setShowAddReviewerForm(false); setShowReviewerDropdown(false); setSearchReviewers(''); setSelectedInternalReviewer(null); }}>Cancel</button>
                          <button type="button" className={styles.addToQueueBtn} onClick={handleAddInternalReviewer} disabled={!selectedInternalReviewer}>
                            Add to Queue
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* External Reviewer - Manual Entry */}
                  {addReviewerMode === 'external' && (
                    <div className={styles.externalReviewerPane}>
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
                        <div />
                        <div className={styles.formActions}>
                          <button type="button" className={styles.cancelFormBtn} onClick={() => setShowAddReviewerForm(false)}>Cancel</button>
                          <button type="button" className={styles.addToQueueBtn} onClick={handleAddExternalReviewer} disabled={!newReviewerEmail.trim()}>
                            Add to Queue
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Queued new reviewers */}
              {newReviewers.length > 0 && (
                <div className={styles.queuedNewReviewers}>
                  {newReviewers.map(r => (
                    <div key={r.email} className={styles.queuedReviewerItem}>
                      <div className={styles.queuedReviewerInfo}>
                        <span className={styles.queuedName}>{r.name || r.email}</span>
                        {r.name && <span className={styles.queuedEmail}>{r.email}</span>}
                        {r.isExternal ? (
                          <span className={styles.externalBadge}>External</span>
                        ) : (
                          <span className={styles.internalBadge}>Internal</span>
                        )}
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

            {/* Previous Reviewers - Cards with re-invite/remove */}
            {loadingReviewers ? (
              <div className={styles.reviewerLoading}>
                <span className="material-symbols-rounded">hourglass_empty</span>
                Loading previous reviewers...
              </div>
            ) : previousReviewers.length > 0 ? (
              <div className={styles.previousReviewersBlock}>
                <div className={styles.previousReviewersHeader}>
                  <span className={styles.prevLabel}>Previous Reviewers ({previousReviewers.length})</span>
                </div>
                <div className={styles.prevReviewerCards}>
                  {previousReviewers.map(reviewer => {
                    const alreadyQueued = newReviewers.some(r => r.email === reviewer.reviewer_email);
                    return (
                      <div key={reviewer.reviewer_id} className={styles.prevReviewerCard}>
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
                        <div className={styles.prevReviewerActions}>
                          <button
                            type="button"
                            className={`${styles.reinviteBtn} ${alreadyQueued ? styles.reinviteBtnDisabled : ''}`}
                            onClick={() => handleReinvitePreviousReviewer(reviewer)}
                            disabled={alreadyQueued}
                            title={alreadyQueued ? 'Already added to queue' : 'Re-invite this reviewer for the revision'}
                          >
                            <span className="material-symbols-rounded">mail</span>
                            {alreadyQueued ? 'Queued' : 'Re-invite'}
                          </button>
                          <button
                            type="button"
                            className={styles.removeReviewerBtn}
                            onClick={() => handleRemovePreviousReviewer(reviewer.reviewer_id)}
                            title="Remove from previous reviewers list"
                          >
                            <span className="material-symbols-rounded">person_remove</span>
                            Remove
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
          </div>
        )}

        {/* Editor Comments */}
        <div className={styles.commentsSection}>
          <label>
            Editor Comments
            <span className={styles.required}>*</span>
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
            {editorComments.length} characters
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
