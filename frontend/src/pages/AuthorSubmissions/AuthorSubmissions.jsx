import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import acsApi from '../../api/apiService';
import PaperCard from '../../components/PaperCard/PaperCard';
import Pagination from '../../components/pagination/Pagination';
import { useListWithFilters } from '../../hooks/useListWithFilters';
import { useToast } from '../../hooks/useToast';
import styles from './AuthorSubmissions.module.css';

const AuthorSubmissions = () => {
  const [statusStats, setStatusStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [paperTypeFilter, setPaperTypeFilter] = useState('');
  const { success, error: showError } = useToast();

  const PAPER_TYPES = [
    'Full Length Article',
    'Review Paper',
    'Short Communication',
    'Case Study',
    'Technical Note'
  ];

  // Custom fetch function for author's papers with filters
  const fetchPapersWithFilters = async (skip, limit, filters) => {
    return await acsApi.author.listSubmissions(skip, limit, filters.status || '');
  };

  // Use the custom hook for list management
  const {
    data: papers,
    loading,
    error,
    pagination,
    filters,
    handleFilterChange,
    goToPage,
    nextPage,
    prevPage,
  } = useListWithFilters(fetchPapersWithFilters, { status: '' }, 10);

  // Fetch paper statistics for author
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const stats = await acsApi.author.getDashboardStats();
        setStatusStats({
          submitted: stats?.total_submissions || 0,
          under_review: stats?.under_review || 0,
          accepted: stats?.accepted_papers || 0,
          rejected: stats?.rejected_papers || 0,
        });
      } catch (err) {
        console.warn('Failed to load paper stats:', err);
        setStatusStats({});
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleStatusFilter = (status) => {
    handleFilterChange('status', status);
  };

  // Filter papers by paper type (client-side)
  const filteredPapers = paperTypeFilter 
    ? papers.filter(paper => paper.paper_type === paperTypeFilter)
    : papers;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>My Submissions</h1>
          <p>View and manage all your paper submissions</p>
        </div>
        {/* Filter Section */}
        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <label>Filter by Status:</label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className={styles.filterSelect}
              disabled={loading}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="under_review">Under Review</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
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

      

      {/* Loading State */}
      {loading && (
        <div className={styles.loading}>
          <span className="material-symbols-rounded">hourglass_empty</span>
          <p>Loading submissions...</p>
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
      {!loading && !error && filteredPapers.length === 0 && (
        <div className={styles.empty}>
          <span className="material-symbols-rounded">inbox</span>
          <h3>No submissions found</h3>
          <p>You haven't submitted any papers yet.</p>
          <Link to="/submit" className={styles.emptyActionBtn}>
            Submit Your First Paper
          </Link>
        </div>
      )}

      {/* Papers List */}
      {!loading && filteredPapers.length > 0 && (
        <>
          <div className={styles.paperList}>
            {filteredPapers.map(paper => (
              <PaperCard
                key={paper.id}
                paper={paper}
                actions="author"
                role="author"
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

export default AuthorSubmissions;
