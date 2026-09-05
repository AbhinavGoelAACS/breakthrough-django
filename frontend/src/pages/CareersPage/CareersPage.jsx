import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import acsApi from '../../api/apiService';
import { describeApiError, isNotFound } from '../../utils/apiError';
import styles from './CareersPage.module.css';

const EMPLOYMENT_LABELS = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  internship: 'Internship',
  contract: 'Contract',
};

export const CareersPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  // Tracked separately from `jobs` so a failed request is never rendered as
  // "no openings" — the reader needs to know it is worth retrying.
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Which card is currently showing its "Link copied" confirmation, if any.
  const [copiedJobId, setCopiedJobId] = useState(null);
  const copiedTimer = useRef(null);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await acsApi.careers.listJobs();
        const list = Array.isArray(data) ? data : data?.jobs || [];
        setJobs(list);
      } catch (err) {
        // A 404 means there is nothing here, not that something broke.
        if (!isNotFound(err)) {
          console.error('Error fetching jobs:', err);
          setError(describeApiError(err, 'We could not load the open roles.'));
        }
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [reloadKey]);

  const copyText = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    // The async clipboard is gated behind a secure context, so keep the old
    // selection trick for anyone hitting the site over plain http.
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    document.execCommand('copy');
    document.body.removeChild(field);
  };

  const handleShare = async (job) => {
    const url = `${window.location.origin}/careers/${job.slug}`;

    // On phones the OS share sheet is what people expect; on desktop it is
    // usually absent, and copying the link is the useful equivalent.
    if (navigator.share) {
      try {
        await navigator.share({
          title: job.title,
          text: `${job.title} at Breakthrough Publishers India`,
          url,
        });
        return;
      } catch (err) {
        // Dismissing the sheet is a choice, not a failure — only a real error
        // is worth falling back for.
        if (err?.name === 'AbortError') return;
      }
    }

    try {
      await copyText(url);
      setCopiedJobId(job.id);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopiedJobId(null), 2000);
    } catch (err) {
      console.error('Error sharing job:', err);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* ── Hero — the dark-green band used across the public site ── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <span className={styles.heroLabel}>Careers</span>
            <h1 className={styles.heroTitle}>Work on the record of research.</h1>
            <div className={styles.heroDivider} />
            <p className={styles.heroSubtitle}>
              Breakthrough Publishers India produces peer-reviewed journals, scholarly books and
              conference proceedings. The people who do that work — editors, reviewers coordinators,
              production staff and engineers — are what the imprint is.
            </p>
            <div className={styles.heroButtons}>
              <a href="#open-roles" className={styles.btnHeroPrimary}>
                View open roles
              </a>
            </div>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>
                {loading || error ? '—' : jobs.length}
              </span>
              <span className={styles.heroStatLabel}>
                {jobs.length === 1 ? 'Open position' : 'Open positions'}
              </span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>Journals · Books</span>
              <span className={styles.heroStatLabel}>What we publish</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Open roles ── */}
      <section id="open-roles" className={`${styles.section} ${styles.sectionSurface}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Open roles</span>
            <h2 className={styles.sectionTitle}>Positions we are hiring for</h2>
            <p className={styles.sectionBody}>
              Every role below is live. Applications are read by the editorial and operations leads
              who would work with you.
            </p>
          </div>

          {loading ? (
            <p className={styles.stateMessage}>Loading open roles…</p>
          ) : error ? (
            <div className={styles.loadError}>
              <span className="material-symbols-rounded">cloud_off</span>
              <div>
                <p className={styles.loadErrorTitle}>{error}</p>
                <button
                  type="button"
                  className={styles.retryBtn}
                  onClick={() => setReloadKey((k) => k + 1)}
                >
                  Try again
                </button>
              </div>
            </div>
          ) : jobs.length === 0 ? (
            <p className={styles.stateMessage}>
              No roles are open at the moment. New openings are posted here first.
            </p>
          ) : (
            <div className={styles.jobGrid}>
              {jobs.map((job) => (
                <article key={job.id} className={styles.jobCard}>
                  <div className={styles.jobHead}>
                    <h3 className={styles.jobTitle}>{job.title}</h3>
                    <span className={styles.jobType}>
                      {EMPLOYMENT_LABELS[job.employment_type] || 'Full-time'}
                    </span>
                  </div>

                  <p className={styles.jobMeta}>
                    {[job.department, job.location, job.experience_level]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>

                  {job.description && <p className={styles.jobDesc}>{job.description}</p>}

                  {(job.required_skills || []).length > 0 && (
                    <div className={styles.skillList}>
                      {job.required_skills.slice(0, 5).map((skill) => (
                        <span key={skill} className={styles.skillPill}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className={styles.jobFooter}>
                    <Link to={`/careers/${job.slug}`} className={styles.jobLink}>
                      View role and apply
                      <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>
                        arrow_forward
                      </span>
                    </Link>

                    <button
                      type="button"
                      className={`${styles.shareBtn} ${
                        copiedJobId === job.id ? styles.shareBtnCopied : ''
                      }`}
                      onClick={() => handleShare(job)}
                      aria-label={`Share ${job.title}`}
                    >
                      <span
                        className="material-symbols-rounded"
                        style={{ fontSize: '1rem' }}
                        aria-hidden="true"
                      >
                        {copiedJobId === job.id ? 'check' : 'link'}
                      </span>
                      <span aria-live="polite">
                        {copiedJobId === job.id ? 'Link copied' : 'Share'}
                      </span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.footerName}>Breakthrough Publishers India</span>
            <p className={styles.footerCopyright}>
              &copy; {new Date().getFullYear()} Breakthrough Publishers India. Excellence in Academic
              Publishing.
            </p>
          </div>
          <div className={styles.footerLinks}>
            <Link to="/journals">Journals</Link>
            <Link to="/books">Books</Link>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-of-service">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CareersPage;
