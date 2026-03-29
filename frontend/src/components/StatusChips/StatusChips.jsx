import React from 'react';
import styles from './StatusChips.module.css';

const StatusChips = ({ status, className = '' }) => {
  const statusConfig = getStatusConfig(status);

  if (!status) {
    return (
      <div className={`${styles.container} ${className}`}>
        <span className={`${styles.chip} ${styles.unknown}`}>
          Unknown
        </span>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <span
        className={`${styles.chip} ${styles[statusConfig.class]}`}
        title={statusConfig.tooltip}
      >
        <span className={styles.label}>{statusConfig.label}</span>
      </span>
    </div>
  );
};

/**
 * Get status configuration by status type
 */
function getStatusConfig(status) {
  const statusLower = (status || 'unknown').toLowerCase().replace(/\s+/g, '_');

  const configs = {
    submitted: {
      label: 'Submitted',
      class: 'submitted',
      tooltip: 'Paper has been submitted'
    },
    pending: {
      label: 'Pending',
      class: 'pending',
      tooltip: 'Awaiting review'
    },
    under_review: {
      label: 'Under Review',
      class: 'underReview',
      tooltip: 'Currently being reviewed'
    },
    reviewed: {
      label: 'Reviewed',
      class: 'reviewed',
      tooltip: 'Review completed'
    },
    accepted: {
      label: 'Accepted',
      class: 'accepted',
      tooltip: 'Paper accepted for publication'
    },
    rejected: {
      label: 'Rejected',
      class: 'rejected',
      tooltip: 'Paper has been rejected'
    },
    correction: {
      label: 'Revision Requested',
      class: 'revision',
      tooltip: 'Author needs to make revisions'
    },
    correction_required: {
      label: 'Revision Requested',
      class: 'revision',
      tooltip: 'Author needs to make revisions'
    },
    under_publication: {
      label: 'Under Publication',
      class: 'publication',
      tooltip: 'Being prepared for publication'
    },
    published: {
      label: 'Published',
      class: 'published',
      tooltip: 'Published online/in print'
    },
    resubmitted: {
      label: 'Resubmitted',
      class: 'resubmitted',
      tooltip: 'Resubmitted after revisions'
    },
    unknown: {
      label: 'Unknown',
      class: 'unknown',
      tooltip: 'Status unknown'
    }
  };

  return configs[statusLower] || configs.unknown;
}

export default StatusChips;
