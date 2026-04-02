import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import acsApi from '../api/apiService.js';
import OrganizationAutocomplete from './OrganizationAutocomplete';
import styles from './SubmitPaperForm.module.css';

const SALUTATION_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Prof. Dr.', label: 'Prof. Dr.' },
  { value: 'Prof.', label: 'Prof.' },
  { value: 'Dr.', label: 'Dr.' },
  { value: 'Mr.', label: 'Mr.' },
  { value: 'Ms.', label: 'Ms.' },
];

// Research categories for journal recommendations
const RESEARCH_CATEGORIES = [
  { value: '', label: 'Select Research Area...' },
  { value: 'Arts & Humanities', label: 'Arts & Humanities' },
  { value: 'Social Sciences', label: 'Social Sciences' },
  { value: 'Business & Economics', label: 'Business & Economics' },
  { value: 'Law', label: 'Law' },
  { value: 'Education', label: 'Education' },
  { value: 'Computer Science', label: 'Computer Science' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Physical Sciences', label: 'Physical Sciences' },
  { value: 'Life Sciences', label: 'Life Sciences' },
  { value: 'Medicine & Health', label: 'Medicine & Health' },
];

const EMPTY_CO_AUTHOR = {
  salutation: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  designation: '',
  department: '',
  organisation: '',
  email: '',
  is_corresponding: false,
};

const MAX_CO_AUTHORS = 5;

export const SubmitPaperForm = () => {
  const navigate = useNavigate();
  const { success, error: showError, warning: showWarning } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [journals, setJournals] = useState([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [keywordChips, setKeywordChips] = useState([]);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [pdfPreviewFile, setPdfPreviewFile] = useState(null);
  const [pdfPreviewLabel, setPdfPreviewLabel] = useState('');
  const [pdfObjectUrl, setPdfObjectUrl] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  // Journal recommendations state
  const [recommendedJournals, setRecommendedJournals] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [journalDropdownOpen, setJournalDropdownOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    // Step 1: Paper Metadata
    title: '',
    abstract: '',
    keywords: '',
    research_area: '',
    paper_type: 'Full Length Article',
    message_to_editor: '',
    journal_id: '',
    // Step 2: Author Details
    authorDetails: {
      salutation: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      designation: '',
      department: '',
      organisation: '',
    },
    coAuthors: [],
    // Step 3: File Upload
    titlePageFile: null,
    titlePagePreview: null,
    blindedManuscriptFile: null,
    blindedManuscriptPreview: null,
    // Step 4: Terms
    termsAccepted: false,
  });

  // Load journals and author profile on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load journals
        const journalsResponse = await acsApi.getJournals(0, 100);
        const journalsArray = journalsResponse.journals || journalsResponse.data || journalsResponse || [];
        setJournals(Array.isArray(journalsArray) ? journalsArray : []);
        
        // Load author profile for pre-fill
        try {
          const profile = await acsApi.author.getAuthorProfile();
          if (profile) {
            setFormData(prev => ({
              ...prev,
              authorDetails: {
                salutation: profile.salutation || '',
                first_name: profile.fname || '',
                middle_name: profile.mname || '',
                last_name: profile.lname || '',
                designation: profile.designation || '',
                department: profile.department || '',
                organisation: profile.organisation || profile.affiliation || '',
              }
            }));
          }
        } catch (profileErr) {
          console.log('Could not load author profile for pre-fill:', profileErr);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
        setJournals([]);
      }
    };
    loadInitialData();
  }, []);

  // Manage PDF object URL lifecycle
  useEffect(() => {
    if (pdfPreviewFile) {
      const url = URL.createObjectURL(pdfPreviewFile);
      setPdfObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfObjectUrl(null);
    }
  }, [pdfPreviewFile]);

  // Validation helper functions
  const validateEmail = (email) => {
    if (!email) return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateField = (field, value) => {
    switch (field) {
      case 'title':
        if (!value?.trim()) return 'Paper title is required';
        if (value.trim().length < 10) return 'Title must be at least 10 characters';
        if (value.length > 500) return 'Title must not exceed 500 characters';
        return '';
      case 'abstract':
        if (!value?.trim()) return 'Abstract is required';
        if (value.trim().length < 100) return 'Abstract must be at least 100 characters';
        if (value.length > 2000) return 'Abstract must not exceed 2000 characters';
        return '';
      case 'keywords':
        if (keywordChips.length === 0) return 'At least one keyword is required';
        return '';
      case 'research_area':
        if (!value?.trim()) return 'Research area is required';
        return '';
      case 'journal_id':
        if (!value) return 'Please select a journal';
        return '';
      case 'first_name':
        if (!value?.trim()) return 'First name is required';
        if (value.trim().length < 2) return 'First name must be at least 2 characters';
        return '';
      case 'last_name':
        if (!value?.trim()) return 'Last name is required';
        if (value.trim().length < 2) return 'Last name must be at least 2 characters';
        return '';
      case 'salutation':
        if (!value) return 'Salutation is required';
        return '';
      case 'designation':
        if (!value?.trim()) return 'Designation is required';
        return '';
      case 'department':
        if (!value?.trim()) return 'Department is required';
        return '';
      case 'organisation':
        if (!value?.trim()) return 'Organisation is required';
        return '';
      case 'email':
        if (!value?.trim()) return 'Email is required';
        if (!validateEmail(value)) return 'Please enter a valid email address';
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const value = formData[field];
    const error = validateField(field, value);
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleAuthorBlur = (field) => {
    const touchedKey = `author_${field}`;
    setTouched(prev => ({ ...prev, [touchedKey]: true }));
    const value = formData.authorDetails[field];
    const error = validateField(field, value);
    setFieldErrors(prev => ({ ...prev, [touchedKey]: error }));
  };

  const handleCoAuthorBlur = (index, field) => {
    const touchedKey = `coauthor_${index}_${field}`;
    setTouched(prev => ({ ...prev, [touchedKey]: true }));
    const value = formData.coAuthors[index]?.[field];
    const error = validateField(field, value);
    setFieldErrors(prev => ({ ...prev, [touchedKey]: error }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (touched[field]) {
      const error = validateField(field, value);
      setFieldErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleAuthorChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      authorDetails: { ...prev.authorDetails, [field]: value }
    }));
    // Clear error when user starts typing
    const touchedKey = `author_${field}`;
    if (touched[touchedKey]) {
      const error = validateField(field, value);
      setFieldErrors(prev => ({ ...prev, [touchedKey]: error }));
    }
  };

  // Keyword chip handling
  const handleKeywordInputChange = (e) => {
    const value = e.target.value;
    setKeywordInput(value);
    
    // Check if comma was entered
    if (value.includes(',')) {
      const parts = value.split(',');
      const newKeyword = parts[0].trim();
      
      if (newKeyword && !keywordChips.includes(newKeyword)) {
        const newChips = [...keywordChips, newKeyword];
        setKeywordChips(newChips);
        setFormData(prev => ({ ...prev, keywords: newChips.join(', ') }));
      }
      setKeywordInput(parts[1] || '');
    }
  };

  const handleKeywordKeyDown = (e) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      const newKeyword = keywordInput.trim();
      if (!keywordChips.includes(newKeyword)) {
        const newChips = [...keywordChips, newKeyword];
        setKeywordChips(newChips);
        setFormData(prev => ({ ...prev, keywords: newChips.join(', ') }));
      }
      setKeywordInput('');
    } else if (e.key === 'Backspace' && !keywordInput && keywordChips.length > 0) {
      // Remove last chip on backspace if input is empty
      const newChips = keywordChips.slice(0, -1);
      setKeywordChips(newChips);
      setFormData(prev => ({ ...prev, keywords: newChips.join(', ') }));
    }
  };

  const removeKeywordChip = (indexToRemove) => {
    const newChips = keywordChips.filter((_, idx) => idx !== indexToRemove);
    setKeywordChips(newChips);
    setFormData(prev => ({ ...prev, keywords: newChips.join(', ') }));
  };

  // Fetch journal recommendations based on research area, keywords and abstract
  const fetchJournalRecommendations = async () => {
    if (!formData.research_area) {
      showWarning('Please select a research area first');
      return;
    }
    if (keywordChips.length < 5) {
      showWarning('Please enter at least 5 keywords to get recommendations');
      return;
    }
    
    setLoadingRecommendations(true);
    try {
      const response = await acsApi.journals.getRecommendations(formData.research_area, keywordChips, formData.abstract);
      if (response.recommendations && response.recommendations.length > 0) {
        setRecommendedJournals(response.recommendations);
        success(`Found ${response.recommendations.length} recommended journal${response.recommendations.length > 1 ? 's' : ''} for your paper!`);
      } else {
        setRecommendedJournals([]);
        showWarning('No journals found in this research area. Please check our available journals.');
      }
    } catch (err) {
      console.error('Failed to fetch journal recommendations:', err);
      showError('Failed to get journal recommendations. Please try again.');
      setRecommendedJournals([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Get sorted journals with recommended ones first
  const getSortedJournals = () => {
    if (!journals || journals.length === 0) return [];
    
    const recommendedIds = new Set(recommendedJournals.map(r => r.journal_id));
    
    // Partition journals into recommended and others
    const recommended = journals.filter(j => recommendedIds.has(j.id));
    const others = journals.filter(j => !recommendedIds.has(j.id));
    
    // Sort recommended by score (descending)
    recommended.sort((a, b) => {
      const scoreA = recommendedJournals.find(r => r.journal_id === a.id)?.score || 0;
      const scoreB = recommendedJournals.find(r => r.journal_id === b.id)?.score || 0;
      return scoreB - scoreA;
    });
    
    // Sort others alphabetically
    others.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    return [...recommended, ...others];
  };

  // Get recommendation info for a journal
  const getRecommendationInfo = (journalId) => {
    return recommendedJournals.find(r => r.journal_id === journalId);
  };


  // Co-author handling
  const addCoAuthor = () => {
    if (formData.coAuthors.length >= MAX_CO_AUTHORS) {
      showError(`Maximum ${MAX_CO_AUTHORS} co-authors allowed per paper`);
      return;
    }
    setFormData(prev => ({
      ...prev,
      coAuthors: [...prev.coAuthors, { ...EMPTY_CO_AUTHOR, author_order: prev.coAuthors.length + 2 }]
    }));
  };

  const removeCoAuthor = (index) => {
    setFormData(prev => ({
      ...prev,
      coAuthors: prev.coAuthors.filter((_, idx) => idx !== index).map((co, idx) => ({
        ...co,
        author_order: idx + 2
      }))
    }));
  };

  // Move co-author up or down in the list (swap positions)
  const moveCoAuthor = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.coAuthors.length) return;
    
    setFormData(prev => {
      const newCoAuthors = [...prev.coAuthors];
      // Swap the two co-authors
      [newCoAuthors[index], newCoAuthors[newIndex]] = [newCoAuthors[newIndex], newCoAuthors[index]];
      // Update author_order for all
      return {
        ...prev,
        coAuthors: newCoAuthors.map((co, idx) => ({ ...co, author_order: idx + 2 }))
      };
    });
  };

  const updateCoAuthor = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      coAuthors: prev.coAuthors.map((co, idx) => 
        idx === index ? { ...co, [field]: value } : co
      )
    }));
    // Validate on change if field was touched
    const touchedKey = `coauthor_${index}_${field}`;
    if (touched[touchedKey]) {
      const error = validateField(field, value);
      setFieldErrors(prev => ({ ...prev, [touchedKey]: error }));
    }
  };

  const handleFileChange = (fileType, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      showError('Only PDF and Word documents are allowed');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      showError('File size must not exceed 50MB');
      return;
    }

    if (fileType === 'titlePage') {
      setFormData(prev => ({
        ...prev,
        titlePageFile: file,
        titlePagePreview: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`
      }));
    } else if (fileType === 'blindedManuscript') {
      setFormData(prev => ({
        ...prev,
        blindedManuscriptFile: file,
        blindedManuscriptPreview: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`
      }));
    }
  };

  const validateStep = (step) => {
    const errors = {};
    let isValid = true;

    const validations = {
      1: () => {
        // Title validation
        const titleError = validateField('title', formData.title);
        if (titleError) {
          errors.title = titleError;
          isValid = false;
        }

        // Abstract validation
        const abstractError = validateField('abstract', formData.abstract);
        if (abstractError) {
          errors.abstract = abstractError;
          isValid = false;
        }

        // Keywords validation
        if (keywordChips.length === 0) {
          errors.keywords = 'At least one keyword is required';
          isValid = false;
        }

        // Research area validation (now required)
        const researchAreaError = validateField('research_area', formData.research_area);
        if (researchAreaError) {
          errors.research_area = researchAreaError;
          isValid = false;
        }

        // Journal validation
        const journalError = validateField('journal_id', formData.journal_id);
        if (journalError) {
          errors.journal_id = journalError;
          isValid = false;
        }

        if (!isValid) {
          setFieldErrors(prev => ({ ...prev, ...errors }));
          setTouched(prev => ({ ...prev, title: true, abstract: true, keywords: true, research_area: true, journal_id: true }));
          showError('Please fix the errors in the form');
        }
        return isValid;
      },
      2: () => {
        const { authorDetails } = formData;
        const requiredAuthorFields = ['salutation', 'first_name', 'last_name', 'designation', 'department', 'organisation'];
        
        // Validate primary author (all fields required)
        requiredAuthorFields.forEach(field => {
          const error = validateField(field, authorDetails[field]);
          if (error) {
            errors[`author_${field}`] = error;
            isValid = false;
          }
        });

        // Validate co-authors (all fields required)
        formData.coAuthors.forEach((co, index) => {
          const requiredCoAuthorFields = ['salutation', 'first_name', 'last_name', 'email', 'designation', 'department', 'organisation'];
          requiredCoAuthorFields.forEach(field => {
            const error = validateField(field, co[field]);
            if (error) {
              errors[`coauthor_${index}_${field}`] = error;
              isValid = false;
            }
          });
        });

        if (!isValid) {
          setFieldErrors(prev => ({ ...prev, ...errors }));
          // Mark all author fields as touched
          const touchedFields = {};
          requiredAuthorFields.forEach(f => touchedFields[`author_${f}`] = true);
          formData.coAuthors.forEach((_, i) => {
            ['salutation', 'first_name', 'last_name', 'email', 'designation', 'department', 'organisation'].forEach(f => {
              touchedFields[`coauthor_${i}_${f}`] = true;
            });
          });
          setTouched(prev => ({ ...prev, ...touchedFields }));
          showError('Please fill in all required author details');
        }
        return isValid;
      },
      3: () => {
        if (!formData.titlePageFile) {
          showError('Please upload the title page file');
          return false;
        }
        if (!formData.blindedManuscriptFile) {
          showError('Please upload the blinded manuscript file');
          return false;
        }
        return true;
      },
      4: () => {
        if (!hasReadTerms) {
          showWarning('Please open and read the terms and conditions');
          return false;
        }
        if (!formData.termsAccepted) {
          showError('Please accept the terms and conditions');
          return false;
        }
        return true;
      }
    };
    return validations[step]?.() ?? true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep) && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    try {
      const response = await acsApi.author.submitPaper({
        title: formData.title,
        abstract: formData.abstract,
        keywords: formData.keywords,
        journal_id: parseInt(formData.journal_id),
        title_page: formData.titlePageFile,
        blinded_manuscript: formData.blindedManuscriptFile,
        research_area: formData.research_area,
        paper_type: formData.paper_type,
        message_to_editor: formData.message_to_editor,
        terms_accepted: formData.termsAccepted,
        author_details: formData.authorDetails,
        co_authors: formData.coAuthors.map((co, idx) => ({
          ...co,
          author_order: idx + 2
        }))
      });

      success(`Paper submitted successfully! Paper ID: ${response.paper_code || response.id}`);
      setTimeout(() => navigate('/author'), 1500);
    } catch (err) {
      console.error('Submit error:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to submit paper';
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (stepNum) => {
    if (currentStep > stepNum) return 'completed';
    if (currentStep === stepNum) return 'inProgress';
    return 'pending';
  };

  const steps = [
    { num: 1, label: 'Paper Metadata', icon: 'description' },
    { num: 2, label: 'Author Details', icon: 'person' },
    { num: 3, label: 'Upload', icon: 'cloud_upload' },
    { num: 4, label: 'Review & Submit', icon: 'done' }
  ];

  const formatAuthorName = (author) => {
    const parts = [];
    if (author.salutation) parts.push(author.salutation);
    if (author.first_name) parts.push(author.first_name);
    if (author.middle_name) parts.push(author.middle_name);
    if (author.last_name) parts.push(author.last_name);
    return parts.join(' ') || 'Not provided';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Submit Your Paper</h1>
        <p>Complete all steps to submit your paper for peer review</p>
      </div>

      {/* Stepper */}
      <div className={styles.stepper}>
        {steps.map((step) => {
          const status = getStepStatus(step.num);
          return (
            <div key={step.num} className={`${styles.step} ${styles[status]}`}>
              <div className={styles.stepContent}>
                <div
                  className={`${styles.stepDot} ${styles[status]}`}
                  onClick={() => currentStep > step.num && setCurrentStep(step.num)}
                >
                  <span className={`material-symbols-rounded ${styles.stepIcon}`}>
                    {step.icon}
                  </span>
                </div>
                <div className={styles.stepLabel}>
                  <strong>STEP {step.num}</strong>
                  <h4>{step.label}</h4>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Content */}
      <div className={styles.formCard}>
        {/* Step 1: Paper Metadata */}
        {currentStep === 1 && (
          <div>
            <h2>Step 1: Paper Metadata</h2>
            
            <div className={`${styles.field} ${touched.title && fieldErrors.title ? styles.fieldError : ''}`}>
              <label htmlFor="title">Paper Title *</label>
              <input
                id="title"
                type="text"
                placeholder="Enter paper title (minimum 10 characters)"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                onBlur={() => handleBlur('title')}
                maxLength={500}
                className={`${styles.input} ${touched.title && fieldErrors.title ? styles.inputError : ''}`}
              />
              <div className={styles.fieldMeta}>
                <small className={styles.charCount}>{formData.title.length}/500 characters</small>
                {touched.title && fieldErrors.title && (
                  <span className={styles.errorText}>{fieldErrors.title}</span>
                )}
              </div>
            </div>

            <div className={`${styles.field} ${touched.abstract && fieldErrors.abstract ? styles.fieldError : ''}`}>
              <label htmlFor="abstract">Abstract *</label>
              <textarea
                id="abstract"
                placeholder="Enter paper abstract (100-2000 characters)"
                value={formData.abstract}
                onChange={(e) => handleInputChange('abstract', e.target.value)}
                onBlur={() => handleBlur('abstract')}
                maxLength={2000}
                rows={6}
                className={`${styles.textarea} ${touched.abstract && fieldErrors.abstract ? styles.inputError : ''}`}
              />
              <div className={styles.fieldMeta}>
                <small className={styles.charCount}>{formData.abstract.length}/2000 characters (min: 100)</small>
                {touched.abstract && fieldErrors.abstract && (
                  <span className={styles.errorText}>{fieldErrors.abstract}</span>
                )}
              </div>
            </div>

            <div className={`${styles.field} ${touched.keywords && fieldErrors.keywords ? styles.fieldError : ''}`}>
              <label htmlFor="keywords">Keywords * <span className={styles.keywordHint}>(min. 5 for journal suggestions)</span></label>
              <div className={styles.keywordInputRow}>
                <input
                  id="keywords"
                  type="text"
                  placeholder="Type keyword and press comma or Enter"
                  value={keywordInput}
                  onChange={handleKeywordInputChange}
                  onKeyDown={handleKeywordKeyDown}
                  onBlur={() => {
                    setTouched(prev => ({ ...prev, keywords: true }));
                    if (keywordChips.length === 0) {
                      setFieldErrors(prev => ({ ...prev, keywords: 'At least one keyword is required' }));
                    } else {
                      setFieldErrors(prev => ({ ...prev, keywords: '' }));
                    }
                  }}
                  className={`${styles.input} ${touched.keywords && fieldErrors.keywords ? styles.inputError : ''}`}
                />
              </div>
              <div className={styles.fieldMeta}>
                <small className={styles.helperText}>
                  Separate keywords with commas or press Enter 
                  <span className={styles.keywordCount}>({keywordChips.length}/5 minimum)</span>
                </small>
                {touched.keywords && fieldErrors.keywords && (
                  <span className={styles.errorText}>{fieldErrors.keywords}</span>
                )}
              </div>
              {keywordChips.length > 0 && (
                <div className={styles.keywordChipsBelow}>
                  {keywordChips.map((kw, idx) => (
                    <span key={idx} className={styles.keywordChip}>
                      {kw}
                      <button 
                        type="button" 
                        onClick={() => removeKeywordChip(idx)}
                        className={styles.chipRemove}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.fieldRow}>
              <div className={`${styles.field} ${touched.research_area && fieldErrors.research_area ? styles.fieldError : ''}`}>
                <label htmlFor="research_area">Research Area *</label>
                <select
                  id="research_area"
                  value={formData.research_area}
                  onChange={(e) => {
                    handleInputChange('research_area', e.target.value);
                    // Clear recommendations when area changes
                    setRecommendedJournals([]);
                  }}
                  onBlur={() => handleBlur('research_area')}
                  className={`${styles.select} ${touched.research_area && fieldErrors.research_area ? styles.inputError : ''}`}
                >
                  {RESEARCH_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                {touched.research_area && fieldErrors.research_area && (
                  <span className={styles.errorText}>{fieldErrors.research_area}</span>
                )}
              </div>

              <div className={`${styles.field} ${touched.journal_id && fieldErrors.journal_id ? styles.fieldError : ''}`}>
                <label htmlFor="journal">
                  Select Journal *
                  {recommendedJournals.length > 0 && (
                    <span className={styles.recommendedBadge}>
                      {recommendedJournals.length} Recommended
                    </span>
                  )}
                </label>
                <div className={styles.journalSelectRow}>
                  <div className={styles.journalDropdownWrapper}>
                  <button
                    type="button"
                    className={`${styles.journalDropdownTrigger} ${touched.journal_id && fieldErrors.journal_id ? styles.inputError : ''} ${journalDropdownOpen ? styles.dropdownOpen : ''}`}
                    onClick={() => setJournalDropdownOpen(!journalDropdownOpen)}
                    onBlur={(e) => {
                      // Capture currentTarget before async operation
                      const currentTarget = e.currentTarget;
                      // Delay closing to allow click on options
                      setTimeout(() => {
                        if (currentTarget && !currentTarget.contains(document.activeElement)) {
                          setJournalDropdownOpen(false);
                        }
                      }, 200);
                      handleBlur('journal_id');
                    }}
                  >
                    <span className={formData.journal_id ? styles.selectedValue : styles.placeholder}>
                      {formData.journal_id 
                        ? journals.find(j => String(j.id) === String(formData.journal_id))?.name || 'Select Journal'
                        : '-- Select Journal --'}
                    </span>
                    <span className={`material-symbols-rounded ${styles.dropdownArrow}`}>
                      {journalDropdownOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                  
                  {journalDropdownOpen && (
                    <div className={styles.journalDropdownMenu}>
                      <div 
                        className={styles.journalDropdownOption}
                        onClick={() => {
                          handleInputChange('journal_id', '');
                          setJournalDropdownOpen(false);
                        }}
                      >
                        <span className={styles.journalOptionName}>-- Select Journal --</span>
                      </div>
                      {getSortedJournals().map(j => {
                        const recommendation = getRecommendationInfo(j.id);
                        const isRecommended = !!recommendation;
                        
                        return (
                          <div
                            key={j.id}
                            className={`${styles.journalDropdownOption} ${isRecommended ? styles.recommendedOption : ''} ${String(formData.journal_id) === String(j.id) ? styles.selectedOption : ''}`}
                            onClick={() => {
                              handleInputChange('journal_id', j.id);
                              setJournalDropdownOpen(false);
                            }}
                          >
                            <div className={styles.journalOptionContent}>
                              <div className={styles.journalOptionHeader}>
                                <span className={styles.journalOptionName}>{j.name}</span>
                                {isRecommended && (
                                  <span className={styles.recommendedChip}>
                                    <span className="material-symbols-rounded">star</span>
                                    Recommended
                                  </span>
                                )}
                              </div>
                              {isRecommended && recommendation.match_reason && (
                                <span className={styles.matchReason}>{recommendation.match_reason}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  </div>
                  <button
                    type="button"
                    onClick={fetchJournalRecommendations}
                    disabled={!formData.research_area || keywordChips.length < 5 || loadingRecommendations}
                    className={`${styles.suggestBtn} ${formData.research_area && keywordChips.length >= 5 ? styles.suggestBtnActive : ''}`}
                    title={!formData.research_area ? 'Select a research area first' : keywordChips.length < 5 ? `Add ${5 - keywordChips.length} more keyword${5 - keywordChips.length > 1 ? 's' : ''} to enable` : 'Get journal suggestions'}
                  >
                    {loadingRecommendations ? (
                      <>
                        <span className={`material-symbols-rounded ${styles.spinIcon}`}>sync</span>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-rounded">auto_awesome</span>
                        Suggest
                      </>
                    )}
                  </button>
                </div>
                {touched.journal_id && fieldErrors.journal_id && (
                  <span className={styles.errorText}>{fieldErrors.journal_id}</span>
                )}
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="paper_type">Paper Type *</label>
                <select
                  id="paper_type"
                  value={formData.paper_type}
                  onChange={(e) => handleInputChange('paper_type', e.target.value)}
                  className={styles.select}
                >
                  <option value="Full Length Article">Full Length Article</option>
                  <option value="Review Paper">Review Paper</option>
                  <option value="Short Communication">Short Communication</option>
                  <option value="Case Study">Case Study</option>
                  <option value="Technical Note">Technical Note</option>
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="message_to_editor">Message to the Editor (Optional)</label>
              <textarea
                id="message_to_editor"
                placeholder="Any special notes or requests for the editor..."
                value={formData.message_to_editor}
                onChange={(e) => handleInputChange('message_to_editor', e.target.value)}
                maxLength={1000}
                rows={3}
                className={styles.textarea}
              />
              <small className={styles.helperText}>Any special notes or requests you'd like to communicate to the editor</small>
            </div>
          </div>
        )}

        {/* Step 2: Author Details */}
        {currentStep === 2 && (
          <div>
            <h2>Step 2: Author Details</h2>
            <p className={styles.stepSubtitle}>All fields marked with * are required</p>
            
            {/* Primary Author */}
            <div className={styles.authorSection}>
              <h3 className={styles.authorSectionTitle}>
                <span className="material-symbols-rounded">person</span>
                Primary Author (You)
              </h3>
              
              <div className={styles.fieldRow}>
                <div className={`${styles.fieldSmall} ${touched.author_salutation && fieldErrors.author_salutation ? styles.fieldError : ''}`}>
                  <label htmlFor="author_salutation">Salutation *</label>
                  <select
                    id="author_salutation"
                    value={formData.authorDetails.salutation}
                    onChange={(e) => handleAuthorChange('salutation', e.target.value)}
                    onBlur={() => handleAuthorBlur('salutation')}
                    className={`${styles.select} ${touched.author_salutation && fieldErrors.author_salutation ? styles.inputError : ''}`}
                  >
                    {SALUTATION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {touched.author_salutation && fieldErrors.author_salutation && (
                    <span className={styles.errorText}>{fieldErrors.author_salutation}</span>
                  )}
                </div>
                <div className={`${styles.field} ${touched.author_first_name && fieldErrors.author_first_name ? styles.fieldError : ''}`}>
                  <label htmlFor="author_fname">First Name *</label>
                  <input
                    id="author_fname"
                    type="text"
                    placeholder="First name"
                    value={formData.authorDetails.first_name}
                    onChange={(e) => handleAuthorChange('first_name', e.target.value)}
                    onBlur={() => handleAuthorBlur('first_name')}
                    className={`${styles.input} ${touched.author_first_name && fieldErrors.author_first_name ? styles.inputError : ''}`}
                  />
                  {touched.author_first_name && fieldErrors.author_first_name && (
                    <span className={styles.errorText}>{fieldErrors.author_first_name}</span>
                  )}
                </div>
                <div className={styles.field}>
                  <label htmlFor="author_mname">Middle Name</label>
                  <input
                    id="author_mname"
                    type="text"
                    placeholder="Middle name (optional)"
                    value={formData.authorDetails.middle_name}
                    onChange={(e) => handleAuthorChange('middle_name', e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={`${styles.field} ${touched.author_last_name && fieldErrors.author_last_name ? styles.fieldError : ''}`}>
                  <label htmlFor="author_lname">Last Name *</label>
                  <input
                    id="author_lname"
                    type="text"
                    placeholder="Last name"
                    value={formData.authorDetails.last_name}
                    onChange={(e) => handleAuthorChange('last_name', e.target.value)}
                    onBlur={() => handleAuthorBlur('last_name')}
                    className={`${styles.input} ${touched.author_last_name && fieldErrors.author_last_name ? styles.inputError : ''}`}
                  />
                  {touched.author_last_name && fieldErrors.author_last_name && (
                    <span className={styles.errorText}>{fieldErrors.author_last_name}</span>
                  )}
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={`${styles.field} ${touched.author_designation && fieldErrors.author_designation ? styles.fieldError : ''}`}>
                  <label htmlFor="author_designation">Designation/Occupation *</label>
                  <input
                    id="author_designation"
                    type="text"
                    placeholder="e.g., Associate Professor"
                    value={formData.authorDetails.designation}
                    onChange={(e) => handleAuthorChange('designation', e.target.value)}
                    onBlur={() => handleAuthorBlur('designation')}
                    className={`${styles.input} ${touched.author_designation && fieldErrors.author_designation ? styles.inputError : ''}`}
                  />
                  {touched.author_designation && fieldErrors.author_designation && (
                    <span className={styles.errorText}>{fieldErrors.author_designation}</span>
                  )}
                </div>
                <div className={`${styles.field} ${touched.author_department && fieldErrors.author_department ? styles.fieldError : ''}`}>
                  <label htmlFor="author_department">Department *</label>
                  <input
                    id="author_department"
                    type="text"
                    placeholder="e.g., Computer Science"
                    value={formData.authorDetails.department}
                    onChange={(e) => handleAuthorChange('department', e.target.value)}
                    onBlur={() => handleAuthorBlur('department')}
                    className={`${styles.input} ${touched.author_department && fieldErrors.author_department ? styles.inputError : ''}`}
                  />
                  {touched.author_department && fieldErrors.author_department && (
                    <span className={styles.errorText}>{fieldErrors.author_department}</span>
                  )}
                </div>
                <div className={`${styles.field} ${touched.author_organisation && fieldErrors.author_organisation ? styles.fieldError : ''}`}>
                  <label htmlFor="author_organisation">Organisation *</label>
                  <OrganizationAutocomplete
                    id="author_organisation"
                    name="author_organisation"
                    placeholder="Search for your organization..."
                    value={formData.authorDetails.organisation}
                    onChange={(value) => handleAuthorChange('organisation', value)}
                    onSelect={() => handleAuthorBlur('organisation')}
                    required
                    className={touched.author_organisation && fieldErrors.author_organisation ? styles.inputError : ''}
                  />
                  {touched.author_organisation && fieldErrors.author_organisation && (
                    <span className={styles.errorText}>{fieldErrors.author_organisation}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Co-Authors */}
            <div className={styles.coAuthorsSection}>
              <div className={styles.coAuthorsHeader}>
                <h3 className={styles.authorSectionTitle}>
                  <span className="material-symbols-rounded">group</span>
                  Co-Authors
                  <span className={styles.coAuthorCount}>({formData.coAuthors.length}/{MAX_CO_AUTHORS})</span>
                </h3>
                <button 
                  type="button" 
                  onClick={addCoAuthor} 
                  className={styles.addCoAuthorBtn}
                  disabled={formData.coAuthors.length >= MAX_CO_AUTHORS}
                >
                  <span className="material-symbols-rounded">add</span>
                  Add Co-Author
                </button>
              </div>

              {formData.coAuthors.length === 0 ? (
                <p className={styles.noCoAuthors}>No co-authors added. Click &quot;Add Co-Author&quot; to add one. (Max {MAX_CO_AUTHORS})</p>
              ) : (
                formData.coAuthors.map((coAuthor, index) => (
                  <div key={index} className={styles.coAuthorCard}>
                    <div className={styles.coAuthorHeader}>
                      <span className={styles.coAuthorNumber}>Co-Author {index + 1}</span>
                      <div className={styles.coAuthorActions}>
                        <button 
                          type="button" 
                          onClick={() => moveCoAuthor(index, 'up')}
                          className={styles.moveCoAuthorBtn}
                          disabled={index === 0}
                          title="Move up"
                        >
                          <span className="material-symbols-rounded">arrow_upward</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => moveCoAuthor(index, 'down')}
                          className={styles.moveCoAuthorBtn}
                          disabled={index === formData.coAuthors.length - 1}
                          title="Move down"
                        >
                          <span className="material-symbols-rounded">arrow_downward</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => removeCoAuthor(index)}
                          className={styles.removeCoAuthorBtn}
                        >
                          <span className="material-symbols-rounded">close</span>
                        </button>
                      </div>
                    </div>

                    <div className={styles.fieldRow}>
                      <div className={`${styles.fieldSmall} ${touched[`coauthor_${index}_salutation`] && fieldErrors[`coauthor_${index}_salutation`] ? styles.fieldError : ''}`}>
                        <label>Salutation *</label>
                        <select
                          value={coAuthor.salutation}
                          onChange={(e) => updateCoAuthor(index, 'salutation', e.target.value)}
                          onBlur={() => handleCoAuthorBlur(index, 'salutation')}
                          className={`${styles.select} ${touched[`coauthor_${index}_salutation`] && fieldErrors[`coauthor_${index}_salutation`] ? styles.inputError : ''}`}
                        >
                          {SALUTATION_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        {touched[`coauthor_${index}_salutation`] && fieldErrors[`coauthor_${index}_salutation`] && (
                          <span className={styles.errorText}>{fieldErrors[`coauthor_${index}_salutation`]}</span>
                        )}
                      </div>
                      <div className={`${styles.field} ${touched[`coauthor_${index}_first_name`] && fieldErrors[`coauthor_${index}_first_name`] ? styles.fieldError : ''}`}>
                        <label>First Name *</label>
                        <input
                          type="text"
                          placeholder="First name"
                          value={coAuthor.first_name}
                          onChange={(e) => updateCoAuthor(index, 'first_name', e.target.value)}
                          onBlur={() => handleCoAuthorBlur(index, 'first_name')}
                          className={`${styles.input} ${touched[`coauthor_${index}_first_name`] && fieldErrors[`coauthor_${index}_first_name`] ? styles.inputError : ''}`}
                        />
                        {touched[`coauthor_${index}_first_name`] && fieldErrors[`coauthor_${index}_first_name`] && (
                          <span className={styles.errorText}>{fieldErrors[`coauthor_${index}_first_name`]}</span>
                        )}
                      </div>
                      <div className={styles.field}>
                        <label>Middle Name</label>
                        <input
                          type="text"
                          placeholder="Middle name"
                          value={coAuthor.middle_name}
                          onChange={(e) => updateCoAuthor(index, 'middle_name', e.target.value)}
                          className={styles.input}
                        />
                      </div>
                      <div className={`${styles.field} ${touched[`coauthor_${index}_last_name`] && fieldErrors[`coauthor_${index}_last_name`] ? styles.fieldError : ''}`}>
                        <label>Last Name *</label>
                        <input
                          type="text"
                          placeholder="Last name"
                          value={coAuthor.last_name}
                          onChange={(e) => updateCoAuthor(index, 'last_name', e.target.value)}
                          onBlur={() => handleCoAuthorBlur(index, 'last_name')}
                          className={`${styles.input} ${touched[`coauthor_${index}_last_name`] && fieldErrors[`coauthor_${index}_last_name`] ? styles.inputError : ''}`}
                        />
                        {touched[`coauthor_${index}_last_name`] && fieldErrors[`coauthor_${index}_last_name`] && (
                          <span className={styles.errorText}>{fieldErrors[`coauthor_${index}_last_name`]}</span>
                        )}
                      </div>
                    </div>

                    <div className={styles.fieldRow}>
                      <div className={`${styles.field} ${touched[`coauthor_${index}_email`] && fieldErrors[`coauthor_${index}_email`] ? styles.fieldError : ''}`}>
                        <label>Email *</label>
                        <input
                          type="email"
                          placeholder="Email address"
                          value={coAuthor.email}
                          onChange={(e) => updateCoAuthor(index, 'email', e.target.value)}
                          onBlur={() => handleCoAuthorBlur(index, 'email')}
                          className={`${styles.input} ${touched[`coauthor_${index}_email`] && fieldErrors[`coauthor_${index}_email`] ? styles.inputError : ''}`}
                        />
                        {touched[`coauthor_${index}_email`] && fieldErrors[`coauthor_${index}_email`] && (
                          <span className={styles.errorText}>{fieldErrors[`coauthor_${index}_email`]}</span>
                        )}
                      </div>
                      <div className={`${styles.field} ${touched[`coauthor_${index}_designation`] && fieldErrors[`coauthor_${index}_designation`] ? styles.fieldError : ''}`}>
                        <label>Designation *</label>
                        <input
                          type="text"
                          placeholder="Designation"
                          value={coAuthor.designation}
                          onChange={(e) => updateCoAuthor(index, 'designation', e.target.value)}
                          onBlur={() => handleCoAuthorBlur(index, 'designation')}
                          className={`${styles.input} ${touched[`coauthor_${index}_designation`] && fieldErrors[`coauthor_${index}_designation`] ? styles.inputError : ''}`}
                        />
                        {touched[`coauthor_${index}_designation`] && fieldErrors[`coauthor_${index}_designation`] && (
                          <span className={styles.errorText}>{fieldErrors[`coauthor_${index}_designation`]}</span>
                        )}
                      </div>
                    </div>

                    <div className={styles.fieldRow}>
                      <div className={`${styles.field} ${touched[`coauthor_${index}_department`] && fieldErrors[`coauthor_${index}_department`] ? styles.fieldError : ''}`}>
                        <label>Department *</label>
                        <input
                          type="text"
                          placeholder="Department"
                          value={coAuthor.department}
                          onChange={(e) => updateCoAuthor(index, 'department', e.target.value)}
                          onBlur={() => handleCoAuthorBlur(index, 'department')}
                          className={`${styles.input} ${touched[`coauthor_${index}_department`] && fieldErrors[`coauthor_${index}_department`] ? styles.inputError : ''}`}
                        />
                        {touched[`coauthor_${index}_department`] && fieldErrors[`coauthor_${index}_department`] && (
                          <span className={styles.errorText}>{fieldErrors[`coauthor_${index}_department`]}</span>
                        )}
                      </div>
                      <div className={`${styles.field} ${touched[`coauthor_${index}_organisation`] && fieldErrors[`coauthor_${index}_organisation`] ? styles.fieldError : ''}`}>
                        <label>Organisation *</label>
                        <OrganizationAutocomplete
                          name={`coauthor_${index}_organisation`}
                          placeholder="Search for organization..."
                          value={coAuthor.organisation}
                          onChange={(value) => updateCoAuthor(index, 'organisation', value)}
                          onSelect={() => handleCoAuthorBlur(index, 'organisation')}
                          required
                          className={touched[`coauthor_${index}_organisation`] && fieldErrors[`coauthor_${index}_organisation`] ? styles.inputError : ''}
                        />
                        {touched[`coauthor_${index}_organisation`] && fieldErrors[`coauthor_${index}_organisation`] && (
                          <span className={styles.errorText}>{fieldErrors[`coauthor_${index}_organisation`]}</span>
                        )}
                      </div>
                    </div>

                    <div className={styles.checkboxField}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={coAuthor.is_corresponding}
                          onChange={(e) => updateCoAuthor(index, 'is_corresponding', e.target.checked)}
                        />
                        <span>Corresponding Author</span>
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 3: File Upload */}
        {currentStep === 3 && (
          <div>
            <h2>Step 3: Upload Paper Files</h2>
            
            {/* Author Guidelines Box */}
            <div className={styles.guidelinesBox}>
              <div className={styles.guidelinesHeader}>
                <span className="material-symbols-rounded">info</span>
                <h3>Submission Guidelines</h3>
              </div>
              <ul className={styles.guidelinesList}>
                <li><strong>Title Page:</strong> Must include paper title, all author names, affiliations, corresponding author email, and any acknowledgments.</li>
                <li><strong>Blinded Manuscript:</strong> Must NOT contain any identifying information - remove author names, affiliations, and self-citations that reveal identity.</li>
                <li><strong>File Format:</strong> PDF is preferred. Microsoft Word (.doc, .docx) is also accepted.</li>
                <li><strong>File Size:</strong> Maximum 50MB per file.</li>
                <li><strong>Page Limit:</strong> Research articles should not exceed 25 pages including references and figures.</li>
                <li><strong>References:</strong> Use consistent citation style (APA, IEEE, or journal-specific format).</li>
                <li><strong>Figures & Tables:</strong> Include high-resolution images (minimum 300 DPI) embedded in the manuscript.</li>
              </ul>
            </div>
            
            {/* Title Page Upload */}
            <div className={styles.field}>
              <label>Title Page (PDF or Word) *</label>
              <p className={styles.fieldHint}>
                This file should include the paper title, author names, affiliations, and contact information.
              </p>
              <div 
                className={`${styles.uploadArea} ${formData.titlePagePreview ? styles.uploadAreaSuccess : ''}`}
                onClick={() => document.getElementById('titlePageFile').click()}
              >
                <input
                  id="titlePageFile"
                  type="file"
                  onChange={(e) => handleFileChange('titlePage', e)}
                  accept=".pdf,.doc,.docx"
                  className={styles.hiddenInput}
                />
                {formData.titlePagePreview ? (
                  <div className={styles.uploadSuccess}>
                    <span className={`material-symbols-rounded ${styles.successIcon}`}>check_circle</span>
                    <p className={styles.uploadedFileName}>{formData.titlePagePreview}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData(prev => ({ ...prev, titlePageFile: null, titlePagePreview: null }));
                      }}
                      className={styles.removeFileBtn}
                    >
                      <span className="material-symbols-rounded">delete</span>
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <span className={`material-symbols-rounded ${styles.uploadIconMaterial}`}>upload_file</span>
                    <p className={styles.uploadText}>Drag and drop your title page here</p>
                    <p className={styles.uploadOr}>or</p>
                    <span className={styles.browseBtn}>
                      <span className="material-symbols-rounded">folder_open</span>
                      Browse Files
                    </span>
                    <p className={styles.uploadHint}>
                      PDF, DOC, DOCX • Max 50MB
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Blinded Manuscript Upload */}
            <div className={styles.field}>
              <label>Blinded Manuscript (PDF or Word) *</label>
              <p className={styles.fieldHint}>
                This file should NOT contain any identifying information (no author names, affiliations, or acknowledgments). 
                This version will be sent to reviewers for blind peer review.
              </p>
              <div 
                className={`${styles.uploadArea} ${formData.blindedManuscriptPreview ? styles.uploadAreaSuccess : ''}`}
                onClick={() => document.getElementById('blindedManuscriptFile').click()}
              >
                <input
                  id="blindedManuscriptFile"
                  type="file"
                  onChange={(e) => handleFileChange('blindedManuscript', e)}
                  accept=".pdf,.doc,.docx"
                  className={styles.hiddenInput}
                />
                {formData.blindedManuscriptPreview ? (
                  <div className={styles.uploadSuccess}>
                    <span className={`material-symbols-rounded ${styles.successIcon}`}>check_circle</span>
                    <p className={styles.uploadedFileName}>{formData.blindedManuscriptPreview}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData(prev => ({ ...prev, blindedManuscriptFile: null, blindedManuscriptPreview: null }));
                      }}
                      className={styles.removeFileBtn}
                    >
                      <span className="material-symbols-rounded">delete</span>
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <span className={`material-symbols-rounded ${styles.uploadIconMaterial}`}>description</span>
                    <p className={styles.uploadText}>Drag and drop your blinded manuscript here</p>
                    <p className={styles.uploadOr}>or</p>
                    <span className={styles.browseBtn}>
                      <span className="material-symbols-rounded">folder_open</span>
                      Browse Files
                    </span>
                    <p className={styles.uploadHint}>
                      PDF, DOC, DOCX • Max 50MB
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {currentStep === 4 && (
          <div>
            <h2>Step 4: Review & Submit</h2>
            <div className={styles.reviewBox}>
              {/* Paper Metadata */}
              <div className={styles.reviewSection}>
                <h3>Paper Information</h3>
                <div className={styles.reviewGrid}>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Title:</span>
                    <span className={styles.reviewValue}>{formData.title || 'Not provided'}</span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Journal:</span>
                    <span className={styles.reviewValue}>
                      {journals.find(j => String(j.id) === String(formData.journal_id))?.name || 'Not selected'}
                    </span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Research Area:</span>
                    <span className={styles.reviewValue}>{formData.research_area || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              <div className={styles.reviewSection}>
                <h3>Abstract</h3>
                <p className={styles.abstractPreview}>{formData.abstract || 'Not provided'}</p>
              </div>

              <div className={styles.reviewSection}>
                <h3>Keywords</h3>
                <div className={styles.keywordChipsReview}>
                  {keywordChips.map((kw, idx) => (
                    <span key={idx} className={styles.keywordChipReview}>{kw}</span>
                  ))}
                </div>
              </div>

              {/* Author Details */}
              <div className={styles.reviewSection}>
                <h3>Primary Author</h3>
                <div className={styles.reviewGrid}>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Name:</span>
                    <span className={styles.reviewValue}>{formatAuthorName(formData.authorDetails)}</span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Designation:</span>
                    <span className={styles.reviewValue}>{formData.authorDetails.designation || 'Not specified'}</span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Department:</span>
                    <span className={styles.reviewValue}>{formData.authorDetails.department || 'Not specified'}</span>
                  </div>
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Organisation:</span>
                    <span className={styles.reviewValue}>{formData.authorDetails.organisation || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {/* Co-Authors */}
              {formData.coAuthors.length > 0 && (
                <div className={styles.reviewSection}>
                  <h3>Co-Authors ({formData.coAuthors.length})</h3>
                  {formData.coAuthors.map((co, idx) => (
                    <div key={idx} className={styles.coAuthorReview}>
                      <strong>{idx + 1}. {formatAuthorName(co)}</strong>
                      {co.is_corresponding && <span className={styles.correspondingBadge}>Corresponding</span>}
                      <div className={styles.coAuthorDetails}>
                        {co.designation && <span>{co.designation}</span>}
                        {co.department && <span>{co.department}</span>}
                        {co.organisation && <span>{co.organisation}</span>}
                        {co.email && <span>{co.email}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Files */}
              <div className={styles.reviewSection}>
                <h3>Paper Files</h3>
                <div className={styles.fileCardsGrid}>
                  <div className={styles.fileCard}>
                    <div className={styles.fileCardIcon}>
                      <span className="material-symbols-rounded">description</span>
                    </div>
                    <div className={styles.fileCardInfo}>
                      <p className={styles.fileCardLabel}>Title Page</p>
                      <p className={styles.fileCardName}>{formData.titlePagePreview || 'Not uploaded'}</p>
                    </div>
                    {formData.titlePageFile && formData.titlePageFile.type === 'application/pdf' && (
                      <button
                        type="button"
                        className={styles.fileCardPreviewBtn}
                        onClick={() => {
                          setPdfPreviewFile(formData.titlePageFile);
                          setPdfPreviewLabel('Title Page');
                        }}
                      >
                        <span className="material-symbols-rounded">visibility</span>
                        Preview
                      </button>
                    )}
                  </div>
                  <div className={styles.fileCard}>
                    <div className={styles.fileCardIcon}>
                      <span className="material-symbols-rounded">article</span>
                    </div>
                    <div className={styles.fileCardInfo}>
                      <p className={styles.fileCardLabel}>Blinded Manuscript</p>
                      <p className={styles.fileCardName}>{formData.blindedManuscriptPreview || 'Not uploaded'}</p>
                    </div>
                    {formData.blindedManuscriptFile && formData.blindedManuscriptFile.type === 'application/pdf' && (
                      <button
                        type="button"
                        className={styles.fileCardPreviewBtn}
                        onClick={() => {
                          setPdfPreviewFile(formData.blindedManuscriptFile);
                          setPdfPreviewLabel('Blinded Manuscript');
                        }}
                      >
                        <span className="material-symbols-rounded">visibility</span>
                        Preview
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Message to Editor */}
              {formData.message_to_editor && (
                <div className={styles.reviewSection}>
                  <h3>Message to Editor</h3>
                  <p>{formData.message_to_editor}</p>
                </div>
              )}

              {/* Terms & Conditions */}
              <div className={styles.termsSection}>
                <label className={styles.termsLabel}>
                  <input
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={(e) => {
                      if (!hasReadTerms && e.target.checked) {
                        showWarning('Please open and read the terms and conditions');
                        return;
                      }
                      handleInputChange('termsAccepted', e.target.checked);
                    }}
                  />
                  <span>
                    I agree to the{' '}
                    <button 
                      type="button" 
                      className={styles.termsLink}
                      onClick={(e) => {
                        e.preventDefault();
                        setShowTermsModal(true);
                      }}
                    >
                      Terms and Conditions
                    </button>
                  </span>
                </label>
                <div className={styles.termsNote}>
                  <strong>By submitting, you confirm:</strong>
                  <ul>
                    <li>The paper is original and has not been published elsewhere</li>
                    <li>All authors have agreed to the submission</li>
                    <li>The paper complies with the journal's guidelines</li>
                    <li>You have read and agree to the terms and conditions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          onClick={handlePrevStep}
          disabled={currentStep === 1 || loading}
          className={`${styles.btn} ${styles.btnSecondary}`}
        >
          ← Previous
        </button>
        {currentStep < 4 ? (
          <button
            onClick={handleNextStep}
            disabled={loading}
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.termsAccepted || !hasReadTerms}
            className={`${styles.btn} ${styles.btnSuccess}`}
          >
            {loading ? 'Submitting...' : 'Submit Paper'}
          </button>
        )}
      </div>

      {loading && <div className={styles.loadingOverlay}>Processing your submission...</div>}

      {/* PDF Preview Modal */}
      {pdfPreviewFile && (
        <div className={styles.modalOverlay} onClick={() => { setPdfPreviewFile(null); setPdfPreviewLabel(''); }}>
          <div className={styles.pdfViewerModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.pdfViewerHeader}>
              <div className={styles.pdfViewerTitle}>
                <span className="material-symbols-rounded">picture_as_pdf</span>
                <h3>{pdfPreviewLabel}</h3>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => { setPdfPreviewFile(null); setPdfPreviewLabel(''); }}
                aria-label="Close preview"
              >
                ×
              </button>
            </div>
            <div className={styles.pdfViewerBody}>
              <iframe
                src={pdfObjectUrl}
                title={pdfPreviewLabel}
                className={styles.pdfIframe}
              />
            </div>
          </div>
        </div>
      )}

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowTermsModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Terms and Conditions</h2>
              <button 
                className={styles.modalClose} 
                onClick={() => setShowTermsModal(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <h3>1. Submission Guidelines</h3>
              <p>
                By submitting a manuscript to this journal, you agree to the following terms and conditions. 
                Please read them carefully before proceeding with your submission.
              </p>

              <h3>2. Originality and Plagiarism</h3>
              <p>
                Authors must ensure that their work is entirely original. Any work or words of others must be 
                appropriately cited. Plagiarism in any form, including self-plagiarism, is unacceptable and 
                will result in immediate rejection of the manuscript.
              </p>

              <h3>3. Multiple, Redundant, or Concurrent Publication</h3>
              <p>
                Authors should not submit the same manuscript to more than one journal concurrently. 
                Submitting the same manuscript to multiple journals simultaneously constitutes unethical 
                publishing behavior and is unacceptable.
              </p>

              <h3>4. Authorship</h3>
              <p>
                Authorship should be limited to those who have made a significant contribution to the 
                conception, design, execution, or interpretation of the reported study. All those who 
                have made significant contributions should be listed as co-authors.
              </p>

              <h3>5. Disclosure and Conflicts of Interest</h3>
              <p>
                All authors should disclose in their manuscript any financial or other substantive 
                conflict of interest that might be construed to influence the results or interpretation 
                of their manuscript.
              </p>

              <h3>6. Peer Review Process</h3>
              <p>
                All submitted manuscripts undergo a rigorous peer review process. Authors agree to 
                participate in this process and respond to reviewers' comments in a timely manner.
              </p>

              <h3>7. Copyright</h3>
              <p>
                Upon acceptance, authors transfer copyright of their article to the journal. Authors 
                retain the right to use their own material in future works, provided proper acknowledgment 
                is given to the original publication.
              </p>

              <h3>8. Publication Ethics</h3>
              <p>
                Authors must follow the highest standards of publication ethics. Any attempt to manipulate 
                the review process, citation data, or engage in any other form of misconduct will be 
                investigated and appropriate action will be taken.
              </p>

              <h3>9. Data Access and Retention</h3>
              <p>
                Authors may be asked to provide the raw data in connection with a paper for editorial 
                review, and should be prepared to provide public access to such data if practicable.
              </p>

              <h3>10. Corrections and Retractions</h3>
              <p>
                If significant errors are discovered after publication, authors are obligated to notify 
                the journal promptly. The journal reserves the right to issue corrections or retractions 
                as appropriate.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => {
                  setHasReadTerms(true);
                  setShowTermsModal(false);
                }}
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
