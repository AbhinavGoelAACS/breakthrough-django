import React, { useCallback, useEffect, useState } from 'react';
import acsApi from '../../api/apiService';
import { useToast } from '../../hooks/useToast';
import { describeApiError, isNotFound } from '../../utils/apiError';
import { formatDateTimeIST } from '../../utils/dateUtils';
import './AdminProposals.css';

const STATUS_FILTERS = [
  { id: 'submitted', label: 'New' },
  { id: 'under_review', label: 'Under review' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'declined', label: 'Declined' },
  { id: 'all', label: 'All' },
];

const KIND_FILTERS = [
  { id: 'all', label: 'Both' },
  { id: 'book', label: 'Books' },
  { id: 'proceedings', label: 'Proceedings' },
];

const ATTACHMENT_LABELS = {
  cv_file: 'Curriculum vitae',
  sample_chapter_file: 'Sample chapter',
  outline_file: 'Outline document',
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return formatDateTimeIST(value);
  } catch {
    return new Date(value).toLocaleDateString('en-IN');
  }
};

const Row = ({ label, value }) =>
  value ? (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  ) : null;

const Prose = ({ label, value }) =>
  value ? (
    <>
      <p className="ap-prose-label">{label}</p>
      <p className="ap-prose">{value}</p>
    </>
  ) : null;

const AdminProposals = () => {
  const { success, error: showError } = useToast();
  const [proposals, setProposals] = useState([]);
  const [counts, setCounts] = useState({ total: 0, submitted: 0, book: 0, proceedings: 0 });
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [kindFilter, setKindFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProposals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await acsApi.proposals.list({ status: statusFilter, kind: kindFilter });
      setProposals(data.proposals || []);
      setCounts(data.counts || { total: 0, submitted: 0, book: 0, proceedings: 0 });
    } catch (err) {
      if (!isNotFound(err)) setError(describeApiError(err, 'Could not load proposals.'));
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, kindFilter]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const openProposal = async (row) => {
    try {
      setDetailLoading(true);
      setSelected({ ...row, loading: true });
      const detail = await acsApi.proposals.getDetail(row.kind, row.id);
      setSelected({ ...row, ...detail });
      setNote(detail.decision_note || '');
    } catch (err) {
      showError(describeApiError(err, 'Could not open that proposal.'));
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const decide = async (newStatus) => {
    if (!selected) return;
    try {
      setSaving(true);
      const updated = await acsApi.proposals.updateStatus(selected.kind, selected.id, {
        status: newStatus,
        decision_note: note,
      });
      success(`${updated.reference} marked ${updated.status_label.toLowerCase()}.`);
      setSelected((prev) => ({ ...prev, ...updated }));
      fetchProposals();
    } catch (err) {
      showError(describeApiError(err, 'Could not update that proposal.'));
    } finally {
      setSaving(false);
    }
  };

  // The step that connects the queue to the catalogue: an accepted book
  // proposal becomes a draft title an editor can then produce.
  const convertToTitle = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      const book = await acsApi.proposals.convert(selected.kind, selected.id);
      success(`“${book.title}” added to the catalogue as a draft.`);
      setSelected((prev) => ({ ...prev, converted_book_id: book.id }));
      fetchProposals();
    } catch (err) {
      showError(describeApiError(err, 'Could not create a title from this proposal.'));
    } finally {
      setSaving(false);
    }
  };

  const isBook = selected?.kind === 'book';
  const attachments = selected?.attachments || {};
  // Both kinds convert now — a proceedings proposal becomes a volume.
  const canConvert = selected?.status === 'accepted' && !selected?.converted_book_id;

  return (
    <div className="ap-page">
      <header className="ap-header">
        <h1 className="ap-title">Proposals</h1>
        <p className="ap-subtitle">
          Book and conference-proceedings proposals submitted from the public site.
        </p>
      </header>

      <div className="ap-stats">
        <div className="ap-stat ap-stat-attention">
          <span className="ap-stat-value">{counts.submitted}</span>
          <span className="ap-stat-label">Awaiting review</span>
        </div>
        <div className="ap-stat">
          <span className="ap-stat-value">{counts.book}</span>
          <span className="ap-stat-label">Book proposals</span>
        </div>
        <div className="ap-stat">
          <span className="ap-stat-value">{counts.proceedings}</span>
          <span className="ap-stat-label">Proceedings proposals</span>
        </div>
        <div className="ap-stat">
          <span className="ap-stat-value">{counts.total}</span>
          <span className="ap-stat-label">Total received</span>
        </div>
      </div>

      {error && (
        <p className="ap-error">
          {error}{' '}
          <button type="button" className="ap-inline-retry" onClick={fetchProposals}>
            Try again
          </button>
        </p>
      )}

      <div className="ap-filters">
        <div className="ap-filter-group">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`ap-chip ${statusFilter === f.id ? 'is-active' : ''}`}
              onClick={() => setStatusFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="ap-filter-sep" />
        <div className="ap-filter-group">
          {KIND_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`ap-chip ${kindFilter === f.id ? 'is-active' : ''}`}
              onClick={() => setKindFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ap-table-wrap">
        {loading ? (
          <p className="ap-loading">Loading proposals…</p>
        ) : proposals.length === 0 ? (
          <p className="ap-empty">
            Nothing here. New proposals from /books/propose and /proceedings/propose land in this
            queue.
          </p>
        ) : (
          <table className="ap-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Type</th>
                <th>Proposal</th>
                <th>From</th>
                <th>Received</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((row) => (
                <tr
                  key={`${row.kind}-${row.id}`}
                  onClick={() => openProposal(row)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') openProposal(row);
                  }}
                >
                  <td className="ap-ref">{row.reference}</td>
                  <td>
                    <span className={`ap-badge ap-kind-${row.kind}`}>
                      {row.kind === 'book' ? 'Book' : 'Proceedings'}
                    </span>
                  </td>
                  <td>
                    <div className="ap-row-title">{row.title}</div>
                    {row.subtitle && <div className="ap-row-sub">{row.subtitle}</div>}
                    {row.has_attachments && (
                      <span className="ap-clip">
                        <span className="material-symbols-rounded" style={{ fontSize: '0.9rem' }}>
                          attach_file
                        </span>
                        Attachments
                      </span>
                    )}
                  </td>
                  <td>
                    <div>{row.contact_name}</div>
                    <div className="ap-row-sub">{row.contact_email}</div>
                  </td>
                  <td className="ap-date">{formatDate(row.submitted_on)}</td>
                  <td>
                    <span className={`ap-badge ap-status-${row.status}`}>{row.status_label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="ap-overlay" onClick={() => setSelected(null)} role="presentation">
          <aside className="ap-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="ap-drawer-head">
              <div>
                <span className="ap-drawer-ref">{selected.reference}</span>
                <h2>{selected.title || selected.conference_name}</h2>
              </div>
              <button type="button" className="ap-close" onClick={() => setSelected(null)} aria-label="Close">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="ap-drawer-body">
              {detailLoading || selected.loading ? (
                <p className="ap-loading">Loading…</p>
              ) : (
                <>
                  <section className="ap-block">
                    <h3>{isBook ? 'The book' : 'The conference'}</h3>
                    <dl className="ap-dl">
                      {isBook ? (
                        <>
                          <Row label="Type" value={selected.kind_label} />
                          <Row label="Completion" value={selected.completion_status} />
                          <Row label="Expected delivery" value={selected.expected_delivery} />
                          <Row label="Estimated words" value={selected.estimated_words} />
                          <Row label="Estimated pages" value={selected.estimated_pages} />
                          <Row label="Illustrations" value={selected.illustration_count} />
                        </>
                      ) : (
                        <>
                          <Row label="Conference type" value={selected.conference_type} />
                          <Row label="Organiser" value={selected.organising_body} />
                          <Row label="Dates" value={`${selected.conference_start || '?'} → ${selected.conference_end || '?'}`} />
                          <Row label="Venue" value={selected.venue} />
                          <Row label="Subject area" value={selected.subject_area} />
                          <Row label="Expected papers" value={selected.expected_papers} />
                          <Row label="Paper selection" value={selected.selection_process} />
                          <Row label="Website" value={selected.website} />
                          <Row label="Announcement" value={selected.announcement_url} />
                        </>
                      )}
                    </dl>
                  </section>

                  {isBook && (
                    <section className="ap-block">
                      <h3>Content</h3>
                      <Prose label="Synopsis" value={selected.synopsis} />
                      <Prose label="Audience" value={selected.audience} />
                      <Prose label="Chapter outline" value={selected.outline} />
                      <Prose label="Comparable works" value={selected.comparable_works} />
                      <Prose label="Previously published" value={selected.previously_published} />
                      <Prose label="Suggested reviewers" value={selected.suggested_reviewers} />
                    </section>
                  )}

                  {!isBook && selected.message && (
                    <section className="ap-block">
                      <h3>Message</h3>
                      <p className="ap-prose">{selected.message}</p>
                    </section>
                  )}

                  {isBook && Object.keys(attachments).length > 0 && (
                    <section className="ap-block">
                      <h3>Attachments</h3>
                      <div className="ap-attachments">
                        {Object.entries(attachments).map(([field, url]) => (
                          <a
                            key={field}
                            className="ap-attachment"
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>
                              description
                            </span>
                            {ATTACHMENT_LABELS[field] || field}
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="ap-block">
                    <h3>Who sent it</h3>
                    <dl className="ap-dl">
                      <Row label="Name" value={selected.contact_name} />
                      <Row label="Email" value={selected.contact_email} />
                      <Row label="Account" value={selected.account_email} />
                      <Row label="Affiliation" value={selected.affiliation} />
                      <Row label="Designation" value={selected.contact_designation} />
                      <Row label="Phone" value={selected.contact_phone} />
                      <Row label="Received" value={formatDate(selected.submitted_on)} />
                    </dl>
                    <Prose label="Biography" value={selected.author_bio} />
                  </section>

                  <section className="ap-block">
                    <h3>Decision</h3>
                    <dl className="ap-dl">
                      <Row label="Current status" value={selected.status_label} />
                      <Row label="Decided by" value={selected.decided_by_email} />
                      <Row label="Decided on" value={selected.decided_on ? formatDate(selected.decided_on) : null} />
                    </dl>
                    <textarea
                      className="ap-textarea"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Internal note — why this decision was made."
                      aria-label="Decision note"
                    />
                    <div className="ap-decide">
                      <button
                        type="button"
                        className="ap-btn"
                        disabled={saving}
                        onClick={() => decide('under_review')}
                      >
                        Mark under review
                      </button>
                      <button
                        type="button"
                        className="ap-btn ap-btn-accept"
                        disabled={saving}
                        onClick={() => decide('accepted')}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="ap-btn ap-btn-decline"
                        disabled={saving}
                        onClick={() => decide('declined')}
                      >
                        Decline
                      </button>
                    </div>
                    <p className="ap-note">
                      The note is internal and is not sent anywhere. Changing the status does not
                      email the proposer — reply to {selected.contact_email} yourself.
                    </p>
                  </section>

                  <section className="ap-block">
                      <h3>Catalogue</h3>
                      {selected.converted_book_id ? (
                        <p className="ap-note" style={{ marginTop: 0 }}>
                          Already in the catalogue as a draft title. Find it under Catalogue to add
                          metadata, contributors and chapters.
                        </p>
                      ) : (
                        <>
                          <p className="ap-note" style={{ marginTop: 0 }}>
                            {canConvert
                              ? (isBook
                                ? 'Creates a hidden draft title pre-filled from this proposal, at the “commissioned” stage.'
                                : 'Creates a hidden draft volume in the BCP series, carrying over the conference name, dates, venue and organiser.')
                              : 'Accept this proposal first, then you can turn it into a catalogue title.'}
                          </p>
                          <div className="ap-decide">
                            <button
                              type="button"
                              className="ap-btn ap-btn-accept"
                              disabled={saving || !canConvert}
                              onClick={convertToTitle}
                            >
                              {isBook ? 'Create book from this proposal' : 'Create volume from this proposal'}
                            </button>
                          </div>
                        </>
                      )}
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

export default AdminProposals;
