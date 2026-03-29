import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import acsApi from '../../api/apiService';
import { createJournal, createJournalWithFiles } from '../../services/journals';
import { useToast } from '../../hooks/useToast';
import { useModal } from '../../hooks/useModal';
import styles from './AdminJournals.module.css';

// Research categories for journal classification
const RESEARCH_CATEGORIES = [
  { value: '', label: 'Select Category...' },
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

const AdminJournals = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const { confirm } = useModal();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditorsModal, setShowEditorsModal] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [journalEditors, setJournalEditors] = useState({ chief_editor: null, co_editor: null, section_editors: [] });
  const [users, setUsers] = useState([]);
  const [newJournal, setNewJournal] = useState({
    fld_journal_name: '',
    primary_category: '',
    short_form: '',
    freq: 'Quarterly',
    issn_ol: '',
    issn_prt: '',
    cheif_editor: '',
    co_editor: '',
    password: 'default',
    description: '',
    journal_image: '',
    journal_logo: '',
    guidelines: '',
    copyright: '',
    membership: '',
    subscription: '',
    publication: '',
    advertisement: '',
    abs_ind: '',
    // Journal details fields
    about_journal: '',
    chief_say: '',
    aim_objective: '',
    criteria: '',
    scope: '',
    detailed_guidelines: '',
    readings: '',
  });
  const [newEditor, setNewEditor] = useState({
    editor_name: '',
    editor_email: '',
    editor_type: 'section_editor',
    editor_affiliation: '',
    selected_user_id: ''
  });
  const [savingJournal, setSavingJournal] = useState(false);
  const [savingEditor, setSavingEditor] = useState(false);
  const [availableEditors, setAvailableEditors] = useState([]);
  const [selectedChiefEditor, setSelectedChiefEditor] = useState('');
  const [selectedCoEditor, setSelectedCoEditor] = useState('');
  const [selectedSectionEditors, setSelectedSectionEditors] = useState([]);
  const [loadingEditors, setLoadingEditors] = useState(false);
  // File upload state
  const [journalImageFile, setJournalImageFile] = useState(null);
  const [journalLogoFile, setJournalLogoFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const journalsPerPage = 6;

  const fetchJournals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await acsApi.admin.listAllJournals(0, 100, search);
      setJournals(response.journals || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load journals');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  // Get initials from journal name or editor name
  const getInitials = (name) => {
    if (!name) return 'JN';
    const words = name.split(' ').filter(w => w.length > 0);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Generate avatar color based on name
  const getAvatarColor = (name, index) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    return colors[index % colors.length];
  };

  const filteredJournals = journals.filter(j => {
    const matchesSearch = !search || 
      j.name?.toLowerCase().includes(search.toLowerCase()) ||
      j.issn_online?.toLowerCase().includes(search.toLowerCase()) ||
      j.issn_print?.toLowerCase().includes(search.toLowerCase()) ||
      j.short_form?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && j.status !== 'on_hold') ||
      (statusFilter === 'on_hold' && j.status === 'on_hold');
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredJournals.length / journalsPerPage);
  const startIndex = (currentPage - 1) * journalsPerPage;
  const paginatedJournals = filteredJournals.slice(startIndex, startIndex + journalsPerPage);

  const handleEdit = (journal) => {
    navigate(`/journal/${journal.id}`);
  };

  const handleDelete = (journal) => {
    confirm({
      title: 'Delete Journal',
      message: `Are you sure you want to delete "${journal.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'error',
      onConfirm: async () => {
        try {
          setDeletingId(journal.id);
          await acsApi.admin.deleteJournal(journal.id);
          // Remove the deleted journal from the list
          setJournals(journals.filter(j => j.id !== journal.id));
          success(`Journal "${journal.name}" deleted successfully!`, 4000);
        } catch (err) {
          showError(err.response?.data?.detail || `Failed to delete journal "${journal.name}"`, 5000);
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const handleAddJournal = async () => {
    setShowAddModal(true);
    // Fetch available editors for dropdown
    setLoadingEditors(true);
    try {
      const response = await acsApi.admin.listEditors(0, 100);
      setAvailableEditors(response.editors || []);
    } catch (err) {
      console.error('Failed to fetch editors:', err);
      setAvailableEditors([]);
    } finally {
      setLoadingEditors(false);
    }
  };

  const handleSaveJournal = async () => {
    if (!newJournal.fld_journal_name || !newJournal.short_form) {
      showError('Journal name and short form are required', 4000);
      return;
    }
    
    setSavingJournal(true);
    try {
      // Get editor names from selected editors
      const chiefEditor = availableEditors.find(e => e.id === parseInt(selectedChiefEditor));
      const coEditor = availableEditors.find(e => e.id === parseInt(selectedCoEditor));
      const journalData = {
        ...newJournal,
        cheif_editor: chiefEditor?.editor_name || newJournal.cheif_editor,
        co_editor: coEditor?.editor_name || newJournal.co_editor,
        chief_editor_id: selectedChiefEditor ? parseInt(selectedChiefEditor) : null,
        co_editor_id: selectedCoEditor ? parseInt(selectedCoEditor) : null,
        section_editor_ids: selectedSectionEditors.map(id => parseInt(id)),
      };
      
      let created;
      // Use FormData if files are present
      if (journalImageFile || journalLogoFile) {
        created = await createJournalWithFiles(journalData, journalImageFile, journalLogoFile);
      } else {
        created = await createJournal(journalData);
      }
      success(`Journal "${created.name}" created successfully!`, 4000);
      setShowAddModal(false);
      setNewJournal({
        fld_journal_name: '',
        primary_category: '',
        short_form: '',
        freq: 'Quarterly',
        issn_ol: '',
        issn_prt: '',
        cheif_editor: '',
        co_editor: '',
        password: 'default',
        description: '',
        journal_image: '',
        journal_logo: '',
        guidelines: '',
        copyright: '',
        membership: '',
        subscription: '',
        publication: '',
        advertisement: '',
        abs_ind: '',
        about_journal: '',
        chief_say: '',
        aim_objective: '',
        criteria: '',
        scope: '',
        detailed_guidelines: '',
        readings: '',
      });
      setSelectedChiefEditor('');
      setSelectedCoEditor('');
      setSelectedSectionEditors([]);
      // Reset file uploads
      setJournalImageFile(null);
      setJournalLogoFile(null);
      setImagePreview(null);
      setLogoPreview(null);
      fetchJournals();
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to create journal', 5000);
    } finally {
      setSavingJournal(false);
    }
  };

  const handleManageEditors = async (journal) => {
    setSelectedJournal(journal);
    setShowEditorsModal(true);
    setNewEditor({
      editor_name: '',
      editor_email: '',
      editor_type: 'section_editor',
      editor_affiliation: '',
      selected_user_id: ''
    });
    
    // Fetch both journal editors and available editors
    setLoadingEditors(true);
    try {
      const [editorsResponse, availableResponse] = await Promise.all([
        acsApi.admin.getJournalEditors(journal.id),
        acsApi.admin.listUsers(0, 500) // Fetch all users to select from
      ]);
      
      setJournalEditors({
        chief_editor: editorsResponse.chief_editor,
        co_editor: editorsResponse.co_editor,
        section_editors: editorsResponse.section_editors || []
      });
      
      // Filter users who can be editors (exclude already assigned ones)
      const assignedEmails = [
        editorsResponse.chief_editor?.editor_email,
        editorsResponse.co_editor?.editor_email,
        ...(editorsResponse.section_editors || []).map(e => e.editor_email)
      ].filter(Boolean);
      
      const eligibleUsers = (availableResponse.users || []).filter(
        user => !assignedEmails.includes(user.email)
      );
      setAvailableEditors(eligibleUsers);
    } catch (err) {
      showError('Failed to load editors', 4000);
    } finally {
      setLoadingEditors(false);
    }
  };

  const handleEditorSelect = (userId) => {
    const selectedUser = availableEditors.find(u => u.id === parseInt(userId));
    if (selectedUser) {
      setNewEditor({
        ...newEditor,
        selected_user_id: userId,
        editor_name: `${selectedUser.fname || ''} ${selectedUser.lname || ''}`.trim() || selectedUser.email,
        editor_email: selectedUser.email,
        editor_affiliation: selectedUser.affiliation || selectedUser.organisation || ''
      });
    } else {
      setNewEditor({
        ...newEditor,
        selected_user_id: '',
        editor_name: '',
        editor_email: '',
        editor_affiliation: ''
      });
    }
  };

  const handleAddEditor = async () => {
    if (!newEditor.selected_user_id || !newEditor.editor_email) {
      showError('Please select an editor from the dropdown', 4000);
      return;
    }
    
    setSavingEditor(true);
    try {
      await acsApi.admin.createEditor({
        editor_name: newEditor.editor_name,
        editor_email: newEditor.editor_email,
        journal_id: selectedJournal.id,
        editor_type: newEditor.editor_type,
        editor_affiliation: newEditor.editor_affiliation,
      });
      success('Editor added successfully!', 4000);
      setNewEditor({
        editor_name: '',
        editor_email: '',
        editor_type: 'section_editor',
        editor_affiliation: '',
        selected_user_id: ''
      });
      // Refresh editors and available users list
      const [editorsResponse, availableResponse] = await Promise.all([
        acsApi.admin.getJournalEditors(selectedJournal.id),
        acsApi.admin.listUsers(0, 500)
      ]);
      
      setJournalEditors({
        chief_editor: editorsResponse.chief_editor,
        co_editor: editorsResponse.co_editor,
        section_editors: editorsResponse.section_editors || []
      });
      
      // Update available editors (exclude newly assigned)
      const assignedEmails = [
        editorsResponse.chief_editor?.editor_email,
        editorsResponse.co_editor?.editor_email,
        ...(editorsResponse.section_editors || []).map(e => e.editor_email)
      ].filter(Boolean);
      
      const eligibleUsers = (availableResponse.users || []).filter(
        user => !assignedEmails.includes(user.email)
      );
      setAvailableEditors(eligibleUsers);
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to add editor', 5000);
    } finally {
      setSavingEditor(false);
    }
  };

  const handleRemoveEditor = async (editorId, editorName) => {
    confirm({
      title: 'Remove Editor',
      message: `Are you sure you want to remove "${editorName}" from this journal?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: async () => {
        try {
          await acsApi.admin.deleteEditor(editorId);
          success(`Editor "${editorName}" removed successfully!`, 4000);
          
          // Refresh editors and available users list
          const [editorsResponse, availableResponse] = await Promise.all([
            acsApi.admin.getJournalEditors(selectedJournal.id),
            acsApi.admin.listUsers(0, 500)
          ]);
          
          setJournalEditors({
            chief_editor: editorsResponse.chief_editor,
            co_editor: editorsResponse.co_editor,
            section_editors: editorsResponse.section_editors || []
          });
          
          // Update available editors (add back removed editor)
          const assignedEmails = [
            editorsResponse.chief_editor?.editor_email,
            editorsResponse.co_editor?.editor_email,
            ...(editorsResponse.section_editors || []).map(e => e.editor_email)
          ].filter(Boolean);
          
          const eligibleUsers = (availableResponse.users || []).filter(
            user => !assignedEmails.includes(user.email)
          );
          setAvailableEditors(eligibleUsers);
        } catch (err) {
          showError(err.response?.data?.detail || 'Failed to remove editor', 5000);
        }
      },
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Journal Management</h1>
          <p>View and manage all journals in the system</p>
        </div>
        <button className={styles.addBtn} onClick={handleAddJournal}>
          <span className="material-symbols-rounded">add</span>
          Add Journal
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <span className={`material-symbols-rounded ${styles.searchIcon}`}>search</span>
          <input
            type="text"
            placeholder="Search by journal name or ISSN..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.searchInput}
          />
        </div>
        <select 
          className={styles.statusFilter}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading journals...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : filteredJournals.length === 0 ? (
        <div className={styles.empty}>No journals found</div>
      ) : (
        <>
          <div className={styles.journalGrid}>
            {paginatedJournals.map((journal, index) => (
              <div key={journal.id} className={styles.journalCard}>
                <div className={styles.cardTop}>
                  <div className={styles.cardInfo}>
                    <h3>{journal.name}</h3>
                    <span className={`${styles.statusBadge} ${journal.status === 'on_hold' ? styles.onHold : styles.active}`}>
                      {journal.status === 'on_hold' ? 'ON HOLD' : 'ACTIVE'}
                    </span>
                  </div>
                  <div className={styles.cardActions}>
                    <button 
                      className={styles.actionBtn} 
                      onClick={() => handleEdit(journal)}
                      title="Edit journal"
                      disabled={deletingId === journal.id}
                    >
                      <span className="material-symbols-rounded">edit</span>
                    </button>
                    <button 
                      className={styles.actionBtn} 
                      onClick={() => handleManageEditors(journal)}
                      title="Manage editors"
                      disabled={deletingId === journal.id}
                    >
                      <span className="material-symbols-rounded">group</span>
                    </button>
                    <button 
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      onClick={() => handleDelete(journal)}
                      title="Delete journal"
                      disabled={deletingId === journal.id}
                    >
                      <span className="material-symbols-rounded">
                        {deletingId === journal.id ? 'hourglass_empty' : 'delete'}
                      </span>
                    </button>
                  </div>
                </div>
                
                <div className={styles.cardMeta}>
                  <span className={styles.issn}>
                    ISSN: {journal.issn_print || journal.issn_online || 'N/A'}
                  </span>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.avatarGroup}>
                    {journal.chief_editor && (
                      <div 
                        className={`${styles.avatar} ${styles.chiefAvatar}`}
                        style={{ backgroundColor: getAvatarColor(journal.chief_editor, 0) }}
                        title={`Chief Editor: ${journal.chief_editor}`}
                      >
                        {getInitials(journal.chief_editor)}
                      </div>
                    )}
                    {journal.co_editor && (
                      <div 
                        className={`${styles.avatar} ${styles.coAvatar}`}
                        style={{ backgroundColor: getAvatarColor(journal.co_editor, 1) }}
                        title={`Co-Editor: ${journal.co_editor}`}
                      >
                        {getInitials(journal.co_editor)}
                      </div>
                    )}
                    {!journal.chief_editor && !journal.co_editor && (
                      <span className={styles.noEditorText}>No editors assigned</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button 
                className={styles.pageBtn}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <span className="material-symbols-rounded">chevron_left</span>
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`${styles.pageBtn} ${currentPage === page ? styles.activePage : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              
              <button 
                className={styles.pageBtn}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <span className="material-symbols-rounded">chevron_right</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Journal Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Add New Journal</h2>
              <button className={styles.closeBtn} onClick={() => setShowAddModal(false)}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* Basic Information */}
              <h3 className={styles.sectionTitle}>Basic Information</h3>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Journal Name *</label>
                  <input
                    type="text"
                    value={newJournal.fld_journal_name}
                    onChange={(e) => setNewJournal({...newJournal, fld_journal_name: e.target.value})}
                    placeholder="International Journal of..."
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Short Form *</label>
                  <input
                    type="text"
                    value={newJournal.short_form}
                    onChange={(e) => setNewJournal({...newJournal, short_form: e.target.value})}
                    placeholder="IJCS"
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Primary Category</label>
                  <select
                    value={newJournal.primary_category}
                    onChange={(e) => setNewJournal({...newJournal, primary_category: e.target.value})}
                  >
                    {RESEARCH_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Frequency</label>
                  <select
                    value={newJournal.freq}
                    onChange={(e) => setNewJournal({...newJournal, freq: e.target.value})}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Bi-Monthly">Bi-Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Semi-Annual">Semi-Annual</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>ISSN Online</label>
                  <input
                    type="text"
                    value={newJournal.issn_ol}
                    onChange={(e) => setNewJournal({...newJournal, issn_ol: e.target.value})}
                    placeholder="XXXX-XXXX"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>ISSN Print</label>
                  <input
                    type="text"
                    value={newJournal.issn_prt}
                    onChange={(e) => setNewJournal({...newJournal, issn_prt: e.target.value})}
                    placeholder="XXXX-XXXX"
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Abstract Indexing</label>
                  <input
                    type="text"
                    value={newJournal.abs_ind}
                    onChange={(e) => setNewJournal({...newJournal, abs_ind: e.target.value})}
                    placeholder="e.g., Scopus, Web of Science"
                  />
                </div>
              </div>
              
              {/* Editorial Team */}
              <h3 className={styles.sectionTitle}>Editorial Team</h3>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Chief Editor</label>
                  <select
                    value={selectedChiefEditor}
                    onChange={(e) => setSelectedChiefEditor(e.target.value)}
                    disabled={loadingEditors}
                  >
                    <option value="">
                      {loadingEditors ? 'Loading editors...' : 'Select Chief Editor'}
                    </option>
                    {availableEditors
                      .filter(editor => editor.id !== parseInt(selectedCoEditor))
                      .map((editor) => (
                        <option key={editor.id} value={editor.id}>
                          {editor.editor_name} ({editor.editor_email})
                        </option>
                      ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Co-Editor</label>
                  <select
                    value={selectedCoEditor}
                    onChange={(e) => setSelectedCoEditor(e.target.value)}
                    disabled={loadingEditors}
                  >
                    <option value="">
                      {loadingEditors ? 'Loading editors...' : 'Select Co-Editor'}
                    </option>
                    {availableEditors
                      .filter(editor => editor.id !== parseInt(selectedChiefEditor))
                      .map((editor) => (
                        <option key={editor.id} value={editor.id}>
                          {editor.editor_name} ({editor.editor_email})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Section Editors</label>
                <div className={styles.multiSelectContainer}>
                  {loadingEditors ? (
                    <p className={styles.loadingText}>Loading editors...</p>
                  ) : (
                    <div className={styles.editorCheckboxList}>
                      {availableEditors
                        .filter(editor => 
                          editor.id !== parseInt(selectedChiefEditor) && 
                          editor.id !== parseInt(selectedCoEditor)
                        )
                        .map((editor) => (
                          <label key={editor.id} className={styles.editorCheckbox}>
                            <input
                              type="checkbox"
                              checked={selectedSectionEditors.includes(String(editor.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSectionEditors([...selectedSectionEditors, String(editor.id)]);
                                } else {
                                  setSelectedSectionEditors(selectedSectionEditors.filter(id => id !== String(editor.id)));
                                }
                              }}
                            />
                            <span className={styles.editorCheckboxLabel}>
                              {editor.editor_name}
                              <span className={styles.editorCheckboxEmail}>{editor.editor_email}</span>
                            </span>
                          </label>
                        ))}
                      {availableEditors.length === 0 && (
                        <p className={styles.noEditorsText}>No editors available. Create editors first.</p>
                      )}
                    </div>
                  )}
                </div>
                {selectedSectionEditors.length > 0 && (
                  <p className={styles.selectedCount}>
                    {selectedSectionEditors.length} section editor(s) selected
                  </p>
                )}
              </div>

              {/* Media & Branding */}
              <h3 className={styles.sectionTitle}>Media & Branding</h3>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Journal Image</label>
                  <div className={styles.fileUploadWrapper}>
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
                      id="journal-image-upload"
                      className={styles.fileInput}
                    />
                    <label htmlFor="journal-image-upload" className={styles.fileUploadLabel}>
                      <span className="material-symbols-rounded">upload</span>
                      {journalImageFile ? journalImageFile.name : 'Choose image file'}
                    </label>
                    {imagePreview && (
                      <div className={styles.imagePreview}>
                        <img src={imagePreview} alt="Journal preview" />
                        <button 
                          type="button" 
                          className={styles.removePreview}
                          onClick={() => {
                            setJournalImageFile(null);
                            setImagePreview(null);
                          }}
                        >
                          <span className="material-symbols-rounded">close</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <span className={styles.fileHint}>Accepts JPG, PNG, GIF, WebP</span>
                </div>
                <div className={styles.formGroup}>
                  <label>Journal Logo</label>
                  <div className={styles.fileUploadWrapper}>
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
                      id="journal-logo-upload"
                      className={styles.fileInput}
                    />
                    <label htmlFor="journal-logo-upload" className={styles.fileUploadLabel}>
                      <span className="material-symbols-rounded">upload</span>
                      {journalLogoFile ? journalLogoFile.name : 'Choose logo file'}
                    </label>
                    {logoPreview && (
                      <div className={styles.imagePreview}>
                        <img src={logoPreview} alt="Logo preview" />
                        <button 
                          type="button" 
                          className={styles.removePreview}
                          onClick={() => {
                            setJournalLogoFile(null);
                            setLogoPreview(null);
                          }}
                        >
                          <span className="material-symbols-rounded">close</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <span className={styles.fileHint}>Accepts JPG, PNG, GIF, WebP</span>
                </div>
              </div>

              {/* Policies & Documents */}
              <h3 className={styles.sectionTitle}>Policies & Documents</h3>
              <div className={styles.formGroup}>
                <label>Guidelines</label>
                <textarea
                  value={newJournal.guidelines}
                  onChange={(e) => setNewJournal({...newJournal, guidelines: e.target.value})}
                  placeholder="Enter submission guidelines (plain text only)..."
                  rows={4}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Copyright Policy</label>
                <textarea
                  value={newJournal.copyright}
                  onChange={(e) => setNewJournal({...newJournal, copyright: e.target.value})}
                  placeholder="Enter copyright policy (plain text only)..."
                  rows={4}
                />
              </div>

              {/* Subscription & Business */}
              <h3 className={styles.sectionTitle}>Subscription & Business</h3>
              <div className={styles.formGroup}>
                <label>Membership Information</label>
                <textarea
                  value={newJournal.membership}
                  onChange={(e) => setNewJournal({...newJournal, membership: e.target.value})}
                  placeholder="Enter membership information (plain text only)..."
                  rows={4}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Subscription Information</label>
                <textarea
                  value={newJournal.subscription}
                  onChange={(e) => setNewJournal({...newJournal, subscription: e.target.value})}
                  placeholder="Enter subscription information (plain text only)..."
                  rows={4}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Publication Charges</label>
                <textarea
                  value={newJournal.publication}
                  onChange={(e) => setNewJournal({...newJournal, publication: e.target.value})}
                  placeholder="Enter publication charges information (plain text only)..."
                  rows={4}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Advertisement Information</label>
                <textarea
                  value={newJournal.advertisement}
                  onChange={(e) => setNewJournal({...newJournal, advertisement: e.target.value})}
                  placeholder="Enter advertisement information (plain text only)..."
                  rows={4}
                />
              </div>

              {/* Description */}
              <h3 className={styles.sectionTitle}>Description</h3>
              <div className={styles.formGroup}>
                <label>Journal Description</label>
                <textarea
                  value={newJournal.description}
                  onChange={(e) => setNewJournal({...newJournal, description: e.target.value})}
                  placeholder="Enter a detailed description of the journal..."
                  rows={4}
                />
              </div>

              {/* Journal Details - Content for Journal Pages */}
              <h3 className={styles.sectionTitle}>Journal Content (for Journal Pages)</h3>
              <p className={styles.sectionHint}>This content will be displayed on the journal's dedicated page. Plain text only - HTML tags will be stripped.</p>
              
              <div className={styles.formGroup}>
                <label>About the Journal</label>
                <textarea
                  value={newJournal.about_journal}
                  onChange={(e) => setNewJournal({...newJournal, about_journal: e.target.value})}
                  placeholder="Enter detailed information about the journal, its history, mission, etc."
                  rows={5}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Aim & Objectives</label>
                <textarea
                  value={newJournal.aim_objective}
                  onChange={(e) => setNewJournal({...newJournal, aim_objective: e.target.value})}
                  placeholder="Enter the aims and objectives of the journal"
                  rows={4}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Scope</label>
                <textarea
                  value={newJournal.scope}
                  onChange={(e) => setNewJournal({...newJournal, scope: e.target.value})}
                  placeholder="Enter the scope and topics covered by the journal"
                  rows={4}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Submission Criteria</label>
                <textarea
                  value={newJournal.criteria}
                  onChange={(e) => setNewJournal({...newJournal, criteria: e.target.value})}
                  placeholder="Enter the criteria for paper submission"
                  rows={4}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Detailed Author Guidelines</label>
                <textarea
                  value={newJournal.detailed_guidelines}
                  onChange={(e) => setNewJournal({...newJournal, detailed_guidelines: e.target.value})}
                  placeholder="Enter detailed submission and formatting guidelines"
                  rows={5}
                />
              </div>

              <div className={styles.formGroup}>
                <label>From the Editor's Desk</label>
                <textarea
                  value={newJournal.chief_say}
                  onChange={(e) => setNewJournal({...newJournal, chief_say: e.target.value})}
                  placeholder="Enter a message from the Chief Editor"
                  rows={4}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Recommended Readings</label>
                <textarea
                  value={newJournal.readings}
                  onChange={(e) => setNewJournal({...newJournal, readings: e.target.value})}
                  placeholder="Enter recommended readings or references"
                  rows={3}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button 
                className={styles.saveBtn} 
                onClick={handleSaveJournal}
                disabled={savingJournal}
              >
                {savingJournal ? 'Creating...' : 'Create Journal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Editors Modal */}
      {showEditorsModal && selectedJournal && (
        <div className={styles.modalOverlay} onClick={() => setShowEditorsModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Manage Editors - {selectedJournal.name}</h2>
              <button className={styles.closeBtn} onClick={() => setShowEditorsModal(false)}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* Chief Editor */}
              <div className={styles.editorSection}>
                <h3>Chief Editor</h3>
                {journalEditors.chief_editor ? (
                  <div className={styles.editorCard}>
                    <div className={styles.editorInfo}>
                      <strong>{journalEditors.chief_editor.editor_name}</strong>
                      <span>{journalEditors.chief_editor.editor_email}</span>
                    </div>
                    <button 
                      className={styles.removeBtn}
                      onClick={() => handleRemoveEditor(journalEditors.chief_editor.id, journalEditors.chief_editor.editor_name)}
                    >
                      <span className="material-symbols-rounded">person_remove</span>
                    </button>
                  </div>
                ) : (
                  <p className={styles.noEditor}>No chief editor assigned</p>
                )}
              </div>

              {/* Co-Editor */}
              <div className={styles.editorSection}>
                <h3>Co-Editor</h3>
                {journalEditors.co_editor ? (
                  <div className={styles.editorCard}>
                    <div className={styles.editorInfo}>
                      <strong>{journalEditors.co_editor.editor_name}</strong>
                      <span>{journalEditors.co_editor.editor_email}</span>
                    </div>
                    <button 
                      className={styles.removeBtn}
                      onClick={() => handleRemoveEditor(journalEditors.co_editor.id, journalEditors.co_editor.editor_name)}
                    >
                      <span className="material-symbols-rounded">person_remove</span>
                    </button>
                  </div>
                ) : (
                  <p className={styles.noEditor}>No co-editor assigned</p>
                )}
              </div>

              {/* Section Editors */}
              <div className={styles.editorSection}>
                <h3>Section Editors ({journalEditors.section_editors.length})</h3>
                {journalEditors.section_editors.length > 0 ? (
                  journalEditors.section_editors.map((editor) => (
                    <div key={editor.id} className={styles.editorCard}>
                      <div className={styles.editorInfo}>
                        <strong>{editor.editor_name}</strong>
                        <span>{editor.editor_email}</span>
                      </div>
                      <button 
                        className={styles.removeBtn}
                        onClick={() => handleRemoveEditor(editor.id, editor.editor_name)}
                      >
                        <span className="material-symbols-rounded">person_remove</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <p className={styles.noEditor}>No section editors assigned</p>
                )}
              </div>

              {/* Add New Editor Form */}
              <div className={styles.addEditorForm}>
                <h3>
                  <span className="material-symbols-rounded">person_add</span>
                  Add New Editor
                </h3>
                
                {loadingEditors ? (
                  <div className={styles.loadingState}>
                    <span className="material-symbols-rounded">hourglass_empty</span>
                    Loading available users...
                  </div>
                ) : availableEditors.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span className="material-symbols-rounded">info</span>
                    No available users to assign as editors
                  </div>
                ) : (
                  <>
                    <div className={styles.formGroup}>
                      <label>Select Editor *</label>
                      <select
                        value={newEditor.selected_user_id}
                        onChange={(e) => handleEditorSelect(e.target.value)}
                        className={styles.editorSelect}
                      >
                        <option value="">-- Select a user --</option>
                        {availableEditors.map((user) => (
                          <option key={user.id} value={user.id}>
                            {`${user.fname || ''} ${user.lname || ''}`.trim() || 'No Name'} ({user.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    {newEditor.selected_user_id && (
                      <div className={styles.selectedEditorPreview}>
                        <div className={styles.previewHeader}>
                          <span className="material-symbols-rounded">person</span>
                          Selected Editor Details
                        </div>
                        <div className={styles.previewContent}>
                          <div className={styles.previewRow}>
                            <span className={styles.previewLabel}>Name:</span>
                            <span className={styles.previewValue}>{newEditor.editor_name}</span>
                          </div>
                          <div className={styles.previewRow}>
                            <span className={styles.previewLabel}>Email:</span>
                            <span className={styles.previewValue}>{newEditor.editor_email}</span>
                          </div>
                          {newEditor.editor_affiliation && (
                            <div className={styles.previewRow}>
                              <span className={styles.previewLabel}>Affiliation:</span>
                              <span className={styles.previewValue}>{newEditor.editor_affiliation}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className={styles.formGroup}>
                      <label>Editor Type *</label>
                      <select
                        value={newEditor.editor_type}
                        onChange={(e) => setNewEditor({...newEditor, editor_type: e.target.value})}
                        className={styles.editorTypeSelect}
                      >
                        <option value="section_editor">Section Editor</option>
                        <option value="co_editor" disabled={!!journalEditors.co_editor}>
                          Co-Editor {journalEditors.co_editor ? '(Already assigned)' : ''}
                        </option>
                        <option value="chief_editor" disabled={!!journalEditors.chief_editor}>
                          Chief Editor {journalEditors.chief_editor ? '(Already assigned)' : ''}
                        </option>
                      </select>
                    </div>

                    <button 
                      className={styles.addEditorBtn}
                      onClick={handleAddEditor}
                      disabled={savingEditor || !newEditor.selected_user_id}
                    >
                      <span className="material-symbols-rounded">person_add</span>
                      {savingEditor ? 'Adding...' : 'Add Editor to Journal'}
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.closeModalBtn} onClick={() => setShowEditorsModal(false)}>
                <span className="material-symbols-rounded">close</span>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminJournals;
