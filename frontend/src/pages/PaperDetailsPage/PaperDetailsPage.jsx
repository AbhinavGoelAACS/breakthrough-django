import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import { useToast } from '../../hooks/useToast';
import { useModal } from '../../hooks/useModal';
import acsApi from '../../api/apiService';
import { API_BASE_URL } from '../../api/axios';
import paperNormalizer from '../../services/paperNormalizer';
import FileViewer from '../../components/FileViewer/FileViewer';
import StatusChips from '../../components/StatusChips/StatusChips';
import ContactEditorialModal from '../../components/ContactEditorialModal';
import AuthorContactModal from '../../components/AuthorContactModal';
import { formatDateUS, formatDateTimeIST, formatDateWithWeekday, formatFutureDateWithWeekday } from '../../utils/dateUtils';
import styles from './PaperDetailsPage.module.css';

const PaperDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isEditor, isAuthor, isReviewer } = useRole();
  const { success, error: showError, info } = useToast();
  const { confirm } = useModal();

  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedReviewId, setExpandedReviewId] = useState(null);
  const [showAssignReviewer, setShowAssignReviewer] = useState(false);
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [dueDays, setDueDays] = useState(14);
  const [assigningReviewer, setAssigningReviewer] = useState(false);
  const [availableReviewers, setAvailableReviewers] = useState([]);
  const [searchReviewers, setSearchReviewers] = useState('');
  const [filteredReviewers, setFilteredReviewers] = useState([]);
  const [loadingReviewers, setLoadingReviewers] = useState(false);
  const [showReviewerDropdown, setShowReviewerDropdown] = useState(false);
  // External reviewer invitation state
  const [inviteMode, setInviteMode] = useState('existing'); // 'existing' | 'external'
  const [externalEmail, setExternalEmail] = useState('');
  const [externalName, setExternalName] = useState('');
  const [emailError, setEmailError] = useState('');
  // Author resubmission state
  const [showResubmitForm, setShowResubmitForm] = useState(false);
  const [trackChangesFile, setTrackChangesFile] = useState(null);
  const [cleanFile, setCleanFile] = useState(null);
  const [responseFile, setResponseFile] = useState(null);
  const [revisionReason, setRevisionReason] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [resubmitting, setResubmitting] = useState(false);
  // Correspondence history
  const [correspondence, setCorrespondence] = useState([]);
  const [loadingCorrespondence, setLoadingCorrespondence] = useState(false);
  const [showCorrespondence, setShowCorrespondence] = useState(false);
  // Contact Editorial Modal (for admin/editor)
  const [showContactModal, setShowContactModal] = useState(false);
  // Author Contact Modal (for author to contact editorial)
  const [showAuthorContactModal, setShowAuthorContactModal] = useState(false);
  // Revision history
  const [revisionHistory, setRevisionHistory] = useState([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  // Copyright form trigger (admin only)
  const [triggeringCopyright, setTriggeringCopyright] = useState(false);

  // Generate alerts based on paper status and data
  const getAlerts = () => {
    if (!paper) return [];
    const alerts = [];
    const now = new Date();

    // Author-specific alerts
    if (isAuthor()) {
      // Revision requested alert
      if (paper.status === 'correction' || paper.status === 'revision_requested') {
        const deadline = paper.revision_deadline ? new Date(paper.revision_deadline) : null;
        const daysLeft = deadline ? Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)) : null;
        
        alerts.push({
          type: 'warning',
          icon: 'edit_note',
          title: 'Revisions Requested',
          message: deadline 
            ? `Please submit your revisions by ${formatDateUS(paper.revision_deadline)}${daysLeft !== null ? ` (${daysLeft} days left)` : ''}`
            : 'Please submit your revisions as soon as possible.',
          action: () => setShowResubmitForm(true),
          actionText: 'Submit Revision'
        });
      }

      // Paper accepted alert
      if (paper.status === 'accepted') {
        alerts.push({
          type: 'success',
          icon: 'celebration',
          title: 'Congratulations!',
          message: 'Your paper has been accepted for publication.'
        });
      }

      // Paper rejected alert
      if (paper.status === 'rejected') {
        alerts.push({
          type: 'error',
          icon: 'feedback',
          title: 'Paper Not Accepted',
          message: 'Please review the editor feedback for details.'
        });
      }

      // Under review alert
      if (paper.status === 'under_review') {
        alerts.push({
          type: 'info',
          icon: 'rate_review',
          title: 'Under Review',
          message: 'Your paper is currently being reviewed by our experts.'
        });
      }

      // Recently submitted alert
      if (paper.status === 'submitted') {
        alerts.push({
          type: 'info',
          icon: 'hourglass_top',
          title: 'Submission Received',
          message: 'Your paper is awaiting editorial review.'
        });
      }
    }

    // Editor/Admin-specific alerts
    if (isEditor() || isAdmin()) {
      // Paper needs decision
      if (paper.status === 'under_review' && paper.reviews && paper.reviews.length > 0) {
        const submittedReviews = paper.reviews.filter(r => r.status === 'submitted' || r.submitted_at);
        if (submittedReviews.length > 0) {
          alerts.push({
            type: 'warning',
            icon: 'gavel',
            title: 'Decision Required',
            message: `${submittedReviews.length} review(s) submitted. Ready for editorial decision.`,
            action: () => navigate(isAdmin() ? `/admin/submissions/${paper.id}/decision` : `/editor/papers/${paper.id}/decision`),
            actionText: 'Make Decision'
          });
        }
      }

      // Paper awaiting reviewer assignment
      if (paper.status === 'submitted' || (paper.status === 'under_review' && (!paper.reviewers || paper.reviewers.length === 0))) {
        alerts.push({
          type: 'info',
          icon: 'person_add',
          title: 'Assign Reviewers',
          message: 'This paper needs reviewers assigned.',
          action: () => {
            setShowAssignReviewer(true);
            setShowReviewerDropdown(true);
            if (!availableReviewers.length) fetchAvailableReviewers();
          },
          actionText: 'Assign Reviewer'
        });
      }
    }

    return alerts;
  };

  // Generate timeline events for paper activity
  const getTimelineEvents = () => {
    if (!paper) return [];
    const events = [];

    // 1. Paper Submission
    if (paper.submittedDate) {
      events.push({
        id: 'submitted',
        type: 'submitted',
        icon: 'publish',
        iconColor: 'iconBlue',
        title: 'Paper Submitted',
        description: 'Initial manuscript submitted',
        date: new Date(paper.submittedDate),
        showToAll: true
      });
    }

    // 2. Reviewer Assignments - from assignedReviewers
    const reviewers = paper.assignedReviewers || [];
    reviewers.forEach((reviewer, idx) => {
      if (reviewer.assigned_on) {
        events.push({
          id: `assigned-${reviewer.reviewer_id || idx}`,
          type: 'reviewer_assigned',
          icon: 'person_add',
          iconColor: 'iconSlate',
          title: 'Reviewer Assigned',
          description: (isEditor() || isAdmin()) 
            ? `${reviewer.reviewer_name || 'Reviewer'} assigned to review`
            : 'A reviewer has been assigned',
          date: new Date(reviewer.assigned_on),
          showToAll: false, // Hide specific names from authors
          reviewerId: reviewer.reviewer_id,
          reviewerName: reviewer.reviewer_name
        });
      }
    });

    // 3. Reviews Submitted - from assignedReviewers with submitted_at
    reviewers.forEach((reviewer, idx) => {
      if (reviewer.submitted_at && reviewer.has_submitted) {
        events.push({
          id: `reviewed-${reviewer.reviewer_id || idx}`,
          type: 'review_submitted',
          icon: 'rate_review',
          iconColor: 'iconPurple',
          title: 'Review Submitted',
          description: (isEditor() || isAdmin())
            ? `${reviewer.reviewer_name || 'Reviewer'} submitted their review`
            : 'A review has been submitted',
          date: new Date(reviewer.submitted_at),
          showToAll: false,
          reviewerId: reviewer.reviewer_id,
          reviewerName: reviewer.reviewer_name
        });
      }
    });

    // 4. Revision Requested - from paper.revisionRequestedDate
    if (paper.revisionRequestedDate) {
      const revisionTypeLabel = paper.revisionType 
        ? `${paper.revisionType.charAt(0).toUpperCase() + paper.revisionType.slice(1)} revision` 
        : 'Revision';
      events.push({
        id: 'revision-requested',
        type: 'revision_requested',
        icon: 'edit_note',
        iconColor: 'iconAmber',
        title: `${revisionTypeLabel} Requested`,
        description: paper.editorComments 
          ? paper.editorComments.substring(0, 80) + (paper.editorComments.length > 80 ? '...' : '')
          : 'Please address the reviewer feedback',
        date: new Date(paper.revisionRequestedDate),
        showToAll: true
      });
    }

    // 5. Resubmissions - from revisionHistory (versions > 1)
    if (revisionHistory && revisionHistory.length > 0) {
      revisionHistory.forEach((version) => {
        if (version.version_number > 1 && version.uploaded_on) {
          events.push({
            id: `resubmit-v${version.version_number}`,
            type: 'resubmitted',
            icon: 'upload_file',
            iconColor: 'iconTeal',
            title: `Version ${version.version_number} Submitted`,
            description: version.change_summary || 'Revised manuscript submitted',
            date: new Date(version.uploaded_on),
            showToAll: true,
            versionNumber: version.version_number
          });
        }
      });
    }

    // 6. Final Decision - based on status
    if (paper.status === 'accepted') {
      events.push({
        id: 'accepted',
        type: 'accepted',
        icon: 'check_circle',
        iconColor: 'iconGreen',
        title: 'Paper Accepted',
        description: 'Your paper has been accepted for publication',
        date: paper.acceptedOn || paper.accepted_on || paper._raw?.accepted_on || null,
        showToAll: true
      });
    } else if (paper.status === 'rejected') {
      events.push({
        id: 'rejected',
        type: 'rejected',
        icon: 'cancel',
        iconColor: 'iconRed',
        title: 'Paper Rejected',
        description: 'See feedback for details',
        date: new Date(), // No specific date available, use current
        showToAll: true
      });
    } else if (paper.status === 'published') {
      events.push({
        id: 'published',
        type: 'published',
        icon: 'language',
        iconColor: 'iconGreen',
        title: 'Paper Published',
        description: 'Your paper is now publicly available',
        date: new Date(),
        showToAll: true
      });
    }

    // Sort events by date (oldest first for timeline)
    // Paper Submitted should always be first regardless of timestamp
    events.sort((a, b) => {
      // Paper Submitted always comes first
      if (a.type === 'submitted') return -1;
      if (b.type === 'submitted') return 1;
      // Then sort by date (oldest first)
      return a.date - b.date;
    });

    return events;
  };

  useEffect(() => {
    fetchPaperDetails();
  }, [id]);

  // Auto-fetch revision history for timeline when paper loads
  useEffect(() => {
    if (paper?.id && isAuthor()) {
      fetchRevisionHistory();
    }
  }, [paper?.id]);

  useEffect(() => {
    // Filter reviewers when search term changes
    if (searchReviewers.trim()) {
      const filtered = availableReviewers.filter(reviewer =>
        reviewer.name.toLowerCase().includes(searchReviewers.toLowerCase()) ||
        reviewer.email.toLowerCase().includes(searchReviewers.toLowerCase())
      );
      setFilteredReviewers(filtered);
    } else {
      setFilteredReviewers(availableReviewers);
    }
  }, [searchReviewers, availableReviewers]);

  const fetchAvailableReviewers = async () => {
    try {
      setLoadingReviewers(true);
      setShowReviewerDropdown(true); // Show dropdown immediately while loading
      // Use appropriate API based on role, pass paper.id for recommendation scoring
      const response = isAdmin() 
        ? await acsApi.admin.listReviewers(0, 100, '', paper?.id)
        : await acsApi.editor.listReviewers(0, 100, '', paper?.id);
      
      console.log('Reviewers API response:', response);
      
      // Handle both response formats - direct array or wrapped in object
      const reviewersList = Array.isArray(response) ? response : (response?.reviewers || []);
      
      setAvailableReviewers(reviewersList);
      setFilteredReviewers(reviewersList);
      
      if (reviewersList.length === 0) {
        console.warn('No reviewers found in database');
      }
    } catch (err) {
      console.error('Failed to fetch reviewers:', err);
      showError('Failed to load available reviewers', 3000);
    } finally {
      setLoadingReviewers(false);
    }
  };

  // Fetch correspondence history for author
  const fetchCorrespondence = async () => {
    if (!paper?.id) return;
    try {
      setLoadingCorrespondence(true);
      let response;
      if (isAuthor()) {
        response = await acsApi.author.getCorrespondence(paper.id);
      } else if (isAdmin() || isEditor()) {
        response = await acsApi.admin.getPaperCorrespondence(paper.id);
      }
      setCorrespondence(response?.correspondence || []);
    } catch (err) {
      console.error('Failed to fetch correspondence:', err);
      // Don't show error toast, just log it
    } finally {
      setLoadingCorrespondence(false);
    }
  };

  // Handle contact modal close
  const handleContactModalClose = (sent) => {
    setShowContactModal(false);
    if (sent) {
      success('Correspondence sent successfully');
      // Refresh correspondence list if it's visible
      if (showCorrespondence) {
        fetchCorrespondence();
      }
    }
  };

  // Fetch revision history for author
  const fetchRevisionHistory = async () => {
    if (!paper?.id || !isAuthor()) return;
    try {
      setLoadingRevisions(true);
      const response = await acsApi.author.getRevisionHistory(paper.id);
      setRevisionHistory(response.versions || []);
    } catch (err) {
      console.error('Failed to fetch revision history:', err);
    } finally {
      setLoadingRevisions(false);
    }
  };

  // Handle paper resubmission
  const handleResubmit = async () => {
    // Validate track changes file
    if (!trackChangesFile) {
      showError('Please upload the manuscript with track changes', 4000);
      return;
    }
    
    // Validate clean file
    if (!cleanFile) {
      showError('Please upload the clean revised manuscript', 4000);
      return;
    }
    
    // Validate response file
    if (!responseFile) {
      showError('Please upload your response to reviewer comments', 4000);
      return;
    }
    
    // Validate revision reason
    if (!revisionReason.trim()) {
      showError('Please provide a summary of your revisions', 4000);
      return;
    }
    
    if (revisionReason.trim().length < 20) {
      showError('Revision summary must be at least 20 characters', 4000);
      return;
    }
    
    // File type validation - only .docx allowed
    const allowedTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const docxExtension = '.docx';
    
    const validateFile = (file, label) => {
      if (!file.name.toLowerCase().endsWith(docxExtension) && !allowedTypes.includes(file.type)) {
        showError(`${label}: Only .docx (Word) documents are allowed`, 4000);
        return false;
      }
      // 50MB limit
      if (file.size > 50 * 1024 * 1024) {
        showError(`${label}: File size must be less than 50MB`, 4000);
        return false;
      }
      return true;
    };
    
    if (!validateFile(trackChangesFile, 'Track changes file')) return;
    if (!validateFile(cleanFile, 'Clean manuscript')) return;
    if (!validateFile(responseFile, 'Response to reviewer')) return;

    try {
      setResubmitting(true);
      await acsApi.author.resubmitPaper(paper.id, trackChangesFile, cleanFile, responseFile, revisionReason, changeSummary);
      success('Paper resubmitted successfully! Reviewers have been notified.', 5000);
      setShowResubmitForm(false);
      setTrackChangesFile(null);
      setCleanFile(null);
      setResponseFile(null);
      setRevisionReason('');
      setChangeSummary('');
      // Refresh paper details
      await fetchPaperDetails();
    } catch (err) {
      console.error('Error resubmitting paper:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to resubmit paper. Please try again.';
      showError(errorMsg, 5000);
    } finally {
      setResubmitting(false);
    }
  };

  const fetchPaperDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch based on user role
      let response;
      if (isEditor()) {
        response = await acsApi.editor.getPaperDetail(id);
      } else if (isAuthor()) {
        response = await acsApi.author.getSubmissionDetail(id);
      } else if (isReviewer()) {
        response = await acsApi.reviewer.getAssignmentDetail(id);
      } else if (isAdmin()) {
        response = await acsApi.admin.getPaperDetail(id);
      }

      // Normalize the paper data
      const normalized = paperNormalizer.normalizePaper(response);
      setPaper(normalized);
    } catch (err) {
      console.error('Error fetching paper details:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to load paper details';
      setError(errorMsg);
      showError(errorMsg, 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignReviewer = async () => {
    // Determine the email based on invite mode
    const emailToUse = inviteMode === 'external' ? externalEmail.trim() : reviewerEmail.trim();
    
    if (!emailToUse) {
      showError(inviteMode === 'external' 
        ? 'Please enter an email address' 
        : 'Please select or enter a reviewer email', 3000);
      return;
    }

    // Validate email format for external mode
    if (inviteMode === 'external') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailToUse)) {
        showError('Please enter a valid email address', 3000);
        return;
      }
    }

    try {
      setAssigningReviewer(true);
      // Use appropriate API based on role
      if (isAdmin()) {
        await acsApi.admin.inviteReviewer(paper.id, emailToUse, dueDays);
      } else {
        await acsApi.editor.inviteReviewer(paper.id, emailToUse, dueDays);
      }
      
      // Different success messages based on mode
      const successMsg = inviteMode === 'external'
        ? `Invitation sent to ${emailToUse}. They will receive an email to create an account and review this paper.`
        : `Reviewer invitation sent to ${emailToUse}`;
      success(successMsg, 5000);
      
      // Reset form state
      setReviewerEmail('');
      setSearchReviewers('');
      setExternalEmail('');
      setExternalName('');
      setEmailError('');
      setDueDays(14);
      setInviteMode('existing');
      setShowAssignReviewer(false);
      setShowReviewerDropdown(false);
      // Refresh paper details
      await fetchPaperDetails();
    } catch (err) {
      console.error('Error assigning reviewer:', err);
      
      // Extract detailed error message
      let errorMsg = 'Failed to assign reviewer';
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'object') {
          errorMsg = detail.message || detail.error || errorMsg;
          if (detail.fix) {
            errorMsg += ` - ${detail.fix}`;
          }
        } else {
          errorMsg = detail;
        }
      }
      showError(errorMsg, 5000);
    } finally {
      setAssigningReviewer(false);
    }
  };

  const handleSelectReviewer = (reviewer) => {
    setReviewerEmail(reviewer.email);
    setSearchReviewers(reviewer.name);
    setShowReviewerDropdown(false);
  };

  // Trigger copyright form for accepted papers (admin only)
  const handleTriggerCopyrightForm = async () => {
    if (!paper?.id) return;
    
    const confirmed = await confirm({
      title: 'Trigger Copyright Form',
      message: `This will create a copyright transfer form for "${paper.title}" and send an email notification to the author. The author will have 48 hours to complete it.`,
      confirmText: 'Send Copyright Form',
      confirmColor: 'primary'
    });
    
    if (!confirmed) return;
    
    try {
      setTriggeringCopyright(true);
      const result = await acsApi.admin.triggerCopyrightForm(paper.id);
      success(`Copyright form created! Email ${result.email_sent ? 'sent' : 'notification failed'} to ${result.author_email}`, 5000);
    } catch (err) {
      console.error('Error triggering copyright form:', err);
      showError(err.response?.data?.detail || 'Failed to trigger copyright form', 5000);
    } finally {
      setTriggeringCopyright(false);
    }
  };

  const handleViewPaper = () => {
    if (paper?.id) {
      // Get token for authentication (stored as 'authToken' in localStorage)
      const token = localStorage.getItem('authToken');
      
      // Use different endpoint based on role
      let viewUrl;
      if (isAdmin()) {
        viewUrl = `${API_BASE_URL}/api/v1/admin/papers/${paper.id}/view`;
      } else if (isEditor()) {
        viewUrl = `${API_BASE_URL}/api/v1/editor/papers/${paper.id}/view`;
      } else {
        viewUrl = `${API_BASE_URL}/api/v1/author/submissions/${paper.id}/view`;
      }
      
      // Open with token in URL for authentication
      window.open(`${viewUrl}?token=${token}`, '_blank');
      info('Opening file in new tab...', 2000);
    }
  };

  const handleViewTitlePage = () => {
    if (paper?.id) {
      const token = localStorage.getItem('authToken');
      // Authors use author endpoint, editors/admins use editor endpoint
      const viewUrl = isAuthor() 
        ? `${API_BASE_URL}/api/v1/author/submissions/${paper.id}/view-title-page`
        : `${API_BASE_URL}/api/v1/editor/papers/${paper.id}/view-title-page`;
      window.open(`${viewUrl}?token=${token}`, '_blank');
      info('Opening title page in new tab...', 2000);
    }
  };

  const handleViewBlindedManuscript = () => {
    if (paper?.id) {
      const token = localStorage.getItem('authToken');
      // Authors use author endpoint, editors/admins use editor endpoint
      const viewUrl = isAuthor() 
        ? `${API_BASE_URL}/api/v1/author/submissions/${paper.id}/view-blinded-manuscript`
        : `${API_BASE_URL}/api/v1/editor/papers/${paper.id}/view-blinded-manuscript`;
      window.open(`${viewUrl}?token=${token}`, '_blank');
      info('Opening blinded manuscript in new tab...', 2000);
    }
  };

  const handleViewReviewReport = (reviewId, e) => {
    e.stopPropagation(); // Prevent expanding/collapsing the review card
    if (paper?.id) {
      const token = localStorage.getItem('authToken');
      const viewUrl = `${API_BASE_URL}/api/v1/author/submissions/${paper.id}/reviews/${reviewId}/view-report`;
      window.open(`${viewUrl}?token=${token}`, '_blank');
      info('Opening review report in new tab...', 2000);
    }
  };

  const handleDownloadReviewReport = async (reviewId, e) => {
    e.stopPropagation(); // Prevent expanding/collapsing the review card
    try {
      info('Downloading review report...', 2000);
      const response = await acsApi.author.downloadReviewReport(paper.id, reviewId);
      
      // Create blob from response data
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      
      // Get filename from content-disposition header or determine from content-type
      const contentDisposition = response.headers['content-disposition'];
      let filename = `review_report_${reviewId}`;
      
      // Try to get filename from content-disposition header
      if (contentDisposition) {
        // Try filename*=UTF-8'' format first
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\s]+)/i);
        if (utf8Match) {
          filename = decodeURIComponent(utf8Match[1]);
        } else {
          // Try filename="..." or filename=... format
          const filenameMatch = contentDisposition.match(/filename="?([^"\n;]+)"?/i);
          if (filenameMatch) {
            filename = filenameMatch[1].trim();
          }
        }
      } else {
        // Fallback: determine extension from content-type
        const extMap = {
          'application/pdf': '.pdf',
          'application/msword': '.doc',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
        };
        const ext = extMap[contentType] || '';
        filename = `review_report_${reviewId}${ext}`;
      }
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      success('Review report downloaded', 2000);
    } catch (err) {
      console.error('Error downloading review report:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to download review report';
      showError(errorMsg, 3000);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <span className="material-symbols-rounded">hourglass_empty</span>
          <p>Loading paper details...</p>
        </div>
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <span className="material-symbols-rounded">error</span>
          <p>{error || 'Paper not found'}</p>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Format date helper
  const formatDate = (dateStr) => {
    return formatDateUS(dateStr);
  };

  const formatDateTime = (dateStr) => {
    return formatDateTimeIST(dateStr);
  };

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className={styles.container}>
      {/* Sticky Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerContent}>
          {/* Back Link */}
          <button className={styles.backLink} onClick={() => navigate(-1)}>
            <span className="material-symbols-rounded">arrow_back</span>
            <span>Back to Dashboard</span>
          </button>

          {/* Title Section */}
          <div className={styles.headerMain}>
            <div className={styles.headerLeft}>
              <h1 className={styles.pageTitle}>{paper.title}</h1>  
              <StatusChips status={paper.status} />
            </div>
            
            {/* Action Buttons */}
            <div className={styles.headerActions}>
              {/* For authors/editors/admins - show both title page and blinded manuscript buttons */}
              {(isAuthor() || isEditor() || isAdmin()) && (
                <>
                  <button className={styles.btnOutline} onClick={handleViewTitlePage}>
                    <span className="material-symbols-rounded">article</span>
                    Title Page
                  </button>
                  <button className={styles.btnOutline} onClick={handleViewBlindedManuscript}>
                    <span className="material-symbols-rounded">description</span>
                    Blinded Manuscript
                  </button>
                </>
              )}
              
              {isAuthor() && (paper.status === 'correction' || paper.status === 'revision_requested') && (
                <button className={styles.btnDark} onClick={() => setShowResubmitForm(!showResubmitForm)}>
                  <span className="material-symbols-rounded">edit</span>
                  Revise
                </button>
              )}
              
              {(isEditor() || isAdmin()) && !['accepted', 'rejected', 'published'].includes(paper.status) && (
                <button className={styles.btnPrimary} onClick={() => navigate(isAdmin() ? `/admin/submissions/${paper.id}/decision` : `/editor/papers/${paper.id}/decision`)}>
                  <span className="material-symbols-rounded">gavel</span>
                  Make Decision
                </button>
              )}
              
              {isAdmin() && paper.status === 'accepted' && (
                <button 
                  className={styles.btnOutline} 
                  onClick={handleTriggerCopyrightForm}
                  disabled={triggeringCopyright}
                >
                  <span className="material-symbols-rounded">contract</span>
                  {triggeringCopyright ? 'Sending...' : 'Send Copyright Form'}
                </button>
              )}
              
              {(isEditor() || isAdmin()) && String(paper.added_by) !== String(user?.id) && (
                <button className={styles.btnOutline} onClick={() => {
                  setShowAssignReviewer(true);
                  setShowReviewerDropdown(true); // Always show dropdown when modal opens
                  if (!availableReviewers.length) {
                    fetchAvailableReviewers();
                  }
                }}>
                  <span className="material-symbols-rounded">person_add</span>
                  Assign Reviewer
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <div className={styles.pageContent}>
        {/* Left Column - Main Content */}
        <div className={styles.mainColumn}>
          {/* Meta Info Card */}
          <section className={styles.metaCard}>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <p className={styles.metaLabel}>Paper ID</p>
                <p className={styles.metaValue}>{paper.paperCode || `#${paper.id}`}</p>
              </div>
              <div className={styles.metaItem}>
                <p className={styles.metaLabel}>Journal</p>
                <p className={styles.metaValue}>{paper.journal?.name || 'IJSE 2026'}</p>
              </div>
              <div className={styles.metaItem}>
                <p className={styles.metaLabel}>Submitted</p>
                <p className={styles.metaValue}>{formatDate(paper.submittedDate)}</p>
              </div>
              <div className={styles.metaItem}>
                <p className={styles.metaLabel}>Primary Author</p>
                <p className={styles.metaValue}>{paper.author?.name || 'Unknown'}</p>
              </div>
            </div>
          </section>

          {/* Abstract Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className="material-symbols-rounded">subject</span>
              <h2 className={styles.sectionTitle}>Abstract</h2>
            </div>
            <div className={styles.sectionCard}>
              <p className={styles.abstractText}>{paper.abstract || 'No abstract provided'}</p>
            </div>
          </section>

          {/* Keywords */}
          {paper.keywords && paper.keywords.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className="material-symbols-rounded">label</span>
                <h2 className={styles.sectionTitle}>Keywords</h2>
              </div>
              <div className={styles.sectionCard}>
                <div className={styles.keywordsList}>
                  {paper.keywords.map((kw, idx) => (
                    <span key={idx} className={styles.keyword}>{kw}</span>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Reviews Section */}
          {(isEditor() || isAdmin() || isAuthor()) && paper.reviews && paper.reviews.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className="material-symbols-rounded">reviews</span>
                <h2 className={styles.sectionTitle}>Reviewer Feedback ({paper.reviews.length})</h2>
                {paper.status === 'revision_requested' && (
                  <span className={styles.actionBadge}>Action Required</span>
                )}
              </div>
              
              <div className={styles.reviewsCard}>
                {paper.reviews.map((review, idx) => (
                  <div key={review.id} className={styles.reviewBlock}>
                    <div className={styles.reviewContent}>
                      {/* Reviewer Header */}
                      <div className={styles.reviewerHeader}>
                        <div className={styles.reviewerInfo}>
                          <span className={styles.reviewerName}>
                            {isEditor() || isAdmin() ? review.reviewerName : `Reviewer #${idx + 1}`}
                          </span>
                        </div>
                        {review.overallRating && (
                          <div className={styles.overallRating}>
                            <span className="material-symbols-rounded">star</span>
                            <span>{review.overallRating.toFixed(1)} / 5.0</span>
                          </div>
                        )}
                      </div>

                      {/* Rating Bars */}
                      {(review.technicalQuality || review.clarity || review.originality || review.significance) && (
                        <div className={styles.ratingsGrid}>
                          {review.technicalQuality && (
                            <div className={styles.ratingItem}>
                              <p className={styles.ratingLabel}>Technical</p>
                              <div className={styles.ratingBar}>
                                <div className={styles.ratingTrack}>
                                  <div 
                                    className={styles.ratingFill} 
                                    style={{ width: `${(review.technicalQuality / 5) * 100}%` }}
                                  />
                                </div>
                                <span className={styles.ratingValue}>{review.technicalQuality}/5</span>
                              </div>
                            </div>
                          )}
                          {review.clarity && (
                            <div className={styles.ratingItem}>
                              <p className={styles.ratingLabel}>Clarity</p>
                              <div className={styles.ratingBar}>
                                <div className={styles.ratingTrack}>
                                  <div 
                                    className={styles.ratingFill} 
                                    style={{ width: `${(review.clarity / 5) * 100}%` }}
                                  />
                                </div>
                                <span className={styles.ratingValue}>{review.clarity}/5</span>
                              </div>
                            </div>
                          )}
                          {review.originality && (
                            <div className={styles.ratingItem}>
                              <p className={styles.ratingLabel}>Originality</p>
                              <div className={styles.ratingBar}>
                                <div className={styles.ratingTrack}>
                                  <div 
                                    className={styles.ratingFill} 
                                    style={{ width: `${(review.originality / 5) * 100}%` }}
                                  />
                                </div>
                                <span className={styles.ratingValue}>{review.originality}/5</span>
                              </div>
                            </div>
                          )}
                          {review.significance && (
                            <div className={styles.ratingItem}>
                              <p className={styles.ratingLabel}>Significance</p>
                              <div className={styles.ratingBar}>
                                <div className={styles.ratingTrack}>
                                  <div 
                                    className={styles.ratingFill} 
                                    style={{ width: `${(review.significance / 5) * 100}%` }}
                                  />
                                </div>
                                <span className={styles.ratingValue}>{review.significance}/5</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Recommendation */}
                      {review.recommendation && (
                        <div className={styles.reviewField}>
                          <h4 className={styles.fieldLabel}>Critical Requirement</h4>
                          <p className={styles.fieldValue}>{review.recommendation}</p>
                        </div>
                      )}

                      {/* Comments */}
                      {review.authorComments && (
                        <div className={styles.reviewField}>
                          <h4 className={styles.fieldLabel}>Comments</h4>
                          <p className={styles.fieldComment}>"{review.authorComments}"</p>
                        </div>
                      )}

                      {/* Confidential Comments - Editor Only */}
                      {(isEditor() || isAdmin()) && review.confidentialComments && (
                        <div className={styles.reviewFieldConfidential}>
                          <h4 className={styles.fieldLabel}>Confidential Comments (Editor Only)</h4>
                          <p className={styles.fieldComment}>{review.confidentialComments}</p>
                        </div>
                      )}
                    </div>

                    {/* Download Report Button */}
                    {review.reviewReportFile && (
                      <div className={styles.reviewFooter}>
                        <button 
                          className={styles.downloadBtn}
                          onClick={(e) => handleDownloadReviewReport(review.id, e)}
                        >
                          <span className="material-symbols-rounded">download</span>
                          Download Full Report
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Resubmit Form - kept inline as it's author-specific */}
          {showResubmitForm && isAuthor() && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className="material-symbols-rounded">upload_file</span>
                <h2 className={styles.sectionTitle}>Resubmit Revised Paper</h2>
              </div>
              <div className={styles.sectionCard}>
                <p className={styles.resubmitNote}>
                  Please upload all three required files addressing the reviewer's comments:
                </p>
                <div className={styles.form}>
                  {/* Track Changes File */}
                  <div className={styles.formGroup}>
                    <label htmlFor="trackChangesFile">
                      <span className="material-symbols-rounded" style={{verticalAlign: 'middle', marginRight: '6px', fontSize: '18px'}}>track_changes</span>
                      Manuscript with Track Changes *
                    </label>
                    <p className={styles.fileHint}>Upload your revised manuscript showing all changes highlighted using track changes (.docx only)</p>
                    <input
                      type="file"
                      id="trackChangesFile"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => setTrackChangesFile(e.target.files[0])}
                      disabled={resubmitting}
                      className={styles.fileInput}
                    />
                    {trackChangesFile && (
                      <p className={styles.selectedFile}>
                        <span className="material-symbols-rounded">description</span>
                        {trackChangesFile.name} ({(trackChangesFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  {/* Clean File */}
                  <div className={styles.formGroup}>
                    <label htmlFor="cleanFile">
                      <span className="material-symbols-rounded" style={{verticalAlign: 'middle', marginRight: '6px', fontSize: '18px'}}>article</span>
                      Clean Revised Manuscript *
                    </label>
                    <p className={styles.fileHint}>Upload the final clean version of your revised manuscript without track changes (.docx only)</p>
                    <input
                      type="file"
                      id="cleanFile"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => setCleanFile(e.target.files[0])}
                      disabled={resubmitting}
                      className={styles.fileInput}
                    />
                    {cleanFile && (
                      <p className={styles.selectedFile}>
                        <span className="material-symbols-rounded">description</span>
                        {cleanFile.name} ({(cleanFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  {/* Response to Reviewer File */}
                  <div className={styles.formGroup}>
                    <label htmlFor="responseFile">
                      <span className="material-symbols-rounded" style={{verticalAlign: 'middle', marginRight: '6px', fontSize: '18px'}}>rate_review</span>
                      Response to Reviewer Comments *
                    </label>
                    <p className={styles.fileHint}>Upload a detailed response letter addressing each reviewer comment point-by-point (.docx only)</p>
                    <input
                      type="file"
                      id="responseFile"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => setResponseFile(e.target.files[0])}
                      disabled={resubmitting}
                      className={styles.fileInput}
                    />
                    {responseFile && (
                      <p className={styles.selectedFile}>
                        <span className="material-symbols-rounded">description</span>
                        {responseFile.name} ({(responseFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="revisionReason">Revision Summary * <span style={{fontSize: '12px', color: '#666', fontWeight: 'normal'}}>(min 20 characters)</span></label>
                    <textarea
                      id="revisionReason"
                      value={revisionReason}
                      onChange={(e) => setRevisionReason(e.target.value)}
                      placeholder="Briefly describe the changes made in response to the reviewer comments..."
                      rows={4}
                      disabled={resubmitting}
                      className={styles.textarea}
                    />
                    <p className={styles.charCount} style={{fontSize: '12px', color: revisionReason.trim().length < 20 ? '#e74c3c' : '#27ae60', marginTop: '4px'}}>
                      {revisionReason.trim().length}/20 characters minimum
                    </p>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="changeSummary">Detailed Change Log (Optional)</label>
                    <textarea
                      id="changeSummary"
                      value={changeSummary}
                      onChange={(e) => setChangeSummary(e.target.value)}
                      placeholder="List specific changes made..."
                      rows={6}
                      disabled={resubmitting}
                      className={styles.textarea}
                    />
                  </div>

                  <div className={styles.formActions}>
                    <button
                      className={styles.btnPrimary}
                      onClick={handleResubmit}
                      disabled={resubmitting || !trackChangesFile || !cleanFile || !responseFile || revisionReason.trim().length < 20}
                    >
                      {resubmitting ? 'Resubmitting...' : 'Submit Revision'}
                    </button>
                    <button
                      className={styles.btnSecondary}
                      onClick={() => {
                        setShowResubmitForm(false);
                        setTrackChangesFile(null);
                        setCleanFile(null);
                        setResponseFile(null);
                        setRevisionReason('');
                        setChangeSummary('');
                      }}
                      disabled={resubmitting}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <aside className={styles.sideColumn}>
          {/* Activity Timeline */}
          <div className={styles.timelineCard}>
            <div className={styles.timelineHeader}>
              <h2 className={styles.timelineTitle}>Activity Timeline</h2>
            </div>
            <div className={styles.timelineContent}>
              <div className={styles.timelineList}>
                {getTimelineEvents().length > 0 ? (
                  getTimelineEvents().map((event, idx) => (
                    <div key={event.id} className={styles.timelineItem}>
                      {idx < getTimelineEvents().length - 1 && (
                        <div className={styles.timelineConnector} />
                      )}
                      <div className={`${styles.timelineIcon} ${styles[event.iconColor]}`}>
                        <span className="material-symbols-rounded">{event.icon}</span>
                      </div>
                      <div className={styles.timelineInfo}>
                        <p className={styles.timelineEvent}>{event.title}</p>
                        <p className={styles.timelineDate}>
                          {event.date ? formatDateTime(event.date) : event.description}
                        </p>
                        {event.description && event.date && (
                          <p className={styles.timelineDescription}>{event.description}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.timelineItem}>
                    <div className={`${styles.timelineIcon} ${styles.iconSlate}`}>
                      <span className="material-symbols-rounded">schedule</span>
                    </div>
                    <div className={styles.timelineInfo}>
                      <p className={styles.timelineEvent}>No activity yet</p>
                      <p className={styles.timelineDate}>Events will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Alerts Card */}
          <div className={styles.alertCard}>
            {getAlerts().length > 0 ? (
              <div className={styles.alertsList}>
                {getAlerts().map((alert, idx) => (
                  <div key={idx} className={`${styles.alertItem} ${styles[`alert${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}`]}`}>
                    <span className={`material-symbols-rounded ${styles.alertIcon}`}>{alert.icon}</span>
                    <div className={styles.alertText}>
                      <strong>{alert.title}</strong>
                      <p>{alert.message}</p>
                    </div>
                    {alert.action && (
                      <button className={styles.alertActionBtn} onClick={alert.action}>
                        {alert.actionText}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.alertContent}>
                <span className="material-symbols-rounded">check_circle</span>
                <p>All caught up! No pending actions.</p>
              </div>
            )}
          </div>

          {/* Help Card / Contact Author Card */}
          <div className={styles.helpCard}>
            <h3 className={styles.helpTitle}>
              {(isAdmin() || isEditor()) ? 'Contact Author' : 'Need assistance?'}
            </h3>
            <p className={styles.helpText}>
              {(isAdmin() || isEditor()) 
                ? 'Send email correspondence to the author regarding this submission.'
                : 'Our editorial board is here to assist you with any questions regarding the submission process or peer-review status.'}
            </p>
            <button 
              className={styles.helpBtn}
              onClick={() => {
                if (isAdmin() || isEditor()) {
                  setShowContactModal(true);
                } else {
                  // For authors, show the contact modal
                  setShowAuthorContactModal(true);
                }
              }}
            >
              {(isAdmin() || isEditor()) ? 'Send Email to Author' : 'Contact Editorial Office'}
            </button>
          </div>

          {/* Admin/Editor Actions */}
          {(isAdmin() || isEditor()) && (
            <div className={styles.authorActionsCard}>
              <button 
                className={styles.actionCardBtn}
                onClick={() => {
                  setShowCorrespondence(!showCorrespondence);
                  if (!showCorrespondence && correspondence.length === 0) {
                    fetchCorrespondence();
                  }
                }}
              >
                <span className="material-symbols-rounded">mail</span>
                Correspondence History
              </button>
            </div>
          )}

          {/* Author Actions */}
          {isAuthor() && (
            <div className={styles.authorActionsCard}>
              <button 
                className={styles.actionCardBtn}
                onClick={() => {
                  setShowCorrespondence(!showCorrespondence);
                  if (!showCorrespondence && correspondence.length === 0) {
                    fetchCorrespondence();
                  }
                }}
              >
                <span className="material-symbols-rounded">mail</span>
                View Notifications
              </button>
              <button 
                className={styles.actionCardBtn}
                onClick={() => {
                  setShowRevisions(!showRevisions);
                  if (!showRevisions && revisionHistory.length === 0) {
                    fetchRevisionHistory();
                  }
                }}
              >
                <span className="material-symbols-rounded">history</span>
                Submission History
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Correspondence Modal/Section */}
      {showCorrespondence && (isAuthor() || isAdmin() || isEditor()) && (
        <div className={styles.modalOverlay} onClick={() => setShowCorrespondence(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{isAuthor() ? 'Email Notifications' : 'Correspondence History'}</h2>
              <button onClick={() => setShowCorrespondence(false)}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className={styles.modalBody}>
              {loadingCorrespondence ? (
                <div className={styles.loadingSection}>
                  <span className="material-symbols-rounded">hourglass_empty</span>
                  Loading...
                </div>
              ) : correspondence.length === 0 ? (
                <div className={styles.emptySection}>
                  <span className="material-symbols-rounded">inbox</span>
                  <p>No {isAuthor() ? 'email notifications' : 'correspondence'} yet.</p>
                </div>
              ) : (
                <div className={styles.correspondenceList}>
                  {correspondence.map((email, idx) => (
                    <div key={email.id || idx} className={styles.correspondenceItem}>
                      <div className={styles.correspondenceHeader}>
                        <span className={styles.emailType}>
                          {email.email_type?.replace(/_/g, ' ').toUpperCase() || 
                           (email.sender_role ? `Sent by ${email.sender_role}` : 'Email')}
                        </span>
                        <span className={styles.emailDate}>
                          {formatDateTimeIST(email.created_at || email.sent_at)}
                        </span>
                      </div>
                      <div className={styles.correspondenceBody}>
                        <p className={styles.emailSubject}>{email.subject}</p>
                        <span className={`${styles.emailStatus} ${styles[`status${email.delivery_status || 'sent'}`]}`}>
                          {email.delivery_status === 'sent' || !email.delivery_status ? '✓ Delivered' : 
                           email.delivery_status === 'failed' ? '✗ Failed' : '⋯ Pending'}
                        </span>
                        {(isAdmin() || isEditor()) && (
                          <span className={styles.readStatus}>
                            {email.is_read ? '👁 Read' : '○ Unread'}
                          </span>
                        )}
                      </div>
                      {/* Show message preview for admin/editor */}
                      {(isAdmin() || isEditor()) && email.message && (
                        <div className={styles.messagePreview}>
                          {email.message.substring(0, 150)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Revision History Modal */}
      {showRevisions && isAuthor() && (
        <div className={styles.modalOverlay} onClick={() => setShowRevisions(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Submission History</h2>
              <button onClick={() => setShowRevisions(false)}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className={styles.modalBody}>
              {loadingRevisions ? (
                <div className={styles.loadingSection}>
                  <span className="material-symbols-rounded">hourglass_empty</span>
                  Loading...
                </div>
              ) : revisionHistory.length === 0 ? (
                <div className={styles.emptySection}>
                  <span className="material-symbols-rounded">inventory_2</span>
                  <p>No previous versions. This is the original submission.</p>
                </div>
              ) : (
                <div className={styles.revisionList}>
                  {revisionHistory.map((revision, idx) => (
                    <div key={idx} className={styles.revisionItem}>
                      <div className={styles.revisionVersion}>
                        <span className={styles.versionBadge}>V{revision.version_number || idx + 1}</span>
                        <span className={styles.revisionDate}>
                          {formatDateTimeIST(revision.uploaded_on)}
                        </span>
                      </div>
                      <div className={styles.revisionDetails}>
                        {revision.revision_reason && (
                          <p className={styles.revisionReason}>
                            <strong>Reason:</strong> {revision.revision_reason}
                          </p>
                        )}
                        {revision.change_summary && (
                          <p className={styles.changeSummary}>
                            <strong>Changes:</strong> {revision.change_summary}
                          </p>
                        )}
                        {revision.file_size && (
                          <p className={styles.revisionFile}>
                            <span className="material-symbols-rounded">description</span>
                            {(revision.file_size / 1024).toFixed(1)} KB
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Reviewer Modal */}
      {showAssignReviewer && (isEditor() || isAdmin()) && (
        <div className={styles.modalOverlay} onClick={() => {
          setShowAssignReviewer(false);
          setReviewerEmail('');
          setSearchReviewers('');
          setExternalEmail('');
          setExternalName('');
          setEmailError('');
          setInviteMode('existing');
          setShowReviewerDropdown(false);
        }}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Assign Reviewer</h2>
              <button onClick={() => {
                setShowAssignReviewer(false);
                setReviewerEmail('');
                setSearchReviewers('');
                setExternalEmail('');
                setExternalName('');
                setEmailError('');
                setInviteMode('existing');
                setShowReviewerDropdown(false);
              }}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.assignReviewerInfo}>
                <div className={styles.paperInfoRow}>
                  <span className={styles.paperInfoLabel}>Paper:</span>
                  <span className={styles.paperInfoValue}>{paper.title}</span>
                </div>
                <div className={styles.paperInfoRow}>
                  <span className={styles.paperInfoLabel}>Status:</span>
                  <StatusChips status={paper.status} />
                </div>
              </div>

              {/* Show currently assigned reviewers */}
              {paper.reviews && paper.reviews.length > 0 && (
                <div className={styles.currentReviewers}>
                  <h4 className={styles.currentReviewersTitle}>Currently Assigned Reviewers</h4>
                  <div className={styles.currentReviewersList}>
                    {paper.reviews.map((review, idx) => (
                      <div key={review.id || idx} className={styles.currentReviewerItem}>
                        <div className={styles.currentReviewerInfo}>
                          <p className={styles.currentReviewerName}>Reviewer #{idx + 1}</p>
                          <p className={styles.currentReviewerStatus}>
                            {review.status === 'completed' ? '✓ Review Completed' : 
                             review.status === 'pending' ? '⋯ Review Pending' : 
                             '○ Invited'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Tab buttons for invite mode */}
              <div className={styles.inviteModeTabs}>
                <button
                  className={`${styles.inviteModeTab} ${inviteMode === 'existing' ? styles.inviteModeTabActive : ''}`}
                  onClick={() => {
                    setInviteMode('existing');
                    setEmailError('');
                  }}
                  disabled={assigningReviewer}
                >
                  <span className="material-symbols-rounded">group</span>
                  Search Existing
                </button>
                <button
                  className={`${styles.inviteModeTab} ${inviteMode === 'external' ? styles.inviteModeTabActive : ''}`}
                  onClick={() => {
                    setInviteMode('external');
                    setShowReviewerDropdown(false);
                  }}
                  disabled={assigningReviewer}
                >
                  <span className="material-symbols-rounded">person_add</span>
                  Invite External
                </button>
              </div>

              <div className={styles.form}>
                {/* Existing Reviewer Search Mode */}
                {inviteMode === 'existing' && (
                  <div className={styles.formGroup}>
                    <label htmlFor="reviewerEmail">Select Reviewer</label>
                    <div className={styles.reviewerInputContainer}>
                      <input
                        type="text"
                        id="reviewerEmail"
                        value={searchReviewers}
                        onChange={(e) => {
                          setSearchReviewers(e.target.value);
                          setShowReviewerDropdown(true);
                        }}
                        onFocus={() => {
                          if (!availableReviewers.length) {
                            fetchAvailableReviewers();
                          }
                          setShowReviewerDropdown(true);
                        }}
                        placeholder="Search reviewers by name or email..."
                        disabled={assigningReviewer}
                        className={styles.formInput}
                      />
                      {showReviewerDropdown && (
                        <div className={styles.reviewerDropdown}>
                          {loadingReviewers ? (
                            <div className={styles.dropdownItem}>
                              <span className="material-symbols-rounded">hourglass_empty</span>
                              Loading reviewers...
                            </div>
                          ) : filteredReviewers.length > 0 ? (
                            filteredReviewers.map((reviewer) => (
                              <div
                                key={reviewer.id}
                                className={`${styles.dropdownItem} ${reviewer.is_recommended ? styles.dropdownItemRecommended : ''}`}
                                onClick={() => handleSelectReviewer(reviewer)}
                              >
                                <div className={styles.reviewerAvatarSmall}>
                                  {getInitials(reviewer.name)}
                                </div>
                                <div className={styles.dropdownItemContent}>
                                  <div className={styles.dropdownItemNameRow}>
                                    <p className={styles.dropdownItemName}>{reviewer.name}</p>
                                    {reviewer.is_recommended && (
                                      <span className={styles.recommendedChip}>
                                        <span className="material-symbols-rounded">star</span>
                                        Recommended
                                      </span>
                                    )}
                                  </div>
                                  <p className={styles.dropdownItemEmail}>{reviewer.email}</p>
                                  {reviewer.match_reason && (
                                    <p className={styles.dropdownItemMatchReason}>{reviewer.match_reason}</p>
                                  )}
                                  {reviewer.specialization && !reviewer.match_reason && (
                                    <p className={styles.dropdownItemSpec}>{reviewer.specialization}</p>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className={styles.dropdownItem}>
                              <span className="material-symbols-rounded">search_off</span>
                              No reviewers found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {reviewerEmail && (
                      <div className={styles.selectedReviewerCard}>
                        <div className={styles.selectedReviewerAvatar}>
                          {getInitials(searchReviewers || reviewerEmail)}
                        </div>
                        <div className={styles.selectedReviewerInfo}>
                          <p className={styles.selectedReviewerName}>{searchReviewers || 'Unknown'}</p>
                          <p className={styles.selectedReviewerEmail}>{reviewerEmail}</p>
                        </div>
                        <button 
                          className={styles.clearSelection}
                          onClick={() => {
                            setReviewerEmail('');
                            setSearchReviewers('');
                          }}
                        >
                          <span className="material-symbols-rounded">close</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* External Reviewer Invite Mode */}
                {inviteMode === 'external' && (
                  <>
                    <div className={styles.formGroup}>
                      <label htmlFor="externalEmail">Email Address *</label>
                      <input
                        type="email"
                        id="externalEmail"
                        value={externalEmail}
                        onChange={(e) => {
                          setExternalEmail(e.target.value);
                          // Clear error when typing
                          if (emailError) setEmailError('');
                        }}
                        onBlur={() => {
                          // Validate email on blur
                          if (externalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(externalEmail)) {
                            setEmailError('Please enter a valid email address');
                          }
                        }}
                        placeholder="reviewer@university.edu"
                        disabled={assigningReviewer}
                        className={`${styles.formInput} ${emailError ? styles.formInputError : ''}`}
                      />
                      {emailError && (
                        <p className={styles.formError}>{emailError}</p>
                      )}
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="externalName">Name (Optional)</label>
                      <input
                        type="text"
                        id="externalName"
                        value={externalName}
                        onChange={(e) => setExternalName(e.target.value)}
                        placeholder="Dr. John Smith"
                        disabled={assigningReviewer}
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.externalInviteInfo}>
                      <span className="material-symbols-rounded">info</span>
                      <p>An invitation email will be sent with a link to create an account. Once registered, they will be able to review this paper.</p>
                    </div>
                  </>
                )}

                <div className={styles.formGroup}>
                  <label htmlFor="dueDays">Review Due In (Days)</label>
                  <input
                    type="number"
                    id="dueDays"
                    value={dueDays}
                    onChange={(e) => setDueDays(parseInt(e.target.value) || 14)}
                    min="1"
                    max="90"
                    disabled={assigningReviewer}
                    className={styles.formInput}
                  />
                  <p className={styles.formHint}>
                    Due date: {formatFutureDateWithWeekday(dueDays)}
                  </p>
                </div>

                <div className={styles.formActions}>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => {
                      setShowAssignReviewer(false);
                      setReviewerEmail('');
                      setSearchReviewers('');
                      setExternalEmail('');
                      setExternalName('');
                      setEmailError('');
                      setInviteMode('existing');
                      setShowReviewerDropdown(false);
                    }}
                    disabled={assigningReviewer}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.btnPrimary}
                    onClick={handleAssignReviewer}
                    disabled={assigningReviewer || (inviteMode === 'existing' ? !reviewerEmail : !externalEmail || !!emailError)}
                  >
                    {assigningReviewer ? (
                      <>
                        <span className="material-symbols-rounded">hourglass_empty</span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-rounded">send</span>
                        Send Invitation
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Editorial Modal (Admin/Editor) */}
      {paper && (isAdmin() || isEditor()) && (
        <ContactEditorialModal
          isOpen={showContactModal}
          onClose={handleContactModalClose}
          paperId={paper.id}
          paperTitle={paper.title}
          authorName={paper.author?.name || paper.authorName || 'Author'}
          authorEmail={paper.author?.email || paper.authorEmail || ''}
          currentStatus={paper.status}
          senderRole={isAdmin() ? 'admin' : 'editor'}
        />
      )}

      {/* Author Contact Editorial Modal */}
      {paper && isAuthor() && (
        <AuthorContactModal
          isOpen={showAuthorContactModal}
          onClose={() => setShowAuthorContactModal(false)}
          paperId={paper.id}
          paperCode={paper.paperCode || paper.paper_code || `#${paper.id}`}
          paperTitle={paper.title}
        />
      )}
    </div>
  );
};

export default PaperDetailsPage;
