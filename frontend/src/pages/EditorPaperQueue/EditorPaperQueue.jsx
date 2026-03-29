import { useState, useEffect } from 'react';
import acsApi from '../../api/apiService';
import PaperCard from '../../components/PaperCard/PaperCard';
import StatusFilterBar from '../../components/StatusFilterBar/StatusFilterBar';
import Pagination from '../../components/pagination/Pagination';
import { useListWithFilters } from '../../hooks/useListWithFilters';
import { useToast } from '../../hooks/useToast';
import styles from './EditorPaperQueue.module.css';

const EditorPaperQueue = () => {
  const [statusStats, setStatusStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [journals, setJournals] = useState([]);
  const [paperTypeFilter, setPaperTypeFilter] = useState('');
  const { success, error: showError } = useToast();

  // Custom fetch function for editor papers with filters
  const fetchEditorPapersWithFilters = async (skip, limit, filters) => {
    // API only supports status filter from the getPaperQueue endpoint
    return await acsApi.editor.getPaperQueue(
      skip,
      limit,
      filters.status || ''
    );
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
  } = useListWithFilters(fetchEditorPapersWithFilters, { status: '', journal: '' }, 10);

  // Fetch paper statistics and journals
  useEffect(() => {
    const fetchData = async () => {
      try {
        setStatsLoading(true);
        
        // Fetch stats - with error handling
        try {
          const stats = await acsApi.editor.getPaperQueue(0, 1);
          // Extract status from first response if available
          setStatusStats(stats?.status_summary || {});
        } catch (statsErr) {
          console.warn('Failed to load stats:', statsErr);
          setStatusStats({});
        }

        // Fetch available journals - with error handling
        try {
          const journalsData = await acsApi.admin.listJournals(0, 100);
          setJournals(Array.isArray(journalsData.journals) ? journalsData.journals : []);
        } catch (journalsErr) {
          console.warn('Failed to load journals:', journalsErr);
          setJournals([]);
        }
      } catch (err) {
        console.warn('Failed to load data:', err);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleStatusFilter = (status) => {
    handleFilterChange('status', status);
  };

  const handleJournalFilter = (journalId) => {
    handleFilterChange('journal', journalId);
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
        <h1>Paper Queue</h1>
        <p>Manage papers pending your editorial decision</p>
      </div>

      {/* Filters Section */}
      <div className={styles.filtersSection}>
        {/* Status Filter Bar */}
        {!statsLoading && Object.keys(statusStats).length > 0 && (
          <StatusFilterBar
            statuses={statusStats}
            activeFilter={filters.status}
            onFilterChange={handleStatusFilter}
            loading={loading}
          />
        )}

        {/* Journal Filter */}
        {journals.length > 0 && (
          <div className={styles.journalFilter}>
            <label htmlFor="journal-select">Filter by Journal:</label>
            <select
              id="journal-select"
              value={filters.journal || ''}
              onChange={(e) => handleJournalFilter(e.target.value)}
              disabled={loading}
              className={styles.select}
            >
              <option value="">All Journals</option>
              {journals.map((journal) => (
                <option key={journal.id} value={journal.id}>
                  {journal.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Paper Type Filter */}
        <div className={styles.journalFilter}>
          <label htmlFor="paper-type-select">Filter by Paper Type:</label>
          <select
            id="paper-type-select"
            value={paperTypeFilter}
            onChange={(e) => setPaperTypeFilter(e.target.value)}
            disabled={loading}
            className={styles.select}
          >
            <option value="">All Paper Types</option>
            {PAPER_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className={styles.loading}>
          <span className="material-symbols-rounded">hourglass_empty</span>
          <p>Loading papers...</p>
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
          <p>No papers in queue</p>
        </div>
      )}

      {/* Papers List */}
      {!loading && filteredPapers.length > 0 && (
        <>
          <div className={styles.paperList}>
            {filteredPapers.map((paper) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                actions="editor"
                role="editor"
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

export default EditorPaperQueue;
