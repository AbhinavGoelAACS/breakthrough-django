import React from 'react';
import styles from './StatusFilterBar.module.css';

/**
 * Status Filter Bar component showing status counts and filtering
 * @param {Object} statuses - Object with status as key and count as value
 * @param {String} activeFilter - Currently active filter status
 * @param {Function} onFilterChange - Callback when filter is changed
 * @param {Boolean} loading - Loading state
 */
const StatusFilterBar = ({ statuses, activeFilter = '', onFilterChange, loading = false }) => {
  if (!statuses || Object.keys(statuses).length === 0) {
    return null;
  }

  const totalCount = Object.values(statuses).reduce((sum, count) => sum + count, 0);

  const getStatusLabel = (status) => {
    const labels = {
      submitted: 'Submitted',
      pending: 'Pending',
      under_review: 'Under Review',
      reviewed: 'Reviewed',
      accepted: 'Accepted',
      rejected: 'Rejected',
      correction: 'Correction',
      under_publication: 'Under Publication',
      published: 'Published',
      resubmitted: 'Resubmitted',
    };
    return labels[status] || status.replace(/_/g, ' ');
  };

  const getStatusClass = (status) => {
    const statusClasses = {
      submitted: '#ff9800',
      pending: '#2196f3',
      under_review: '#2196f3',
      reviewed: '#00bcd4',
      accepted: '#4caf50',
      rejected: '#f44336',
      correction: '#ff9800',
      under_publication: '#9c27b0',
      published: '#4caf50',
      resubmitted: '#ff9800',
    };
    return status;
  };

  return (
    <div className={styles.filterBar}>
      <div className={styles.filterScroll}>
        {/* All Filter */}
        <button
          className={`${styles.filterBtn} ${activeFilter === '' ? styles.active : ''}`}
          onClick={() => onFilterChange('')}
          disabled={loading}
        >
          <span className={styles.label}>All</span>
          <span className={styles.count}>{totalCount}</span>
        </button>

        {/* Individual Status Filters */}
        {Object.entries(statuses).map(([status, count]) => (
          <button
            key={status}
            className={`${styles.filterBtn} ${styles[getStatusClass(status)]} ${
              activeFilter === status ? styles.active : ''
            }`}
            onClick={() => onFilterChange(status)}
            disabled={loading}
            title={getStatusLabel(status)}
          >
            <span className={styles.label}>{getStatusLabel(status)}</span>
            <span className={styles.count}>{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StatusFilterBar;
