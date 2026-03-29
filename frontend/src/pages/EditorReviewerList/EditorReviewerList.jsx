import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import acsApi from '../../api/apiService';
import ReviewerCard from '../../components/ReviewerCard/ReviewerCard';
import Pagination from '../../components/pagination/Pagination';
import { useListWithFilters } from '../../hooks/useListWithFilters';
import { useToast } from '../../hooks/useToast';
import { useModal } from '../../hooks/useModal';
import styles from './EditorReviewerList.module.css';

const EditorReviewerList = () => {
  const navigate = useNavigate();
  const [specializations, setSpecializations] = useState([]);
  const { success, error: showError } = useToast();
  const { showModal, closeModal, isOpen } = useModal();
  const [selectedReviewer, setSelectedReviewer] = useState(null);
  const [searchInput, setSearchInput] = useState('');

  // Custom fetch function for reviewers with filters
  const fetchReviewersWithFilters = async (skip, limit, filters) => {
    return await acsApi.editor.listReviewers(
      skip,
      limit,
      filters.search || ''
    );
  };

  // Use the custom hook for list management
  const {
    data: reviewers,
    loading,
    error,
    pagination,
    filters,
    handleFilterChange,
    goToPage,
  } = useListWithFilters(
    fetchReviewersWithFilters,
    { specialization: '', search: '' },
    10
  );

  // Note: Specializations would come from backend if available
  // For now, using common academic specializations
  useEffect(() => {
    // Mock specializations - could be fetched from backend if endpoint exists
    const mockSpecs = [
      'Computer Science',
      'Mathematics',
      'Physics',
      'Chemistry',
      'Biology',
      'Engineering',
      'Medicine',
      'Psychology',
      'Economics',
      'Philosophy'
    ];
    setSpecializations(mockSpecs);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    handleFilterChange('search', searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    handleFilterChange('search', '');
  };

  const handleSpecializationFilter = (spec) => {
    handleFilterChange('specialization', spec);
  };

  const handleInviteClick = (reviewer) => {
    setSelectedReviewer(reviewer);
    showModal();
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedReviewer) return;

    const formData = new FormData(e.target);
    const dueDays = formData.get('due_days');

    if (!dueDays || dueDays < 1) {
      showError('Please enter valid due days');
      return;
    }

    try {
      await acsApi.editor.inviteReviewer(selectedReviewer.email, parseInt(dueDays));
      success(`Invitation sent to ${selectedReviewer.fname}`);
      closeModal();
      setSelectedReviewer(null);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to send invitation';
      showError(errorMsg);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Available Reviewers</h1>
        <p>Browse and invite reviewers for paper assignments</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className={styles.searchForm}>
        <div className={styles.searchInput}>
          <span className="material-symbols-rounded">search</span>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            disabled={loading}
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className={styles.clearBtn}
              title="Clear search"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          )}
        </div>
        <button type="submit" className={styles.searchBtn} disabled={loading}>
          <span>Search</span>
        </button>
      </form>

      {/* Specialization Filter */}
      {specializations.length > 0 && (
        <div className={styles.filterBar}>
          <label>Filter by Specialization:</label>
          <div className={styles.filterButtons}>
            <button
              className={`${styles.filterBtn} ${filters.specialization === '' ? styles.active : ''}`}
              onClick={() => handleSpecializationFilter('')}
              disabled={loading}
            >
              All
            </button>
            {specializations.map((spec) => (
              <button
                key={spec}
                className={`${styles.filterBtn} ${
                  filters.specialization === spec ? styles.active : ''
                }`}
                onClick={() => handleSpecializationFilter(spec)}
                disabled={loading}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className={styles.loading}>
          <span className="material-symbols-rounded">hourglass_empty</span>
          <p>Loading reviewers...</p>
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
      {!loading && !error && reviewers.length === 0 && (
        <div className={styles.empty}>
          <span className="material-symbols-rounded">person_off</span>
          <p>No reviewers found</p>
        </div>
      )}

      {/* Reviewers List */}
      {!loading && reviewers.length > 0 && (
        <>
          <div className={styles.reviewerList}>
            {reviewers.map((reviewer) => (
              <ReviewerCard
                key={reviewer.id}
                reviewer={reviewer}
                actions="invite"
                onAction={() => handleInviteClick(reviewer)}
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

      {/* Invite Modal */}
      {isOpen && selectedReviewer && (
        <div className={styles.modal}>
          <div className={styles.modalOverlay} onClick={closeModal} />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Invite Reviewer</h2>
              <button
                className={styles.closeBtn}
                onClick={closeModal}
                title="Close"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className={styles.modalForm}>
              <div className={styles.reviewerInfo}>
                <p>
                  <strong>Name:</strong> {selectedReviewer.fname} {selectedReviewer.lname || ''}
                </p>
                <p>
                  <strong>Email:</strong> {selectedReviewer.email}
                </p>
                {selectedReviewer.specialization && (
                  <p>
                    <strong>Specialization:</strong> {selectedReviewer.specialization}
                  </p>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="due_days">Due Days *</label>
                <input
                  type="number"
                  id="due_days"
                  name="due_days"
                  min="1"
                  max="60"
                  placeholder="e.g., 14"
                  required
                  className={styles.input}
                />
                <small>Number of days for reviewer to complete the review</small>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={closeModal}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn}>
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorReviewerList;
