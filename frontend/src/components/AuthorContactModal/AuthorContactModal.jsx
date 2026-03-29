import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { acsApi } from '../../api/apiService';
import { useToast } from '../../hooks/useToast';
import styles from './AuthorContactModal.module.css';

const AuthorContactModal = ({ 
  isOpen, 
  onClose, 
  paperId, 
  paperCode,
  paperTitle
}) => {
  const { success: showSuccess, error: showError } = useToast();
  
  // State
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [inquiryType, setInquiryType] = useState('general');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ subject: false, message: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  
  // Inquiry types
  const inquiryTypes = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'status', label: 'Submission Status' },
    { value: 'revision', label: 'Revision Query' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'payment', label: 'Payment/Invoice' },
    { value: 'other', label: 'Other' }
  ];

  // Validation rules
  const validations = {
    subject: {
      required: true,
      minLength: 5,
      maxLength: 200,
      validate: (value) => {
        if (!value.trim()) return 'Subject is required';
        if (value.trim().length < 5) return 'Subject must be at least 5 characters';
        if (value.trim().length > 200) return 'Subject cannot exceed 200 characters';
        return null;
      }
    },
    message: {
      required: true,
      minLength: 20,
      maxLength: 2000,
      validate: (value) => {
        if (!value.trim()) return 'Message is required';
        if (value.trim().length < 20) return 'Please provide more details (minimum 20 characters)';
        if (value.trim().length > 2000) return 'Message cannot exceed 2000 characters';
        return null;
      }
    }
  };

  // Get validation error for a field
  const getFieldError = (field, value) => {
    return validations[field]?.validate(value);
  };

  // Check if field should show error
  const shouldShowError = (field) => {
    return touched[field] || submitAttempted;
  };

  // Get error message for display
  const getErrorMessage = (field, value) => {
    if (!shouldShowError(field)) return null;
    return getFieldError(field, value);
  };

  // Check if form is valid
  const isFormValid = () => {
    const subjectError = getFieldError('subject', subject);
    const messageError = getFieldError('message', message);
    return !subjectError && !messageError;
  };

  // Handle field blur
  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    // Validate all fields
    if (!isFormValid()) {
      const subjectError = getFieldError('subject', subject);
      const messageError = getFieldError('message', message);
      showError(subjectError || messageError || 'Please fix the errors before submitting');
      return;
    }
    
    setLoading(true);
    try {
      const response = await acsApi.author.contactEditorial(paperId, {
        subject: subject.trim(),
        message: message.trim(),
        inquiry_type: inquiryType
      });
      
      showSuccess(response.data?.message || 'Your message has been sent to the editorial office');
      // Reset form and close modal on success
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to send message:', error);
      showError(error.response?.data?.detail || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset form state
  const resetForm = () => {
    setSubject('');
    setMessage('');
    setInquiryType('general');
    setTouched({ subject: false, message: false });
    setSubmitAttempted(false);
  };
  
  // Reset form on close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);
  
  if (!isOpen) return null;

  const subjectError = getErrorMessage('subject', subject);
  const messageError = getErrorMessage('message', message);
  
  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <span className="material-symbols-rounded">mail</span>
            <h2>Contact Editorial Office</h2>
          </div>
          <button className={styles.closeBtn} onClick={handleClose} type="button">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {/* Paper Info */}
          <div className={styles.paperInfo}>
            <span className={styles.paperCode}>{paperCode}</span>
            <span className={styles.paperTitle}>{paperTitle}</span>
          </div>
          
          {/* Inquiry Type */}
          <div className={styles.formGroup}>
            <label htmlFor="inquiryType">Inquiry Type</label>
            <select
              id="inquiryType"
              value={inquiryType}
              onChange={(e) => setInquiryType(e.target.value)}
              className={styles.select}
            >
              {inquiryTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <span className={styles.helperText}>Select the category that best describes your inquiry</span>
          </div>
          
          {/* Subject */}
          <div className={styles.formGroup}>
            <label htmlFor="subject">
              Subject <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onBlur={() => handleBlur('subject')}
              placeholder="Brief description of your inquiry"
              className={`${styles.input} ${subjectError ? styles.inputError : ''}`}
              maxLength={200}
              aria-invalid={!!subjectError}
              aria-describedby="subject-helper"
            />
            <div className={styles.inputFooter}>
              {subjectError ? (
                <span className={styles.errorText} id="subject-helper">
                  <span className="material-symbols-rounded">error</span>
                  {subjectError}
                </span>
              ) : (
                <span className={styles.helperText} id="subject-helper">
                  Minimum 5 characters required
                </span>
              )}
              <span className={`${styles.charCount} ${subject.length > 180 ? styles.charCountWarning : ''}`}>
                {subject.length}/200
              </span>
            </div>
          </div>
          
          {/* Message */}
          <div className={styles.formGroup}>
            <label htmlFor="message">
              Message <span className={styles.required}>*</span>
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onBlur={() => handleBlur('message')}
              placeholder="Please provide details about your inquiry. Include any relevant information that would help us assist you better..."
              className={`${styles.textarea} ${messageError ? styles.inputError : ''}`}
              rows={6}
              maxLength={2000}
              aria-invalid={!!messageError}
              aria-describedby="message-helper"
            />
            <div className={styles.inputFooter}>
              {messageError ? (
                <span className={styles.errorText} id="message-helper">
                  <span className="material-symbols-rounded">error</span>
                  {messageError}
                </span>
              ) : (
                <span className={styles.helperText} id="message-helper">
                  Minimum 20 characters required. Be as specific as possible.
                </span>
              )}
              <span className={`${styles.charCount} ${message.length > 1800 ? styles.charCountWarning : ''}`}>
                {message.length}/2000
              </span>
            </div>
          </div>
          
          {/* Info Note */}
          <div className={styles.infoNote}>
            <span className="material-symbols-rounded">info</span>
            <p>
              Your message will be sent to the editorial team responsible for this journal. 
              You will receive a response via email and can also view it in your correspondence history.
            </p>
          </div>
          
          {/* Actions */}
          <div className={styles.actions}>
            <button 
              type="button" 
              className={styles.cancelBtn}
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={loading || (submitAttempted && !isFormValid())}
            >
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Sending...
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded">send</span>
                  Send Message
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

AuthorContactModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  paperId: PropTypes.number.isRequired,
  paperCode: PropTypes.string,
  paperTitle: PropTypes.string
};

export default AuthorContactModal;
