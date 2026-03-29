import React from 'react';
import { formatDateIST } from '../../utils/dateUtils';
import styles from './RevisionRequestDisplay.module.css';

const RevisionRequestDisplay = ({ decision }) => {
  if (!decision.revision_required) {
    return null;
  }

  const getDaysUntilDeadline = (deadline) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLeft = getDaysUntilDeadline(decision.revision_deadline);
  const isOverdue = daysLeft < 0;

  return (
    <div className={`${styles.container} ${isOverdue ? styles.overdue : ''}`}>
      <div className={styles.header}>
        <span className={styles.icon}>✏️</span>
        <h3 className={styles.title}>Revision Required</h3>
        {daysLeft !== null && (
          <span className={`${styles.deadline} ${isOverdue ? styles.overdueText : styles.active}`}>
            {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days remaining`}
          </span>
        )}
      </div>

      {decision.revision_requested_date && (
        <p className={styles.requestedDate}>
          Requested on: {formatDateIST(decision.revision_requested_date)}
        </p>
      )}

      {decision.revision_deadline && (
        <p className={styles.deadlineDate}>
          Deadline: {formatDateIST(decision.revision_deadline)}
        </p>
      )}

      {decision.revision_notes && (
        <div className={styles.notes}>
          <h4 className={styles.notesTitle}>Revision Requirements:</h4>
          <div className={styles.notesContent}>
            {decision.revision_notes}
          </div>
        </div>
      )}

      <div className={styles.instructions}>
        <h4 className={styles.instructionsTitle}>Next Steps:</h4>
        <ol className={styles.instructionsList}>
          <li>Review the revision requirements above</li>
          <li>Make the necessary changes to your paper</li>
          <li>Prepare a detailed summary of changes made</li>
          <li>Upload the revised paper and submit</li>
        </ol>
      </div>
    </div>
  );
};

export default RevisionRequestDisplay;
