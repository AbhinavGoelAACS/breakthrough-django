import React, { useEffect, useState } from 'react';
import acsApi from '../../api/apiService';
import Pagination from '../../components/pagination/Pagination';
import { useListWithFilters } from '../../hooks/useListWithFilters';
import { formatDateIST } from '../../utils/dateUtils';
import styles from './ReviewerHistory.module.css';

const ReviewerHistory = () => {
  const fetchHistoryWithFilters = async (skip, limit) => {
    return await acsApi.reviewer.getReviewHistory(skip, limit);
  };

  const {
    data: reviews,
    loading,
    error,
    pagination,
    goToPage,
  } = useListWithFilters(fetchHistoryWithFilters, {}, 10);

  const getStatusColor = (status) => {
    const colorMap = {
      'completed': 'statusCompleted',
      'pending': 'statusPending',
      'in_progress': 'statusInProgress',
    };
    return colorMap[status] || 'statusNeutral';
  };

  const getStatusLabel = (status) => {
    const labelMap = {
      'completed': 'Completed',
      'pending': 'Pending',
      'in_progress': 'In Progress',
    };
    return labelMap[status] || status;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Review History</h1>
        <p>View your completed reviews and submissions</p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading review history...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && reviews.length === 0 && (
        <div className={styles.empty}>
          <p>No reviews completed yet</p>
        </div>
      )}

      {/* Reviews Table */}
      {!loading && reviews.length > 0 && (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Paper Title</th>
                  <th>Journal</th>
                  <th>Assigned Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.review_id}>
                    <td className={styles.titleCell}>
                      {review.paper_title || 'Untitled Paper'}
                    </td>
                    <td>{review.journal || '-'}</td>
                    <td>{formatDateIST(review.assigned_date)}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[getStatusColor(review.status)]}`}>
                        {getStatusLabel(review.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className={styles.paginationContainer}>
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={goToPage}
                isLoading={loading}
                itemsPerPage={pagination.limit}
                totalItems={pagination.total}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReviewerHistory;
