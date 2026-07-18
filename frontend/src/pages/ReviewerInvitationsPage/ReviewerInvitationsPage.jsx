import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import acsApi from '../../api/apiService';
import { useModal } from '../../hooks/useModal';
import { useToast } from '../../hooks/useToast';
import styles from './ReviewerInvitationsPage.module.css';

const ReviewerInvitationsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm } = useModal();
  const { success, error: showToastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [cancellingId, setCancellingId] = useState(null);
  const [remindingId, setRemindingId] = useState(null);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await acsApi.editor.getPaperInvitations(id);
      setInvitations(response?.invitations || []);
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
      const msg = err.response?.data?.detail || 'Failed to load reviewer invitations';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCancelInvitation = (inv) => {
    const who = inv.reviewer_name || inv.reviewer_email;
    confirm({
      title: 'Cancel Invitation',
      message: `Are you sure you want to cancel the invitation for ${who}? This cannot be undone.`,
      confirmText: 'Cancel Invitation',
      cancelText: 'Keep',
      type: 'error',
      onConfirm: async () => {
        try {
          setCancellingId(inv.id);
          await acsApi.editor.cancelInvitation(id, inv.id);
          setInvitations(prev => prev.filter(i => i.id !== inv.id));
          success(`Invitation for ${who} cancelled.`, 4000);
        } catch (err) {
          console.error('Failed to cancel invitation:', err);
          showToastError(err.response?.data?.detail || 'Failed to cancel invitation', 5000);
        } finally {
          setCancellingId(null);
        }
      },
    });
  };

  const handleRemind = (inv) => {
    const who = inv.reviewer_name || inv.reviewer_email;
    confirm({
      title: 'Send Reminder',
      message: `Send a reminder email to ${who} (${inv.reviewer_email})?`,
      confirmText: 'Send Reminder',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: async () => {
        try {
          setRemindingId(inv.id);
          const res = await acsApi.editor.remindInvitation(id, inv.id);
          setInvitations(prev => prev.map(i =>
            i.id === inv.id
              ? { ...i, reminder_count: res?.reminder_count ?? (i.reminder_count || 0) + 1, last_reminder_at: res?.last_reminder_at || new Date().toISOString() }
              : i
          ));
          success(res?.message || `Reminder sent to ${inv.reviewer_email}`, 4000);
        } catch (err) {
          console.error('Failed to send reminder:', err);
          showToastError(err.response?.data?.detail || 'Failed to send reminder', 5000);
        } finally {
          setRemindingId(null);
        }
      },
    });
  };

  const goBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <span className="material-symbols-rounded">hourglass_empty</span>
          <p>Loading reviewer invitations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <span className="material-symbols-rounded">error</span>
          <p>{error}</p>
          <button className={styles.backBtn} onClick={goBack}>Go Back</button>
        </div>
      </div>
    );
  }

  const pendingCount = invitations.filter(i => i.status === 'pending').length;
  const acceptedCount = invitations.filter(i => i.status === 'accepted').length;
  const declinedCount = invitations.filter(i => i.status === 'declined').length;
  const expiredCount = invitations.filter(i => i.status === 'expired').length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <button className={styles.backLink} onClick={goBack}>
            <span className="material-symbols-rounded">arrow_back</span>
            <span>Back to Paper</span>
          </button>

          <div className={styles.headerMain}>
            <div className={styles.headerLeft}>
              <h1 className={styles.pageTitle}>Reviewer Invitations</h1>
              <span className={styles.totalBadge}>{invitations.length} Total</span>
            </div>

            <div className={styles.summaryBadges}>
              {pendingCount > 0 && (
                <span className={`${styles.badge} ${styles.badgePending}`}>{pendingCount} Pending</span>
              )}
              {acceptedCount > 0 && (
                <span className={`${styles.badge} ${styles.badgeAccepted}`}>{acceptedCount} Accepted</span>
              )}
              {declinedCount > 0 && (
                <span className={`${styles.badge} ${styles.badgeDeclined}`}>{declinedCount} Declined</span>
              )}
              {expiredCount > 0 && (
                <span className={`${styles.badge} ${styles.badgeExpired}`}>{expiredCount} Expired</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className={styles.content}>
        {invitations.length === 0 ? (
          <div className={styles.emptyState}>
            <span className="material-symbols-rounded">mail</span>
            <p>No reviewer invitations have been sent for this paper yet.</p>
          </div>
        ) : (
          <div className={styles.invitationsGrid}>
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className={`${styles.invitationCard} ${styles[`invitationCard${inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}`]}`}
              >
                <div className={styles.invitationCardHeader}>
                  <div className={styles.invitationAvatar}>
                    <span className="material-symbols-rounded">
                      {inv.status === 'accepted' ? 'check_circle' : inv.status === 'declined' ? 'cancel' : inv.status === 'expired' ? 'timer_off' : 'schedule'}
                    </span>
                  </div>
                  <div className={styles.invitationInfo}>
                    <p className={styles.invitationName}>
                      {inv.reviewer_name || 'Unknown Reviewer'}
                      {inv.is_external && <span className={styles.externalBadge}>External</span>}
                    </p>
                    <p className={styles.invitationEmail}>{inv.reviewer_email}</p>
                  </div>
                  <span className={`${styles.statusChip} ${styles[`statusChip${inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}`]}`}>
                    {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                  </span>
                </div>
                <div className={styles.invitationCardMeta}>
                  <span className={styles.invitationMetaItem}>
                    <span className="material-symbols-rounded">send</span>
                    Invited: {inv.invited_on ? new Date(inv.invited_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </span>
                  {inv.status === 'accepted' && inv.accepted_on && (
                    <span className={styles.invitationMetaItem}>
                      <span className="material-symbols-rounded">check</span>
                      Accepted: {new Date(inv.accepted_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  {inv.status === 'declined' && inv.declined_on && (
                    <span className={styles.invitationMetaItem}>
                      <span className="material-symbols-rounded">close</span>
                      Declined: {new Date(inv.declined_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  {inv.status === 'pending' && inv.token_expiry && (
                    <span className={styles.invitationMetaItem}>
                      <span className="material-symbols-rounded">timer</span>
                      Expires: {new Date(inv.token_expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  {inv.reminder_count > 0 && (
                    <span className={styles.invitationMetaItem}>
                      <span className="material-symbols-rounded">notifications_active</span>
                      {inv.reminder_count} reminder{inv.reminder_count === 1 ? '' : 's'} sent
                      {inv.last_reminder_at ? ` (last ${new Date(inv.last_reminder_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})` : ''}
                    </span>
                  )}
                </div>
                {inv.decline_reason && (
                  <div className={styles.declineReason}>
                    <span className="material-symbols-rounded">info</span>
                    <p>{inv.decline_reason}</p>
                  </div>
                )}
                {(inv.status === 'pending' || inv.status === 'expired') && (
                  <div className={styles.invitationCardActions}>
                    {inv.status === 'pending' && (
                      <button
                        className={styles.remindBtn}
                        onClick={() => handleRemind(inv)}
                        disabled={remindingId === inv.id}
                      >
                        <span className="material-symbols-rounded">notifications_active</span>
                        {remindingId === inv.id ? 'Sending...' : 'Send Reminder'}
                      </button>
                    )}
                    <button
                      className={styles.cancelBtn}
                      onClick={() => handleCancelInvitation(inv)}
                      disabled={cancellingId === inv.id}
                    >
                      <span className="material-symbols-rounded">delete</span>
                      {cancellingId === inv.id ? 'Cancelling...' : 'Cancel Invitation'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ReviewerInvitationsPage;
