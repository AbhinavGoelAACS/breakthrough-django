import React from 'react';
import styles from './PaperStatusBadge.module.css';

const PaperStatusBadge = ({ status }) => {
  const getStatusInfo = (s) => {
    const statusMap = {
      'submitted': { label: 'Submitted', className: styles.submitted, icon: '📤' },
      'under review': { label: 'Under Review', className: styles.underReview, icon: '🔍' },
      'under_review': { label: 'Under Review', className: styles.underReview, icon: '🔍' },
      'correction': { label: 'Revision Requested', className: styles.revisionRequested, icon: '✏️' },
      'resubmitted': { label: 'Resubmitted', className: styles.resubmitted, icon: '🔄' },
      'accepted': { label: 'Accepted', className: styles.accepted, icon: '✅' },
      'rejected': { label: 'Rejected', className: styles.rejected, icon: '❌' },
      'published': { label: 'Published', className: styles.published, icon: '📰' },
      'under_publication': { label: 'Under Publication', className: styles.underPublication, icon: '📝' },
      'reviewed': { label: 'Reviewed', className: styles.reviewed, icon: '✔️' },
    };
    return statusMap[s] || { label: s, className: styles.default, icon: '📄' };
  };

  const info = getStatusInfo(status);

  return (
    <span className={`${styles.badge} ${info.className}`}>
      <span className={styles.icon}>{info.icon}</span>
      {info.label}
    </span>
  );
};

export default PaperStatusBadge;
