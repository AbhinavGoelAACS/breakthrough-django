import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../../api/apiService';
import styles from './CareersAdminPage.module.css';

const emptyInvite = {
  subject: '',
  body: '',
  meeting_link: '',
  test_link: '',
};

const CareersAdminPage = () => {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [inviteForm, setInviteForm] = useState(emptyInvite);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const [jobsData, applicationsData] = await Promise.all([
          apiService.careers.admin.listJobs(),
          apiService.careers.admin.listApplications(),
        ]);
        const jobList = Array.isArray(jobsData) ? jobsData : jobsData?.jobs || [];
        const appList = Array.isArray(applicationsData) ? applicationsData : applicationsData?.applications || [];
        setJobs(jobList);
        setApplications(appList);
        if (appList[0]) {
          setSelectedApplication(appList[0]);
          setInviteForm({
            subject: `Interview Invitation for ${appList[0].job_title}`,
            body: `Dear ${appList[0].candidate_name},\n\nThank you for your interest in the ${appList[0].job_title} role. We would like to invite you for an interview with our team.\n\nPlease confirm your availability and connect with us within 24 hours.`,
            meeting_link: '',
            test_link: '',
          });
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Unable to load hiring data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const selectedId = selectedApplication?.id;

  useEffect(() => {
    if (!selectedApplication) return;
    setInviteForm({
      subject: `Interview Invitation for ${selectedApplication.job_title}`,
      body: `Dear ${selectedApplication.candidate_name},\n\nThank you for your interest in the ${selectedApplication.job_title} role. We would like to invite you for an interview with our team.\n\nPlease confirm your availability and connect with us within 24 hours.`,
      meeting_link: '',
      test_link: '',
    });
  }, [selectedId]);

  const handleSendInvite = async () => {
    if (!selectedApplication) return;
    try {
      setSaving(true);
      setError('');
      await apiService.careers.admin.sendInvite(selectedApplication.id, inviteForm);
      const refreshed = await apiService.careers.admin.listApplications();
      const appList = Array.isArray(refreshed) ? refreshed : refreshed?.applications || [];
      setApplications(appList);
      setSelectedApplication(appList.find((item) => item.id === selectedApplication.id) || selectedApplication);
      setInviteForm({ ...inviteForm });
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to send the interview invitation.');
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => ({
    jobs: jobs.length,
    applicants: applications.length,
    shortlisted: applications.filter((item) => ['shortlisted', 'interview'].includes(item.screening_status)).length,
  }), [jobs, applications]);

  if (loading) {
    return <div className={styles.page}><div className={styles.emptyState}>Loading hiring dashboard...</div></div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Careers dashboard</h1>
          <p className={styles.subtitle}>Track hiring pipeline, review candidates, and send interview invites.</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}><span className={styles.statLabel}>Jobs</span><strong>{stats.jobs}</strong></div>
        <div className={styles.statCard}><span className={styles.statLabel}>Applicants</span><strong>{stats.applicants}</strong></div>
        <div className={styles.statCard}><span className={styles.statLabel}>Shortlisted</span><strong>{stats.shortlisted}</strong></div>
      </div>

      {error && <div className={styles.alert}>{error}</div>}

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <h3>Applicants</h3>
          <div className={styles.appList}>
            {applications.length === 0 ? (
              <div className={styles.emptyState}>No applications yet.</div>
            ) : (
              applications.map((app) => (
                <button
                  key={app.id}
                  className={`${styles.appItem} ${selectedApplication?.id === app.id ? styles.appItemActive : ''}`}
                  onClick={() => setSelectedApplication(app)}
                >
                  <div className={styles.appName}>{app.candidate_name}</div>
                  <div className={styles.appMeta}>{app.job_title}</div>
                  <div className={styles.appMeta}>Score: {app.ai_score || 0}%</div>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className={styles.mainPanel}>
          {selectedApplication ? (
            <>
              <div className={styles.summaryCard}>
                <div className={styles.summaryHeader}>
                  <div>
                    <h3>{selectedApplication.candidate_name}</h3>
                    <div className={styles.appMeta}>{selectedApplication.email}</div>
                  </div>
                  <span className={styles.scoreBadge}>{selectedApplication.ai_score || 0}% fit</span>
                </div>

                <div className={styles.summaryGrid}>
                  <div>
                    <span className={styles.label}>Role</span>
                    <div>{selectedApplication.job_title}</div>
                  </div>
                  <div>
                    <span className={styles.label}>Status</span>
                    <div>{selectedApplication.screening_status || 'new'}</div>
                  </div>
                  <div>
                    <span className={styles.label}>Matched skills</span>
                    <div>{(selectedApplication.matched_skills || []).join(', ') || '—'}</div>
                  </div>
                  <div>
                    <span className={styles.label}>Missing skills</span>
                    <div>{(selectedApplication.missing_skills || []).join(', ') || '—'}</div>
                  </div>
                </div>

                <div style={{ marginTop: 18 }}>
                  <span className={styles.label}>AI summary</span>
                  <p>{selectedApplication.ai_summary || 'Profile has been received for review.'}</p>
                </div>
              </div>

              <div className={styles.inviteCard}>
                <h3>Interview invite</h3>
                <div className={styles.formGrid}>
                  <div>
                    <label className={styles.label}>Subject</label>
                    <input
                      className={styles.input}
                      value={inviteForm.subject}
                      onChange={(e) => setInviteForm((prev) => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className={styles.label}>Google Meet / Interview link</label>
                    <input
                      className={styles.input}
                      value={inviteForm.meeting_link}
                      placeholder="https://meet.google.com/..."
                      onChange={(e) => setInviteForm((prev) => ({ ...prev, meeting_link: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className={styles.label}>Assessment link</label>
                    <input
                      className={styles.input}
                      value={inviteForm.test_link}
                      placeholder="https://..."
                      onChange={(e) => setInviteForm((prev) => ({ ...prev, test_link: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <label className={styles.label}>Email body</label>
                  <textarea
                    className={styles.textarea}
                    value={inviteForm.body}
                    onChange={(e) => setInviteForm((prev) => ({ ...prev, body: e.target.value }))}
                  />
                </div>

                <button className={styles.sendBtn} onClick={handleSendInvite} disabled={saving}>
                  {saving ? 'Sending...' : 'Send interview invite'}
                </button>
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>Select a candidate to review and invite.</div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CareersAdminPage;
