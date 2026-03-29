import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import acsApi from '../../api/apiService';
import Pagination from '../../components/pagination/Pagination';
import AssignmentCard from '../../components/AssignmentCard/AssignmentCard';
import { useListWithFilters } from '../../hooks/useListWithFilters';
import styles from './ReviewerAssignments.module.css';

const ReviewerAssignments = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [paperTypeFilter, setPaperTypeFilter] = useState('');

  const PAPER_TYPES = [
    'Full Length Article',
    'Review Paper',
    'Short Communication',
    'Case Study',
    'Technical Note'
  ];

  const fetchAssignmentsWithFilters = useCallback(async (skip, limit, filters) => {
    return await acsApi.reviewer.listAssignments(skip, limit, '', filters.sort || 'due_soon');
  }, []);

  const {
    data: allAssignments,
    loading,
    error,
    pagination,
    goToPage,
  } = useListWithFilters(fetchAssignmentsWithFilters, { sort: 'due_soon' }, 10, refreshTrigger);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setRefreshTrigger(prev => prev + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.toLowerCase());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const assignments = allAssignments.filter(assignment => {
    const matchesSearch = !debouncedSearchTerm || 
      (assignment.paper_title || '').toLowerCase().includes(debouncedSearchTerm) ||
      (assignment.paper_code || '').toLowerCase().includes(debouncedSearchTerm);
    
    const matchesStatus = !statusFilter || assignment.status === statusFilter;
    
    const matchesPaperType = !paperTypeFilter || assignment.paper_type === paperTypeFilter;
    
    return matchesSearch && matchesStatus && matchesPaperType;
  });

  const handleStartReview = (assignmentId) => {
    navigate(`/reviewer/assignments/${assignmentId}/review`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>My Assignments</h1>
          <p>View and manage your paper review assignments</p>
        </div>
        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <label>Filter by Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.filterSelect}
              disabled={loading}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Filter by Paper Type:</label>
            <select
              value={paperTypeFilter}
              onChange={(e) => setPaperTypeFilter(e.target.value)}
              className={styles.filterSelect}
              disabled={loading}
            >
              <option value="">All Paper Types</option>
              {PAPER_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className={styles.searchBar}>
        <span className="material-symbols-rounded">search</span>
        <input
          type="text"
          placeholder="Search by paper title or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        {searchTerm && (
          <button
            className={styles.clearSearchBtn}
            onClick={() => setSearchTerm('')}
            title="Clear search"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className={styles.loading}>
          <span className="material-symbols-rounded">hourglass_empty</span>
          <p>Loading assignments...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className={styles.error}>
          <span className="material-symbols-rounded">error_outline</span>
          <p>{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && assignments.length === 0 && (
        <div className={styles.empty}>
          <span className="material-symbols-rounded">inbox</span>
          <h3>No assignments found</h3>
          <p>You don't have any review assignments yet.</p>
        </div>
      )}

      {/* Assignments List */}
      {!loading && assignments.length > 0 && (
        <>
          <div className={styles.assignmentsList}>
            {assignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onStartReview={handleStartReview}
              />
            ))}
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

export default ReviewerAssignments;
