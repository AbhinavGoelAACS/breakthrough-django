import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { acsApi } from '../../api/apiService';
import { useToast } from '../../hooks/useToast';
import styles from './ContactEditorialModal.module.css';

const ContactEditorialModal = ({ 
  isOpen, 
  onClose, 
  paperId, 
  paperTitle,
  authorName,
  authorEmail,
  currentStatus,
  senderRole = 'admin' // 'admin' or 'editor'
}) => {
  const { showSuccess, showError } = useToast();
  
  // State
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [customPlaceholders, setCustomPlaceholders] = useState({});
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Fetch email templates
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const response = await acsApi.admin.listEmailTemplates();
        setTemplates(response.templates || []);
      } catch (error) {
        console.error('Failed to fetch templates:', error);
        showError('Failed to load email templates');
      } finally {
        setLoadingTemplates(false);
      }
    };
    
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, showError]);
  
  // Handle template selection
  const handleTemplateSelect = (templateId) => {
    const template = templates.find(t => t.id === parseInt(templateId));
    setSelectedTemplate(template);
    
    if (template) {
      // Pre-fill subject and message with placeholder substitution
      let filledSubject = template.subject;
      let filledMessage = template.body_template;
      
      // Default placeholders (these will be auto-filled by the server)
      // reviewer_comments and editor_comments are fetched from the database automatically
      const defaults = {
        author_name: authorName,
        paper_title: paperTitle,
        paper_id: paperId,
        current_status: currentStatus,
        journal_name: 'Breakthrough Publishers India Journal',
        sender_name: senderRole === 'admin' ? 'Administrator' : 'Editor',
        // These are auto-filled by server, use placeholder text for preview
        reviewer_comments: '[Reviewer comments will be auto-filled]',
        editor_comments: '[Editor comments will be auto-filled if available]',
        revision_deadline: '30 days'
      };
      
      // Substitute defaults
      Object.entries(defaults).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
        filledSubject = filledSubject.replace(regex, value || '');
        filledMessage = filledMessage.replace(regex, value || '');
      });
      
      setSubject(filledSubject);
      setMessage(filledMessage);
      
      // Extract remaining placeholders that need user input
      const placeholderMatches = filledMessage.match(/\{\{(\w+)\}\}/g) || [];
      const remainingPlaceholders = {};
      placeholderMatches.forEach(match => {
        const key = match.replace(/\{\{|\}\}/g, '');
        if (!defaults[key]) {
          remainingPlaceholders[key] = '';
        }
      });
      setCustomPlaceholders(remainingPlaceholders);
    } else {
      // Reset to empty for custom message
      setSubject('');
      setMessage('');
      setCustomPlaceholders({});
    }
  };
  
  // Handle placeholder input
  const handlePlaceholderChange = (key, value) => {
    setCustomPlaceholders(prev => ({ ...prev, [key]: value }));
    
    // Update message with new placeholder value
    if (selectedTemplate) {
      let updatedMessage = selectedTemplate.body_template;
      
      // Apply default placeholders
      const defaults = {
        author_name: authorName,
        paper_title: paperTitle,
        paper_id: paperId,
        current_status: currentStatus,
        journal_name: 'Breakthrough Publishers India Journal',
        sender_name: senderRole === 'admin' ? 'Administrator' : 'Editor',
        reviewer_comments: '[Reviewer comments will be auto-filled]',
        editor_comments: '[Editor comments will be auto-filled if available]',
        revision_deadline: '30 days'
      };
      
      Object.entries(defaults).forEach(([k, v]) => {
        const regex = new RegExp(`\\{\\{${k}\\}\\}`, 'gi');
        updatedMessage = updatedMessage.replace(regex, v || '');
      });
      
      // Apply custom placeholders
      Object.entries({ ...customPlaceholders, [key]: value }).forEach(([k, v]) => {
        const regex = new RegExp(`\\{\\{${k}\\}\\}`, 'gi');
        updatedMessage = updatedMessage.replace(regex, v || '');
      });
      
      setMessage(updatedMessage);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim()) {
      showError('Subject and message are required');
      return;
    }
    
    setLoading(true);
    try {
      const data = {
        template_id: selectedTemplate?.id || null,
        subject: subject.trim(),
        message: message.trim(),
        placeholders: customPlaceholders,
        send_email: sendEmail
      };
      
      const response = await acsApi.admin.sendCorrespondence(paperId, data);
      
      showSuccess(
        sendEmail && response.email_sent 
          ? 'Email sent successfully!' 
          : 'Correspondence recorded successfully'
      );
      
      onClose(true); // Close and indicate success
    } catch (error) {
      console.error('Failed to send correspondence:', error);
      showError(error.response?.data?.detail || 'Failed to send correspondence');
    } finally {
      setLoading(false);
    }
  };
  
  // Reset form on close
  const handleClose = () => {
    setSelectedTemplate(null);
    setSubject('');
    setMessage('');
    setCustomPlaceholders({});
    setSendEmail(true);
    onClose(false);
  };
  
  if (!isOpen) return null;
  
  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    const category = template.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {});
  
  // Format placeholder key for display
  const formatPlaceholderLabel = (key) => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Contact Author</h2>
          <button className={styles.closeBtn} onClick={handleClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {/* Recipient Info */}
            <div className={styles.recipientInfo}>
              <div className={styles.recipientField}>
                <label>To:</label>
                <span>{authorName} &lt;{authorEmail}&gt;</span>
              </div>
              <div className={styles.recipientField}>
                <label>Paper:</label>
                <span className={styles.paperTitle}>{paperTitle}</span>
              </div>
            </div>
            
            {/* Template Selection */}
            <div className={styles.formGroup}>
              <label htmlFor="template">Email Template</label>
              <select
                id="template"
                value={selectedTemplate?.id || ''}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                disabled={loadingTemplates}
              >
                <option value="">-- Custom Message --</option>
                {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
                  <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                    {categoryTemplates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            
            {/* Custom Placeholders */}
            {Object.keys(customPlaceholders).length > 0 && (
              <div className={styles.placeholdersSection}>
                <h4>Fill in Custom Fields</h4>
                <div className={styles.placeholderFields}>
                  {Object.entries(customPlaceholders).map(([key, value]) => (
                    <div key={key} className={styles.formGroup}>
                      <label htmlFor={`placeholder-${key}`}>
                        {formatPlaceholderLabel(key)}
                      </label>
                      {key.includes('comments') || key.includes('reason') || key.includes('message') ? (
                        <textarea
                          id={`placeholder-${key}`}
                          value={value}
                          onChange={(e) => handlePlaceholderChange(key, e.target.value)}
                          rows={3}
                          placeholder={`Enter ${formatPlaceholderLabel(key).toLowerCase()}...`}
                        />
                      ) : (
                        <input
                          type="text"
                          id={`placeholder-${key}`}
                          value={value}
                          onChange={(e) => handlePlaceholderChange(key, e.target.value)}
                          placeholder={`Enter ${formatPlaceholderLabel(key).toLowerCase()}...`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Subject */}
            <div className={styles.formGroup}>
              <label htmlFor="subject">Subject *</label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                required
              />
            </div>
            
            {/* Message */}
            <div className={styles.formGroup}>
              <label htmlFor="message">Message *</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Enter your message..."
                required
              />
            </div>
            
            {/* Send Email Option */}
            <div className={styles.sendOption}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                <span className={styles.checkmark}></span>
                Send email to author
              </label>
              <small>Uncheck to only record correspondence without sending email</small>
            </div>
          </div>
          
          <div className={styles.modalFooter}>
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
              className={styles.sendBtn}
              disabled={loading || !subject.trim() || !message.trim()}
            >
              {loading ? 'Sending...' : sendEmail ? 'Send Email' : 'Save Correspondence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

ContactEditorialModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  paperId: PropTypes.number.isRequired,
  paperTitle: PropTypes.string.isRequired,
  authorName: PropTypes.string.isRequired,
  authorEmail: PropTypes.string.isRequired,
  currentStatus: PropTypes.string,
  senderRole: PropTypes.oneOf(['admin', 'editor'])
};

export default ContactEditorialModal;
