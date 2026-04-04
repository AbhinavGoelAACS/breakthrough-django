import React, { useState, useEffect, useRef } from 'react';
import styles from './ReviewForm.module.css';

const ReviewForm = ({
  initialSubmission,
  onSaveDraft,
  onSubmit,
  onUploadReport,
  onDownloadReport,
  isSubmitting
}) => {
  const [activeTab, setActiveTab] = useState('ratings');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  // Form state
  const [ratings, setRatings] = useState({
    technical_quality: initialSubmission?.technical_quality || null,
    clarity: initialSubmission?.clarity || null,
    originality: initialSubmission?.originality || null,
    significance: initialSubmission?.significance || null,
    overall_rating: initialSubmission?.overall_rating || null,
  });

  const [comments, setComments] = useState({
    author_comments: initialSubmission?.author_comments || '',
    confidential_comments: initialSubmission?.confidential_comments || '',
  });

  const [recommendation, setRecommendation] = useState(
    initialSubmission?.recommendation || ''
  );

  const [uploadedFile, setUploadedFile] = useState(
    initialSubmission?.review_report_file || null
  );

  const [fileVersion, setFileVersion] = useState(
    initialSubmission?.file_version || 1
  );

  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const [errors, setErrors] = useState({});

  // Update state when initialSubmission changes (e.g., when data loads from API)
  useEffect(() => {
    if (initialSubmission) {
      setRatings({
        technical_quality: initialSubmission.technical_quality || null,
        clarity: initialSubmission.clarity || null,
        originality: initialSubmission.originality || null,
        significance: initialSubmission.significance || null,
        overall_rating: initialSubmission.overall_rating || null,
      });
      setComments({
        author_comments: initialSubmission.author_comments || '',
        confidential_comments: initialSubmission.confidential_comments || '',
      });
      setRecommendation(initialSubmission.recommendation || '');
      setUploadedFile(initialSubmission.review_report_file || null);
      setFileVersion(initialSubmission.file_version || 1);
    }
  }, [initialSubmission]);

  const hasChanges = () => {
    return Object.values(ratings).some(v => v !== null) || Object.values(comments).some(v => v.trim() !== '');
  };

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const getFileExtension = (filename) => {
    if (!filename) return '';
    return filename.split('.').pop().toLowerCase();
  };

  const isFormComplete = () => {
    // Check all ratings are provided
    const allRatingsProvided = Object.values(ratings).every(v => v !== null);

    // Check for comments (50+ characters total)
    const totalComments = (comments.author_comments + comments.confidential_comments).trim();
    const hasEnoughComments = totalComments.length >= 50;

    // Check recommendation
    const hasRecommendation = recommendation.trim() !== '';

    return allRatingsProvided && hasEnoughComments && hasRecommendation;
  };

  const saveDraft = async () => {
    try {
      setIsSaving(true);
      await onSaveDraft({
        ...ratings,
        ...comments,
      });
    } catch (err) {
      console.error('Error saving draft:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const validateSubmission = () => {
    const newErrors = {};

    // Check all ratings are provided
    const missingRatings = Object.entries(ratings)
      .filter(([, v]) => v === null)
      .map(([k]) => k);

    if (missingRatings.length > 0) {
      newErrors.ratings = 'All ratings are required';
      missingRatings.forEach(k => {
        newErrors[`rating_${k}`] = 'Please select a rating';
      });
    }

    // Check for comments (50+ characters total)
    const totalComments = (comments.author_comments + comments.confidential_comments).trim();
    if (totalComments.length < 50) {
      newErrors.comments = 'At least one comment with 50+ characters is required';
    }
    if (!comments.author_comments.trim()) {
      newErrors.author_comments = 'Comments for authors are required';
    }

    // Check recommendation
    if (!recommendation) {
      newErrors.recommendation = 'Please select a recommendation';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateSubmission()) {
      return;
    }

    try {
      await onSubmit({
        ...ratings,
        ...comments,
        recommendation,
      });
    } catch (err) {
      console.error('Error submitting review:', err);
    }
  };

  const handleRatingChange = (criterion, value) => {
    setRatings(prev => ({
      ...prev,
      [criterion]: value
    }));
  };

  const handleCommentChange = (field, value) => {
    setComments(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only PDF, DOC, and DOCX files are allowed');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    try {
      setUploadingFile(true);
      const result = await onUploadReport(file);
      setUploadedFile(result.filename || file.name);
      setFileVersion(result.file_version);
      // Store local file for preview
      setPreviewFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } catch (err) {
      console.error('Error uploading file:', err);
    } finally {
      setUploadingFile(false);
    }
  };

  const RatingScale = ({ value, onChange }) => {
    return (
      <div className={styles.ratingScale}>
        {[1, 2, 3, 4, 5].map(score => (
          <button
            key={score}
            type="button"
            className={`${styles.ratingBtn} ${value === score ? styles.selected : ''}`}
            onClick={() => onChange(score)}
            title={`Rate ${score}`}
          >
            {score}
          </button>
        ))}
      </div>
    );
  };

  return (
    <form className={styles.reviewForm} onSubmit={handleSubmit}>
      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'ratings' ? styles.active : ''}`}
          onClick={() => setActiveTab('ratings')}
        >
          <span className="material-symbols-rounded">star</span>
          Ratings
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'comments' ? styles.active : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          <span className="material-symbols-rounded">comment</span>
          Comments
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'report' ? styles.active : ''}`}
          onClick={() => setActiveTab('report')}
        >
          <span className="material-symbols-rounded">description</span>
          Report
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {/* Ratings Tab */}
        {activeTab === 'ratings' && (
          <div className={styles.ratingsTab}>
            <div className={styles.ratingItem}>
              <label>Technical Quality</label>
              <p className={styles.hint}>Rate from 1 (Poor) to 5 (Excellent)</p>
              <RatingScale
                value={ratings.technical_quality}
                onChange={(v) => handleRatingChange('technical_quality', v)}
              />
              {errors.rating_technical_quality && (
                <p className={styles.error}>{errors.rating_technical_quality}</p>
              )}
            </div>

            <div className={styles.ratingItem}>
              <label>Clarity</label>
              <p className={styles.hint}>Rate from 1 (Poor) to 5 (Excellent)</p>
              <RatingScale
                value={ratings.clarity}
                onChange={(v) => handleRatingChange('clarity', v)}
              />
              {errors.rating_clarity && (
                <p className={styles.error}>{errors.rating_clarity}</p>
              )}
            </div>

            <div className={styles.ratingItem}>
              <label>Originality</label>
              <p className={styles.hint}>Rate from 1 (Poor) to 5 (Excellent)</p>
              <RatingScale
                value={ratings.originality}
                onChange={(v) => handleRatingChange('originality', v)}
              />
              {errors.rating_originality && (
                <p className={styles.error}>{errors.rating_originality}</p>
              )}
            </div>

            <div className={styles.ratingItem}>
              <label>Significance</label>
              <p className={styles.hint}>Rate from 1 (Poor) to 5 (Excellent)</p>
              <RatingScale
                value={ratings.significance}
                onChange={(v) => handleRatingChange('significance', v)}
              />
              {errors.rating_significance && (
                <p className={styles.error}>{errors.rating_significance}</p>
              )}
            </div>

            <div className={styles.ratingItem}>
              <label>Overall Rating</label>
              <p className={styles.hint}>Rate from 1 (Poor) to 5 (Excellent)</p>
              <RatingScale
                value={ratings.overall_rating}
                onChange={(v) => handleRatingChange('overall_rating', v)}
              />
              {errors.rating_overall_rating && (
                <p className={styles.error}>{errors.rating_overall_rating}</p>
              )}
            </div>

            <div className={styles.recommendationSection}>
              <label>Recommendation</label>
              <p className={styles.hint}>Select your recommendation for this manuscript</p>
              <select
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                className={styles.select}
              >
                <option value="">Select a recommendation...</option>
                <option value="accept">Accept</option>
                <option value="minor_revisions">Minor Revisions</option>
                <option value="major_revisions">Major Revisions</option>
                <option value="reject">Reject</option>
              </select>
              {errors.recommendation && (
                <p className={styles.error}>{errors.recommendation}</p>
              )}
            </div>

            {errors.ratings && (
              <div className={styles.errorBox}>{errors.ratings}</div>
            )}
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className={styles.commentsTab}>
            <div className={styles.commentSection}>
              <label>Comments for Authors</label>
              <p className={styles.hint}>Public comments visible to authors. Provide constructive feedback on the manuscript.</p>
              <textarea
                value={comments.author_comments}
                onChange={(e) => handleCommentChange('author_comments', e.target.value)}
                placeholder="Enter comments for authors..."
                className={styles.textarea}
                rows="8"
              />
              <p className={styles.charCount}>
                {comments.author_comments.length} characters
              </p>
              {errors.author_comments && (
                <p className={styles.error}>{errors.author_comments}</p>
              )}
            </div>

            <div className={styles.commentSection}>
              <label>Confidential Comments</label>
              <p className={styles.hint}>Private comments for editors only. These will not be shared with the authors.</p>
              <textarea
                value={comments.confidential_comments}
                onChange={(e) => handleCommentChange('confidential_comments', e.target.value)}
                placeholder="Enter confidential comments..."
                className={styles.textarea}
                rows="8"
              />
              <p className={styles.charCount}>
                {comments.confidential_comments.length} characters
              </p>
            </div>

            {errors.comments && (
              <div className={styles.errorBox}>{errors.comments}</div>
            )}

            <div className={styles.totalChars}>
              Total: {(comments.author_comments + comments.confidential_comments).length} characters (min: 50)
            </div>
          </div>
        )}

        {/* Report Tab */}
        {activeTab === 'report' && (
          <div className={styles.reportTab}>
            <div className={styles.uploadSection}>
              <p className={styles.uploadLabel}>Upload Review Report (Optional)</p>
              <p className={styles.uploadHint}>PDF, DOC, or DOCX files. Max 10MB.</p>

              <div
                className={styles.uploadArea}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add(styles.dragOver);
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove(styles.dragOver);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove(styles.dragOver);
                  const files = e.dataTransfer.files;
                  if (files.length > 0) {
                    handleFileSelect({ target: { files } });
                  }
                }}
              >
                <span className="material-symbols-rounded">cloud_upload</span>
                <p>Drag and drop your file here, or click to select</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx"
                style={{ display: 'none' }}
              />

              {uploadingFile && (
                <p className={styles.uploading}>Uploading...</p>
              )}

              {uploadedFile && (
                <div className={styles.uploadedFileSection}>
                  <div className={styles.uploadedFile}>
                    <span className="material-symbols-rounded">description</span>
                    <div className={styles.fileInfo}>
                      <p className={styles.fileName}>{typeof uploadedFile === 'string' ? uploadedFile.split('/').pop() : uploadedFile}</p>
                      <p className={styles.fileVersion}>Version {fileVersion}</p>
                    </div>
                    <button
                      type="button"
                      className={styles.previewBtn}
                      onClick={() => setShowPreview(!showPreview)}
                      title={showPreview ? 'Hide preview' : 'Preview file'}
                    >
                      <span className="material-symbols-rounded">{showPreview ? 'visibility_off' : 'visibility'}</span>
                    </button>
                    {onDownloadReport && (
                      <button
                        type="button"
                        className={styles.downloadBtn}
                        onClick={onDownloadReport}
                        title="Download this report"
                      >
                        <span className="material-symbols-rounded">download</span>
                      </button>
                    )}
                  </div>

                  {showPreview && previewUrl && (
                    <div className={styles.filePreview}>
                      {getFileExtension(previewFile?.name || uploadedFile) === 'pdf' ? (
                        <iframe
                          src={previewUrl}
                          className={styles.pdfPreview}
                          title="PDF Preview"
                        />
                      ) : (
                        <div className={styles.docxPreviewFallback}>
                          <span className="material-symbols-rounded">article</span>
                          <p>DOCX preview is not available in the browser.</p>
                          <button
                            type="button"
                            className={styles.downloadBtn}
                            onClick={onDownloadReport}
                          >
                            <span className="material-symbols-rounded">download</span>
                            Download to view
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.saveDraftBtn}
          onClick={saveDraft}
          disabled={isSaving || !hasChanges()}
        >
          {isSaving ? (
            <>
              <span className="material-symbols-rounded">hourglass_empty</span>
              Saving...
            </>
          ) : (
            <>
              <span className="material-symbols-rounded">save</span>
              Save Draft
            </>
          )}
        </button>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isSubmitting || !isFormComplete()}
        >
          {isSubmitting ? (
            <>
              <span className="material-symbols-rounded">hourglass_empty</span>
              Submitting...
            </>
          ) : (
            <>
              <span className="material-symbols-rounded">check_circle</span>
              Submit Review
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ReviewForm;
