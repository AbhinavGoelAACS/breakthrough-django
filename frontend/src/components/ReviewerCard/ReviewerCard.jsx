import React from 'react';
import styles from './ReviewerCard.module.css';

/**
 * Reviewer Card component for displaying reviewer information
 * @param {Object} reviewer - Reviewer data object
 * @param {String} actions - Action type: 'select', 'invite', 'manage', 'view'
 * @param {Function} onAction - Callback when action button is clicked
 */
const ReviewerCard = ({ reviewer, actions = 'view', onAction }) => {
  if (!reviewer) return null;

  const name = reviewer.fname || reviewer.name || 'Unknown Reviewer';
  const email = reviewer.email || 'N/A';
  const specialization = reviewer.specialization || reviewer.expertise || 'General';
  const reviewCount = reviewer.review_count || reviewer.papers_reviewed || 0;
  const rating = reviewer.rating || reviewer.avg_rating || 0;

  const handleAction = () => {
    if (onAction) {
      onAction(reviewer);
    }
  };

  const getActionLabel = () => {
    const labels = {
      select: 'SELECT',
      invite: 'INVITE',
      manage: 'MANAGE',
      view: 'VIEW',
    };
    return labels[actions] || 'ACTION';
  };

  const getActionIcon = () => {
    const icons = {
      select: 'checkbox_blank_outline',
      invite: 'mail',
      manage: 'edit',
      view: 'open_in_new',
    };
    return icons[actions] || 'arrow_forward';
  };

  return (
    <div className={styles.reviewerCard}>
      <div className={styles.cardContent}>
        {/* Reviewer Avatar and Basic Info */}
        <div className={styles.reviewerHeader}>
          <div className={styles.avatar}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div className={styles.basicInfo}>
            <h4 className={styles.name}>{name}</h4>
            <p className={styles.email}>{email}</p>
          </div>
        </div>

        {/* Specialization and Stats */}
        <div className={styles.reviewerMeta}>
          <div className={styles.metaItem}>
            <span className="material-symbols-rounded">tag</span>
            <span className={styles.label}>Specialization</span>
            <span className={styles.value}>{specialization}</span>
          </div>
          <div className={styles.metaItem}>
            <span className="material-symbols-rounded">article</span>
            <span className={styles.label}>Reviews</span>
            <span className={styles.value}>{reviewCount}</span>
          </div>
          {rating > 0 && (
            <div className={styles.metaItem}>
              <span className="material-symbols-rounded">star</span>
              <span className={styles.label}>Rating</span>
              <span className={styles.value}>{rating.toFixed(1)}/5</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      {onAction && (
        <button
          className={`${styles.actionBtn} ${styles[actions]}`}
          onClick={handleAction}
          title={getActionLabel()}
        >
          <span className="material-symbols-rounded">{getActionIcon()}</span>
          <span className={styles.actionLabel}>{getActionLabel()}</span>
        </button>
      )}
    </div>
  );
};

export default ReviewerCard;
