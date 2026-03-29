import { useEffect, useState } from 'react';
import acsApi from '../../api/apiService';
import PaperCard from '../../components/PaperCard/PaperCard';
import Pagination from '../../components/pagination/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { useToast } from '../../hooks/useToast';
import styles from './EditorPendingDecision.module.css';

const EditorPendingDecision = () => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { error: showError } = useToast();
  const {
    pagination,
    goToPage,
    updatePagination,
    totalPages,
    currentPage,
  } = usePagination(10);

  // Fetch papers pending decision
  useEffect(() => {
    const fetchPendingDecision = async () => {
      try {
        setLoading(true);
        const response = await acsApi.editor.getPapersPendingDecision(
          pagination.skip,
          pagination.limit
        );

        setPapers(response.papers || []);
        updatePagination({
          total: response.total,
          skip: response.skip,
          limit: response.limit,
        });
        setError(null);
      } catch (err) {
        const errorMsg = err.response?.data?.message || 'Failed to load pending decisions';
        setError(errorMsg);
        showError(errorMsg);
        setPapers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingDecision();
  }, [pagination.skip, pagination.limit]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Pending Decisions</h1>
        <p>Papers awaiting your editorial decision with completed reviews</p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className={styles.loading}>
          <span className="material-symbols-rounded">hourglass_empty</span>
          <p>Loading pending decisions...</p>
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
      {!loading && !error && papers.length === 0 && (
        <div className={styles.empty}>
          <span className="material-symbols-rounded">done_all</span>
          <p>No pending decisions</p>
          <span className={styles.emptySubtext}>All papers are up to date!</span>
        </div>
      )}

      {/* Papers List */}
      {!loading && papers.length > 0 && (
        <>
          <div className={styles.statsBar}>
            <div className={styles.statItem}>
              <span className="material-symbols-rounded">assignment</span>
              <span>{papers.length} papers awaiting decision</span>
            </div>
            {totalPages > 1 && (
              <div className={styles.statItem}>
                <span className="material-symbols-rounded">info</span>
                <span>Page {currentPage} of {totalPages}</span>
              </div>
            )}
          </div>

          <div className={styles.paperList}>
            {papers.map((paper) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                actions="editor"
                role="editor"
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.paginationContainer}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
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

export default EditorPendingDecision;
