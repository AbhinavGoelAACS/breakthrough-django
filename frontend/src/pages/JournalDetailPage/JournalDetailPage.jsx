import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useJournals } from '../../hooks/useJournals';
import { useToast } from '../../hooks/useToast';
import { useModal } from '../../hooks/useModal';
import { useRole } from '../../hooks/useRole';
import { acsApi } from '../../api/apiService';
import Breadcrumbs from '../../components/breadcrumbs/Breadcrumbs';
import './JournalDetailPage.css';

// Searchable Dropdown Component for Editor Selection
const SearchableEditorDropdown = ({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder = "Search and select...",
  loading = false,
  icon = "person"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => {
    const searchLower = searchTerm.toLowerCase();
    const name = `${opt.fname || ''} ${opt.lname || ''}`.trim().toLowerCase();
    const email = (opt.email || '').toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower);
  });

  const selectedOption = options.find(opt => opt.id === value);
  const displayValue = selectedOption 
    ? `${selectedOption.fname || ''} ${selectedOption.lname || ''}`.trim() || selectedOption.email
    : '';

  const handleSelect = (option) => {
    onChange(option.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="form-group" ref={dropdownRef}>
      <label>
        <span className="label-icon material-symbols-rounded">{icon}</span>
        {label}
      </label>
      <div className={`searchable-dropdown ${isOpen ? 'open' : ''}`}>
        <div 
          className="dropdown-trigger"
          onClick={() => setIsOpen(!isOpen)}
        >
          {loading ? (
            <span className="dropdown-loading">Loading editors...</span>
          ) : displayValue ? (
            <div className="dropdown-selected">
              <span>{displayValue}</span>
              <button 
                type="button" 
                className="clear-btn"
                onClick={handleClear}
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
          ) : (
            <span className="dropdown-placeholder">{placeholder}</span>
          )}
          <span className="material-symbols-rounded dropdown-arrow">
            {isOpen ? 'expand_less' : 'expand_more'}
          </span>
        </div>
        
        {isOpen && (
          <div className="dropdown-menu">
            <div className="dropdown-search">
              <span className="material-symbols-rounded">search</span>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            <div className="dropdown-options">
              {filteredOptions.length === 0 ? (
                <div className="dropdown-empty">
                  {searchTerm ? 'No matching editors found' : 'No editors available'}
                </div>
              ) : (
                filteredOptions.map(opt => (
                  <div
                    key={opt.id}
                    className={`dropdown-option ${opt.id === value ? 'selected' : ''}`}
                    onClick={() => handleSelect(opt)}
                  >
                    <div className="option-avatar">
                      {(opt.fname?.[0] || opt.email?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="option-info">
                      <span className="option-name">
                        {`${opt.fname || ''} ${opt.lname || ''}`.trim() || 'No Name'}
                      </span>
                      <span className="option-email">{opt.email}</span>
                    </div>
                    {opt.id === value && (
                      <span className="material-symbols-rounded option-check">check</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Multi-select Searchable Dropdown for Section Editors
const MultiSelectEditorDropdown = ({ 
  label, 
  values = [], 
  onChange, 
  options, 
  placeholder = "Search and select editors...",
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => {
    const searchLower = searchTerm.toLowerCase();
    const name = `${opt.fname || ''} ${opt.lname || ''}`.trim().toLowerCase();
    const email = (opt.email || '').toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower);
  });

  const selectedOptions = options.filter(opt => values.includes(opt.id));

  const handleToggle = (option) => {
    if (values.includes(option.id)) {
      onChange(values.filter(id => id !== option.id));
    } else {
      onChange([...values, option.id]);
    }
  };

  const handleRemove = (e, optionId) => {
    e.stopPropagation();
    onChange(values.filter(id => id !== optionId));
  };

  return (
    <div className="form-group full-width" ref={dropdownRef}>
      <label>
        <span className="label-icon material-symbols-rounded">groups</span>
        {label}
      </label>
      <div className={`searchable-dropdown multi ${isOpen ? 'open' : ''}`}>
        <div 
          className="dropdown-trigger multi"
          onClick={() => setIsOpen(!isOpen)}
        >
          {loading ? (
            <span className="dropdown-loading">Loading editors...</span>
          ) : selectedOptions.length > 0 ? (
            <div className="dropdown-selected-tags">
              {selectedOptions.map(opt => (
                <span key={opt.id} className="selected-tag">
                  {`${opt.fname || ''} ${opt.lname || ''}`.trim() || opt.email}
                  <button 
                    type="button" 
                    className="tag-remove"
                    onClick={(e) => handleRemove(e, opt.id)}
                  >
                    <span className="material-symbols-rounded">close</span>
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <span className="dropdown-placeholder">{placeholder}</span>
          )}
          <span className="material-symbols-rounded dropdown-arrow">
            {isOpen ? 'expand_less' : 'expand_more'}
          </span>
        </div>
        
        {isOpen && (
          <div className="dropdown-menu">
            <div className="dropdown-search">
              <span className="material-symbols-rounded">search</span>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            <div className="dropdown-options">
              {filteredOptions.length === 0 ? (
                <div className="dropdown-empty">
                  {searchTerm ? 'No matching editors found' : 'No editors available'}
                </div>
              ) : (
                filteredOptions.map(opt => (
                  <div
                    key={opt.id}
                    className={`dropdown-option ${values.includes(opt.id) ? 'selected' : ''}`}
                    onClick={() => handleToggle(opt)}
                  >
                    <div className="option-checkbox">
                      <span className="material-symbols-rounded">
                        {values.includes(opt.id) ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                    </div>
                    <div className="option-info">
                      <span className="option-name">
                        {`${opt.fname || ''} ${opt.lname || ''}`.trim() || 'No Name'}
                      </span>
                      <span className="option-email">{opt.email}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const JournalDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, isEditor } = useRole();
  const { selectedJournal, loading, error, getJournalById, editJournal, editJournalWithFiles, removeJournal } = useJournals();
  const { success, error: showError, warning, info } = useToast();
  const { confirm } = useModal();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Journal details state
  const [journalDetails, setJournalDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // File upload state
  const [journalImageFile, setJournalImageFile] = useState(null);
  const [journalLogoFile, setJournalLogoFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  
  // Available editors state
  const [availableEditors, setAvailableEditors] = useState([]);
  const [loadingEditors, setLoadingEditors] = useState(false);
  const [selectedChiefEditor, setSelectedChiefEditor] = useState(null);
  const [selectedCoEditor, setSelectedCoEditor] = useState(null);
  const [selectedSectionEditors, setSelectedSectionEditors] = useState([]);
  
  // Volume and Issue state
  const [volumes, setVolumes] = useState([]);
  const [loadingVolumes, setLoadingVolumes] = useState(false);
  const [expandedVolumes, setExpandedVolumes] = useState({});
  const [volumeIssues, setVolumeIssues] = useState({});

  // Check for edit mode from URL params
  useEffect(() => {
    const editParam = searchParams.get('edit');
    if (editParam === 'true' && (isAdmin() || isEditor())) {
      setIsEditMode(true);
      // Remove the edit param from URL
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, isAdmin, isEditor]);

  useEffect(() => {
    if (id) {
      getJournalById(id);
      fetchVolumes(id);
      fetchJournalDetails(id);
    }
  }, [id, getJournalById]);

  // Fetch journal details (about, scope, etc.)
  const fetchJournalDetails = async (journalId) => {
    setLoadingDetails(true);
    try {
      const response = await acsApi.journals.getDetails(journalId);
      setJournalDetails(response);
    } catch (err) {
      console.warn('Could not fetch journal details:', err);
      setJournalDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Fetch volumes for the journal
  const fetchVolumes = async (journalId) => {
    setLoadingVolumes(true);
    try {
      const response = await acsApi.journals.getVolumes(journalId);
      setVolumes(response.volumes || []);
    } catch (err) {
      console.error('Failed to load volumes:', err);
    } finally {
      setLoadingVolumes(false);
    }
  };

  // Toggle volume expansion and fetch issues
  const toggleVolume = async (volumeId) => {
    setExpandedVolumes(prev => ({
      ...prev,
      [volumeId]: !prev[volumeId]
    }));

    // Fetch issues if not already loaded
    if (!volumeIssues[volumeId] && !expandedVolumes[volumeId]) {
      try {
        const response = await acsApi.journals.getVolumeIssues(id, volumeId);
        setVolumeIssues(prev => ({
          ...prev,
          [volumeId]: response.issues || []
        }));
      } catch (err) {
        console.error('Failed to load issues:', err);
      }
    }
  };

  // Fetch available editors for dropdowns
  const fetchAvailableEditors = async () => {
    setLoadingEditors(true);
    try {
      // Fetch all users with editor role
      const response = await acsApi.admin.listUsers(0, 500, '', 'editor');
      setAvailableEditors(response.users || []);
    } catch (err) {
      console.error('Failed to fetch editors:', err);
      // Fallback: try to get all users
      try {
        const allUsersResponse = await acsApi.admin.listUsers(0, 500);
        setAvailableEditors(allUsersResponse.users || []);
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
        setAvailableEditors([]);
      }
    } finally {
      setLoadingEditors(false);
    }
  };

  // Fetch journal's current editors
  const fetchJournalEditors = async (journalId) => {
    try {
      const response = await acsApi.admin.getJournalEditors(journalId);
      // Set selected editors based on current assignments
      if (response.chief_editor?.user_id) {
        setSelectedChiefEditor(response.chief_editor.user_id);
      }
      if (response.co_editor?.user_id) {
        setSelectedCoEditor(response.co_editor.user_id);
      }
      if (response.section_editors?.length > 0) {
        setSelectedSectionEditors(response.section_editors.map(e => e.user_id).filter(Boolean));
      }
    } catch (err) {
      console.warn('Could not fetch journal editors:', err);
    }
  };

  useEffect(() => {
    if (selectedJournal && isEditMode) {
      setEditFormData({
        ...selectedJournal,
        // Strip HTML tags from description and guidelines for editing
        description: selectedJournal.description || '',
        guidelines: selectedJournal.guidelines || '',
        // Journal details fields
        about_journal: journalDetails?.about_journal || '',
        chief_say: journalDetails?.chief_say || '',
        aim_objective: journalDetails?.aim_objective || '',
        criteria: journalDetails?.criteria || '',
        scope: journalDetails?.scope || '',
        detailed_guidelines: journalDetails?.guidelines || '',
        readings: journalDetails?.readings || '',
      });
      // Fetch available editors when entering edit mode
      fetchAvailableEditors();
      fetchJournalEditors(selectedJournal.id);
    }
  }, [isEditMode, selectedJournal, journalDetails]);

  // Function to strip HTML tags from description
  const stripHtmlTags = (html) => {
    if (!html) return 'No description available';
    const stripped = html.replace(/<[^>]*>/g, '');
    const decoded = new DOMParser().parseFromString(stripped, 'text/html').body.textContent || stripped;
    return decoded.trim();
  };

  // Function to convert HTML entities to plain text
  const decodeHtmlEntities = (html) => {
    if (!html) return '';
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    return textarea.value;
  };

  // Handle edit form input changes
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value,
    });
  };

  // Handle update submission
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      // Get editor names from selected editors
      const chiefEditor = availableEditors.find(e => e.id === selectedChiefEditor);
      const coEditor = availableEditors.find(e => e.id === selectedCoEditor);
      
      const updateData = {
        ...editFormData,
        chief_editor: chiefEditor 
          ? `${chiefEditor.fname || ''} ${chiefEditor.lname || ''}`.trim() || chiefEditor.email
          : editFormData.chief_editor,
        co_editor: coEditor
          ? `${coEditor.fname || ''} ${coEditor.lname || ''}`.trim() || coEditor.email
          : editFormData.co_editor,
        chief_editor_id: selectedChiefEditor,
        co_editor_id: selectedCoEditor,
        section_editor_ids: selectedSectionEditors,
      };
      
      // Use file upload version if files are present
      if (journalImageFile || journalLogoFile) {
        await editJournalWithFiles(id, updateData, journalImageFile, journalLogoFile);
      } else {
        await editJournal(id, updateData);
      }
      // Refresh the journal data and details after successful update
      await getJournalById(id);
      await fetchJournalDetails(id);
      setIsEditMode(false);
      // Reset file state
      setJournalImageFile(null);
      setJournalLogoFile(null);
      setImagePreview(null);
      setLogoPreview(null);
      success('Journal updated successfully!', 4000);
    } catch (err) {
      showError('Failed to update journal: ' + err.message, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    confirm({
      title: 'Delete Journal',
      message: 'Are you sure you want to delete this journal? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'error',
      onConfirm: async () => {
        try {
          setIsSubmitting(true);
          await removeJournal(id);
          success('Journal deleted successfully!', 4000);
          navigate('/journals');
        } catch (err) {
          showError('Failed to delete journal: ' + err.message, 5000);
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="journal-detail-page">
        <div className="journal-detail-loading">
          <div className="spinner"></div>
          <p>Loading journal details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="journal-detail-page">
        <div className="journal-detail-error">
          <p>{error}</p>
          <button className="btn-back" onClick={() => navigate('/journals')}>
            Back to Journals
          </button>
        </div>
      </div>
    );
  }

  if (!selectedJournal) {
    return (
      <div className="journal-detail-page">
        <div className="journal-detail-empty">
          <p>Journal not found</p>
          <button className="btn-back" onClick={() => navigate('/journals')}>
            Back to Journals
          </button>
        </div>
      </div>
    );
  }

  const journal = selectedJournal;

  const breadcrumbItems = [
    { label: 'Home', path: '/' },
    { label: 'Journals', path: '/journals' },
    { label: journal.name, path: `/journal/${id}` },
  ];

  return (
    <div className="journal-detail-page">
      <Breadcrumbs items={breadcrumbItems} />
      
      {/* Edit Mode */}
      {isEditMode ? (
        <div className="journal-edit-container">
          {/* Edit Header */}
          <div className="edit-header">
            <button 
              type="button" 
              className="back-btn"
              onClick={() => setIsEditMode(false)}
            >
              <span className="material-symbols-rounded">arrow_back</span>
              Back
            </button>
            <div className="edit-header-info">
              <h1>Edit Journal</h1>
              <p>{journal.name}</p>
            </div>
          </div>

          <form onSubmit={handleUpdateSubmit} className="journal-edit-form">
            {/* Basic Information Section */}
            <section className="form-section">
              <div className="section-header">
                <span className="material-symbols-rounded">info</span>
                <h3>Basic Information</h3>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name">Journal Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={editFormData.name || ''}
                    onChange={handleEditInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="short_form">Short Form / Abbreviation *</label>
                  <input
                    type="text"
                    id="short_form"
                    name="short_form"
                    value={editFormData.short_form || ''}
                    onChange={handleEditInputChange}
                    placeholder="e.g., IJCS"
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={editFormData.description || ''}
                    onChange={handleEditInputChange}
                    rows="4"
                    placeholder="Brief description of the journal"
                  />
                </div>
              </div>
            </section>

            {/* Editorial Team Section */}
            <section className="form-section">
              <div className="section-header">
                <span className="material-symbols-rounded">group</span>
                <h3>Editorial Team</h3>
              </div>
              <p className="section-description">
                Select editors from the system users. Use the search to find editors by name or email.
              </p>
              <div className="form-grid">
                <SearchableEditorDropdown
                  label="Chief Editor"
                  value={selectedChiefEditor}
                  onChange={setSelectedChiefEditor}
                  options={availableEditors}
                  placeholder="Search for chief editor..."
                  loading={loadingEditors}
                  icon="stars"
                />
                <SearchableEditorDropdown
                  label="Co-Editor"
                  value={selectedCoEditor}
                  onChange={setSelectedCoEditor}
                  options={availableEditors}
                  placeholder="Search for co-editor..."
                  loading={loadingEditors}
                  icon="person_add"
                />
                <MultiSelectEditorDropdown
                  label="Section Editors"
                  values={selectedSectionEditors}
                  onChange={setSelectedSectionEditors}
                  options={availableEditors}
                  placeholder="Search and add section editors..."
                  loading={loadingEditors}
                />
              </div>
            </section>

            {/* Media & Branding Section */}
            <section className="form-section">
              <div className="section-header">
                <span className="material-symbols-rounded">image</span>
                <h3>Media & Branding</h3>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Journal Image</label>
                  <div className="file-upload-wrapper">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setJournalImageFile(file);
                          setImagePreview(URL.createObjectURL(file));
                        }
                      }}
                      id="edit-journal-image"
                      className="file-input"
                    />
                    <label htmlFor="edit-journal-image" className="file-upload-label">
                      <span className="material-symbols-rounded">upload</span>
                      {journalImageFile ? journalImageFile.name : 'Choose image file'}
                    </label>
                    {(imagePreview || selectedJournal?.journal_image) && (
                      <div className="image-preview">
                        <img src={imagePreview || selectedJournal?.journal_image} alt="Journal preview" />
                        {imagePreview && (
                          <button 
                            type="button" 
                            className="remove-preview"
                            onClick={() => {
                              setJournalImageFile(null);
                              setImagePreview(null);
                            }}
                          >
                            <span className="material-symbols-rounded">close</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="file-hint">Accepts JPG, PNG, GIF, WebP</span>
                </div>
                <div className="form-group">
                  <label>Journal Logo</label>
                  <div className="file-upload-wrapper">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setJournalLogoFile(file);
                          setLogoPreview(URL.createObjectURL(file));
                        }
                      }}
                      id="edit-journal-logo"
                      className="file-input"
                    />
                    <label htmlFor="edit-journal-logo" className="file-upload-label">
                      <span className="material-symbols-rounded">upload</span>
                      {journalLogoFile ? journalLogoFile.name : 'Choose logo file'}
                    </label>
                    {(logoPreview || selectedJournal?.journal_logo) && (
                      <div className="image-preview">
                        <img src={logoPreview || selectedJournal?.journal_logo} alt="Logo preview" />
                        {logoPreview && (
                          <button 
                            type="button" 
                            className="remove-preview"
                            onClick={() => {
                              setJournalLogoFile(null);
                              setLogoPreview(null);
                            }}
                          >
                            <span className="material-symbols-rounded">close</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="file-hint">Accepts JPG, PNG, GIF, WebP</span>
                </div>
              </div>
            </section>

            {/* Publication Details Section */}
            <section className="form-section">
              <div className="section-header">
                <span className="material-symbols-rounded">menu_book</span>
                <h3>Publication Details</h3>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="issn_online">ISSN (Online)</label>
                  <input
                    type="text"
                    id="issn_online"
                    name="issn_online"
                    value={editFormData.issn_online || ''}
                    onChange={handleEditInputChange}
                    placeholder="XXXX-XXXX"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="issn_print">ISSN (Print)</label>
                  <input
                    type="text"
                    id="issn_print"
                    name="issn_print"
                    value={editFormData.issn_print || ''}
                    onChange={handleEditInputChange}
                    placeholder="XXXX-XXXX"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="frequency">Publication Frequency</label>
                  <input
                    type="text"
                    id="frequency"
                    name="frequency"
                    value={editFormData.frequency || ''}
                    onChange={handleEditInputChange}
                    placeholder="e.g., Quarterly, Monthly"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="guidelines">Guidelines</label>
                  <textarea
                    id="guidelines"
                    name="guidelines"
                    value={editFormData.guidelines || ''}
                    onChange={handleEditInputChange}
                    rows="4"
                    placeholder="Enter submission guidelines (plain text only)"
                  />
                </div>
              </div>
            </section>

            {/* Journal Page Content Section */}
            <section className="form-section journal-page-section">
              <div className="section-header">
                <span className="material-symbols-rounded">web</span>
                <h3>Journal Page Content</h3>
              </div>
              <p className="section-description">
                This content will be displayed on the journal's dedicated page (e.g., /j/ijcs). Plain text only - HTML tags will be stripped.
              </p>
              
              <div className="form-grid single-column">
                <div className="form-group">
                  <label htmlFor="about_journal">
                    <span className="label-icon material-symbols-rounded">article</span>
                    About the Journal
                  </label>
                  <textarea
                    id="about_journal"
                    name="about_journal"
                    value={editFormData.about_journal || ''}
                    onChange={handleEditInputChange}
                    rows="6"
                    placeholder="Enter detailed information about the journal, its history, mission, etc."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="aim_objective">
                    <span className="label-icon material-symbols-rounded">flag</span>
                    Aim & Objectives
                  </label>
                  <textarea
                    id="aim_objective"
                    name="aim_objective"
                    value={editFormData.aim_objective || ''}
                    onChange={handleEditInputChange}
                    rows="5"
                    placeholder="Enter the aims and objectives of the journal"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="scope">
                    <span className="label-icon material-symbols-rounded">category</span>
                    Scope & Topics
                  </label>
                  <textarea
                    id="scope"
                    name="scope"
                    value={editFormData.scope || ''}
                    onChange={handleEditInputChange}
                    rows="5"
                    placeholder="Enter the scope and topics covered by the journal"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="criteria">
                    <span className="label-icon material-symbols-rounded">checklist</span>
                    Submission Criteria
                  </label>
                  <textarea
                    id="criteria"
                    name="criteria"
                    value={editFormData.criteria || ''}
                    onChange={handleEditInputChange}
                    rows="4"
                    placeholder="Enter the criteria for paper submission"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="detailed_guidelines">
                    <span className="label-icon material-symbols-rounded">description</span>
                    Detailed Author Guidelines
                  </label>
                  <textarea
                    id="detailed_guidelines"
                    name="detailed_guidelines"
                    value={editFormData.detailed_guidelines || ''}
                    onChange={handleEditInputChange}
                    rows="6"
                    placeholder="Enter detailed submission and formatting guidelines"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="chief_say">
                    <span className="label-icon material-symbols-rounded">campaign</span>
                    From the Editor's Desk
                  </label>
                  <textarea
                    id="chief_say"
                    name="chief_say"
                    value={editFormData.chief_say || ''}
                    onChange={handleEditInputChange}
                    rows="4"
                    placeholder="Enter a message from the Chief Editor"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="readings">
                    <span className="label-icon material-symbols-rounded">library_books</span>
                    Recommended Readings
                  </label>
                  <textarea
                    id="readings"
                    name="readings"
                    value={editFormData.readings || ''}
                    onChange={handleEditInputChange}
                    rows="3"
                    placeholder="Enter recommended readings or references"
                  />
                </div>
              </div>
            </section>

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditMode(false)}
                disabled={isSubmitting}
              >
                <span className="material-symbols-rounded">close</span>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                <span className="material-symbols-rounded">
                  {isSubmitting ? 'hourglass_empty' : 'save'}
                </span>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Header Banner */}
          <div className="journal-detail-header">
            <div className="journal-detail-header-content">
              
              <div className="journal-detail-title-section">
                <h1>{journal.name}</h1>
                {journal.short_form && (
                  <span className="journal-short-form">{journal.short_form}</span>
                )}
              </div>
              
              {/* Admin/Editor Actions */}
              {(isAdmin() || isEditor()) && (
                <div className="journal-header-actions">
                  <button 
                    className="action-btn edit-btn" 
                    onClick={() => setIsEditMode(true)}
                    title="Edit Journal"
                  >
                    <span className="material-symbols-rounded">edit</span>
                    Edit
                  </button>
                  {isAdmin() && (
                    <button 
                      className="action-btn delete-btn" 
                      onClick={handleDelete}
                      title="Delete Journal"
                    >
                      <span className="material-symbols-rounded">delete</span>
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="journal-detail-container">
            <div className="journal-detail-main">
              {/* Description Section */}
              <section className="journal-detail-section">
                <h2>About</h2>
                <div className="journal-detail-description">
                  <p>{stripHtmlTags(journal.description)}</p>
                </div>
              </section>

              {/* Key Information */}
              <section className="journal-detail-section">
                <h2>Key Information</h2>
                <div className="journal-detail-info-grid">
                  <div className="info-card">
                    <label>Chief Editor</label>
                    <p>{journal.chief_editor || 'Not specified'}</p>
                  </div>
                  <div className="info-card">
                    <label>ISSN Online</label>
                    <p>{journal.issn_online || 'N/A'}</p>
                  </div>
                  <div className="info-card">
                    <label>ISSN Print</label>
                    <p>{journal.issn_print || 'N/A'}</p>
                  </div>
                </div>
              </section>

              {/* Submission Guidelines */}
              {journal.guidelines && (
                <section className="journal-detail-section">
                  <h2>Submission Guidelines</h2>
                  <div className="journal-detail-guidelines">
                    <p>{stripHtmlTags(journal.guidelines)}</p>
                  </div>
                </section>
              )}

              {/* Volumes and Issues Section */}
              <section className="journal-detail-section">
                <h2>Volumes & Issues</h2>
                {loadingVolumes ? (
                  <div className="volumes-loading">
                    <div className="spinner-small"></div>
                    <span>Loading volumes...</span>
                  </div>
                ) : volumes.length === 0 ? (
                  <div className="no-volumes">
                    <p>No volumes available yet for this journal.</p>
                  </div>
                ) : (
                  <div className="volumes-list">
                    {volumes.map((volume) => (
                      <div key={volume.id} className="volume-item">
                        <div 
                          className={`volume-header ${expandedVolumes[volume.id] ? 'expanded' : ''}`}
                          onClick={() => toggleVolume(volume.id)}
                        >
                          <div className="volume-info">
                            <span className="volume-icon">
                              <span className="material-symbols-rounded">
                                {expandedVolumes[volume.id] ? 'expand_less' : 'expand_more'}
                              </span>
                            </span>
                            <span className="volume-title">Volume {volume.volume_no}</span>
                            <span className="volume-year">({volume.year})</span>
                          </div>
                          <span className="volume-issue-count">
                            {volume.issue_count} {volume.issue_count === 1 ? 'Issue' : 'Issues'}
                          </span>
                        </div>
                        
                        {expandedVolumes[volume.id] && (
                          <div className="issues-container">
                            {!volumeIssues[volume.id] ? (
                              <div className="issues-loading">
                                <div className="spinner-small"></div>
                                <span>Loading issues...</span>
                              </div>
                            ) : volumeIssues[volume.id].length === 0 ? (
                              <div className="no-issues">
                                <p>No issues in this volume yet.</p>
                              </div>
                            ) : (
                              <div className="issues-grid">
                                {volumeIssues[volume.id].map((issue) => (
                                  <Link 
                                    key={issue.id} 
                                    to={`/journal/${id}/volume/${volume.volume_no}/issue/${issue.issue_no}`}
                                    className="issue-card"
                                  >
                                    <div className="issue-header">
                                      <span className="issue-number">Issue {issue.issue_no}</span>
                                      {issue.month && <span className="issue-month">{issue.month}</span>}
                                    </div>
                                    <div className="issue-details">
                                      <span className="issue-papers">
                                        <span className="material-symbols-rounded">article</span>
                                        {issue.paper_count} {issue.paper_count === 1 ? 'Paper' : 'Papers'}
                                      </span>
                                      {issue.pages && (
                                        <span className="issue-pages">
                                          <span className="material-symbols-rounded">menu_book</span>
                                          {issue.pages} pages
                                        </span>
                                      )}
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default JournalDetailPage;
