import { apiService } from '../api/apiService';
import apiClient from '../api/axios';

const JOURNAL_ENDPOINTS = {
  LIST: '/api/v1/journals/',
  DETAIL: (id) => `/api/v1/journals/${id}`,
  DETAILS: (id) => `/api/v1/journals/${id}/details`,
  CREATE: '/api/v1/journals/',
  UPDATE: (id) => `/api/v1/journals/${id}`,
  DELETE: (id) => `/api/v1/journals/${id}`,
};

/**
 * Fetch all journals with pagination
 * @param {number} skip - Number of journals to skip (default: 0)
 * @param {number} limit - Number of journals to return (default: 100)
 * @returns {Promise<array>} - List of journals
 */
export const fetchJournals = async (skip = 0, limit = 100) => {
  try {
    return await apiService.get(`${JOURNAL_ENDPOINTS.LIST}?skip=${skip}&limit=${limit}`);
  } catch (error) {
    console.error('Error fetching journals:', error);
    throw error;
  }
};

/**
 * Fetch a single journal by ID
 * @param {number} id - Journal ID
 * @returns {Promise<object>} - Journal data
 */
export const fetchJournalById = async (id) => {
  try {
    return await apiService.get(JOURNAL_ENDPOINTS.DETAIL(id));
  } catch (error) {
    console.error(`Error fetching journal ${id}:`, error);
    throw error;
  }
};

/**
 * Fetch detailed information about a journal
 * @param {number} id - Journal ID
 * @returns {Promise<object>} - Detailed journal data
 */
export const fetchJournalDetails = async (id) => {
  try {
    return await apiService.get(JOURNAL_ENDPOINTS.DETAILS(id));
  } catch (error) {
    console.error(`Error fetching journal details for ${id}:`, error);
    throw error;
  }
};

/**
 * Create a new journal
 * @param {object} journalData - Journal data
 * @returns {Promise<object>} - Created journal
 */
export const createJournal = async (journalData) => {
  try {
    return await apiService.post(JOURNAL_ENDPOINTS.CREATE, journalData);
  } catch (error) {
    console.error('Error creating journal:', error);
    throw error;
  }
};

/**
 * Create a new journal with file uploads
 * @param {object} journalData - Journal data
 * @param {File} imageFile - Journal image file (optional)
 * @param {File} logoFile - Journal logo file (optional)
 * @returns {Promise<object>} - Created journal
 */
export const createJournalWithFiles = async (journalData, imageFile = null, logoFile = null) => {
  try {
    const formData = new FormData();
    
    // Add all journal data fields
    Object.keys(journalData).forEach(key => {
      if (journalData[key] !== null && journalData[key] !== undefined && journalData[key] !== '') {
        if (Array.isArray(journalData[key])) {
          // Handle arrays (like section_editor_ids)
          journalData[key].forEach(item => {
            formData.append(key, item);
          });
        } else {
          formData.append(key, journalData[key]);
        }
      }
    });
    
    // Add files if provided
    if (imageFile) {
      formData.append('journal_image', imageFile);
    }
    if (logoFile) {
      formData.append('journal_logo', logoFile);
    }
    
    const response = await apiClient.post(JOURNAL_ENDPOINTS.CREATE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error creating journal with files:', error);
    throw error;
  }
};

/**
 * Update an existing journal
 * @param {number} id - Journal ID
 * @param {object} journalData - Updated journal data
 * @returns {Promise<object>} - Updated journal
 */
export const updateJournal = async (id, journalData) => {
  try {
    // Transform frontend field names to backend field names
    const transformedData = {
      fld_journal_name: journalData.name,
      primary_category: journalData.primary_category,
      freq: journalData.frequency || journalData.freq,
      issn_ol: journalData.issn_online || journalData.issn_ol,
      issn_prt: journalData.issn_print || journalData.issn_prt,
      cheif_editor: journalData.chief_editor || journalData.cheif_editor,
      co_editor: journalData.co_editor,
      password: journalData.password || 'default',
      abs_ind: journalData.abstract_indexing || journalData.abs_ind,
      short_form: journalData.short_form,
      journal_image: journalData.journal_image,
      journal_logo: journalData.journal_logo,
      guidelines: journalData.guidelines,
      copyright: journalData.copyright,
      membership: journalData.membership,
      subscription: journalData.subscription,
      publication: journalData.publication,
      advertisement: journalData.advertisement,
      description: journalData.description,
      // Journal details fields
      about_journal: journalData.about_journal,
      chief_say: journalData.chief_say,
      aim_objective: journalData.aim_objective,
      criteria: journalData.criteria,
      scope: journalData.scope,
      detailed_guidelines: journalData.detailed_guidelines,
      readings: journalData.readings,
    };
    return await apiService.put(JOURNAL_ENDPOINTS.UPDATE(id), transformedData);
  } catch (error) {
    console.error(`Error updating journal ${id}:`, error);
    throw error;
  }
};

/**
 * Update an existing journal with file uploads
 * @param {number} id - Journal ID
 * @param {object} journalData - Updated journal data
 * @param {File} imageFile - Journal image file (optional)
 * @param {File} logoFile - Journal logo file (optional)
 * @returns {Promise<object>} - Updated journal
 */
export const updateJournalWithFiles = async (id, journalData, imageFile = null, logoFile = null) => {
  try {
    const formData = new FormData();
    
    // Transform and add all journal data fields
    const transformedData = {
      fld_journal_name: journalData.name,
      primary_category: journalData.primary_category,
      freq: journalData.frequency || journalData.freq,
      issn_ol: journalData.issn_online || journalData.issn_ol,
      issn_prt: journalData.issn_print || journalData.issn_prt,
      cheif_editor: journalData.chief_editor || journalData.cheif_editor,
      co_editor: journalData.co_editor,
      abs_ind: journalData.abstract_indexing || journalData.abs_ind,
      short_form: journalData.short_form,
      guidelines: journalData.guidelines,
      copyright: journalData.copyright,
      membership: journalData.membership,
      subscription: journalData.subscription,
      publication: journalData.publication,
      advertisement: journalData.advertisement,
      description: journalData.description,
      about_journal: journalData.about_journal,
      chief_say: journalData.chief_say,
      aim_objective: journalData.aim_objective,
      criteria: journalData.criteria,
      scope: journalData.scope,
      detailed_guidelines: journalData.detailed_guidelines,
      readings: journalData.readings,
      chief_editor_id: journalData.chief_editor_id,
      co_editor_id: journalData.co_editor_id,
      section_editor_ids: journalData.section_editor_ids,
    };
    
    Object.keys(transformedData).forEach(key => {
      if (transformedData[key] !== null && transformedData[key] !== undefined && transformedData[key] !== '') {
        if (Array.isArray(transformedData[key])) {
          transformedData[key].forEach(item => {
            formData.append(key, item);
          });
        } else {
          formData.append(key, transformedData[key]);
        }
      }
    });
    
    // Add files if provided
    if (imageFile) {
      formData.append('journal_image', imageFile);
    }
    if (logoFile) {
      formData.append('journal_logo', logoFile);
    }
    
    const response = await apiClient.put(JOURNAL_ENDPOINTS.UPDATE(id), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating journal ${id} with files:`, error);
    throw error;
  }
};

/**
 * Delete a journal
 * @param {number} id - Journal ID
 * @returns {Promise<object>} - Deletion response
 */
export const deleteJournal = async (id) => {
  try {
    return await apiService.delete(JOURNAL_ENDPOINTS.DELETE(id));
  } catch (error) {
    console.error(`Error deleting journal ${id}:`, error);
    throw error;
  }
};
