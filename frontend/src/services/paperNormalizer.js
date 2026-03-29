/**
 * Paper Normalizer - Converts backend field names to standard frontend format
 * Handles field inconsistencies across different API endpoints
 */

export const paperNormalizer = {
  /**
   * Normalize paper object from backend response
   * Maps different field names to standard format
   */
  normalizePaper: (rawData) => {
    if (!rawData) return null;

    // Handle reviewer API response format (nested paper object)
    // { review_id, paper: {...}, assignment: {...} }
    let data = rawData;
    let reviewerAssignment = null;
    if (rawData.paper && rawData.review_id !== undefined) {
      // This is a reviewer response format - flatten it
      data = {
        ...rawData.paper,
        review_id: rawData.review_id,
        assignment: rawData.assignment
      };
      // Create an assigned_reviewers entry for the current reviewer's assignment
      if (rawData.assignment) {
        reviewerAssignment = {
          assigned_on: rawData.assignment.assigned_date,
          review_status: rawData.assignment.status,
          has_submitted: rawData.assignment.status === 'submitted' || rawData.assignment.status === 'completed',
          submitted_at: rawData.assignment.submitted_date || null
        };
      }
    }

    // Handle journal - can be string, object, or nested
    let journalId = data.journal_id;
    let journalName = data.journal_name || 'Unknown Journal';
    if (data.journal) {
      if (typeof data.journal === 'object') {
        journalId = journalId || data.journal.id;
        journalName = data.journal.name || journalName;
      } else {
        journalName = data.journal;
      }
    }

    // Handle author - can be string, object, or nested
    let authorId = data.author_id || data.added_by;
    let authorName = data.author_name || '';
    let authorEmail = data.author_email || '';
    let authorAffiliation = '';
    if (data.author) {
      if (typeof data.author === 'object') {
        authorId = authorId || data.author.id;
        authorName = data.author.name || authorName;
        authorEmail = data.author.email || authorEmail;
        authorAffiliation = data.author.affiliation || '';
      } else {
        authorName = data.author;
      }
    }

    // Handle co-authors - can be array of strings or array of objects
    let coAuthors = [];
    if (Array.isArray(data.co_authors)) {
      coAuthors = data.co_authors.map(ca => {
        if (typeof ca === 'object') {
          return `${ca.first_name || ''} ${ca.middle_name || ''} ${ca.last_name || ''}`.trim() || ca.email || 'Unknown';
        }
        return ca;
      });
    } else if (typeof data.co_authors === 'string') {
      coAuthors = data.co_authors.split(',').filter(a => a.trim());
    }

    // Determine assigned reviewers - use reviewer's own assignment if available
    const assignedReviewers = reviewerAssignment 
      ? [reviewerAssignment] 
      : (data.assigned_reviewers || []);

    return {
      id: data.id || data.paper_id,
      title: data.title || data.name || 'Untitled',
      abstract: data.abstract || '',
      keywords: Array.isArray(data.keywords)
        ? data.keywords
        : (data.keywords || '').split(',').filter(k => k.trim()),
      paperCode: data.code || data.paper_code || '',
      journal: {
        id: journalId,
        name: journalName
      },
      author: {
        id: authorId,
        name: authorName,
        email: authorEmail,
        affiliation: authorAffiliation
      },
      coAuthors: coAuthors,
      status: data.status || 'unknown',
      submittedDate: data.submitted_date || data.added_on || new Date().toISOString(),
      filePath: data.file_path || data.file || data.file_url || '',
      fileName: data.file_name || extractFileName(data.file_path || data.file || data.file_url || ''),
      fileSize: data.file_size,
      volume: data.volume,
      issue: data.issue,
      pageNumber: data.page_number || data.page,
      
      // Review-related fields (from OnlineReview model)
      reviews: data.reviews ? data.reviews.map(r => paperNormalizer.normalizeReview(r)) : [],
      
      // Assigned reviewers with full details
      assignedReviewers: assignedReviewers,
      reviewStatus: data.review_status || 'not_assigned',
      totalReviewers: data.total_reviewers || 0,
      completedReviews: data.completed_reviews || 0,
      
      // Decision-related fields
      decision: data.decision ? paperNormalizer.normalizeDecision(data.decision) : null,
      
      // Additional metadata
      mailStatus: data.mail_status || data.mailstatus,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      
      // Version info
      versionNumber: data.version_number,
      revisionCount: data.revision_count,
      revisionDeadline: data.revision_deadline,
      revisionNotes: data.revision_notes,
      revisionRequestedDate: data.revision_requested_date,
      revisionType: data.revision_type,
      editorComments: data.editor_comments,
      researchArea: data.research_area,
      messageToEditor: data.message_to_editor,
      acceptedOn: data.accepted_on,
      
      // Reviewer-specific fields
      reviewId: data.review_id,
      assignment: data.assignment,
      
      // Original data for fallback
      _raw: rawData
    };
  },

  /**
   * Normalize review object from backend response
   */
  normalizeReview: (rawData) => {
    if (!rawData) return null;

    // Parse rating if it's stored as JSON string
    let ratings = {};
    if (typeof rawData.rating === 'string') {
      try {
        ratings = JSON.parse(rawData.rating);
      } catch (e) {
        ratings = {};
      }
    } else if (typeof rawData.rating === 'object') {
      ratings = rawData.rating;
    }

    return {
      id: rawData.id || rawData.review_id,
      paperId: rawData.paper_id,
      reviewerId: rawData.reviewer_id,
      reviewerName: rawData.reviewer_name || rawData.reviewer,
      reviewerEmail: rawData.reviewer_email,
      status: rawData.status || rawData.review_status || 'pending',
      technicalQuality: ratings.technical_quality || rawData.technical_quality || 0,
      clarity: ratings.clarity || rawData.clarity || 0,
      originality: ratings.originality || rawData.originality || 0,
      significance: ratings.significance || rawData.significance || 0,
      overallRating: ratings.overall_rating || rawData.overall_rating || rawData.rating || 0,
      recommendation: rawData.recommendation || '',
      authorComments: rawData.author_comments || rawData.comments || '',
      confidentialComments: rawData.confidential_comments || '',
      reviewComment: rawData.review_comment || '',
      reviewReportFile: rawData.review_report_file || null,
      submittedDate: rawData.submitted_date || rawData.date_submitted || rawData.date,
      assignedDate: rawData.assigned_date || rawData.date_assigned,
      dueDate: rawData.due_date,
      priority: rawData.priority,
      
      _raw: rawData
    };
  },

  /**
   * Normalize decision object from backend response
   */
  normalizeDecision: (rawData) => {
    if (!rawData) return null;

    return {
      id: rawData.id || rawData.decision_id,
      type: rawData.type || rawData.decision_type,
      reason: rawData.reason || '',
      requestedRevisions: rawData.requested_revisions || rawData.revision_comments || '',
      revisionType: rawData.revision_type, // 'minor' or 'major'
      decisionDate: rawData.decision_date || rawData.created_at,
      editorName: rawData.editor_name || rawData.editor,
      comments: rawData.comments || '',
      
      _raw: rawData
    };
  },

  /**
   * Normalize list of papers
   */
  normalizePapers: (rawArray) => {
    if (!Array.isArray(rawArray)) return [];
    return rawArray.map(p => paperNormalizer.normalizePaper(p));
  },

  /**
   * Get field mapping reference
   */
  getFieldMapping: () => ({
    id: ['id', 'paper_id'],
    title: ['title', 'name'],
    code: ['code', 'paper_code'],
    journal: ['journal', 'journal_name', 'journal_id'],
    author: ['author', 'author_name', 'author_id', 'added_by'],
    authorEmail: ['author_email', 'email'],
    abstract: ['abstract', 'abstract_text'],
    keywords: ['keywords', 'keyword'],
    filePath: ['file_path', 'file'],
    fileName: ['file_name'],
    status: ['status', 'paper_status'],
    submittedDate: ['submitted_date', 'added_on', 'created_at'],
    updatedDate: ['updated_date', 'updated_at', 'modified_on'],
    coAuthors: ['co_authors', 'coauthors', 'coauth'],
    volume: ['volume', 'vol'],
    issue: ['issue', 'issue_no'],
    pageNumber: ['page_number', 'page', 'page_no'],
    mailStatus: ['mail_status', 'mailstatus'],
    rating: ['rating', 'overall_rating'],
    recommendation: ['recommendation', 'reviewer_recommendation'],
    dueDate: ['due_date', 'due_on'],
    priority: ['priority', 'review_priority']
  })
};

/**
 * Helper function to extract filename from path
 */
function extractFileName(filePath) {
  if (!filePath) return 'document';
  return filePath.split('/').pop() || 'document';
}

export default paperNormalizer;
