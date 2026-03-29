import React from 'react';
import { formatDateIST } from '../../utils/dateUtils';
import styles from './ReviewerFeedbackCard.module.css';

const ReviewerFeedbackCard = ({ review }) => {
  const getRatingColor = (rating) => {
    if (rating >= 4) return '#4caf50';
    if (rating >= 3) return '#ff9800';
    return '#f44336';
  };

  const getRecommendationLabel = (rec) => {
    const recommendations = {
      'accept': { label: 'Accept', color: '#4caf50' },
      'minor_revisions': { label: 'Minor Revisions', color: '#ff9800' },
      'major_revisions': { label: 'Major Revisions', color: '#f57c00' },
      'reject': { label: 'Reject', color: '#f44336' },
    };
    return recommendations[rec] || { label: rec, color: '#999' };
  };

  const rec = getRecommendationLabel(review.recommendation);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.recommendation}>
          <span style={{ backgroundColor: rec.color }} className={styles.recommendationBadge}>
            {rec.label}
          </span>
        </div>
        <span className={styles.submittedDate}>
          {formatDateIST(review.submitted_on)}
        </span>
      </div>

      <div className={styles.ratings}>
        <div className={styles.ratingItem}>
          <span className={styles.ratingLabel}>Technical Quality</span>
          <div className={styles.stars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={styles.star}
                style={{
                  color: i < review.technical_quality ? getRatingColor(review.technical_quality) : '#ddd'
                }}
              >
                ★
              </span>
            ))}
          </div>
          <span className={styles.ratingValue}>{review.technical_quality}/5</span>
        </div>

        <div className={styles.ratingItem}>
          <span className={styles.ratingLabel}>Clarity</span>
          <div className={styles.stars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={styles.star}
                style={{
                  color: i < review.clarity ? getRatingColor(review.clarity) : '#ddd'
                }}
              >
                ★
              </span>
            ))}
          </div>
          <span className={styles.ratingValue}>{review.clarity}/5</span>
        </div>

        <div className={styles.ratingItem}>
          <span className={styles.ratingLabel}>Originality</span>
          <div className={styles.stars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={styles.star}
                style={{
                  color: i < review.originality ? getRatingColor(review.originality) : '#ddd'
                }}
              >
                ★
              </span>
            ))}
          </div>
          <span className={styles.ratingValue}>{review.originality}/5</span>
        </div>

        <div className={styles.ratingItem}>
          <span className={styles.ratingLabel}>Significance</span>
          <div className={styles.stars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={styles.star}
                style={{
                  color: i < review.significance ? getRatingColor(review.significance) : '#ddd'
                }}
              >
                ★
              </span>
            ))}
          </div>
          <span className={styles.ratingValue}>{review.significance}/5</span>
        </div>

        <div className={styles.ratingItem}>
          <span className={styles.ratingLabel}>Overall Rating</span>
          <div className={styles.stars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={styles.star}
                style={{
                  color: i < review.overall_rating ? getRatingColor(review.overall_rating) : '#ddd'
                }}
              >
                ★
              </span>
            ))}
          </div>
          <span className={styles.ratingValue}>{review.overall_rating}/5</span>
        </div>
      </div>

      <div className={styles.comments}>
        <h4 className={styles.commentsTitle}>Reviewer Comments</h4>
        <p className={styles.commentText}>{review.author_comments || 'No comments provided'}</p>
      </div>
    </div>
  );
};

export default ReviewerFeedbackCard;
