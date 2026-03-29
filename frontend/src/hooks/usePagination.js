import { useState } from 'react';

/**
 * Custom hook for managing pagination state
 * @param {number} initialLimit - Items per page (default: 20)
 * @param {number} initialPage - Starting page (default: 1)
 * @returns {Object} Pagination state and helper methods
 */
export const usePagination = (initialLimit = 20, initialPage = 1) => {
  const [pagination, setPaginationState] = useState({
    total: 0,
    skip: (initialPage - 1) * initialLimit,
    limit: initialLimit,
    currentPage: initialPage,
  });

  const goToPage = (page) => {
    setPaginationState((prev) => ({
      ...prev,
      currentPage: page,
      skip: (page - 1) * prev.limit,
    }));
  };

  const nextPage = () => {
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    if (pagination.currentPage < totalPages) {
      goToPage(pagination.currentPage + 1);
    }
  };

  const prevPage = () => {
    if (pagination.currentPage > 1) {
      goToPage(pagination.currentPage - 1);
    }
  };

  const setLimit = (newLimit) => {
    setPaginationState((prev) => ({
      ...prev,
      limit: newLimit,
      currentPage: 1,
      skip: 0,
    }));
  };

  const updatePagination = (data) => {
    setPaginationState((prev) => ({
      ...prev,
      total: data.total || prev.total,
      skip: data.skip !== undefined ? data.skip : prev.skip,
      limit: data.limit || prev.limit,
    }));
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return {
    pagination,
    goToPage,
    nextPage,
    prevPage,
    setLimit,
    updatePagination,
    totalPages,
    currentPage: pagination.currentPage,
  };
};

export default usePagination;
