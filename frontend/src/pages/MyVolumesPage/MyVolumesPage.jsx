import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import acsApi from '../../api/apiService';
import { useAuth } from '../../hooks/useAuth';
import { describeApiError, isNotFound } from '../../utils/apiError';
import { proposalStyles as styles } from '../../components/proposal/proposalStyles';
import '../AdminBooks/AdminBooks.css';

/**
 * The volumes a signed-in user guest-edits.
 *
 * Deliberately not behind the editor portal guard: a guest editor is usually
 * an author or an outside academic, not a staff editor, so the portal route
 * would turn them away.
 */
export const MyVolumesPage = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [volumes, setVolumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchVolumes = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await acsApi.guestEditor.myVolumes();
        setVolumes(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!isNotFound(err)) setError(describeApiError(err, 'We could not load your volumes.'));
        setVolumes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVolumes();
  }, [isAuthenticated, reloadKey]);

  const shell = (children) => (
    <div className={styles.pageWrapper}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>My volumes</h1>
          <p className={styles.heroSubtitle}>
            Books and conference proceedings you have been invited to guest-edit.
          </p>
        </div>
      </section>
      <section className={styles.formSection}>
        <div className={styles.formInner}>{children}</div>
      </section>
    </div>
  );

  if (authLoading) return shell(<p>Loading…</p>);

  if (!isAuthenticated) {
    return shell(
      <div className={styles.card}>
        <h2 className={styles.stepHeading}>Sign in to see your volumes</h2>
        <p className={styles.stepIntro}>
          Guest-editor access is tied to your account.
        </p>
        <Link to="/login" state={{ from: '/my-volumes' }} className={styles.btnPrimary}>Sign in</Link>
      </div>,
    );
  }

  if (loading) return shell(<p>Loading your volumes…</p>);

  if (error) {
    return shell(
      <div className={styles.card}>
        <h2 className={styles.stepHeading}>We couldn&apos;t load your volumes</h2>
        <p className={styles.stepIntro}>{error}</p>
        <button type="button" className={styles.btnPrimary} style={{ border: 0, cursor: 'pointer' }}
          onClick={() => setReloadKey((k) => k + 1)}>
          Try again
        </button>
      </div>,
    );
  }

  if (volumes.length === 0) {
    return shell(
      <div className={styles.card}>
        <h2 className={styles.stepHeading}>Nothing here yet</h2>
        <p className={styles.stepIntro}>
          When an editor invites you to guest-edit a volume, it will appear here. Invitations are
          sent by email — check the address on your account.
        </p>
        <Link to="/books" className={styles.btnSecondary}>Browse the catalogue</Link>
      </div>,
    );
  }

  return shell(
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {volumes.map((v) => (
        <article key={v.guest_editor_id} className="ab-block">
          <div className="ab-row-title" style={{ fontSize: '1.05rem' }}>
            {v.book.title}{' '}
            <span className={`ab-badge ab-guest-${v.status}`}>{v.status_label}</span>
          </div>
          <div className="ab-row-sub">
            {v.book.kind_label}
            {v.book.conference_name ? ` · ${v.book.conference_name}` : ''}
            {v.book.series_abbreviation ? ` · ${v.book.series_abbreviation}` : ''}
            {` · ${v.book.chapter_count} chapter${v.book.chapter_count === 1 ? '' : 's'}`}
          </div>
          <div className="ab-row-sub" style={{ marginTop: '0.35rem' }}>
            <span className={`ab-badge ab-prod-${v.book.production_status}`}>
              {v.book.production_label}
            </span>{' '}
            <span className={`ab-badge ${v.book.is_published ? 'ab-vis-live' : 'ab-vis-hidden'}`}>
              {v.book.is_published ? 'Live' : 'Not yet public'}
            </span>
          </div>

          <div className="ab-actions" style={{ marginTop: '1rem' }}>
            <span className="ab-actions-spacer" />
            {v.status === 'invited' ? (
              <Link to={`/guest-editor/${v.invitation_token}`} className="ab-btn ab-btn-primary">
                Respond to invitation
              </Link>
            ) : v.status === 'active' ? (
              <Link to="/my-volumes/manage" className="ab-btn ab-btn-primary">
                Open the volume editor
              </Link>
            ) : null}
          </div>
        </article>
      ))}
      <p className={styles.help}>
        You can edit each volume&apos;s details, contributors and chapters. Publishing and series
        decisions stay with the editorial team.
      </p>
    </div>,
  );
};

export default MyVolumesPage;
