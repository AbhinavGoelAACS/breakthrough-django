import React, { useCallback, useEffect, useState } from 'react';
import acsApi from '../../api/apiService';
import { useToast } from '../../hooks/useToast';
import { describeApiError, isNotFound } from '../../utils/apiError';
import { formatDateTimeIST } from '../../utils/dateUtils';
import styles from './CareersAdminPage.module.css';

const STATUS_FILTERS = [
  { id: 'new', label: 'New' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'interview', label: 'Interview' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

const STATUS_LABELS = {
  new: 'New',
  screening: 'Screening',
  shortlisted: 'Shortlisted',
  rejected: 'Rejected',
  interview: 'Interview',
  hired: 'Hired',
};

const EMPLOYMENT_TYPES = [
  { id: 'full_time', label: 'Full-time' },
  { id: 'part_time', label: 'Part-time' },
  { id: 'internship', label: 'Internship' },
  { id: 'contract', label: 'Contract' },
];

const emptyJob = {
  title: '',
  department: '',
  location: '',
  employment_type: 'full_time',
  experience_level: '',
  description: '',
  responsibilities: '',
  requirements: '',
  required_skills: '',
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return formatDateTimeIST(value);
  } catch {
    return new Date(value).toLocaleDateString('en-IN');
  }
};

const inviteDraft = (application) => ({
  subject: `Interview invitation — ${application.job_title || application.job?.title || 'your application'}`,
  body:
    `Dear ${application.candidate_name},\n\n` +
    `Thank you for your interest in the ${application.job_title || application.job?.title || 'advertised'} role at ` +
    'Breakthrough Publishers India. We would like to invite you to an interview with our team.\n\n' +
    'Please reply to confirm a time that suits you.\n\n' +
    'With regards,\nBreakthrough Publishers India',
  meeting_link: '',
  test_link: '',
});

const Row = ({ label, value }) =>
  value ? (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  ) : null;

const CareersAdminPage = () => {
  const { success, error: showError } = useToast();

  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [invite, setInvite] = useState(null);
  const [saving, setSaving] = useState(false);

  const [showJobForm, setShowJobForm] = useState(false);
  const [jobForm, setJobForm] = useState(emptyJob);
  const [creatingJob, setCreatingJob] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [jobsData, applicationsData] = await Promise.all([
        acsApi.careers.admin.listJobs(),
        acsApi.careers.admin.listApplications(),
      ]);
      setJobs(Array.isArray(jobsData) ? jobsData : jobsData?.jobs || []);
      setApplications(
        Array.isArray(applicationsData) ? applicationsData : applicationsData?.applications || []
      );
    } catch (err) {
      // A 404 means nothing has been posted yet, not that something broke.
      if (!isNotFound(err)) setError(describeApiError(err, 'Could not load the hiring queue.'));
      setJobs([]);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // The list endpoint omits the cover letter, links and resume, so the detail
  // request is what makes a candidate reviewable.
  const openApplication = async (row) => {
    try {
      setDetailLoading(true);
      setSelected({ ...row, loading: true });
      setInvite(inviteDraft(row));
      const detail = await acsApi.careers.admin.getApplication(row.id);
      setSelected({ ...row, ...detail, loading: false });
    } catch (err) {
      showError(describeApiError(err, 'Could not open that application.'));
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeApplication = () => {
    setSelected(null);
    setInvite(null);
  };

  const setStatus = async (newStatus) => {
    if (!selected) return;
    try {
      setSaving(true);
      const updated = await acsApi.careers.admin.updateApplication(selected.id, {
        screening_status: newStatus,
      });
      const screening_status = updated.screening_status || newStatus;
      setSelected((prev) => ({ ...prev, screening_status }));
      setApplications((prev) =>
        prev.map((row) => (row.id === selected.id ? { ...row, screening_status } : row))
      );
      success(`${selected.candidate_name} marked ${STATUS_LABELS[screening_status].toLowerCase()}.`);
    } catch (err) {
      showError(describeApiError(err, 'Could not update that application.'));
    } finally {
      setSaving(false);
    }
  };

  const sendInvite = async () => {
    if (!selected || !invite) return;
    if (!invite.subject.trim() || !invite.body.trim()) {
      showError('An invitation needs both a subject and a message.');
      return;
    }
    try {
      setSaving(true);
      await acsApi.careers.admin.sendInvite(selected.id, invite);
      success(`Invitation sent to ${selected.email}.`);
      // The backend moves the application to "interview" once the mail is away.
      setSelected((prev) => ({ ...prev, screening_status: 'interview' }));
      setApplications((prev) =>
        prev.map((row) =>
          row.id === selected.id ? { ...row, screening_status: 'interview' } : row
        )
      );
    } catch (err) {
      showError(describeApiError(err, 'Could not send the interview invitation.'));
    } finally {
      setSaving(false);
    }
  };

  const createJob = async (event) => {
    event.preventDefault();
    try {
      setCreatingJob(true);
      await acsApi.careers.admin.createJob({
        ...jobForm,
        required_skills: jobForm.required_skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean),
      });
      success(`“${jobForm.title}” is now live on the careers page.`);
      setJobForm(emptyJob);
      setShowJobForm(false);
      fetchData();
    } catch (err) {
      showError(describeApiError(err, 'Could not create that role.'));
    } finally {
      setCreatingJob(false);
    }
  };

  const onJobField = (event) => {
    const { name, value } = event.target;
    setJobForm((prev) => ({ ...prev, [name]: value }));
  };

  const visible =
    statusFilter === 'all'
      ? applications
      : applications.filter((row) => (row.screening_status || 'new') === statusFilter);

  const counts = {
    openRoles: jobs.filter((job) => job.is_active).length,
    applicants: applications.length,
    awaiting: applications.filter((row) => (row.screening_status || 'new') === 'new').length,
    shortlisted: applications.filter((row) =>
      ['shortlisted', 'interview'].includes(row.screening_status)
    ).length,
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Careers</h1>
          <p className={styles.subtitle}>
            Roles advertised on the public careers page, and everyone who has applied to them.
          </p>
        </div>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => setShowJobForm((open) => !open)}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>
            {showJobForm ? 'close' : 'add'}
          </span>
          {showJobForm ? 'Cancel' : 'Post a role'}
        </button>
      </header>

      <div className={styles.stats}>
        <div className={`${styles.stat} ${counts.awaiting ? styles.statAttention : ''}`}>
          <span className={styles.statValue}>{counts.awaiting}</span>
          <span className={styles.statLabel}>Awaiting review</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{counts.shortlisted}</span>
          <span className={styles.statLabel}>Shortlisted</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{counts.applicants}</span>
          <span className={styles.statLabel}>Applicants</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{counts.openRoles}</span>
          <span className={styles.statLabel}>Open roles</span>
        </div>
      </div>

      {error && (
        <p className={styles.error}>
          {error}{' '}
          <button type="button" className={styles.inlineRetry} onClick={fetchData}>
            Try again
          </button>
        </p>
      )}

      {showJobForm && (
        <form className={styles.jobForm} onSubmit={createJob}>
          <h2 className={styles.blockTitle}>New role</h2>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Title</span>
              <input
                className={styles.input}
                name="title"
                value={jobForm.title}
                onChange={onJobField}
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Department</span>
              <input
                className={styles.input}
                name="department"
                value={jobForm.department}
                onChange={onJobField}
                placeholder="Editorial"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Location</span>
              <input
                className={styles.input}
                name="location"
                value={jobForm.location}
                onChange={onJobField}
                placeholder="Remote / Jaipur"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Employment type</span>
              <select
                className={styles.input}
                name="employment_type"
                value={jobForm.employment_type}
                onChange={onJobField}
              >
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Experience</span>
              <input
                className={styles.input}
                name="experience_level"
                value={jobForm.experience_level}
                onChange={onJobField}
                placeholder="2–4 years"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Required skills</span>
              <input
                className={styles.input}
                name="required_skills"
                value={jobForm.required_skills}
                onChange={onJobField}
                placeholder="Copy-editing, LaTeX, DOI registration"
              />
              <span className={styles.hint}>Comma separated — these drive the fit score.</span>
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Description</span>
            <textarea
              className={styles.textarea}
              name="description"
              value={jobForm.description}
              onChange={onJobField}
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Responsibilities</span>
            <textarea
              className={styles.textarea}
              name="responsibilities"
              value={jobForm.responsibilities}
              onChange={onJobField}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Requirements</span>
            <textarea
              className={styles.textarea}
              name="requirements"
              value={jobForm.requirements}
              onChange={onJobField}
            />
          </label>

          <div className={styles.formActions}>
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={creatingJob}
            >
              {creatingJob ? 'Publishing…' : 'Publish role'}
            </button>
          </div>
        </form>
      )}

      <section className={styles.block}>
        <h2 className={styles.blockTitle}>Live roles</h2>
        {loading ? (
          <p className={styles.empty}>Loading roles…</p>
        ) : jobs.length === 0 ? (
          <p className={styles.empty}>
            No roles posted yet. Anything published here appears on /careers straight away.
          </p>
        ) : (
          <div className={styles.roleGrid}>
            {jobs.map((job) => (
              <article key={job.id} className={styles.roleCard}>
                <div className={styles.roleHead}>
                  <h3 className={styles.roleTitle}>{job.title}</h3>
                  <span
                    className={`${styles.badge} ${job.is_active ? styles.badgeOpen : styles.badgeClosed}`}
                  >
                    {job.is_active ? 'Open' : 'Closed'}
                  </span>
                </div>
                <p className={styles.roleMeta}>
                  {[job.department, job.location, job.experience_level].filter(Boolean).join(' · ') ||
                    '—'}
                </p>
                <p className={styles.roleCount}>
                  {job.application_count} {job.application_count === 1 ? 'applicant' : 'applicants'}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.block}>
        <h2 className={styles.blockTitle}>Applicants</h2>

        <div className={styles.filters} role="group" aria-label="Filter applicants by status">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={statusFilter === filter.id}
              className={`${styles.chip} ${statusFilter === filter.id ? styles.chipActive : ''}`}
              onClick={() => setStatusFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className={styles.tableWrap}>
          {loading ? (
            <p className={styles.empty}>Loading applicants…</p>
          ) : visible.length === 0 ? (
            <p className={styles.empty}>
              {applications.length === 0
                ? 'Nobody has applied yet. Applications from /careers land here.'
                : 'No applicants with that status.'}
            </p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Role</th>
                  <th>Fit</th>
                  <th>Applied</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr
                    key={row.id}
                    tabIndex={0}
                    onClick={() => openApplication(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') openApplication(row);
                    }}
                  >
                    <td>
                      <div className={styles.rowTitle}>{row.candidate_name}</div>
                      <div className={styles.rowSub}>{row.email}</div>
                    </td>
                    <td>{row.job_title}</td>
                    <td className={styles.score}>{row.ai_score ?? 0}%</td>
                    <td className={styles.date}>{formatDate(row.created_at)}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${styles[`status_${row.screening_status || 'new'}`]}`}
                      >
                        {STATUS_LABELS[row.screening_status] || 'New'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {selected && (
        <div className={styles.overlay} onClick={closeApplication} role="presentation">
          <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHead}>
              <div>
                <span className={styles.drawerEyebrow}>
                  {selected.job_title || selected.job?.title}
                </span>
                <h2>{selected.candidate_name}</h2>
              </div>
              <button
                type="button"
                className={styles.close}
                onClick={closeApplication}
                aria-label="Close"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className={styles.drawerBody}>
              {detailLoading || selected.loading ? (
                <p className={styles.empty}>Loading…</p>
              ) : (
                <>
                  <section className={styles.card}>
                    <h3>Screening</h3>
                    <div className={styles.scoreRow}>
                      <span className={styles.scoreBadge}>{selected.ai_score ?? 0}% fit</span>
                      <span
                        className={`${styles.badge} ${styles[`status_${selected.screening_status || 'new'}`]}`}
                      >
                        {STATUS_LABELS[selected.screening_status] || 'New'}
                      </span>
                    </div>
                    <p className={styles.prose}>
                      {selected.ai_summary || 'No automated summary was produced for this profile.'}
                    </p>
                    <dl className={styles.dl}>
                      <Row
                        label="Matched skills"
                        value={(selected.matched_skills || []).join(', ') || '—'}
                      />
                      <Row
                        label="Missing skills"
                        value={(selected.missing_skills || []).join(', ') || '—'}
                      />
                    </dl>
                    <p className={styles.note}>
                      The fit score is a keyword match against the role’s required skills, not a
                      judgement of the candidate. Read the resume before deciding.
                    </p>
                  </section>

                  <section className={styles.card}>
                    <h3>Candidate</h3>
                    <dl className={styles.dl}>
                      <Row label="Email" value={selected.email} />
                      <Row label="Phone" value={selected.phone} />
                      <Row label="Applied" value={formatDate(selected.created_at)} />
                      <Row label="Portfolio" value={selected.portfolio_link} />
                      <Row label="GitHub" value={selected.github_link} />
                      <Row label="LinkedIn" value={selected.linkedin_link} />
                    </dl>
                    {selected.resume_url && (
                      <a
                        className={styles.attachment}
                        href={selected.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>
                          description
                        </span>
                        Open resume
                      </a>
                    )}
                  </section>

                  {selected.cover_letter && (
                    <section className={styles.card}>
                      <h3>Cover letter</h3>
                      <p className={styles.prose}>{selected.cover_letter}</p>
                    </section>
                  )}

                  {selected.resume_text && (
                    <section className={styles.card}>
                      <h3>Resume text</h3>
                      <p className={`${styles.prose} ${styles.proseScroll}`}>
                        {selected.resume_text}
                      </p>
                    </section>
                  )}

                  <section className={styles.card}>
                    <h3>Decision</h3>
                    <div className={styles.decide}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        disabled={saving}
                        onClick={() => setStatus('shortlisted')}
                      >
                        Shortlist
                      </button>
                      <button
                        type="button"
                        className={styles.btn}
                        disabled={saving}
                        onClick={() => setStatus('hired')}
                      >
                        Mark hired
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnDecline}`}
                        disabled={saving}
                        onClick={() => setStatus('rejected')}
                      >
                        Reject
                      </button>
                    </div>
                  </section>

                  <section className={styles.card}>
                    <h3>Interview invite</h3>
                    {(selected.invitations || []).length > 0 && (
                      <p className={styles.note}>
                        Last sent {formatDate(selected.invitations[0].sent_at)} —{' '}
                        {selected.invitations[0].status}.
                      </p>
                    )}
                    <div className={styles.formGrid}>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>Subject</span>
                        <input
                          className={styles.input}
                          value={invite?.subject || ''}
                          onChange={(e) =>
                            setInvite((prev) => ({ ...prev, subject: e.target.value }))
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>Meeting link</span>
                        <input
                          className={styles.input}
                          value={invite?.meeting_link || ''}
                          placeholder="https://meet.google.com/…"
                          onChange={(e) =>
                            setInvite((prev) => ({ ...prev, meeting_link: e.target.value }))
                          }
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>Assessment link</span>
                        <input
                          className={styles.input}
                          value={invite?.test_link || ''}
                          placeholder="https://…"
                          onChange={(e) =>
                            setInvite((prev) => ({ ...prev, test_link: e.target.value }))
                          }
                        />
                      </label>
                    </div>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Message</span>
                      <textarea
                        className={`${styles.textarea} ${styles.textareaTall}`}
                        value={invite?.body || ''}
                        onChange={(e) => setInvite((prev) => ({ ...prev, body: e.target.value }))}
                      />
                    </label>
                    <p className={styles.note}>
                      Both links are appended to the message. Sending moves the candidate to
                      Interview.
                    </p>
                    <div className={styles.formActions}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        disabled={saving}
                        onClick={sendInvite}
                      >
                        {saving ? 'Sending…' : `Send to ${selected.email}`}
                      </button>
                    </div>
                  </section>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default CareersAdminPage;
