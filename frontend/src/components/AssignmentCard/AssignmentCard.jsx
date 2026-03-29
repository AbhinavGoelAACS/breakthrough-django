import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateIST } from '../../utils/dateUtils';
import styles from './AssignmentCard.module.css';

const AssignmentCard = ({ assignment, onStartReview }) => {
  const navigate = useNavigate();

  const getDaysRemaining = (dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getUrgencyClass = (daysRemaining) => {
    if (daysRemaining < 3) return 'urgency-high';
    if (daysRemaining < 7) return 'urgency-medium';
    return 'urgency-low';
  };

  const daysRemaining = getDaysRemaining(assignment.due_date);

  const getStatusClass = (status) => {
    if (!status) return 'Pending';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Determine if this is a re-review (paper has been resubmitted and needs re-review)
  const isReReview = assignment.is_resubmission && assignment.status === 'pending';
  const paperVersion = assignment.paper_version || 1;
  const paperType = assignment.paper_type || 'Full Length Article';

  return (
    <div className={`${styles.assignmentCard} ${isReReview ? styles.reReviewCard : ''}`}>
      <div className={styles.cardContent}>
        <div className={styles.titleSection}>
          <h3 className={styles.paperTitle}>
            {assignment.paper_title || 'Untitled Paper'}
            {paperVersion > 1 && (
              <span className={styles.versionBadge}>v{paperVersion}</span>
            )}
          </h3>
          {isReReview && (
            <span className={styles.reReviewBadge}>
              <span className="material-symbols-rounded">replay</span>
              Re-review Required
            </span>
          )}
        </div>

        <div className={styles.metaSection}>
          <div className={styles.metaLeft}>
            <span className={styles.metaItem}>
              <span className="material-symbols-rounded">calendar_today</span>
              Due: {formatDateIST(assignment.due_date)}
            </span>
            <span className={styles.paperTypeChip}>
              {paperType}
            </span>
          </div>

          <div className={styles.metaRight}>
            <span className={`${styles.statusBadge} ${styles[`status${getStatusClass(assignment.status)}`]}`}>
              {isReReview ? 'Pending Re-review' : (assignment.status || 'Pending')}
            </span>
            <span className={`${styles.urgencyBadge} ${styles[getUrgencyClass(daysRemaining)]}`}>
              {daysRemaining > 0 ? `${daysRemaining}d left` : 'Overdue'}
            </span>
          </div>
        </div>
      </div>

      {assignment.status === 'pending' && (
        <button
          className={`${styles.startBtn} ${isReReview ? styles.reReviewBtn : ''}`}
          onClick={() => navigate(`/reviewer/assignments/${assignment.id}/review`)}
          title={isReReview ? "Re-review Paper" : "Start Review"}
        >
          <span>{isReReview ? 'Re-review' : 'Start Review'}</span>
          <span className="material-symbols-rounded">{isReReview ? 'replay' : 'arrow_forward'}</span>
        </button>
      )}

      {assignment.status === 'in_progress' && (
        <button
          className={styles.continueBtn}
          onClick={() => navigate(`/reviewer/assignments/${assignment.id}/review`)}
          title="Continue Review"
        >
          <span>Continue</span>
          <span className="material-symbols-rounded">arrow_forward</span>
        </button>
      )}

      {(assignment.status === 'completed' || assignment.status === 'submitted') && (
        <button
          className={styles.viewBtn}
          onClick={() => navigate(`/reviewer/assignments/${assignment.id}/review`)}
          title="View Review"
        >
          <span>View</span>
          <span className="material-symbols-rounded">open_in_new</span>
        </button>
      )}
    </div>
  );
};

export default AssignmentCard;
