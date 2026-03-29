import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import acsApi from '../../api/apiService.js';
import { formatDateIST } from '../../utils/dateUtils';
import styles from './ReviewerDashboard.module.css';

export const ReviewerDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_assignments: 0,
    pending_reviews: 0,
    completed_reviews: 0,
  });
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const statsData = await acsApi.reviewer.getDashboardStats();
        setStats({
          total_assignments: statsData?.total_assignments || 0,
          pending_reviews: statsData?.pending_reviews || 0,
          completed_reviews: statsData?.completed_reviews || 0,
        });
        
        try {
          const assignmentsData = await acsApi.reviewer.listAssignments(0, 5);
          const assignments = assignmentsData?.assignments || assignmentsData || [];
          setRecentAssignments(Array.isArray(assignments) ? assignments.slice(0, 5) : []);
        } catch (assignErr) {
          console.warn('Failed to fetch assignments:', assignErr);
          setRecentAssignments([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err.response?.data?.detail || 'Failed to load dashboard data');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAuthenticated, user]);

  const getStatusColorClass = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('pending')) return 'Amber';
    if (statusLower.includes('progress') || statusLower.includes('in_progress')) return 'Blue';
    if (statusLower.includes('submit') || statusLower.includes('completed')) return 'Emerald';
    if (statusLower.includes('reject') || statusLower.includes('declined')) return 'Rose';
    return 'Slate';
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
    <div className={styles.reviewerDashboard}>
      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
              <span className="material-symbols-rounded">assignment</span>
            </div>
            <span className={`${styles.statTrend} ${styles.statTrendUp}`}>↑ Active</span>
          </div>
          <div className={styles.statBottom}>
            <p className={styles.statLabel}>Total Assignments</p>
            <h3 className={styles.statNumber}>{(stats.total_assignments || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.statIconAmber}`}>
              <span className="material-symbols-rounded">rate_review</span>
            </div>
            <span className={`${styles.statTrend} ${styles.statTrendDown}`}>Action Required</span>
          </div>
          <div className={styles.statBottom}>
            <p className={styles.statLabel}>Pending Reviews</p>
            <h3 className={styles.statNumber}>{(stats.pending_reviews || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <div className={`${styles.statIcon} ${styles.statIconEmerald}`}>
              <span className="material-symbols-rounded">check_circle</span>
            </div>
            <span className={`${styles.statTrend} ${styles.statTrendUp}`}>↑ Great</span>
          </div>
          <div className={styles.statBottom}>
            <p className={styles.statLabel}>Completed Reviews</p>
            <h3 className={styles.statNumber}>{(stats.completed_reviews || 0).toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Section Heading */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Recent Assignments</h2>
        <Link to="/reviewer/assignments" className={styles.viewAllLink}>View All</Link>
      </div>

      {/* Recent Assignments Table */}
      <div className={styles.dashboardCard}>
        <div className={styles.tableWrapper}>
          {recentAssignments.length > 0 ? (
            <table className={styles.assignmentsTable}>
              <thead>
                <tr>
                  <th>Paper Title</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentAssignments.map((assignment, index) => (
                  <tr key={assignment.id || index}>
                    <td className={styles.titleCell}>
                      <span className={styles.paperTitle}>
                        {assignment.paper_title || 'Untitled Paper'}
                      </span>
                      {assignment.paper_version > 1 && (
                        <span className={styles.versionTag}>v{assignment.paper_version}</span>
                      )}
                      {assignment.is_resubmission && assignment.status === 'pending' && (
                        <span className={styles.resubmitBadge}>Re-review</span>
                      )}
                    </td>
                    <td className={styles.dateCell}>
                      {formatDateIST(assignment.due_date)}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[`statusBadge${getStatusColorClass(assignment.status)}`]}`}>
                        {assignment.is_resubmission && assignment.status === 'pending' 
                          ? 'Re-review Pending' 
                          : assignment.status || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.reviewBtn}
                        onClick={() => navigate(`/reviewer/assignments/${assignment.id}/review`)}
                      >
                        <span className="material-symbols-rounded">chevron_right</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.noData}>
              <span className="material-symbols-rounded">inbox</span>
              <p>No assignments yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewerDashboard;
