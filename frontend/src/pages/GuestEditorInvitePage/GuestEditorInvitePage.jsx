import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import acsApi from '../../api/apiService';
import { useAuth } from '../../hooks/useAuth';
import { describeApiError } from '../../utils/apiError';
import { proposalStyles as styles } from '../../components/proposal/proposalStyles';

/**
 * Accept or decline an invitation to guest-edit a volume.
 *
 * Reading the invitation is public so the recipient can see what they were
 * asked before signing in; responding requires the account that matches the
 * invited address.
 */
export const GuestEditorInvitePage = () => {
  const { token } = useParams();
  const { isAuthenticated, user, loading: authLoading } = useAuth();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [reason, setReason] = useState('');
  const [showDecline, setShowDecline] = useState(false);
  const [outcome, setOutcome] = useState(null);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        setInvite(await acsApi.guestEditor.getInvitation(token));
      } catch (err) {
        setLoadError(describeApiError(err, 'We could not open this invitation.'));
      } finally {
        setLoading(false);
      }
    };
    fetchInvite();
  }, [token]);

  const respond = async (action) => {
    try {
      setSubmitting(true);
      setFormError('');
      await acsApi.guestEditor.respond(token, action, action === 'decline' ? reason : undefined);
      setOutcome(action);
    } catch (err) {
      setFormError(describeApiError(err, 'We could not record your response.'));
    } finally {
      setSubmitting(false);
    }
  };

  const wrap = (children) => (
    <div className={styles.pageWrapper}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Guest editor invitation</h1>
        </div>
      </section>
      <section className={styles.formSection}>
        <div className={styles.formInner}>{children}</div>
      </section>
    </div>
  );

  if (loading || authLoading) return wrap(<p>Loading…</p>);

  if (loadError) {
    return wrap(
      <div className={styles.card}>
        <h2 className={styles.stepHeading}>We couldn&apos;t open this invitation</h2>
        <p className={styles.stepIntro}>{loadError}</p>
        <Link to="/" className={styles.btnSecondary}>Back to the site</Link>
      </div>,
    );
  }

  if (outcome) {
    return wrap(
      <div className={styles.success}>
        <div className={styles.successIcon}>
          <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
            {outcome === 'accept' ? 'check' : 'do_not_disturb_on'}
          </span>
        </div>
        <h2 className={styles.successTitle}>
          {outcome === 'accept' ? 'You are now a guest editor' : 'Invitation declined'}
        </h2>
        <p className={styles.successBody}>
          {outcome === 'accept'
            ? `“${invite.book.title}” is now in your volumes. You can edit its details, contributors and chapters; publishing stays with the editorial team.`
            : 'Thank you for letting us know. We have told the editor who invited you.'}
        </p>
        <div className={styles.successActions}>
          {outcome === 'accept' ? (
            <Link to="/my-volumes" className={styles.btnPrimary}>Go to my volumes</Link>
          ) : (
            <Link to="/" className={styles.btnSecondary}>Back to the site</Link>
          )}
        </div>
      </div>,
    );
  }

  const alreadyAnswered = invite.status !== 'invited';
  const wrongAccount =
    isAuthenticated && (user?.email || '').toLowerCase() !== (invite.email || '').toLowerCase();

  return wrap(
    <div className={styles.card}>
      <h2 className={styles.stepHeading}>
        You have been invited to guest-edit “{invite.book.title}”
      </h2>
      <p className={styles.stepIntro}>
        {invite.book.kind === 'proceedings' && invite.book.conference_name
          ? `A conference proceedings volume for ${invite.book.conference_name}.`
          : `A ${invite.book.kind_label.toLowerCase()}.`}
        {invite.invited_by_email ? ` Invited by ${invite.invited_by_email}.` : ''}
      </p>

      {invite.message && (
        <div className={styles.fields}>
          <div className={styles.field}>
            <span className={styles.label}>Message from the editor</span>
            <p className={styles.help} style={{ whiteSpace: 'pre-line' }}>{invite.message}</p>
          </div>
        </div>
      )}

      <p className={styles.help} style={{ marginTop: '1.25rem' }}>
        As a guest editor you can manage this volume&apos;s details, its contributors and its
        chapters. Publishing, deleting and series decisions stay with the editorial team.
      </p>

      {alreadyAnswered ? (
        <p className={styles.formError}>
          This invitation was already {invite.status_label.toLowerCase()}.
        </p>
      ) : invite.expired ? (
        <p className={styles.formError}>
          This invitation expired on {new Date(invite.expires_on).toLocaleDateString('en-IN')}.
          Ask the editor to send a new one.
        </p>
      ) : !isAuthenticated ? (
        <>
          <p className={styles.formError}>
            Sign in as <strong>{invite.email}</strong> to accept or decline.
          </p>
          <div className={styles.actions}>
            <span className={styles.actionsSpacer} />
            <Link to="/login" state={{ from: `/guest-editor/${token}` }} className={styles.btnPrimary}>
              Sign in
            </Link>
          </div>
        </>
      ) : wrongAccount ? (
        <p className={styles.formError}>
          This invitation was sent to <strong>{invite.email}</strong>, but you are signed in as{' '}
          <strong>{user.email}</strong>. Sign in with the invited address to respond.
        </p>
      ) : (
        <>
          {showDecline && (
            <div className={styles.fields} style={{ marginTop: '1.25rem' }}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="reason">
                  Reason <span className={styles.optional}>(optional)</span>
                </label>
                <textarea
                  id="reason"
                  className={styles.textarea}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Anything you would like the editor to know."
                />
              </div>
            </div>
          )}

          {formError && <p className={styles.formError}>{formError}</p>}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnSecondary}
              disabled={submitting}
              onClick={() => (showDecline ? respond('decline') : setShowDecline(true))}
            >
              {showDecline ? 'Confirm decline' : 'Decline'}
            </button>
            <span className={styles.actionsSpacer} />
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={submitting}
              onClick={() => respond('accept')}
            >
              {submitting ? 'Saving…' : 'Accept invitation'}
            </button>
          </div>
        </>
      )}
    </div>,
  );
};

export default GuestEditorInvitePage;
