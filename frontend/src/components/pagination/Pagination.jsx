import React from 'react';
import './Pagination.css';

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  isLoading,
  itemsPerPage = 6,
  totalItems = 0,
}) => {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    onPageChange(page);
  };

  // Calculate item range
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = getPageNumbers();

  return (
    <div className="pagination">
      <div className="pagination-left">
        <span className="pagination-items-info">
          Items {startItem}-{endItem}/{totalItems}
        </span>
      </div>

      <div className="pagination-center">
        <button
          className="pagination-btn pagination-prev"
          onClick={handlePrevious}
          disabled={currentPage === 1 || isLoading}
          aria-label="Previous page"
        >
          <span className="material-symbols-rounded">chevron_left</span>
        </button>

        <div className="pagination-numbers">
          {pageNumbers[0] > 1 && (
            <>
              <button
                className="pagination-number"
                onClick={() => handlePageClick(1)}
                disabled={isLoading}
              >
                1
              </button>
              {pageNumbers[0] > 2 && <span className="pagination-ellipsis">...</span>}
            </>
          )}

          {pageNumbers.map((page) => (
            <button
              key={page}
              className={`pagination-number ${currentPage === page ? 'active' : ''}`}
              onClick={() => handlePageClick(page)}
              disabled={isLoading}
            >
              {page}
            </button>
          ))}

          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                <span className="pagination-ellipsis">...</span>
              )}
              <button
                className="pagination-number"
                onClick={() => handlePageClick(totalPages)}
                disabled={isLoading}
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        <button
          className="pagination-btn pagination-next"
          onClick={handleNext}
          disabled={currentPage === totalPages || isLoading}
          aria-label="Next page"
        >
          <span className="material-symbols-rounded">chevron_right</span>
        </button>
      </div>

      <div className="pagination-right">
        <span className="pagination-info">
          Page {currentPage} of {totalPages}
        </span>
      </div>
    </div>
  );
};

export default Pagination;
