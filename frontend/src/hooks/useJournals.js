import { useState, useCallback } from 'react';
import {
  fetchJournals,
  fetchJournalById,
  fetchJournalDetails,
  createJournal,
  createJournalWithFiles,
  updateJournal,
  updateJournalWithFiles,
  deleteJournal,
} from '../services/journals';

/**
 * Custom hook for managing journal operations
 * @returns {object} - Journal management functions and state
 */
export const useJournals = () => {
  const [journals, setJournals] = useState([]);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [journalDetails, setJournalDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ skip: 0, limit: 10, total: 0 });

  /**
   * Get all journals with pagination
   */
  const getAllJournals = useCallback(async (skip = 0, limit = 10) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJournals(skip, limit);
      const journalList = Array.isArray(data) ? data : data.data || data.journals || [];
      setJournals(journalList);
      setPagination({ skip, limit, total: journalList.length });
      return journalList;
    } catch (err) {
      setError(err.message || 'Failed to fetch journals');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get a single journal by ID
   */
  const getJournalById = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJournalById(id);
      setSelectedJournal(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch journal');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get detailed information about a journal
   */
  const getJournalDetails = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJournalDetails(id);
      setJournalDetails(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch journal details');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new journal
   */
  const addJournal = useCallback(async (journalData) => {
    try {
      setLoading(true);
      setError(null);
      const newJournal = await createJournal(journalData);
      setJournals([...journals, newJournal]);
      return newJournal;
    } catch (err) {
      setError(err.message || 'Failed to create journal');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [journals]);

  /**
   * Update an existing journal
   */
  const editJournal = useCallback(
    async (id, journalData) => {
      try {
        setLoading(true);
        setError(null);
        const updated = await updateJournal(id, journalData);
        setJournals(journals.map((j) => (j.id === id ? updated : j)));
        if (selectedJournal?.id === id) {
          setSelectedJournal(updated);
        }
        return updated;
      } catch (err) {
        setError(err.message || 'Failed to update journal');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [journals, selectedJournal]
  );

  /**
   * Update an existing journal with file uploads
   */
  const editJournalWithFiles = useCallback(
    async (id, journalData, imageFile = null, logoFile = null) => {
      try {
        setLoading(true);
        setError(null);
        const updated = await updateJournalWithFiles(id, journalData, imageFile, logoFile);
        setJournals(journals.map((j) => (j.id === id ? updated : j)));
        if (selectedJournal?.id === id) {
          setSelectedJournal(updated);
        }
        return updated;
      } catch (err) {
        setError(err.message || 'Failed to update journal');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [journals, selectedJournal]
  );

  /**
   * Delete a journal
   */
  const removeJournal = useCallback(
    async (id) => {
      try {
        setLoading(true);
        setError(null);
        await deleteJournal(id);
        setJournals(journals.filter((j) => j.id !== id));
        if (selectedJournal?.id === id) {
          setSelectedJournal(null);
        }
        return true;
      } catch (err) {
        setError(err.message || 'Failed to delete journal');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [journals, selectedJournal]
  );

  /**
   * Clear errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear selected journal
   */
  const clearSelection = useCallback(() => {
    setSelectedJournal(null);
    setJournalDetails(null);
  }, []);

  return {
    // State
    journals,
    selectedJournal,
    journalDetails,
    loading,
    error,
    pagination,

    // Methods
    getAllJournals,
    getJournalById,
    getJournalDetails,
    addJournal,
    editJournal,
    editJournalWithFiles,
    removeJournal,
    clearError,
    clearSelection,
  };
};

export default useJournals;
