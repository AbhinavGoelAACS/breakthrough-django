/**
 * Journal Context Provider
 * 
 * Provides journal context based on route parameters.
 * When accessing a journal via route (e.g., /j/ijest),
 * this context fetches and provides journal data to all child components.
 */

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { acsApi } from '../api/apiService';

// Create the context
export const JournalContext = createContext(null);

/**
 * JournalProvider Component
 * 
 * Wraps journal routes and provides journal context based on route params.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.shortForm - Journal short form from route params
 */
export const JournalProvider = ({ children, shortForm }) => {
  // Current journal data
  const [currentJournal, setCurrentJournal] = useState(null);
  // Extended journal details (about, scope, guidelines, etc.)
  const [journalDetails, setJournalDetails] = useState(null);
  // Loading state
  const [loading, setLoading] = useState(true);
  // Error state
  const [error, setError] = useState(null);
  // Whether we're on a journal page (always true when this provider is used)
  const [isJournalSite, setIsJournalSite] = useState(false);

  /**
   * Fetch journal data by short_form
   */
  const fetchJournalByShortForm = useCallback(async (shortFormValue) => {
    if (!shortFormValue) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const response = await acsApi.journals.getByShortForm(shortFormValue);
      setCurrentJournal(response);
      setIsJournalSite(true);
      
      // Also fetch extended details
      try {
        const details = await acsApi.journals.getDetails(response.id);
        setJournalDetails(details);
      } catch (detailsErr) {
        console.warn('Could not fetch journal details:', detailsErr);
        // Non-critical error, don't set main error state
      }
    } catch (err) {
      console.error('Failed to fetch journal:', shortFormValue, err);
      setError(`Journal "${shortFormValue}" not found`);
      setCurrentJournal(null);
      setIsJournalSite(false);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh journal data
   */
  const refreshJournal = useCallback(async () => {
    if (shortForm) {
      await fetchJournalByShortForm(shortForm);
    }
  }, [shortForm, fetchJournalByShortForm]);

  // Fetch journal when shortForm changes
  useEffect(() => {
    if (shortForm) {
      fetchJournalByShortForm(shortForm);
    } else {
      setIsJournalSite(false);
      setLoading(false);
    }
  }, [shortForm, fetchJournalByShortForm]);

  // Context value
  const value = {
    // Journal data
    currentJournal,
    journalDetails,
    
    // State flags
    loading,
    error,
    isJournalSite,
    shortForm,
    
    // Actions
    refreshJournal,
    
    // Computed values
    journalId: currentJournal?.id || null,
    journalName: currentJournal?.name || null,
    journalShortForm: currentJournal?.short_form || shortForm,
  };

  return (
    <JournalContext.Provider value={value}>
      {children}
    </JournalContext.Provider>
  );
};

/**
 * Custom hook to access journal context
 * 
 * @returns {Object} Journal context value
 * @throws {Error} If used outside of JournalProvider
 * 
 * @example
 * const { currentJournal, isJournalSite, loading } = useJournalContext();
 * 
 * if (isJournalSite && currentJournal) {
 *   return <JournalHomePage journal={currentJournal} />;
 * }
 */
export const useJournalContext = () => {
  const context = useContext(JournalContext);
  
  if (context === undefined || context === null) {
    throw new Error('useJournalContext must be used within a JournalProvider');
  }
  
  return context;
};

export default JournalProvider;
