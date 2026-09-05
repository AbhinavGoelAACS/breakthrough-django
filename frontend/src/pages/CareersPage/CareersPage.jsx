import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../api/apiService';
import styles from './CareersPage.module.css';

const CareersPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await apiService.get('/api/v1/careers/jobs', { skipAuth: true });
        const list = Array.isArray(data) ? data : data?.jobs || [];
        setJobs(list);
      } catch (err) {
        setError(err.response?.data?.detail || 'Unable to load open roles right now.');
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, []);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <span className={styles.eyebrow}>Breakthrough Publishers</span>
            <h1 className={styles.title}>Build the next chapter of scholarly publishing.</h1>
            <p className={styles.subtitle}>
              Join a team that is shaping research, editorial operations, and digital publishing across journals,
              books, and scholarly communities.
            </p>
            <div className={styles.heroActions}>
              <a href="#open-roles" className={styles.primaryBtn}>View open roles</a>
              <a href="#how-we-work" className={styles.secondaryBtn}>Why work with us</a>
            </div>
          </div>

          <div className={styles.stats}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{jobs.length || 0}</span>
              <span className={styles.statLabel}>Open positions</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>Remote-ready</span>
              <span className={styles.statLabel}>Flexible collaboration</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>Research-first</span>
              <span className={styles.statLabel}>Mission-driven culture</span>
            </div>
          </div>
        </div>
      </section>

      <main className={styles.content}>
        <section id="open-roles">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Open roles</h2>
            <span className={styles.sectionMeta}>{jobs.length} roles currently live</span>
          </div>

          {loading ? (
            <div className={styles.emptyState}>Loading opportunities...</div>
          ) : error ? (
            <div className={styles.emptyState}>{error}</div>
          ) : jobs.length === 0 ? (
            <div className={styles.emptyState}>No roles are open right now. Please check back soon.</div>
          ) : (
            <div className={styles.jobsGrid}>
              {jobs.map((job) => (
                <article key={job.id} className={styles.jobCard}>
                  <div className={styles.jobHeader}>
                    <h3 className={styles.jobTitle}>{job.title}</h3>
                    <span className={styles.jobType}>{job.employment_type || 'Full Time'}</span>
                  </div>

                  <div className={styles.jobMeta}>
                    <span>{job.location || 'Remote'}</span>
                    <span className={styles.dot}>•</span>
                    <span>{job.department || 'Operations'}</span>
                    <span className={styles.dot}>•</span>
                    <span>{job.experience_level || 'Mid-Senior'}</span>
                  </div>

                  <p className={styles.jobDesc}>{job.description}</p>

                  <div className={styles.skillList}>
                    {(job.required_skills || []).slice(0, 5).map((skill) => (
                      <span key={skill} className={styles.skillPill}>{skill}</span>
                    ))}
                  </div>

                  <Link to={`/careers/${job.slug}`} className={styles.cardLink}>View role and apply</Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default CareersPage;
