import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import acsApi from '../../api/apiService';
import { useToast } from '../../hooks/useToast';
import styles from './EditorJournals.module.css';

const EditorJournals = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingJournal, setEditingJournal] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchMyJournals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await acsApi.editor.getMyJournals();
      setJournals(response.journals || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load your journals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyJournals();
  }, [fetchMyJournals]);

  // Get initials from journal name
  const getInitials = (name) => {
    if (!name) return 'JN';
    const words = name.split(' ').filter(w => w.length > 0);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleEdit = (journal) => {
    // Navigate to journal detail page with edit mode
    navigate(`/journal/${journal.journal_id}?edit=true`);
  };

  const handleView = (journal) => {
    navigate(`/journal/${journal.journal_id}`);
  };

  const handleSave = async () => {
    if (!editingJournal) return;
    
    setSaving(true);
    try {
      const updateData = {
        description: editingJournal.description,
        co_editor: editingJournal.co_editor,
        journal_logo: editingJournal.journal_logo,
        guidelines: editingJournal.guidelines,
      };
      
      // Add chief editor only fields if user is chief editor
      if (editingJournal.editor_type === 'chief_editor') {
        updateData.fld_journal_name = editingJournal.fld_journal_name;
        updateData.freq = editingJournal.freq;
        updateData.issn_ol = editingJournal.issn_ol;
        updateData.issn_prt = editingJournal.issn_prt;
        updateData.cheif_editor = editingJournal.cheif_editor;
      }
      
      await acsApi.editor.updateJournal(editingJournal.journal_id, updateData);
      success('Journal updated successfully!', 4000);
      setEditingJournal(null);
      fetchMyJournals();
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to update journal', 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (field, value) => {
    setEditingJournal(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading your journals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>My Journals</h1>
          <p>Journals assigned to you for editorial management</p>
        </div>
      </div>

      {journals.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={`material-symbols-rounded ${styles.emptyIcon}`}>library_books</span>
          <h3>No Journals Assigned</h3>
          <p>You don't have any journals assigned to you yet. Contact an administrator to get journal access.</p>
        </div>
      ) : (
        <div className={styles.journalGrid}>
          {journals.map((journal) => (
            <div key={journal.journal_id} className={styles.journalCard}>
              <div className={styles.cardHeader}>
                {journal.journal_logo ? (
                  <img 
                    src={journal.journal_logo} 
                    alt={journal.journal_name} 
                    className={styles.journalLogo}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={styles.logoPlaceholder} 
                  style={{ display: journal.journal_logo ? 'none' : 'flex' }}
                >
                  {getInitials(journal.journal_name)}
                </div>
                <div className={styles.journalInfo}>
                  <h3 className={styles.journalName}>{journal.journal_name}</h3>
                  <span className={`${styles.editorTypeBadge} ${
                    journal.editor_type === 'chief_editor' ? styles.chiefBadge : styles.sectionBadge
                  }`}>
                    <span className="material-symbols-rounded" style={{ fontSize: '0.85rem' }}>
                      {journal.editor_type === 'chief_editor' ? 'stars' : 'person'}
                    </span>
                    {journal.editor_type === 'chief_editor' ? 'Chief Editor' : 'Section Editor'}
                  </span>
                  <div className={styles.journalMeta}>
                    {journal.short_form && (
                      <span className={styles.metaItem}>
                        <span className="material-symbols-rounded">badge</span>
                        {journal.short_form}
                      </span>
                    )}
                    {journal.issn_online && (
                      <span className={styles.metaItem}>
                        <span className="material-symbols-rounded">tag</span>
                        {journal.issn_online}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.cardBody}>
                <p className={styles.description}>
                  {journal.description || 'No description available'}
                </p>

                {journal.paper_stats && (
                  <div className={styles.statsGrid}>
                    <div className={styles.statItem}>
                      <div className={styles.statValue}>{journal.paper_stats.total || 0}</div>
                      <div className={styles.statLabel}>Total Papers</div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statValue}>{journal.paper_stats.pending || 0}</div>
                      <div className={styles.statLabel}>Pending</div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statValue}>{journal.paper_stats.under_review || 0}</div>
                      <div className={styles.statLabel}>Under Review</div>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.cardActions}>
                <button 
                  className={`${styles.actionBtn} ${styles.editBtn}`}
                  onClick={() => handleEdit(journal)}
                >
                  <span className="material-symbols-rounded">edit</span>
                  Edit Journal
                </button>
                <button 
                  className={`${styles.actionBtn} ${styles.viewBtn}`}
                  onClick={() => handleView(journal)}
                >
                  <span className="material-symbols-rounded">visibility</span>
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingJournal && (
        <div className={styles.modalOverlay} onClick={() => setEditingJournal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Edit Journal</h2>
              <button className={styles.closeBtn} onClick={() => setEditingJournal(null)}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Basic Fields - All editors */}
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={editingJournal.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Journal description..."
                />
              </div>

              <div className={styles.formGroup}>
                <label>Co-Editor</label>
                <input
                  type="text"
                  value={editingJournal.co_editor}
                  onChange={(e) => handleFormChange('co_editor', e.target.value)}
                  placeholder="Co-editor name"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Journal Logo URL</label>
                <input
                  type="text"
                  value={editingJournal.journal_logo}
                  onChange={(e) => handleFormChange('journal_logo', e.target.value)}
                  placeholder="/images/logo.png"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Guidelines URL</label>
                <input
                  type="text"
                  value={editingJournal.guidelines}
                  onChange={(e) => handleFormChange('guidelines', e.target.value)}
                  placeholder="/guidelines.pdf"
                />
              </div>

              {/* Chief Editor Only Fields */}
              <div className={styles.formSection}>
                <h3>
                  {editingJournal.editor_type === 'chief_editor' 
                    ? 'Chief Editor Settings' 
                    : 'Restricted Fields (Chief Editor Only)'}
                </h3>

                <div className={styles.formGroup}>
                  <label>Journal Name</label>
                  <input
                    type="text"
                    value={editingJournal.fld_journal_name}
                    onChange={(e) => handleFormChange('fld_journal_name', e.target.value)}
                    placeholder="Journal name"
                    disabled={editingJournal.editor_type !== 'chief_editor'}
                  />
                  {editingJournal.editor_type !== 'chief_editor' && (
                    <p className={styles.restrictedNote}>Only chief editors can modify this field</p>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Publication Frequency</label>
                  <input
                    type="text"
                    value={editingJournal.freq}
                    onChange={(e) => handleFormChange('freq', e.target.value)}
                    placeholder="e.g., Quarterly"
                    disabled={editingJournal.editor_type !== 'chief_editor'}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>ISSN Online</label>
                  <input
                    type="text"
                    value={editingJournal.issn_ol}
                    onChange={(e) => handleFormChange('issn_ol', e.target.value)}
                    placeholder="XXXX-XXXX"
                    disabled={editingJournal.editor_type !== 'chief_editor'}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>ISSN Print</label>
                  <input
                    type="text"
                    value={editingJournal.issn_prt}
                    onChange={(e) => handleFormChange('issn_prt', e.target.value)}
                    placeholder="XXXX-XXXX"
                    disabled={editingJournal.editor_type !== 'chief_editor'}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Chief Editor Name</label>
                  <input
                    type="text"
                    value={editingJournal.cheif_editor}
                    onChange={(e) => handleFormChange('cheif_editor', e.target.value)}
                    placeholder="Chief editor name"
                    disabled={editingJournal.editor_type !== 'chief_editor'}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setEditingJournal(null)}>
                Cancel
              </button>
              <button 
                className={styles.saveBtn} 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <span className="material-symbols-rounded">save</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorJournals;
