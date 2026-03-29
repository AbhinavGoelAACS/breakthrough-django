import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import acsApi from '../../api/apiService.js';
import { formatDateIST } from '../../utils/dateUtils';
import styles from './EditorDashboard.module.css';

export const EditorDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_papers: 0,
    pending_review: 0,
    under_review: 0,
    ready_for_publish: 0,
  });
  const [recentPapers, setRecentPapers] = useState([]);
  const [allPapers, setAllPapers] = useState([]);
  const [filteredPapers, setFilteredPapers] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch dashboard stats with error handling
        try {
          const statsData = await acsApi.editor.getDashboardStats();
          setStats(statsData || {
            total_papers: 0,
            pending_review: 0,
            under_review: 0,
            ready_for_publish: 0,
          });
        } catch (statsErr) {
          console.warn('Failed to fetch dashboard stats, using defaults:', statsErr);
          // Continue with default stats
        }
        
        // Fetch papers
        try {
          const queueData = await acsApi.editor.getPaperQueue(0, 10);
          const papers = queueData.papers || queueData || [];
          const papersArray = Array.isArray(papers) ? papers : [];
          setAllPapers(papersArray);
          setRecentPapers(papersArray.slice(0, 5));
          setFilteredPapers(papersArray);
        } catch (queueErr) {
          console.warn('Failed to fetch paper queue:', queueErr);
          setAllPapers([]);
          setRecentPapers([]);
          setFilteredPapers([]);
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

  const handleFilterChange = (status) => {
    setFilterStatus(status);
    if (status === 'all') {
      setFilteredPapers(allPapers);
    } else {
      setFilteredPapers(allPapers.filter(paper => {
        const paperStatus = paper.status?.toLowerCase() || '';
        return paperStatus.includes(status.toLowerCase());
      }));
    }
  };

  const getStatusColorClass = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('submit') || statusLower.includes('pending')) return 'Blue';
    if (statusLower.includes('review')) return 'Amber';
    if (statusLower.includes('accept') || statusLower.includes('publish')) return 'Emerald';
    if (statusLower.includes('reject')) return 'Rose';
    return 'Slate';
  };

  const getStatusIcon = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('submit') || statusLower.includes('pending')) return 'article';
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
    <div className={styles.editorDashboard}>
      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
              <span className="material-symbols-rounded">description</span>
            </div>
            <span className={`${styles.statTrend} ${stats.total_papers > 0 ? styles.statTrendUp : styles.statTrendStable}`}>
              {stats.total_papers > 0 ? '↑ New' : 'Stable'}
            </span>
          </div>
          <div className={styles.statBottom}>
            <p className={styles.statLabel}>Total Papers</p>
            <h3 className={styles.statNumber}>{(stats.total_papers || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.statIconEmerald}`}>
              <span className="material-symbols-rounded">rate_review</span>
            </div>
            <span className={`${styles.statTrend} ${styles.statTrendUp}`}>↑ Pending</span>
          </div>
          <div className={styles.statBottom}>
            <p className={styles.statLabel}>Pending Review</p>
            <h3 className={styles.statNumber}>{(stats.pending_review || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.statIconAmber}`}>
              <span className="material-symbols-rounded">search</span>
            </div>
            <span className={`${styles.statTrend} ${styles.statTrendDown}`}>↓ Reviewing</span>
          </div>
          <div className={styles.statBottom}>
            <p className={styles.statLabel}>Under Review</p>
            <h3 className={styles.statNumber}>{(stats.under_review || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.statIconPurple}`}>
              <span className="material-symbols-rounded">check_circle</span>
            </div>
            <span className={`${styles.statTrend} ${styles.statTrendUp}`}>↑ Ready</span>
          </div>
          <div className={styles.statBottom}>
            <p className={styles.statLabel}>Ready to Publish</p>
            <h3 className={styles.statNumber}>{(stats.ready_for_publish || 0).toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.dashboardGrid}>
        {/* Paper Queue Section */}
        <div className={`${styles.dashboardCard} ${styles.papersCard}`}>
          <div className={styles.cardHeader}>
            <h3>Paper Queue</h3>
            <div className={styles.filterButtons}>
              <button 
                className={`${styles.filterBtn} ${filterStatus === 'all' ? styles.filterBtnActive : ''}`}
                onClick={() => handleFilterChange('all')}
              >
                All
              </button>
              <button 
                className={`${styles.filterBtn} ${filterStatus === 'pending' ? styles.filterBtnActive : ''}`}
                onClick={() => handleFilterChange('pending')}
              >
                Pending
              </button>
              <button 
                className={`${styles.filterBtn} ${filterStatus === 'under' ? styles.filterBtnActive : ''}`}
                onClick={() => handleFilterChange('under')}
              >
                Under Review
              </button>
              <button 
                className={`${styles.filterBtn} ${filterStatus === 'ready' ? styles.filterBtnActive : ''}`}
                onClick={() => handleFilterChange('ready')}
              >
                Ready
              </button>
            </div>
          </div>
          <div className={styles.tableWrapper}>
            {filteredPapers.length > 0 ? (
              <table className={styles.papersTable}>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Journal</th>
                    <th>Submitted</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPapers.map((paper, index) => (
                    <tr 
                      key={paper.id || index} 
                      onClick={() => navigate(`/editor/papers/${paper.id}`)}
                      className={styles.clickableRow}
                    >
                      <td className={styles.titleCell}>{paper.title || paper.name || 'Untitled'}</td>
                      <td>{paper.author_name || (typeof paper.author === 'object' ? paper.author?.name : paper.author) || 'N/A'}</td>
                      <td>{paper.journal_name || (typeof paper.journal === 'object' ? paper.journal?.name : paper.journal) || 'N/A'}</td>
                      <td>{formatDateIST(paper.submitted_date)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[`statusBadge${getStatusColorClass(paper.status)}`]}`}>
                          {paper.status || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.noData}>
                <span className="material-symbols-rounded">inbox</span>
                <p>No papers found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorDashboard;
