import { useState, useEffect, useRef, useCallback } from 'react';
import { searchOrganizations } from '../api/rorService';

/**
 * Custom hook for searching organizations with debouncing
 * @param {string} query - Search query
 * @param {number} debounceMs - Debounce delay in milliseconds (default: 300)
 * @param {number} minLength - Minimum query length to trigger search (default: 2)
 * @returns {{ organizations: Array, loading: boolean, error: string|null }}
 */
export const useOrganizationSearch = (query, debounceMs = 300, minLength = 2) => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const performSearch = useCallback(async (searchQuery) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!searchQuery || searchQuery.trim().length < minLength) {
      setOrganizations([]);
      setLoading(false);
      return;
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const results = await searchOrganizations(searchQuery, 10);
      setOrganizations(results);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Organization search error:', err);
        setError('Failed to search organizations');
        setOrganizations([]);
      }
    } finally {
      setLoading(false);
    }
  }, [minLength]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, debounceMs, performSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { organizations, loading, error };
};

export default useOrganizationSearch;
