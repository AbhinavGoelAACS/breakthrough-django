import { useState, useEffect } from 'react';
import acsApi from '../../api/apiService';
import PaperCard from '../../components/PaperCard/PaperCard';
import StatusFilterBar from '../../components/StatusFilterBar/StatusFilterBar';
import Pagination from '../../components/pagination/Pagination';
import { useListWithFilters } from '../../hooks/useListWithFilters';
import { useToast } from '../../hooks/useToast';
import styles from './AdminSubmissions.module.css';

const AdminSubmissions = () => {
  const [statusStats, setStatusStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [paperTypeFilter, setPaperTypeFilter] = useState('');
  const { success, error: showError } = useToast();

  // Custom fetch function for papers with filters
  const fetchPapersWithFilters = async (skip, limit, filters) => {
    return await acsApi.admin.listAllPapers(skip, limit, filters.status || '');
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

  // Fetch paper statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const stats = await acsApi.admin.getPapersByStatus();
        setStatusStats(stats || {});
      } catch (err) {
        console.warn('Failed to load paper stats:', err);
        // Don't show error toast - just use empty stats
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

  const PAPER_TYPES = [
    'Full Length Article',
    'Review Paper',
    'Short Communication',
    'Case Study',
    'Technical Note'
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>All Submissions</h1>
          <p>View and manage all paper submissions</p>
        </div>
        {/* Paper Type Filter */}
        <div className={styles.filterSection}>
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

      {/* Status Filter Bar */}
      {!statsLoading && Object.keys(statusStats).length > 0 && (
        <StatusFilterBar
          statuses={statusStats}
          activeFilter={filters.status}
          onFilterChange={handleStatusFilter}
          loading={loading}
        />
      )}

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
          <p>No submissions found</p>
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
                actions="admin"
                role="admin"
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

export default AdminSubmissions;
