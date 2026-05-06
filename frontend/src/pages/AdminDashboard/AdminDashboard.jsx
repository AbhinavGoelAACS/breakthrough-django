import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';
import { useToast } from '../../hooks/useToast';
import acsApi from '../../api/apiService.js';
import { formatAnnouncementContent } from '../../utils/announcementContent';
import styles from './AdminDashboard.module.css';

export const AdminDashboard = () => {
  useRole();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_users: 0,
    total_journals: 0,
    total_submissions: 0,
    pending_papers: 0,
    published_papers: 0,
  });
  const [recentPapers, setRecentPapers] = useState([]);
  const [journals, setJournals] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    description: '',
    journal_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatDate = (isoDate) => {
    if (!isoDate) return '';
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const normalizeNewsResponse = (response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.news)) return response.news;
    if (Array.isArray(response?.results)) return response.results;
    if (Array.isArray(response?.data?.news)) return response.data.news;
    if (Array.isArray(response?.data)) return response.data;
    return [];
  };

  const fetchAnnouncements = useCallback(async () => {
    try {
      setAnnouncementsLoading(true);
      const response = await acsApi.admin.listNews(0, 6);
      const news = normalizeNewsResponse(response);
      setAnnouncements(news);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
      setAnnouncements([]);
      showError('Failed to load announcements');
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [showError]);

  const fetchJournals = useCallback(async () => {
    try {
      const response = await acsApi.admin.listAllJournals(0, 50);
      const nextJournals = response?.journals || response || [];
      setJournals(Array.isArray(nextJournals) ? nextJournals : []);
    } catch (err) {
      console.error('Failed to fetch journals for announcements:', err);
      setJournals([]);
    }
  }, []);

  const resetAnnouncementForm = () => {
    setAnnouncementForm({ title: '', description: '', journal_id: '' });
    setEditingAnnouncementId(null);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch dashboard stats
        const statsData = await acsApi.admin.getDashboardStats();
        setStats({
          total_users: statsData?.total_users || 0,
          total_journals: statsData?.total_journals || 0,
          total_submissions: statsData?.total_submissions || 0,
          pending_papers: statsData?.pending_papers || 0,
          published_papers: statsData?.published_papers || 0,
        });
        
        // Fetch recent papers
        try {
          const papersData = await acsApi.admin.listAllPapers(0, 5);
          const papers = papersData?.papers || papersData || [];
          setRecentPapers(Array.isArray(papers) ? papers.slice(0, 5) : []);
        } catch (paperErr) {
          console.warn('Failed to fetch papers:', paperErr);
          setRecentPapers([]);
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err.response?.data?.detail || 'Failed to load dashboard data');
      } finally {
        await Promise.allSettled([fetchAnnouncements(), fetchJournals()]);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [fetchAnnouncements, fetchJournals]);

  const handleAnnouncementSubmit = async (event) => {
    event.preventDefault();
    setSavingAnnouncement(true);

    const payload = {
      title: announcementForm.title.trim(),
      description: announcementForm.description.trim(),
      journal_id: announcementForm.journal_id ? Number(announcementForm.journal_id) : null,
    };

    try {
      if (editingAnnouncementId) {
        await acsApi.admin.updateNews(editingAnnouncementId, payload);
        success('Announcement updated successfully');
      } else {
        await acsApi.admin.createNews(payload);
        success('Announcement created successfully');
      }

      resetAnnouncementForm();
      await fetchAnnouncements();
    } catch (err) {
      console.error('Failed to save announcement:', err);
      showError('Failed to save announcement');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleEditAnnouncement = (announcement) => {
    setAnnouncementForm({
      title: announcement.title || '',
      description: announcement.description || '',
      journal_id: announcement.journal_id ? String(announcement.journal_id) : '',
    });
    setEditingAnnouncementId(announcement.id);
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    setSavingAnnouncement(true);
    try {
      await acsApi.admin.deleteNews(announcementId);
      success('Announcement deleted successfully');
      if (editingAnnouncementId === announcementId) {
        resetAnnouncementForm();
      }
      await fetchAnnouncements();
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      showError('Failed to delete announcement');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const getStatusColorClass = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('submit')) return 'Blue';
    if (statusLower.includes('review')) return 'Amber';
    if (statusLower.includes('accept') || statusLower.includes('publish')) return 'Emerald';
    if (statusLower.includes('reject')) return 'Rose';
    return 'Slate';
  };

  const getStatusIcon = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('submit')) return 'article';
    if (statusLower.includes('review')) return 'history_edu';
    if (statusLower.includes('accept') || statusLower.includes('publish')) return 'check_circle';
    if (statusLower.includes('reject')) return 'cancel';
    return 'description';
  };

  if (loading) {
    return (
      <div className={styles.dashboardLoading}>
        <span className={`material-symbols-rounded ${styles.loadingIcon}`}>hourglass_empty</span>
        <span>Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboardError}>
        <span className="material-symbols-rounded">error</span>
        <span>Error: {error}</span>
      </div>
    );
  }

  return (
    <div className={styles.adminDashboard}>
      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
              <span className="material-symbols-rounded">description</span>
            </div>
          </div>
          <div className={styles.statBottom}>
            <p className={styles.statLabel}>Total Submissions</p>
            <h3 className={styles.statNumber}>{(stats.total_submissions || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.statIconEmerald}`}>
              <span className="material-symbols-rounded">book</span>
            </div>
          </div>
          <div className={styles.statBottom}>
            <p className={styles.statLabel}>Active Journals</p>
            <h3 className={styles.statNumber}>{(stats.total_journals || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.statIconAmber}`}>
              <span className="material-symbols-rounded">rate_review</span>
            </div>
          </div>
          <div className={styles.statBottom}>
            <p className={styles.statLabel}>Pending Reviews</p>
            <h3 className={styles.statNumber}>{(stats.pending_papers || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.statIconPurple}`}>
              <span className="material-symbols-rounded">group</span>
            </div>
          </div>
          <div className={styles.statBottom}>
            <p className={styles.statLabel}>Total Registered Users</p>
            <h3 className={styles.statNumber}>{(stats.total_users || 0).toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={styles.dashboardGrid}>
        {/* Recent Submissions */}
        <div className={`${styles.dashboardCard} ${styles.submissionsCard}`}>
          <div className={styles.cardHeader}>
            <h3>Recent Submissions</h3>
            <Link to="/admin/submissions" className={styles.viewAllLink}>View All</Link>
          </div>
          <div className={styles.submissionsList}>
            {recentPapers.length > 0 ? (
              recentPapers.map((paper, index) => (
                <div 
                  key={paper.id || index} 
                  className={styles.submissionItem}
                  onClick={() => navigate(`/admin/submissions/${paper.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.submissionContent}>
                    <div className={`${styles.submissionIcon} ${styles[`submissionIcon${getStatusColorClass(paper.status)}`]}`}>
                      <span className="material-symbols-rounded">{getStatusIcon(paper.status)}</span>
                    </div>
                    <div className={styles.submissionDetails}>
                      <h4>{paper.title || paper.name || 'Untitled Paper'}</h4>
                      <div className={styles.submissionMeta}>
                        <span className={`${styles.statusBadge} ${styles[`statusBadge${getStatusColorClass(paper.status)}`]}`}>
                          {paper.status || 'Unknown'}
                        </span>
                        <span className={styles.paperInfo}>
                          {paper.paper_code || `#${paper.id}`} • 
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>newspaper</span>
                            {paper.journal_name || (typeof paper.journal === 'object' ? paper.journal?.name : paper.journal) || 'No Journal'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noData}>
                <span className="material-symbols-rounded">inbox</span>
                <p>No recent submissions</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className={styles.dashboardSidebar}>
          <div className={`${styles.dashboardCard} ${styles.announcementsCard}`}>
            <div className={styles.cardHeader}>
              <h3>News & Announcements</h3>
              <Link to="/admin/settings" className={styles.viewAllLink}>Open Settings</Link>
            </div>

            <form className={styles.announcementForm} onSubmit={handleAnnouncementSubmit}>
              <input
                type="text"
                className={styles.announcementInput}
                placeholder="Announcement title"
                value={announcementForm.title}
                onChange={(event) => setAnnouncementForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
              <textarea
                className={styles.announcementTextarea}
                placeholder="Write announcement details"
                value={announcementForm.description}
                onChange={(event) => setAnnouncementForm((current) => ({ ...current, description: event.target.value }))}
                rows={4}
              />
              <select
                className={styles.announcementSelect}
                value={announcementForm.journal_id}
                onChange={(event) => setAnnouncementForm((current) => ({ ...current, journal_id: event.target.value }))}
              >
                <option value="">General announcement</option>
                {journals.map((journal) => (
                  <option key={journal.id || journal.fld_id} value={journal.id || journal.fld_id}>
                    {journal.name || journal.fld_journal_name}
                  </option>
                ))}
              </select>
              <div className={styles.announcementFormActions}>
                <button type="submit" className={styles.primaryActionBtn} disabled={savingAnnouncement}>
                  {savingAnnouncement ? 'Saving...' : editingAnnouncementId ? 'Update' : 'Publish'}
                </button>
                {editingAnnouncementId ? (
                  <button type="button" className={styles.secondaryActionBtn} onClick={resetAnnouncementForm} disabled={savingAnnouncement}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>

            <div className={styles.announcementList}>
              {announcementsLoading ? (
                <div className={styles.noData}>
                  <span className="material-symbols-rounded">hourglass_empty</span>
                  <p>Loading announcements...</p>
                </div>
              ) : announcements.length > 0 ? (
                announcements.map((announcement) => (
                  <article
                    key={announcement.id}
                    className={`${styles.announcementItem} ${announcement.journal_id ? styles.newsBanner : styles.announcementBanner}`}
                  >
                    <div className={styles.announcementItemHeader}>
                      <div>
                        <h4>{announcement.title || 'Untitled announcement'}</h4>
                        <p className={styles.announcementMetaText}>
                          {announcement.journal_name || 'General Announcement'}
                          {announcement.added_on ? ` • ${formatDate(announcement.added_on)}` : ''}
                        </p>
                      </div>
                      <span className={announcement.journal_id ? styles.newsTypePill : styles.announcementTypePill}>
                        {announcement.journal_id ? 'Journal News' : 'General Announcement'}
                      </span>
                      <div className={styles.announcementActions}>
                        <button
                          type="button"
                          className={styles.inlineEditBtn}
                          onClick={() => handleEditAnnouncement(announcement)}
                          disabled={savingAnnouncement}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.inlineDeleteBtn}
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                          disabled={savingAnnouncement}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className={styles.announcementBody}>
                      {formatAnnouncementContent(announcement.description || 'No description available.')}
                    </p>
                  </article>
                ))
              ) : (
                <div className={styles.noData}>
                  <span className="material-symbols-rounded">campaign</span>
                  <p>No announcements available</p>
                </div>
              )}
            </div>
          </div>

          {/* Analytics Preview */}
          <div className={`${styles.dashboardCard} ${styles.trendsCard}`}>
            <h3>Analytics</h3>
            <p className={styles.analyticsTeaser}>View detailed charts for submission trends, top reviewers, and more.</p>
            <Link to="/admin/analytics" className={styles.analyticsLink}>
              <span className="material-symbols-rounded">analytics</span>
              View Full Analytics
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
