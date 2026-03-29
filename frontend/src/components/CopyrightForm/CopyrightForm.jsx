import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { acsApi } from '../../api/apiService';
import { useToast } from '../../hooks/useToast';
import styles from './CopyrightForm.module.css';

const CopyrightForm = ({ isOpen, onClose, paperId, onSuccess }) => {
  const { success, error: showError } = useToast();
  
  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(null);
  const [fetchError, setFetchError] = useState(false);
  const [formValues, setFormValues] = useState({
    author_name: '',
    author_affiliation: '',
    signature: '',
    original_work: false,
    no_conflict: false,
    rights_transfer: false,
    co_authors_consent: false,
    copyright_agreed: false,
  });
  
  // Use ref to track if we've already fetched for this paperId
  const lastFetchedPaperIdRef = useRef(null);

  // Fetch form data when opening
  useEffect(() => {
    // Only fetch if modal is open and we haven't fetched for this paper yet
    if (!isOpen || !paperId) {
      return;
    }
    
    // Prevent re-fetching for the same paper
    if (lastFetchedPaperIdRef.current === paperId && formData) {
      return;
    }
    
    let isMounted = true;
    
    const fetchFormData = async () => {
      setLoading(true);
      setFetchError(false);
      
      try {
        const response = await acsApi.copyright.getForm(paperId);
        
        if (!isMounted) return;
        
        setFormData(response);
        lastFetchedPaperIdRef.current = paperId;
        
        // Pre-fill author name if available
        if (response.author_name) {
          setFormValues(prev => ({
            ...prev,
            author_name: response.author_name || '',
            author_affiliation: response.author_affiliation || '',
          }));
        }
      } catch (error) {
        console.error('Failed to fetch copyright form:', error);
        if (!isMounted) return;
        setFetchError(true);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchFormData();
    
    return () => {
      isMounted = false;
    };
  }, [isOpen, paperId]); // Remove onClose and showError from dependencies
  
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFetchError(false);
      lastFetchedPaperIdRef.current = null;
      setFormData(null);
    }
  }, [isOpen]);

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!formData?.deadline) return null;
    
    const deadline = new Date(formData.deadline);
    const now = new Date();
    const diff = deadline - now;
    
    if (diff <= 0) return { expired: true, text: 'Expired' };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      expired: false,
      text: `${hours}h ${minutes}m remaining`,
      urgent: hours < 12
    };
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formValues.author_name.trim()) {
      showError('Please enter your full name');
      return false;
    }
    if (!formValues.author_affiliation.trim()) {
      showError('Please enter your affiliation');
      return false;
    }
    if (!formValues.signature.trim()) {
      showError('Please enter your digital signature');
      return false;
    }
    if (!formValues.original_work) {
      showError('Please confirm this is original work');
      return false;
    }
    if (!formValues.no_conflict) {
      showError('Please confirm no conflict of interest');
      return false;
    }
    if (!formValues.rights_transfer) {
      showError('Please agree to transfer copyright');
      return false;
    }
    if (!formValues.copyright_agreed) {
      showError('Please agree to the copyright terms');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await acsApi.copyright.submitForm(paperId, formValues);
      success('Copyright transfer form submitted successfully!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to submit copyright form:', error);
      showError(error.response?.data?.detail || 'Failed to submit copyright form');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const timeRemaining = getTimeRemaining();

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Copyright Transfer Agreement</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading form...</p>
          </div>
        ) : fetchError ? (
          <div className={styles.expiredState}>
            <div className={styles.expiredIcon}>⚠️</div>
            <h3>Failed to Load</h3>
            <p>Unable to load the copyright form. Please try again later or contact the editorial office.</p>
            <button type="button" className={styles.closeModalBtn} onClick={onClose}>
              Close
            </button>
          </div>
        ) : formData?.status === 'expired' ? (
          <div className={styles.expiredState}>
            <div className={styles.expiredIcon}>⚠️</div>
            <h3>Form Expired</h3>
            <p>The deadline for this copyright transfer form has passed. Please contact the editorial office for assistance.</p>
            <button type="button" className={styles.closeModalBtn} onClick={onClose}>
              Close
            </button>
          </div>
        ) : formData?.status === 'completed' ? (
          <div className={styles.completedState}>
            <div className={styles.completedIcon}>✓</div>
            <h3>Already Submitted</h3>
            <p>You have already submitted the copyright transfer form for this paper.</p>
            <button type="button" className={styles.closeModalBtn} onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.modalBody}>
              {/* Paper Info */}
              <div className={styles.paperInfo}>
                <h3>{formData?.paper_title}</h3>
                {timeRemaining && (
                  <div className={`${styles.deadline} ${timeRemaining.urgent ? styles.urgent : ''}`}>
                    <span className={styles.deadlineIcon}>⏱️</span>
                    {timeRemaining.text}
                  </div>
                )}
              </div>

              {/* Author Information */}
              <div className={styles.section}>
                <h4>Author Information</h4>
                
                <div className={styles.formGroup}>
                  <label htmlFor="author_name">Full Name *</label>
                  <input
                    type="text"
                    id="author_name"
                    name="author_name"
                    value={formValues.author_name}
                    onChange={handleInputChange}
                    placeholder="Enter your full legal name"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="author_affiliation">Affiliation *</label>
                  <input
                    type="text"
                    id="author_affiliation"
                    name="author_affiliation"
                    value={formValues.author_affiliation}
                    onChange={handleInputChange}
                    placeholder="Institution/Organization"
                    required
                  />
                </div>
              </div>

              {/* Declarations */}
              <div className={styles.section}>
                <h4>Declarations</h4>
                
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="original_work"
                      checked={formValues.original_work}
                      onChange={handleInputChange}
                    />
                    <span className={styles.checkmark}></span>
                    <span className={styles.labelText}>
                      I confirm that this manuscript is original work, has not been published before, 
                      and is not currently being considered for publication elsewhere.
                    </span>
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="no_conflict"
                      checked={formValues.no_conflict}
                      onChange={handleInputChange}
                    />
                    <span className={styles.checkmark}></span>
                    <span className={styles.labelText}>
                      I declare that there are no conflicts of interest that could have influenced the 
                      results or interpretation of the work.
                    </span>
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="rights_transfer"
                      checked={formValues.rights_transfer}
                      onChange={handleInputChange}
                    />
                    <span className={styles.checkmark}></span>
                    <span className={styles.labelText}>
                      I agree to transfer the first publication rights and exclusive rights to 
                      Breakthrough Publishers India for the publication of this work.
                    </span>
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="co_authors_consent"
                      checked={formValues.co_authors_consent}
                      onChange={handleInputChange}
                    />
                    <span className={styles.checkmark}></span>
                    <span className={styles.labelText}>
                      I confirm that all co-authors (if any) have reviewed and approved the final 
                      manuscript, and consent to its publication.
                    </span>
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="copyright_agreed"
                      checked={formValues.copyright_agreed}
                      onChange={handleInputChange}
                    />
                    <span className={styles.checkmark}></span>
                    <span className={styles.labelText}>
                      I have read and agree to the copyright policy and terms of publication.
                    </span>
                  </label>
                </div>
              </div>

              {/* Digital Signature */}
              <div className={styles.section}>
                <h4>Digital Signature</h4>
                <div className={styles.formGroup}>
                  <label htmlFor="signature">Type your full name as digital signature *</label>
                  <input
                    type="text"
                    id="signature"
                    name="signature"
                    value={formValues.signature}
                    onChange={handleInputChange}
                    placeholder="Type your full name"
                    className={styles.signatureInput}
                    required
                  />
                  <p className={styles.signatureNote}>
                    By typing your name above, you are providing a legally binding electronic signature.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button 
                type="button" 
                className={styles.cancelBtn} 
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className={styles.submitBtn}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Copyright Form'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

CopyrightForm.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  paperId: PropTypes.number,
  onSuccess: PropTypes.func,
};

export default CopyrightForm;
