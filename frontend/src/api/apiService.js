import apiClient, { API_BASE_URL } from './axios';

// Export the API client instance
export const getApiClient = () => apiClient;

// API service functions for common HTTP operations
export const apiService = {
  // GET request
  get: async (endpoint, config = {}) => {
    try {
      const response = await apiClient.get(endpoint, config);
      return response.data;
    } catch (error) {
      console.error('GET request failed:', error);
      throw error;
    }
  },

  // POST request
  post: async (endpoint, data, config = {}) => {
    try {
      const response = await apiClient.post(endpoint, data, config);
      console.log(`POST ${endpoint}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
      throw error;
    }
  },

  // PUT request
  put: async (endpoint, data) => {
    try {
      const response = await apiClient.put(endpoint, data);
      return response.data;
    } catch (error) {
      console.error('PUT request failed:', error);
      throw error;
    }
  },

  // DELETE request
  delete: async (endpoint) => {
    try {
      const response = await apiClient.delete(endpoint);
      return response.data;
    } catch (error) {
      console.error('DELETE request failed:', error);
      throw error;
    }
  },

  // PATCH request
  patch: async (endpoint, data) => {
    try {
      const response = await apiClient.patch(endpoint, data);
      return response.data;
    } catch (error) {
      console.error('PATCH request failed:', error);
      throw error;
    }
  }
};

// Example specific API functions for Breakthrough Publishers system
export const acsApi = {
  // Authentication
  login: (credentials) => apiService.post('auth/login/', credentials),
  logout: () => apiService.post('auth/logout/'),
  register: (userData) => apiService.post('auth/register/', userData),

  // User management
  getUserProfile: () => apiService.get('users/profile/'),
  updateUserProfile: (data) => apiService.put('users/profile/', data),

  // Journals (public - no auth required)
  journals: {
    list: (skip = 0, limit = 10) => 
      apiService.get(`/api/v1/journals/?skip=${skip}&limit=${limit}`, { skipAuth: true }),
    listJournals: (skip = 0, limit = 3) => 
      apiService.get(`/api/v1/journals/?skip=${skip}&limit=${limit}`, { skipAuth: true }),
    getDetail: (id) => apiService.get(`/api/v1/journals/${id}`, { skipAuth: true }),
    getDetails: (id) => apiService.get(`/api/v1/journals/${id}/details`, { skipAuth: true }),
    getByShortForm: (shortForm) => apiService.get(`/api/v1/journals/by-subdomain/${shortForm}`, { skipAuth: true }),
    getEditorialBoard: (shortForm) => apiService.get(`/api/v1/journals/by-subdomain/${shortForm}/editorial-board`, { skipAuth: true }),
    getVolumes: (journalId) => apiService.get(`/api/v1/journals/${journalId}/volumes`, { skipAuth: true }),
    getVolumeIssues: (journalId, volumeNo) => apiService.get(`/api/v1/journals/${journalId}/volumes/${volumeNo}/issues`, { skipAuth: true }),
    getAllIssues: (journalId) => apiService.get(`/api/v1/journals/${journalId}/issues`, { skipAuth: true }),
    createVolume: (journalId, data) => apiService.post(`/api/v1/journals/${journalId}/volumes`, data),
    deleteVolume: (journalId, volumeId) => apiService.delete(`/api/v1/journals/${journalId}/volumes?volume_id=${volumeId}`),
    createIssue: (journalId, volumeNo, data) => apiService.post(`/api/v1/journals/${journalId}/volumes/${volumeNo}/issues`, data),
    deleteIssue: (journalId, volumeNo, issueId) => apiService.delete(`/api/v1/journals/${journalId}/volumes/${volumeNo}/issues?issue_id=${issueId}`),
    getRecommendations: (researchArea, keywords, abstract = '') => 
      apiService.post('/api/v1/journals/recommend/', { research_area: researchArea, keywords, abstract }),
  },

  // Articles/News (public - no auth required)
  articles: {
    list: (skip = 0, limit = 10) => 
      apiService.get(`/api/v1/articles/?skip=${skip}&limit=${limit}`, { skipAuth: true }),
    latest: (limit = 5) => 
      apiService.get(`/api/v1/articles/latest?limit=${limit}`, { skipAuth: true }),
    getDetail: (id) => apiService.get(`/api/v1/articles/${id}`, { skipAuth: true }),
    getByJournal: (journalId, skip = 0, limit = 10) => 
      apiService.get(`/api/v1/articles/journal/${journalId}?skip=${skip}&limit=${limit}`, { skipAuth: true }),
  },

  // Public News/Announcements (no auth required)
  news: {
    list: (skip = 0, limit = 10, journalId = null) => 
      apiService.get(`/api/v1/articles/news?skip=${skip}&limit=${limit}${journalId ? `&journal_id=${journalId}` : ''}`, { skipAuth: true }),
    getDetail: (newsId) => apiService.get(`/api/v1/articles/news/${newsId}`, { skipAuth: true }),
  },

  // Legacy methods for backwards compatibility (public)
  getJournals: (skip = 0, limit = 20, search = '') => 
    apiService.get(`/api/v1/journals/?skip=${skip}&limit=${limit}${search ? `&search=${search}` : ''}`, { skipAuth: true }),
  getJournalDetail: (id) => apiService.get(`/api/v1/journals/${id}`, { skipAuth: true }),

  // Admin endpoints
  admin: {
    getDashboardStats: () => apiService.get('/api/v1/admin/dashboard/stats'),
    listUsers: (skip = 0, limit = 20, search = '', role = '') =>
      apiService.get(`/api/v1/admin/users?skip=${skip}&limit=${limit}${search ? `&search=${search}` : ''}${role ? `&role=${role}` : ''}`),
    updateUserRole: (userId, role) => apiService.post(`/api/v1/admin/users/${userId}/role`, { role }),
    getUserRoles: (userId) => apiService.get(`/api/v1/admin/users/${userId}/roles`),
    updateUserRoles: (userId, roles) => apiService.put(`/api/v1/admin/users/${userId}/roles`, { roles }),
    deleteUser: (userId) => apiService.delete(`/api/v1/admin/users/${userId}`),
    listAllJournals: (skip = 0, limit = 20, search = '') =>
      apiService.get(`/api/v1/admin/journals?skip=${skip}&limit=${limit}${search ? `&search=${search}` : ''}`),
    deleteJournal: (journalId) => apiService.delete(`/api/v1/journals/${journalId}`),
    listAllPapers: (skip = 0, limit = 50, status = '') =>
      apiService.get(`/api/v1/admin/papers?skip=${skip}&limit=${limit}${status ? `&status=${status}` : ''}`),
    getPaperDetail: (paperId) => apiService.get(`/api/v1/admin/papers/${paperId}`),
    deletePaper: (paperId) => apiService.delete(`/api/v1/admin/papers/${paperId}`),
    getRecentActivity: (limit = 20) => apiService.get(`/api/v1/admin/activity?limit=${limit}`),
    getPapersByStatus: () => apiService.get('/api/v1/admin/stats/papers-by-status'),
    // Admin can also invite reviewers using the editor endpoint (which accepts both roles)
    inviteReviewer: (paperId, reviewerEmail, dueDays = 14, reviewerName = '') =>
      apiService.post(`/api/v1/editor/papers/${paperId}/invite-reviewer`, { reviewer_email: reviewerEmail, due_days: dueDays, reviewer_name: reviewerName }),
    cancelInvitation: (paperId, invitationId) =>
      apiService.delete(`/api/v1/editor/papers/${paperId}/invitations?invitation_id=${invitationId}`),
    listReviewers: (skip = 0, limit = 50, search = '', paperId = null) =>
      apiService.get(`/api/v1/editor/reviewers?skip=${skip}&limit=${limit}${search ? `&search=${search}` : ''}${paperId ? `&paper_id=${paperId}` : ''}`),
    
    // Editor Management
    listEditors: (skip = 0, limit = 50, journalId = null, editorType = null, search = '') =>
      apiService.get(`/api/v1/admin/editors?skip=${skip}&limit=${limit}${journalId ? `&journal_id=${journalId}` : ''}${editorType ? `&editor_type=${editorType}` : ''}${search ? `&search=${search}` : ''}`),
    createEditor: (editorData) => apiService.post('/api/v1/admin/editors', editorData),
    updateEditor: (editorId, editorData) => apiService.put(`/api/v1/admin/editors/${editorId}`, editorData),
    deleteEditor: (editorId) => apiService.delete(`/api/v1/admin/editors/${editorId}`),
    getJournalEditors: (journalId) => apiService.get(`/api/v1/admin/journals/${journalId}/editors`),
    
    // Admin User Creation
    createUser: (userData) => apiService.post('/api/v1/admin/users/create', userData),
    
    // News/Announcements Management
    listNews: (skip = 0, limit = 20, journalId = null) =>
      apiService.get(`/api/v1/admin/news?skip=${skip}&limit=${limit}${journalId ? `&journal_id=${journalId}` : ''}`),
    createNews: (newsData) => apiService.post('/api/v1/admin/news', newsData),
    updateNews: (newsId, newsData) => apiService.put(`/api/v1/admin/news/${newsId}`, newsData),
    deleteNews: (newsId) => apiService.delete(`/api/v1/admin/news/${newsId}`),
    
    // Email Templates
    listEmailTemplates: (category = null) =>
      apiService.get(`/api/v1/admin/email-templates${category ? `?category=${category}` : ''}`),
    getEmailTemplate: (templateId) =>
      apiService.get(`/api/v1/admin/email-templates/${templateId}`),
    createEmailTemplate: (templateData) =>
      apiService.post('/api/v1/admin/email-templates', templateData),
    updateEmailTemplate: (templateId, templateData) =>
      apiService.put(`/api/v1/admin/email-templates/${templateId}`, templateData),
    
    // Paper Correspondence (Admin)
    getPaperCorrespondence: (paperId) =>
      apiService.get(`/api/v1/admin/papers/${paperId}/correspondence`),
    sendCorrespondence: (paperId, data) =>
      apiService.post(`/api/v1/admin/papers/${paperId}/correspondence`, data),
    
    // Copyright Form Management
    triggerCopyrightForm: (paperId) =>
      apiService.post(`/api/v1/admin/papers/${paperId}/trigger-copyright-form`),
    
    // Analytics
    getSubmissionTrends: (months = 6) =>
      apiService.get(`/api/v1/admin/analytics/submission-trends?months=${months}`),
    getTopReviewers: (limit = 10) =>
      apiService.get(`/api/v1/admin/analytics/top-reviewers?limit=${limit}`),
    getStatusDistribution: () =>
      apiService.get('/api/v1/admin/analytics/status-distribution'),
    getJournalStats: () =>
      apiService.get('/api/v1/admin/analytics/journal-stats'),
    getUserGrowth: (months = 6) =>
      apiService.get(`/api/v1/admin/analytics/user-growth?months=${months}`),
    getReviewMetrics: () =>
      apiService.get('/api/v1/admin/analytics/review-metrics'),
  },

  // Author endpoints
  author: {
    getDashboardStats: () => apiService.get('/api/v1/author/dashboard/stats'),
    listSubmissions: (skip = 0, limit = 20, statusFilter = '') =>
      apiService.get(`/api/v1/author/submissions?skip=${skip}&limit=${limit}${statusFilter ? `&status_filter=${statusFilter}` : ''}`),
    getSubmissionDetail: (paperId) => apiService.get(`/api/v1/author/submissions/${paperId}`),
    submitPaper: ({ title, abstract, keywords, journal_id, title_page, blinded_manuscript, research_area, paper_type, message_to_editor, terms_accepted, authors }) => {
      console.log('submitPaper called with:', { 
        title, 
        abstract: abstract?.substring(0, 50) + '...', 
        keywords, 
        journal_id, 
        titlePageName: title_page?.name,
        titlePageSize: title_page?.size,
        blindedManuscriptName: blinded_manuscript?.name,
        blindedManuscriptSize: blinded_manuscript?.size,
        research_area,
        paper_type,
        terms_accepted,
        authors_count: authors?.length || 0
      });
      
      if (!title_page || !(title_page instanceof File)) {
        console.error('ERROR: title_page is not a valid File object!', title_page);
        return Promise.reject(new Error('Invalid title page file - must be a File object'));
      }
      
      if (!blinded_manuscript || !(blinded_manuscript instanceof File)) {
        console.error('ERROR: blinded_manuscript is not a valid File object!', blinded_manuscript);
        return Promise.reject(new Error('Invalid blinded manuscript file - must be a File object'));
      }
      
      const formData = new FormData();
      formData.append('title', title);
      formData.append('abstract', abstract);
      formData.append('keywords', keywords);
      formData.append('journal_id', String(journal_id));
      formData.append('title_page', title_page, title_page.name);
      formData.append('blinded_manuscript', blinded_manuscript, blinded_manuscript.name);
      formData.append('research_area', research_area || '');
      formData.append('paper_type', paper_type || 'Full Length Article');
      formData.append('message_to_editor', message_to_editor || '');
      formData.append('terms_accepted', terms_accepted ? 'true' : 'false');
      formData.append('authors', JSON.stringify(authors || []));
      
      // Debug FormData contents
      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value);
      }
      
      console.log('Posting to /api/v1/author/submit-paper');
      
      return apiClient.post('/api/v1/author/submit-paper', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}% (${progressEvent.loaded}/${progressEvent.total} bytes)`);
        }
      }).then(response => {
        console.log('Response received:', response.data);
        return response.data;
      });
    },
    getPaperComments: (paperId) => apiService.get(`/api/v1/author/submissions/${paperId}/comments`),
    getSubmissionReviews: (paperId) => apiService.get(`/api/v1/author/submissions/${paperId}/reviews`),
    getEditorDecision: (paperId) => apiService.get(`/api/v1/author/submissions/${paperId}/decision`),
    getRevisionHistory: (paperId) => apiService.get(`/api/v1/author/submissions/${paperId}/revisions`),
    resubmitPaper: (paperId, trackChangesFile, cleanFile, responseFile, revisionReason, changeSummary) => {
      const formData = new FormData();
      formData.append('track_changes_file', trackChangesFile);
      formData.append('clean_file', cleanFile);
      formData.append('response_file', responseFile);
      formData.append('revision_reason', revisionReason);
      if (changeSummary) formData.append('change_summary', changeSummary);
      return apiService.post(`/api/v1/author/submissions/${paperId}/resubmit`, formData);
    },
    downloadPaper: (paperId) =>
      apiClient.get(`/api/v1/author/submissions/${paperId}/download`, {
        responseType: 'blob'
      }),
    downloadReviewReport: (paperId, reviewId) =>
      apiClient.get(`/api/v1/author/submissions/${paperId}/reviews/${reviewId}/download-report`, {
        responseType: 'blob'
      }),
    // Correspondence/Notification history
    getCorrespondence: (paperId) => apiService.get(`/api/v1/author/submissions/${paperId}/correspondence`),
    markCorrespondenceRead: (paperId, correspondenceId) =>
      apiService.put(`/api/v1/author/submissions/${paperId}/correspondence/${correspondenceId}/read`),
    getUnreadCount: (paperId) =>
      apiService.get(`/api/v1/author/submissions/${paperId}/unread-count`),
    // Contact Editorial Office
    contactEditorial: (paperId, data) => {
      const formData = new FormData();
      formData.append('subject', data.subject);
      formData.append('message', data.message);
      formData.append('inquiry_type', data.inquiry_type || 'general');
      return apiClient.post(`/api/v1/author/submissions/${paperId}/contact-editorial`, formData);
    },
    // Get URLs for viewing files in browser
    getViewPaperUrl: (paperId) => `/api/v1/author/submissions/${paperId}/view`,
    getViewReviewReportUrl: (paperId, reviewId) => `/api/v1/author/submissions/${paperId}/reviews/${reviewId}/view-report`,
    getAuthorProfile: () => apiService.get('/api/v1/author/profile'),
    updateAuthorProfile: (profileData) => apiService.post('/api/v1/author/profile', profileData),
    requestReviewers: (paperId, suggestedReviewers, justification) =>
      apiService.post(`/api/v1/author/submissions/${paperId}/request-reviewers`, {
        suggested_reviewers: suggestedReviewers,
        justification: justification
      }),
  },

  // Copyright Transfer Form endpoints
  copyright: {
    getPending: () => apiService.get('/api/v1/copyright/pending'),
    getForm: (paperId) => apiService.get(`/api/v1/copyright/${paperId}`),
    submitForm: (paperId, formData) => apiService.post(`/api/v1/copyright/${paperId}/submit`, formData),
  },

  // Editor endpoints
  editor: {
    getDashboardStats: () => apiService.get('/api/v1/editor/dashboard/stats'),
    getPaperQueue: (skip = 0, limit = 20, statusFilter = '') =>
      apiService.get(`/api/v1/editor/paper-queue?skip=${skip}&limit=${limit}${statusFilter ? `&status_filter=${statusFilter}` : ''}`),
    getPaperDetail: (paperId) => apiService.get(`/api/v1/editor/papers/${paperId}`),
    assignReviewer: (paperId, reviewerId) =>
      apiService.post(`/api/v1/editor/papers/${paperId}/assign-reviewer`, { reviewer_id: reviewerId }),
    updatePaperStatus: (paperId, status, comments = '') =>
      apiService.post(`/api/v1/editor/papers/${paperId}/status`, { status, comments }),
    getPaperReviews: (paperId) => apiService.get(`/api/v1/editor/papers/${paperId}/reviews`),
    listReviewers: (skip = 0, limit = 50, search = '', paperId = null) =>
      apiService.get(`/api/v1/editor/reviewers?skip=${skip}&limit=${limit}${search ? `&search=${search}` : ''}${paperId ? `&paper_id=${paperId}` : ''}`),
    getPendingActions: () => apiService.get('/api/v1/editor/pending-actions'),
    // Invitation endpoints
    inviteReviewer: (paperId, reviewerEmail, dueDays = 14, reviewerName = '') =>
      apiService.post(`/api/v1/editor/papers/${paperId}/invite-reviewer`, { reviewer_email: reviewerEmail, due_days: dueDays, reviewer_name: reviewerName }),
    getPaperInvitations: (paperId) =>
      apiService.get(`/api/v1/editor/papers/${paperId}/invitations`),
    cancelInvitation: (paperId, invitationId) =>
      apiService.delete(`/api/v1/editor/papers/${paperId}/invitations?invitation_id=${invitationId}`),
    assignReviewerToPaper: (paperId, reviewerId, dueDays = 14) =>
      apiService.post(`/api/v1/editor/papers/${paperId}/assign-reviewer`, { reviewer_id: reviewerId, due_days: dueDays }),
    
    // My Journals - Journals assigned to this editor
    getMyJournals: () => apiService.get('/api/v1/editor/my-journals'),
    updateJournal: (journalId, journalData) => apiService.put(`/api/v1/editor/journals/${journalId}`, journalData),
    
    // Phase 6: Editor Decision Panel
    getPapersPendingDecision: (skip = 0, limit = 20) =>
      apiService.get(`/api/v1/editor/papers-pending-decision?skip=${skip}&limit=${limit}`),
    makePaperDecision: (paperId, decisionData) =>
      apiService.post(`/api/v1/editor/papers/${paperId}/decision`, decisionData),
    getPaperDecision: (paperId) =>
      apiService.get(`/api/v1/editor/papers/${paperId}/decision`),
    
    // Publishing workflow
    getReadyToPublish: (skip = 0, limit = 20) =>
      apiService.get(`/api/v1/editor/ready-to-publish?skip=${skip}&limit=${limit}`),
    publishPaper: (paperId, publishData) =>
      apiService.post(`/api/v1/editor/papers/${paperId}/publish`, publishData),
    publishPaperWithFile: async (paperId, formData) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/v1/editor/papers/${paperId}/publish-with-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (!response.ok) {
        const error = await response.json();
        throw { response: { data: error } };
      }
      return response.json();
    },
    checkDoiStatus: (paperId) =>
      apiService.get(`/api/v1/editor/papers/${paperId}/doi-status`),
    
    // Email Templates (Editor can also access)
    listEmailTemplates: (category = null) =>
      apiService.get(`/api/v1/admin/email-templates${category ? `?category=${category}` : ''}`),
    
    // Paper Correspondence (Editor)
    getPaperCorrespondence: (paperId) =>
      apiService.get(`/api/v1/admin/papers/${paperId}/correspondence`),
    sendCorrespondence: (paperId, data) =>
      apiService.post(`/api/v1/admin/papers/${paperId}/correspondence`, data),
    
    // View paper PDF
    getViewPaperUrl: (paperId) => `/api/v1/editor/papers/${paperId}/view`,

    // Submission History
    getSubmissionHistory: (paperId) =>
      apiService.get(`/api/v1/editor/papers/${paperId}/submission-history`),
  },

  // Invitation endpoints (public, no auth required)
  invitations: {
    getInvitationStatus: (token) => 
      apiService.get(`/api/v1/invitations/status/${token}`, { skipAuth: true }),
    acceptInvitation: (token) =>
      apiService.post(`/api/v1/invitations/${token}/accept`, {}, { skipAuth: true }),
    declineInvitation: (token, reason = '') =>
      apiService.post(`/api/v1/invitations/${token}/decline?${reason ? `reason=${encodeURIComponent(reason)}` : ''}`, {}, { skipAuth: true }),
    registerAndAccept: (token, { fname, lname, password, organization }) =>
      apiService.post(`/api/v1/invitations/${token}/register-accept`, { fname, lname: lname || '', password, organization: organization || '' }, { skipAuth: true }),
  },

  // Reviewer endpoints
  reviewer: {
    getDashboardStats: () => apiService.get('/api/v1/reviewer/dashboard/stats'),
    listAssignments: (skip = 0, limit = 20, statusFilter = '', sortBy = 'due_soon') =>
      apiService.get(`/api/v1/reviewer/assignments?skip=${skip}&limit=${limit}${statusFilter ? `&status_filter=${statusFilter}` : ''}&sort_by=${sortBy}`),
    getAssignmentDetail: (reviewId) => apiService.get(`/api/v1/reviewer/assignments/${reviewId}`),
    getReviewDetail: (reviewId) => apiService.get(`/api/v1/reviewer/assignments/${reviewId}/detail`),
    saveReviewDraft: (reviewId, reviewData) =>
      apiService.post(`/api/v1/reviewer/assignments/${reviewId}/save-draft`, reviewData),
    submitReview: (reviewId, reviewData) =>
      apiService.post(`/api/v1/reviewer/assignments/${reviewId}/submit`, reviewData),
    uploadReviewReport: (reviewId, file) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.post(`/api/v1/reviewer/assignments/${reviewId}/upload-report`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(res => res.data);
    },
    downloadReviewReport: (reviewId) =>
      apiClient.get(`/api/v1/reviewer/assignments/${reviewId}/download-report`, {
        responseType: 'blob'
      }),
    getReviewHistory: () => apiService.get('/api/v1/reviewer/history'),
    getReviewerProfile: () => apiService.get('/api/v1/reviewer/profile'),
    getPendingInvitations: (skip = 0, limit = 20) =>
      apiService.get(`/api/v1/reviewer/invitations?skip=${skip}&limit=${limit}`),
    acceptInvitation: (invitationId) =>
      apiService.post(`/api/v1/reviewer/invitations/${invitationId}/accept`, {}),
    declineInvitation: (invitationId, reason = '') =>
      apiService.post(`/api/v1/reviewer/invitations/${invitationId}/decline?${reason ? `reason=${encodeURIComponent(reason)}` : ''}`, {}),
  },

  // Role Management endpoints
  roles: {
    // Get current user's roles and pending requests
    getMyRoles: () => apiService.get('/api/v1/roles/my-roles'),
    
    // Request a new role
    requestRole: (requestedRole, reason = '') =>
      apiService.post('/api/v1/roles/request', { requested_role: requestedRole, reason }),
    
    // Switch active role/persona
    switchRole: (role) =>
      apiService.post('/api/v1/roles/switch', { role }),
    
    // Admin: List all role requests
    listRequests: (statusFilter = '', skip = 0, limit = 20) =>
      apiService.get(`/api/v1/roles/requests?skip=${skip}&limit=${limit}${statusFilter ? `&status_filter=${statusFilter}` : ''}`),
    
    // Admin: Process (approve/reject) a role request
    processRequest: (requestId, action, adminNotes = '', journalId = null) =>
      apiService.patch(`/api/v1/roles/requests/${requestId}`, { 
        action, 
        admin_notes: adminNotes,
        journal_id: journalId 
      }),
    
    // Admin: Get roles for a specific user
    getUserRoles: (userId) => apiService.get(`/api/v1/roles/users/${userId}/roles`),
    
    // Admin: Directly assign role to user
    assignRole: (userId, role, journalId = null) =>
      apiService.post(`/api/v1/roles/users/${userId}/roles?role=${role}${journalId ? `&journal_id=${journalId}` : ''}`),
    
    // Admin: Revoke role from user
    revokeRole: (userId, role) =>
      apiService.delete(`/api/v1/roles/users/${userId}/roles/${role}`),
  },
};

export default acsApi;