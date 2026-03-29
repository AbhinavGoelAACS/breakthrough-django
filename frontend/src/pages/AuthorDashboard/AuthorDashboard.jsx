import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import acsApi from '../../api/apiService.js';
import CopyrightForm from '../../components/CopyrightForm';
import styles from './AuthorDashboard.module.css';

export const AuthorDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_submissions: 0,
    accepted_papers: 0,
    rejected_papers: 0,
    under_review: 0,
  });
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [pendingCopyrightForms, setPendingCopyrightForms] = useState([]);
  const [copyrightModalOpen, setCopyrightModalOpen] = useState(false);
  const [selectedCopyrightPaperId, setSelectedCopyrightPaperId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch dashboard stats
        const statsData = await acsApi.author.getDashboardStats();
        console.log('Dashboard stats received:', statsData);
        setStats({
          total_submissions: statsData?.total_submissions || 0,
          accepted_papers: statsData?.accepted_papers || 0,
          rejected_papers: statsData?.rejected_papers || 0,
          under_review: statsData?.under_review || 0,
        });
        
        // Fetch recent submissions
        try {
          const submissionsData = await acsApi.author.listSubmissions(0, 5);
          console.log('Submissions data received:', submissionsData);
          const papers = submissionsData?.papers || submissionsData || [];
          setRecentSubmissions(Array.isArray(papers) ? papers.slice(0, 5) : []);
        } catch (paperErr) {
          console.warn('Failed to fetch submissions:', paperErr);
          setRecentSubmissions([]);
        }
        
        // Fetch pending copyright forms
        try {
          const copyrightData = await acsApi.copyright.getPending();
          console.log('Copyright forms received:', copyrightData);
          setPendingCopyrightForms(copyrightData?.forms || []);
        } catch (copyrightErr) {
          console.warn('Failed to fetch copyright forms:', copyrightErr);
          setPendingCopyrightForms([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err.response?.data?.detail || 'Failed to load dashboard data');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusColorClass = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('submit')) return 'Blue';
    if (statusLower.includes('review')) return 'Amber';
    if (statusLower.includes('accept') || statusLower.includes('publish')) return 'Emerald';
    if (statusLower.includes('reject')) return 'Rose';
    return 'Slate';
  };

  const getTimeRemaining = (deadline) => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diff = deadlineDate - now;
    
    if (diff <= 0) return { text: 'Expired', urgent: true };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      text: `${hours}h ${minutes}m remaining`,
      urgent: hours < 12
    };
  };

  const openCopyrightModal = (paperId) => {
    setSelectedCopyrightPaperId(paperId);
    setCopyrightModalOpen(true);
  };

  const handleCopyrightSuccess = () => {
    // Remove the completed form from the list
    setPendingCopyrightForms(forms => forms.filter(f => f.paper_id !== selectedCopyrightPaperId));
  };

  if (loading) {
    return (
      <div className={styles.dashboardLoading}>
        <span className={`material-symbols-rounded ${styles.loadingIcon}`}>clock_loader_20</span>
        <span>Loading</span>
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
    <div className={styles.authorDashboard}>
      {/* Copyright Transfer Form Banner */}
      {pendingCopyrightForms.length > 0 && (
        <div className={styles.copyrightBanner}>
          <div className={styles.copyrightBannerIcon}>
            <span className="material-symbols-rounded">contract</span>
          </div>
          <div className={styles.copyrightBannerContent}>
            <h3>Action Required: Copyright Transfer Form</h3>
            <p>You have {pendingCopyrightForms.length} accepted paper{pendingCopyrightForms.length > 1 ? 's' : ''} requiring copyright transfer agreement.</p>
            <div className={styles.copyrightFormsList}>
              {pendingCopyrightForms.map((form) => {
                const timeRemaining = getTimeRemaining(form.deadline);
                return (
                  <button
                    key={form.paper_id}
                    className={styles.copyrightFormItem}
                    onClick={() => openCopyrightModal(form.paper_id)}
                  >
                    <span className={styles.copyrightFormTitle}>{form.paper_title}</span>
                    <span className={`${styles.copyrightDeadline} ${timeRemaining.urgent ? styles.urgent : ''}`}>
                      {timeRemaining.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Copyright Form Modal */}
      <CopyrightForm
        isOpen={copyrightModalOpen}
        onClose={() => setCopyrightModalOpen(false)}
        paperId={selectedCopyrightPaperId}
        onSuccess={handleCopyrightSuccess}
      />

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
              <span className="material-symbols-rounded">description</span>
            </div>
            <span className={`${styles.statTrend} ${styles.statTrendUp}`}>↑ 8%</span>
          </div>
          <div className={styles.statBottom}>
            <p className={styles.statLabel}>Total Submissions</p>
            <h3 className={styles.statNumber}>{(stats.total_submissions || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.statIconEmerald}`}>
              <span className="material-symbols-rounded">check_circle</span>
            </div>
            <span className={`${styles.statTrend} ${styles.statTrendUp}`}>↑ 3%</span>
          </div>
          <div className={styles.statBottom}>
            <p className={styles.statLabel}>Accepted Papers</p>
            <h3 className={styles.statNumber}>{(stats.accepted_papers || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.statIconAmber}`}>
              <span className="material-symbols-rounded">history_edu</span>
            </div>
            <span className={`${styles.statTrend} ${styles.statTrendUp}`}>↑ 5%</span>
          </div>
          <div className={styles.statBottom}>
            <p className={styles.statLabel}>Under Review</p>
            <h3 className={styles.statNumber}>{(stats.under_review || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.statIconRose}`}>
              <span className="material-symbols-rounded">cancel</span>
            </div>
            <span className={`${styles.statTrend} ${styles.statTrendDown}`}>↓ 1%</span>
          </div>
          <div className={styles.statBottom}>
            <p className={styles.statLabel}>Rejected Papers</p>
            <h3 className={styles.statNumber}>{(stats.rejected_papers || 0).toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Section Heading */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>My Recent Submissions</h2>
        <Link to="/author/submissions" className={styles.viewAllLink}>View All</Link>
      </div>

      {/* Main Content Grid */}
      <div className={styles.dashboardGrid}>
        {/* Recent Submissions */}
        <div className={`${styles.dashboardCard} ${styles.submissionsCard}`}>
          <div className={styles.tableWrapper}>
            {recentSubmissions.length > 0 ? (
              <table className={styles.submissionsTable}>
                <thead>
                  <tr>
                    <th>Paper Title</th>
                    <th>Journal</th>
                    <th>Status</th>
                    <th>Paper ID</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSubmissions.map((paper, index) => (
                    <tr 
                      key={paper.id || index}
                      onClick={() => navigate(`/author/submissions/${paper.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className={styles.titleCell}>
                        <span className={styles.paperTitle}>{paper.title || paper.name || 'Untitled Paper'}</span>
                      </td>
                      <td className={styles.journalCell}>
                        {paper.journal_name || (typeof paper.journal === 'object' ? paper.journal?.name : paper.journal) || 'No Journal'}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[`statusBadge${getStatusColorClass(paper.status)}`]}`}>
                          {paper.status || 'Unknown'}
                        </span>
                      </td>
                      <td className={styles.idCell}>#{paper.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.noData}>
                <span className="material-symbols-rounded">inbox</span>
                <p>No recent submissions</p>
              </div>
            )}
          </div>
        </div>
       
    
      </div>
    </div>
  );
};

export default AuthorDashboard;
