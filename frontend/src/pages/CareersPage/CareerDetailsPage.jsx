import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiService } from '../../api/apiService';
import styles from './CareersPage.module.css';

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
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [resumeFile, setResumeFile] = useState(null);
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    const loadJob = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await apiService.get(`/api/v1/careers/jobs/${slug}`, { skipAuth: true });
        setJob(data);
      } catch (err) {
        setError(err.response?.data?.detail || 'This role is not available right now.');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      loadJob();
    }
  }, [slug]);

  const requiredSkills = useMemo(() => job?.required_skills || [], [job]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!job) return;

    try {
      setSubmitting(true);
      const payload = new FormData();
      payload.append('job_id', String(job.id));
      Object.entries(form).forEach(([key, value]) => {
        if (value) payload.append(key, value);
      });
      if (resumeFile) payload.append('resume', resumeFile);

      const data = await apiService.post('/api/v1/careers/applications', payload);
      setSubmission(data);
      setForm(defaultForm);
      setResumeFile(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to submit your application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles.pageContainer}><div className={styles.emptyState}>Loading role details...</div></div>;
  }

  if (error || !job) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.emptyState}>{error || 'Role not found.'}</div>
        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <Link to="/careers" className={styles.primaryBtn}>Back to careers</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div style={{ marginBottom: 20 }}>
        <Link to="/careers" className={styles.smallBtn}>← Back to careers</Link>
      </div>

      <div className={styles.gridTwo}>
        <section className={styles.detailCard}>
          <span className={styles.eyebrow} style={{ color: '#0f172a', borderColor: '#dbeafe', background: '#eff6ff' }}>{job.department || 'Operations'}</span>
          <h2 style={{ marginTop: 18 }}>{job.title}</h2>

          <div className={styles.metaList}>
            <div className={styles.metaItem}><span className={styles.label}>Location</span>{job.location || 'Remote'}</div>
            <div className={styles.metaItem}><span className={styles.label}>Experience</span>{job.experience_level || 'Mid-Senior'}</div>
            <div className={styles.metaItem}><span className={styles.label}>Employment Type</span>{job.employment_type || 'Full Time'}</div>
          </div>

          <div style={{ marginTop: 28 }}>
            <h3>Role overview</h3>
            <p className={styles.jobDesc}>{job.description}</p>
          </div>

          <div style={{ marginTop: 26 }}>
            <h3>Key responsibilities</h3>
            <p className={styles.jobDesc}>{job.responsibilities || 'You will support high-impact publishing operations, cross-functional collaboration, and continuous improvement.'}</p>
          </div>

          <div style={{ marginTop: 26 }}>
            <h3>Required skills</h3>
            <div className={styles.skillList}>
              {requiredSkills.map((skill) => (
                <span key={skill} className={styles.skillPill}>{skill}</span>
              ))}
            </div>
          </div>
        </section>

        <aside className={styles.formCard}>
          <h3>Apply for this role</h3>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.row}>
              <div>
                <label className={styles.label}>Full name</label>
                <input className={styles.input} name="candidate_name" value={form.candidate_name} onChange={handleChange} required />
              </div>
              <div>
                <label className={styles.label}>Email</label>
                <input className={styles.input} type="email" name="email" value={form.email} onChange={handleChange} required />
              </div>
            </div>

            <div className={styles.row}>
              <div>
                <label className={styles.label}>Phone</label>
                <input className={styles.input} name="phone" value={form.phone} onChange={handleChange} />
              </div>
              <div>
                <label className={styles.label}>Portfolio</label>
                <input className={styles.input} name="portfolio_link" value={form.portfolio_link} onChange={handleChange} />
              </div>
            </div>

            <div className={styles.row}>
              <div>
                <label className={styles.label}>GitHub</label>
                <input className={styles.input} name="github_link" value={form.github_link} onChange={handleChange} />
              </div>
              <div>
                <label className={styles.label}>LinkedIn</label>
                <input className={styles.input} name="linkedin_link" value={form.linkedin_link} onChange={handleChange} />
              </div>
            </div>

            <div>
              <label className={styles.label}>Resume upload</label>
              <input className={styles.fileField} type="file" accept=".pdf,.doc,.docx" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
            </div>

            <div>
              <label className={styles.label}>Resume text (optional if file uploaded)</label>
              <textarea className={styles.textarea} name="resume_text" value={form.resume_text} onChange={handleChange} placeholder="Paste a summary of your experience, skills, and achievements..." />
            </div>

            <div>
              <label className={styles.label}>Cover letter</label>
              <textarea className={styles.textarea} name="cover_letter" value={form.cover_letter} onChange={handleChange} />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit application'}
            </button>
          </form>

          {submission && (
            <div className={styles.successBox}>
              <strong>Application submitted successfully.</strong>
              <div style={{ marginTop: 8 }}>AI score: <span className={styles.scorePill}>{submission.ai_score || 0}%</span></div>
              <div style={{ marginTop: 8 }}>{submission.ai_summary || 'Your profile has been added to review.'}</div>
            </div>
          )}

          {error && !submission && <div className={styles.successBox} style={{ background: '#fff7ed', borderColor: '#fdba74', color: '#9a4d00' }}>{error}</div>}
        </aside>
      </div>
    </div>
  );
};

export default CareerDetailsPage;
