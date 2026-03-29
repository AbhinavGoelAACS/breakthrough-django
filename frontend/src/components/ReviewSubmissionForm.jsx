import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import acsApi from '../api/apiService.js';
import { formatDateIST } from '../utils/dateUtils';
import './ReviewSubmissionForm.css';

const ReviewSubmissionForm = () => {
  const { reviewId } = useParams();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    technicalQuality: 0,
    clarity: 0,
    originality: 0,
    significance: 0,
    overallRating: 0,
    authorComments: '',
    confidentialComments: '',
    recommendation: 'accept'
  });

  // UI state
  const [paper, setPaper] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Tabs
  const [activeTab, setActiveTab] = useState('ratings');

  const RATING_CRITERIA = [
    { key: 'technicalQuality', label: 'Technical Quality', description: 'Methodological rigor and technical soundness' },
    { key: 'clarity', label: 'Clarity & Writing', description: 'Writing quality and presentation clarity' },
    { key: 'originality', label: 'Originality & Novelty', description: 'Novelty and originality of contribution' },
    { key: 'significance', label: 'Significance & Impact', description: 'Significance and potential impact of work' }
  ];

  const RECOMMENDATIONS = [
    { value: 'accept', label: 'Accept', color: 'success' },
    { value: 'minor_revisions', label: 'Minor Revisions', color: 'warning' },
    { value: 'major_revisions', label: 'Major Revisions', color: 'orange' },
    { value: 'reject', label: 'Reject', color: 'danger' }
  ];

  // Load assignment details
  useEffect(() => {
    loadAssignment();
  }, [reviewId]);

  const loadAssignment = async () => {
    if (!reviewId) {
      setError('No review ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const data = await acsApi.reviewer.getAssignmentDetail(reviewId);
      setAssignment(data);
      setPaper(data.paper);
    } catch (err) {
      console.error('Failed to load assignment:', err);
      if (err.response?.status === 404) {
        setError('Review assignment not found');
      } else {
        setError('Failed to load assignment details. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle rating change
  const handleRatingChange = (criterion, value) => {
    setFormData(prev => ({
      ...prev,
      [criterion]: value
    }));
    // Clear validation error for this field
    if (validationErrors[criterion]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[criterion];
        return newErrors;
      });
    }
  };

  // Handle comment change
  const handleCommentChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    // Check all ratings are set
    RATING_CRITERIA.forEach(criterion => {
      if (formData[criterion.key] === 0 || formData[criterion.key] === '0') {
        errors[criterion.key] = `${criterion.label} rating is required`;
      }
    });

    if (formData.overallRating === 0 || formData.overallRating === '0') {
      errors.overallRating = 'Overall rating is required';
    }

    // Check at least one comment exists
    if (!formData.authorComments.trim() && !formData.confidentialComments.trim()) {
      errors.comments = 'At least one comment is required';
    }

    // Check comment lengths
    if (formData.authorComments.trim().length < 50) {
      errors.authorComments = 'Author comments must be at least 50 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const reviewData = {
        technical_quality: parseInt(formData.technicalQuality),
        clarity: parseInt(formData.clarity),
        originality: parseInt(formData.originality),
        significance: parseInt(formData.significance),
        overall_rating: parseInt(formData.overallRating),
        author_comments: formData.authorComments.trim(),
        confidential_comments: formData.confidentialComments.trim(),
        recommendation: formData.recommendation
      };

      const response = await acsApi.reviewer.submitReview(reviewId, reviewData);

      setSuccess(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/reviewer-dashboard');
      }, 3000);
    } catch (err) {
      console.error('Failed to submit review:', err);
      if (err.response?.status === 400) {
        setError(err.response.data?.detail || 'Invalid review data');
      } else if (err.response?.status === 404) {
        setError('Review assignment not found');
      } else {
        setError('Failed to submit review. Please try again later.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Rating star display
  const renderStars = (value, onChange) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            className={`star ${star <= value ? 'filled' : ''}`}
            onClick={() => onChange(star)}
            title={`${star} star${star !== 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="review-form-loading">
        <div className="spinner"></div>
        <p>Loading review assignment...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="review-form-success">
        <div className="success-icon">✓</div>
        <h2>Review Submitted Successfully!</h2>
        <p>Thank you for your detailed review. The editor has been notified.</p>
        <p className="redirect-message">Redirecting to dashboard in 3 seconds...</p>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="review-form-error">
        <div className="error-icon">⚠</div>
        <h2>Error Loading Review</h2>
        <p>{error}</p>
        <button 
          className="button button-secondary"
          onClick={() => navigate('/reviewer-dashboard')}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="review-submission-form">
      {/* Header with Paper Info */}
      <div className="form-header">
        <div className="paper-info">
          <h2>{paper?.paper_name || 'Paper Review'}</h2>
          <p className="paper-meta">
            {paper?.author && `By ${typeof paper.author === 'object' ? paper.author?.name : paper.author}`}
            {paper?.paper_id && ` • Paper ID: ${paper.paper_id}`}
          </p>
          {assignment?.due_date && (
            <p className="due-date">
              Due: {formatDateIST(assignment.due_date)}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="form-error">
          <p>{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="form-tabs">
        <button
          className={`tab ${activeTab === 'ratings' ? 'active' : ''}`}
          onClick={() => setActiveTab('ratings')}
        >
          Ratings & Recommendation
        </button>
        <button
          className={`tab ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          Comments
        </button>
        <button
          className={`tab ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          Review Summary
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form-container">
        {/* Ratings Tab */}
        {activeTab === 'ratings' && (
          <div className="form-section ratings-section">
            <h3>Paper Ratings</h3>
            <p className="section-description">
              Please rate the paper on the following criteria (1 = Poor, 5 = Excellent)
            </p>

            {/* Individual Criteria */}
            <div className="ratings-list">
              {RATING_CRITERIA.map(criterion => (
                <div key={criterion.key} className="rating-item">
                  <div className="rating-header">
                    <label htmlFor={`rating-${criterion.key}`}>{criterion.label}</label>
                    <span className="rating-value">{formData[criterion.key]} / 5</span>
                  </div>
                  <p className="rating-description">{criterion.description}</p>
                  {renderStars(formData[criterion.key], (value) => 
                    handleRatingChange(criterion.key, value)
                  )}
                  {validationErrors[criterion.key] && (
                    <p className="error-message">{validationErrors[criterion.key]}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Overall Rating */}
            <div className="overall-rating-section">
              <div className="rating-item large">
                <div className="rating-header">
                  <label htmlFor="overall-rating">Overall Quality Rating</label>
                  <span className="rating-value">{formData.overallRating} / 5</span>
                </div>
                <p className="rating-description">
                  Based on the criteria above, your overall assessment of this paper
                </p>
                {renderStars(formData.overallRating, (value) => 
                  handleRatingChange('overallRating', value)
                )}
                {validationErrors.overallRating && (
                  <p className="error-message">{validationErrors.overallRating}</p>
                )}
              </div>
            </div>

            {/* Recommendation */}
            <div className="recommendation-section">
              <h4>Recommendation</h4>
              <p className="section-description">
                What is your recommendation for this paper?
              </p>
              <div className="recommendation-buttons">
                {RECOMMENDATIONS.map(rec => (
                  <button
                    key={rec.value}
                    type="button"
                    className={`recommendation-btn ${rec.color} ${
                      formData.recommendation === rec.value ? 'selected' : ''
                    }`}
                    onClick={() => handleRatingChange('recommendation', rec.value)}
                  >
                    {rec.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className="form-section comments-section">
            {/* Author Comments */}
            <div className="comment-field">
              <h4>Comments for the Author</h4>
              <p className="field-description">
                These comments will be shared with the author. Provide constructive feedback.
              </p>
              <textarea
                id="author-comments"
                className={`comment-textarea ${validationErrors.authorComments ? 'error' : ''}`}
                placeholder="Please provide detailed comments for the author (minimum 50 characters)..."
                value={formData.authorComments}
                onChange={(e) => handleCommentChange('authorComments', e.target.value)}
                rows={8}
                maxLength={3000}
              />
              <div className="field-meta">
                <span className="char-count">
                  {formData.authorComments.length}/3000 characters
                </span>
                {validationErrors.authorComments && (
                  <span className="error-message">{validationErrors.authorComments}</span>
                )}
              </div>
            </div>

            {/* Confidential Comments */}
            <div className="comment-field">
              <h4>Confidential Comments for the Editor</h4>
              <p className="field-description">
                These comments are only visible to editors and reviewers. Include any sensitive or controversial feedback here.
              </p>
              <textarea
                id="confidential-comments"
                className="comment-textarea"
                placeholder="Optional confidential comments (max 2000 characters)..."
                value={formData.confidentialComments}
                onChange={(e) => handleCommentChange('confidentialComments', e.target.value)}
                rows={8}
                maxLength={2000}
              />
              <div className="field-meta">
                <span className="char-count">
                  {formData.confidentialComments.length}/2000 characters
                </span>
              </div>
            </div>

            {validationErrors.comments && (
              <div className="form-error">
                <p>{validationErrors.comments}</p>
              </div>
            )}
          </div>
        )}

        {/* Review Summary Tab */}
        {activeTab === 'review' && (
          <div className="form-section summary-section">
            <h3>Review Summary</h3>
            
            <div className="summary-grid">
              <div className="summary-item">
                <h4>Ratings</h4>
                <ul className="rating-summary">
                  {RATING_CRITERIA.map(criterion => (
                    <li key={criterion.key}>
                      <span className="criterion-name">{criterion.label}:</span>
                      <span className="criterion-value">
                        {formData[criterion.key]} / 5
                      </span>
                    </li>
                  ))}
                  <li className="overall">
                    <span className="criterion-name">Overall:</span>
                    <span className="criterion-value">
                      {formData.overallRating} / 5
                    </span>
                  </li>
                </ul>
              </div>

              <div className="summary-item">
                <h4>Recommendation</h4>
                <div className={`recommendation-badge ${RECOMMENDATIONS.find(r => r.value === formData.recommendation)?.color}`}>
                  {RECOMMENDATIONS.find(r => r.value === formData.recommendation)?.label}
                </div>
              </div>
            </div>

            <div className="summary-comments">
              <h4>Author Comments</h4>
              <p className="preview-box">
                {formData.authorComments || '(No comments provided)'}
              </p>

              {formData.confidentialComments && (
                <>
                  <h4>Confidential Comments</h4>
                  <p className="preview-box confidential">
                    {formData.confidentialComments}
                  </p>
                </>
              )}
            </div>

            <div className="summary-note">
              <p>
                Please review the information above. Once submitted, you cannot edit this review.
              </p>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => navigate('/reviewer-dashboard')}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button button-primary"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewSubmissionForm;
