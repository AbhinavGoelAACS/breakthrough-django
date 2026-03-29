import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import acsApi from '../../api/apiService.js';
import styles from './AdminAnalytics.module.css';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];

export const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submissionTrends, setSubmissionTrends] = useState([]);
  const [topReviewers, setTopReviewers] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [journalStats, setJournalStats] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [reviewMetrics, setReviewMetrics] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all analytics data in parallel
        const [
          trendsRes,
          reviewersRes,
          statusRes,
          journalRes,
          growthRes,
          metricsRes
        ] = await Promise.all([
          acsApi.admin.getSubmissionTrends(6),
          acsApi.admin.getTopReviewers(10),
          acsApi.admin.getStatusDistribution(),
          acsApi.admin.getJournalStats(),
          acsApi.admin.getUserGrowth(6),
          acsApi.admin.getReviewMetrics()
        ]);

        setSubmissionTrends(trendsRes.trends || []);
        setTopReviewers(reviewersRes.reviewers || []);
        setStatusDistribution(statusRes.distribution || []);
        setJournalStats(journalRes.journal_stats || []);
        setUserGrowth(growthRes.growth || []);
        setReviewMetrics(metricsRes);

        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        setError(err.response?.data?.detail || 'Failed to load analytics');
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const formatStatusLabel = (status) => {
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <span className={`material-symbols-rounded ${styles.loadingIcon}`}>hourglass_empty</span>
        <span>Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <span className="material-symbols-rounded">error</span>
        <span>Error: {error}</span>
      </div>
    );
  }

  return (
    <div className={styles.analyticsPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Analytics Dashboard</h1>
          <p>Comprehensive insights into submissions, reviews, and user activity</p>
        </div>
        <Link to="/admin" className={styles.backLink}>
          <span className="material-symbols-rounded">arrow_back</span>
          Back to Dashboard
        </Link>
      </div>

      {/* Charts Grid */}
      <div className={styles.chartsGrid}>
        {/* Submission Trends */}
        <div className={`${styles.chartCard} ${styles.wide}`}>
          <div className={styles.chartHeader}>
            <h3>
              <span className="material-symbols-rounded">trending_up</span>
              Submission Trends
            </h3>
            <span className={styles.subtitle}>Monthly submissions over the past 6 months</span>
          </div>
          <div className={styles.chartContainer}>
            {submissionTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={submissionTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="submissions"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.noData}>
                <span className="material-symbols-rounded">inbox</span>
                <p>No submission data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Reviewers */}
        <div className={`${styles.chartCard} ${styles.wide}`}>
          <div className={styles.chartHeader}>
            <h3>
              <span className="material-symbols-rounded">star</span>
              Top Reviewers
            </h3>
            <span className={styles.subtitle}>Reviewers with most completed reviews</span>
          </div>
          <div className={styles.chartContainer}>
            {topReviewers.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topReviewers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px'
                    }}
                    formatter={(value, name) => [value, name === 'reviews_completed' ? 'Reviews' : name]}
                  />
                  <Bar dataKey="reviews_completed" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.noData}>
                <span className="material-symbols-rounded">inbox</span>
                <p>No reviewer data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>
              <span className="material-symbols-rounded">pie_chart</span>
              Status Distribution
            </h3>
            <span className={styles.subtitle}>Papers by current status</span>
          </div>
          <div className={styles.chartContainer}>
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ status, count }) => `${formatStatusLabel(status)}: ${count}`}
                    labelLine={false}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, formatStatusLabel(name)]}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.noData}>
                <span className="material-symbols-rounded">inbox</span>
                <p>No status data available</p>
              </div>
            )}
          </div>
        </div>

        {/* User Growth */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>
              <span className="material-symbols-rounded">group_add</span>
              User Growth
            </h3>
            <span className={styles.subtitle}>New registrations per month</span>
          </div>
          <div className={styles.chartContainer}>
            {userGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="new_users" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.noData}>
                <span className="material-symbols-rounded">inbox</span>
                <p>No user growth data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Journal Stats */}
        <div className={`${styles.chartCard} ${styles.wide}`}>
          <div className={styles.chartHeader}>
            <h3>
              <span className="material-symbols-rounded">library_books</span>
              Journal Statistics
            </h3>
            <span className={styles.subtitle}>Submissions by journal</span>
          </div>
          <div className={styles.chartContainer}>
            {journalStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={journalStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="journal_name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="accepted" stackId="a" fill="#10B981" name="Accepted" />
                  <Bar dataKey="under_review" stackId="a" fill="#F59E0B" name="Under Review" />
                  <Bar dataKey="rejected" stackId="a" fill="#EF4444" name="Rejected" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.noData}>
                <span className="material-symbols-rounded">inbox</span>
                <p>No journal data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Review Metrics */}
        {reviewMetrics && (
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>
                <span className="material-symbols-rounded">rate_review</span>
                Review Metrics
              </h3>
              <span className={styles.subtitle}>Overall review statistics</span>
            </div>
            <div className={styles.metricsContainer}>
              <div className={styles.metricItem}>
                <span className={styles.metricValue}>{reviewMetrics.total_reviews}</span>
                <span className={styles.metricLabel}>Total Reviews</span>
              </div>
              <div className={styles.ratingsGrid}>
                <div className={styles.ratingItem}>
                  <span className={styles.ratingLabel}>Technical Quality</span>
                  <span className={styles.ratingValue}>{reviewMetrics.average_ratings?.technical_quality || 0}/5</span>
                </div>
                <div className={styles.ratingItem}>
                  <span className={styles.ratingLabel}>Clarity</span>
                  <span className={styles.ratingValue}>{reviewMetrics.average_ratings?.clarity || 0}/5</span>
                </div>
                <div className={styles.ratingItem}>
                  <span className={styles.ratingLabel}>Originality</span>
                  <span className={styles.ratingValue}>{reviewMetrics.average_ratings?.originality || 0}/5</span>
                </div>
                <div className={styles.ratingItem}>
                  <span className={styles.ratingLabel}>Significance</span>
                  <span className={styles.ratingValue}>{reviewMetrics.average_ratings?.significance || 0}/5</span>
                </div>
              </div>
              {reviewMetrics.recommendation_distribution?.length > 0 && (
                <div className={styles.recommendationList}>
                  {reviewMetrics.recommendation_distribution.map((rec, idx) => (
                    <div key={idx} className={styles.recommendationItem}>
                      <span>{formatStatusLabel(rec.recommendation)}</span>
                      <span className={styles.recCount}>{rec.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;
