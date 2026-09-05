import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import acsApi from '../../api/apiService';
import { describeApiError } from '../../utils/apiError';
import styles from './CareersPage.module.css';

const EMPLOYMENT_LABELS = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  internship: 'Internship',
  contract: 'Contract',
};

const defaultForm = {
  candidate_name: '',
  email: '',
  phone: '',
  portfolio_link: '',
  github_link: '',
  linkedin_link: '',
  cover_letter: '',
  resume_text: '',
};

const CareerDetailsPage = () => {
  const { slug } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  // Kept apart from submitError so a failed application never replaces the
  // role the candidate is still reading.
  const [loadError, setLoadError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [resumeFile, setResumeFile] = useState(null);
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await acsApi.careers.getJob(slug);
        setJob(data);
      } catch (err) {
        console.error('Error fetching job:', err);
        setLoadError(describeApiError(err, 'This role is not open at the moment.'));
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchJob();
  }, [slug]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!job) return;

    if (!resumeFile && !form.resume_text.trim()) {
      setSubmitError('Attach a resume file or paste your experience below — one of the two.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      const payload = new FormData();
      payload.append('job_id', String(job.id));
      Object.entries(form).forEach(([key, value]) => {
        if (value) payload.append(key, value);
      });
      if (resumeFile) payload.append('resume', resumeFile);

      const data = await acsApi.careers.submitApplication(payload);
      setSubmission(data);
      setForm(defaultForm);
      setResumeFile(null);
    } catch (err) {
      setSubmitError(describeApiError(err, 'We could not submit your application.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.detailInner}>
          <p className={styles.stateMessage}>Loading role…</p>
        </div>
      </div>
    );
  }

  if (loadError || !job) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.detailInner}>
          <p className={styles.stateMessage}>{loadError || 'We could not find that role.'}</p>
          <div className={styles.centreAction}>
            <Link to="/careers" className={styles.btnPrimary}>
              Back to all roles
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      {/* ── Role header, on the same dark-green band as the careers list ── */}
      <section className={styles.detailHero}>
        <div className={styles.detailHeroInner}>
          <Link to="/careers" className={styles.backLink}>
            <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>
              arrow_back
            </span>
            All roles
          </Link>
          <span className={styles.heroLabel}>{job.department || 'Breakthrough Publishers'}</span>
          <h1 className={styles.detailTitle}>{job.title}</h1>
          <div className={styles.heroDivider} />
          <p className={styles.detailMetaLine}>
            {[
              job.location,
              EMPLOYMENT_LABELS[job.employment_type] || 'Full-time',
              job.experience_level,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionSurface}`}>
        <div className={styles.detailGrid}>
          {/* ── The role ── */}
          <div className={styles.detailMain}>
            {job.description && (
              <div className={styles.detailBlock}>
                <h2 className={styles.detailBlockTitle}>About the role</h2>
                <p className={styles.prose}>{job.description}</p>
              </div>
            )}

            {job.responsibilities && (
              <div className={styles.detailBlock}>
                <h2 className={styles.detailBlockTitle}>Responsibilities</h2>
                <p className={styles.prose}>{job.responsibilities}</p>
              </div>
            )}

            {job.requirements && (
              <div className={styles.detailBlock}>
                <h2 className={styles.detailBlockTitle}>What we are looking for</h2>
                <p className={styles.prose}>{job.requirements}</p>
              </div>
            )}

            {(job.required_skills || []).length > 0 && (
              <div className={styles.detailBlock}>
                <h2 className={styles.detailBlockTitle}>Skills</h2>
                <div className={styles.skillList}>
                  {job.required_skills.map((skill) => (
                    <span key={skill} className={styles.skillPill}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Apply ── */}
          <aside className={styles.applyCard} id="apply">
            <h2 className={styles.applyTitle}>Apply for this role</h2>

            {submission ? (
              <div className={styles.successBox}>
                <p className={styles.successTitle}>Application received.</p>
                <p className={styles.successBody}>
                  Thank you, {submission.candidate_name || 'and welcome'}. Your application for{' '}
                  {job.title} has been logged and will be read by our hiring team. We will be in
                  touch at {submission.email || 'the address you gave'}.
                </p>
                <Link to="/careers" className={styles.btnSecondary}>
                  Back to all roles
                </Link>
              </div>
            ) : (
              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.formRow}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Full name *</span>
                    <input
                      className={styles.input}
                      name="candidate_name"
                      value={form.candidate_name}
                      onChange={handleChange}
                      required
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Email *</span>
                    <input
                      className={styles.input}
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </label>
                </div>

                <div className={styles.formRow}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Phone</span>
                    <input
                      className={styles.input}
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Portfolio or website</span>
                    <input
                      className={styles.input}
                      name="portfolio_link"
                      value={form.portfolio_link}
                      onChange={handleChange}
                    />
                  </label>
                </div>

                <div className={styles.formRow}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>GitHub</span>
                    <input
                      className={styles.input}
                      name="github_link"
                      value={form.github_link}
                      onChange={handleChange}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>LinkedIn</span>
                    <input
                      className={styles.input}
                      name="linkedin_link"
                      value={form.linkedin_link}
                      onChange={handleChange}
                    />
                  </label>
                </div>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Resume</span>
                  <input
                    className={styles.fileField}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  />
                  <span className={styles.hint}>PDF, DOC or DOCX, up to 10 MB.</span>
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Or paste your experience</span>
                  <textarea
                    className={styles.textarea}
                    name="resume_text"
                    value={form.resume_text}
                    onChange={handleChange}
                    placeholder="Your background, the work you have done, and the skills you would bring."
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Cover letter</span>
                  <textarea
                    className={styles.textarea}
                    name="cover_letter"
                    value={form.cover_letter}
                    onChange={handleChange}
                    placeholder="Why this role, and why Breakthrough."
                  />
                </label>

                {submitError && <p className={styles.formError}>{submitError}</p>}

                <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit application'}
                </button>
              </form>
            )}
          </aside>
        </div>
      </section>

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
            <Link to="/careers">All roles</Link>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-of-service">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CareerDetailsPage;
