import React, { useState, useEffect } from 'react';
import apiService from '../../api/apiService';
import { useToast } from '../../hooks/useToast';
import styles from './AdminSettings.module.css';

const AdminSettings = () => {
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState('news');
  const [loading, setLoading] = useState(false);
  
  // News state
  const [newsList, setNewsList] = useState([]);
  const [newsForm, setNewsForm] = useState({ title: '', description: '', journal_id: '' });
  const [editingNewsId, setEditingNewsId] = useState(null);
  const [journals, setJournals] = useState([]);
  
  // Settings state
  const [settings, setSettings] = useState({
    siteName: 'Breakthrough Publishers India Journal System',
    adminEmail: 'admin@breakthroughpublishers.org',
    emailNotifications: true,
    autoAssignReviewers: false,
    reviewDeadlineDays: 14,
    maxFileSize: 10,
    minReviewers: 2,
    enableTwoFactor: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
  });

  useEffect(() => {
    if (activeTab === 'news') {
      fetchNews();
      fetchJournals();
    }
  }, [activeTab]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const response = await apiService.admin.listNews();
      const data = response?.data;
      if (data && Array.isArray(data.news)) {
        setNewsList(data.news);
      } else if (Array.isArray(data)) {
        setNewsList(data);
      } else {
        setNewsList([]);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      showError('Failed to fetch news');
    } finally {
      setLoading(false);
    }
  };

  const fetchJournals = async () => {
    try {
      const response = await apiService.getJournals();
      // Handle both array and object response formats
      const journalData = response.data;
      if (Array.isArray(journalData)) {
        setJournals(journalData);
      } else if (journalData && journalData.journals) {
        setJournals(journalData.journals);
      } else {
        setJournals([]);
      }
    } catch (error) {
      console.error('Error fetching journals:', error);
    }
  };

  const handleNewsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newsData = {
        title: newsForm.title,
        description: newsForm.description,
        journal_id: newsForm.journal_id ? parseInt(newsForm.journal_id) : null,
      };
      
      if (editingNewsId) {
        await apiService.admin.updateNews(editingNewsId, newsData);
        success('News updated successfully');
      } else {
        await apiService.admin.createNews(newsData);
        success('News created successfully');
      }
      
      setNewsForm({ title: '', description: '', journal_id: '' });
      setEditingNewsId(null);
      fetchNews();
    } catch (error) {
      console.error('Error saving news:', error);
      showError('Failed to save news');
    } finally {
      setLoading(false);
    }
  };

  const handleEditNews = (news) => {
    setNewsForm({
      title: news.title,
      description: news.description || '',
      journal_id: news.journal_id || '',
    });
    setEditingNewsId(news.id);
  };

  const handleDeleteNews = async (newsId) => {
    if (!window.confirm('Are you sure you want to delete this news item?')) return;
    
    setLoading(true);
    try {
      await apiService.admin.deleteNews(newsId);
      success('News deleted successfully');
      fetchNews();
    } catch (error) {
      console.error('Error deleting news:', error);
      showError('Failed to delete news');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // In a real app, this would save to backend
      success('Settings saved successfully');
    } catch (error) {
      showError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'news', label: 'News & Announcements' },
    { id: 'general', label: 'General Settings' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'review', label: 'Review Settings' },
    { id: 'security', label: 'Security' },
    { id: 'maintenance', label: 'Maintenance' },
  ];

  return (
    <div className={styles.settingsPage}>
      <h1 className={styles.pageTitle}>Admin Settings</h1>

      <div className={styles.tabNav}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {/* News Tab */}
        {activeTab === 'news' && (
          <div className={styles.newsTab}>
            <h2>{editingNewsId ? 'Edit News' : 'Add News/Announcement'}</h2>
            <form onSubmit={handleNewsSubmit} className={styles.newsForm}>
              <div className={styles.formGroup}>
                <label htmlFor="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  value={newsForm.title}
                  onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                  required
                  placeholder="Enter news title"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={newsForm.description}
                  onChange={(e) => setNewsForm({ ...newsForm, description: e.target.value })}
                  rows={4}
                  placeholder="Enter news description"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="journal">Journal (Optional)</label>
                <select
                  id="journal"
                  value={newsForm.journal_id}
                  onChange={(e) => setNewsForm({ ...newsForm, journal_id: e.target.value })}
                >
                  <option value="">-- General Announcement --</option>
                  {journals.map(journal => (
                    <option key={journal.id || journal.fld_id} value={journal.id || journal.fld_id}>
                      {journal.name || journal.fld_journal_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                  {loading ? 'Saving...' : (editingNewsId ? 'Update News' : 'Add News')}
                </button>
                {editingNewsId && (
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => {
                      setNewsForm({ title: '', description: '', journal_id: '' });
                      setEditingNewsId(null);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <h2>News List</h2>
            {loading && <p>Loading...</p>}
            {!loading && newsList.length === 0 && (
              <p className={styles.emptyState}>No news items found. Add your first announcement above.</p>
            )}
            <div className={styles.newsList}>
              {newsList.map(news => (
                <div key={news.id} className={styles.newsCard}>
                  <div className={styles.newsHeader}>
                    <h3>{news.title}</h3>
                    <span className={styles.newsDate}>{news.added_on}</span>
                  </div>
                  <p>{news.description}</p>
                  {news.journal_name && (
                    <span className={styles.journalTag}>{news.journal_name}</span>
                  )}
                  <div className={styles.newsActions}>
                    <button onClick={() => handleEditNews(news)} className={styles.editBtn}>
                      Edit
                    </button>
                    <button onClick={() => handleDeleteNews(news.id)} className={styles.deleteBtn}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <div className={styles.settingsSection}>
            <h2>General Settings</h2>
            <div className={styles.formGroup}>
              <label>Site Name</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => handleSettingChange('siteName', e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Admin Email</label>
              <input
                type="email"
                value={settings.adminEmail}
                onChange={(e) => handleSettingChange('adminEmail', e.target.value)}
              />
            </div>
            <button onClick={handleSaveSettings} className={styles.primaryBtn} disabled={loading}>
              Save Settings
            </button>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className={styles.settingsSection}>
            <h2>Notification Settings</h2>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                />
                Enable Email Notifications
              </label>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={settings.autoAssignReviewers}
                  onChange={(e) => handleSettingChange('autoAssignReviewers', e.target.checked)}
                />
                Auto-assign Reviewers
              </label>
            </div>
            <button onClick={handleSaveSettings} className={styles.primaryBtn} disabled={loading}>
              Save Settings
            </button>
          </div>
        )}

        {/* Review Settings Tab */}
        {activeTab === 'review' && (
          <div className={styles.settingsSection}>
            <h2>Review Settings</h2>
            <div className={styles.formGroup}>
              <label>Review Deadline (days)</label>
              <input
                type="number"
                min="1"
                max="90"
                value={settings.reviewDeadlineDays}
                onChange={(e) => handleSettingChange('reviewDeadlineDays', parseInt(e.target.value))}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Maximum File Size (MB)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.maxFileSize}
                onChange={(e) => handleSettingChange('maxFileSize', parseInt(e.target.value))}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Minimum Reviewers per Paper</label>
              <input
                type="number"
                min="1"
                max="5"
                value={settings.minReviewers}
                onChange={(e) => handleSettingChange('minReviewers', parseInt(e.target.value))}
              />
            </div>
            <button onClick={handleSaveSettings} className={styles.primaryBtn} disabled={loading}>
              Save Settings
            </button>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className={styles.settingsSection}>
            <h2>Security Settings</h2>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={settings.enableTwoFactor}
                  onChange={(e) => handleSettingChange('enableTwoFactor', e.target.checked)}
                />
                Enable Two-Factor Authentication
              </label>
            </div>
            <div className={styles.formGroup}>
              <label>Session Timeout (minutes)</label>
              <input
                type="number"
                min="5"
                max="120"
                value={settings.sessionTimeout}
                onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Maximum Login Attempts</label>
              <input
                type="number"
                min="3"
                max="10"
                value={settings.maxLoginAttempts}
                onChange={(e) => handleSettingChange('maxLoginAttempts', parseInt(e.target.value))}
              />
            </div>
            <button onClick={handleSaveSettings} className={styles.primaryBtn} disabled={loading}>
              Save Settings
            </button>
          </div>
        )}

        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <div className={styles.settingsSection}>
            <h2>Maintenance</h2>
            <div className={styles.maintenanceActions}>
              <div className={styles.maintenanceCard}>
                <h3>Database Backup</h3>
                <p>Create a backup of the database.</p>
                <button className={styles.secondaryBtn}>Create Backup</button>
              </div>
              <div className={styles.maintenanceCard}>
                <h3>Clear Cache</h3>
                <p>Clear system cache to free up memory.</p>
                <button className={styles.secondaryBtn}>Clear Cache</button>
              </div>
              <div className={styles.maintenanceCard}>
                <h3>Reindex Search</h3>
                <p>Rebuild the search index for better results.</p>
                <button className={styles.secondaryBtn}>Reindex</button>
              </div>
              <div className={`${styles.maintenanceCard} ${styles.dangerCard}`}>
                <h3>Maintenance Mode</h3>
                <p>Put the site in maintenance mode.</p>
                <button className={styles.dangerBtn}>Enable Maintenance Mode</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
