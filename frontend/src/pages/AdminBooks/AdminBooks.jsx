import React, { useCallback, useEffect, useState } from 'react';
import acsApi from '../../api/apiService';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { describeApiError, fieldErrors, isNotFound } from '../../utils/apiError';
import './AdminBooks.css';

// Must match Book.PRODUCTION_CHOICES in backend/api/models.py
const PIPELINE = [
  { id: 'commissioned', label: 'Commissioned' },
  { id: 'manuscript', label: 'Manuscript delivered' },
  { id: 'copyediting', label: 'Copyediting' },
  { id: 'typesetting', label: 'Typesetting' },
  { id: 'proofs', label: 'Proofs with author' },
  { id: 'published', label: 'Published' },
];

// Must match Book.KIND_CHOICES
const KINDS = [
  { value: 'monograph', label: 'Monograph' },
  { value: 'edited', label: 'Edited volume' },
  { value: 'textbook', label: 'Textbook' },
  { value: 'proceedings', label: 'Proceedings' },
];

const VISIBILITY = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Live' },
  { id: 'hidden', label: 'Hidden' },
];

const EMPTY_BOOK = {
  title: '', subtitle: '', slug: '', series: '', volume_no: '', kind: 'monograph',
  abstract: '', isbn: '', eisbn: '', doi: '', pages: '', edition: '',
  language: 'English', published_on: '',
  // Conference metadata — Crossref registers proceedings as a distinct record
  // type and needs these, so they are kept structured rather than free text.
  conference_name: '', conference_acronym: '', conference_number: '',
  conference_start: '', conference_end: '', conference_venue: '',
  conference_organiser: '', conference_url: '',
  is_open_access: false, is_published: false, production_status: 'commissioned',
};

const EMPTY_GUEST = { name: '', email: '', affiliation: '', invitation_message: '' };

const EMPTY_CHAPTER = {
  title: '', authors: '', doi: '', start_page: '', end_page: '', is_open_access: false,
};

const AdminBooks = () => {
  const { success, error: showError } = useToast();
  const { user } = useAuth();
  // Guest editors reach this same screen for their own volumes. The API
  // enforces the boundary; hiding the controls stops them clicking things
  // that would only ever return 403.
  const isStaff = ['admin', 'editor'].includes((user?.role || '').toLowerCase());
  const [books, setBooks] = useState([]);
  const [counts, setCounts] = useState({ total: 0, published: 0, in_production: 0 });
  const [series, setSeries] = useState([]);
  const [production, setProduction] = useState('all');
  const [visibility, setVisibility] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [open, setOpen] = useState(null); // the book being edited, or 'new'
  const [tab, setTab] = useState('details');
  const [form, setForm] = useState(EMPTY_BOOK);
  const [errors, setErrors] = useState({});
  const [contributors, setContributors] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [newChapter, setNewChapter] = useState(EMPTY_CHAPTER);
  const [warnings, setWarnings] = useState([]);
  const [guestEditors, setGuestEditors] = useState([]);
  const [newGuest, setNewGuest] = useState(EMPTY_GUEST);
  const [guestErrors, setGuestErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await acsApi.catalogue.listBooks({
        productionStatus: production,
        visibility,
        q: query.trim() || undefined,
      });
      setBooks(data.books || []);
      setCounts(data.counts || { total: 0, published: 0, in_production: 0 });
    } catch (err) {
      if (!isNotFound(err)) setError(describeApiError(err, 'Could not load the catalogue.'));
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [production, visibility, query]);

  useEffect(() => {
    const t = setTimeout(fetchBooks, query ? 300 : 0); // debounce typing only
    return () => clearTimeout(t);
  }, [fetchBooks, query]);

  useEffect(() => {
    acsApi.catalogue
      .listSeries()
      .then((data) => setSeries(Array.isArray(data) ? data : []))
      .catch(() => setSeries([]));
  }, []);

  const openNew = () => {
    setOpen('new');
    setTab('details');
    setForm(EMPTY_BOOK);
    setContributors([]);
    setChapters([]);
    setWarnings([]);
    setGuestEditors([]);
    setNewGuest(EMPTY_GUEST);
    setErrors({});
  };

  const openBook = async (row) => {
    setOpen(row);
    setTab('details');
    setErrors({});
    try {
      const book = await acsApi.catalogue.getBook(row.id);
      setForm({
        ...EMPTY_BOOK,
        ...Object.fromEntries(
          Object.keys(EMPTY_BOOK).map((k) => [k, book[k] ?? EMPTY_BOOK[k]]),
        ),
        series: book.series ?? '',
      });
      setContributors(book.contributors || []);
      setChapters(book.chapters || []);
      setWarnings(book.warnings || []);
      setOpen(book);
      try {
        setGuestEditors(await acsApi.catalogue.listGuestEditors(row.id));
      } catch {
        setGuestEditors([]);   // not fatal — the rest of the drawer still works
      }
    } catch (err) {
      showError(describeApiError(err, 'Could not open that title.'));
      setOpen(null);
    }
  };

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const buildPayload = () => {
    const payload = { ...form };
    // Empty strings would fail integer/date validation server-side
    ['volume_no', 'pages', 'series', 'conference_number'].forEach((k) => {
      payload[k] = payload[k] === '' ? null : Number(payload[k]);
      if (Number.isNaN(payload[k])) payload[k] = null;
    });
    if (!payload.published_on) payload.published_on = null;
    if (!payload.conference_start) payload.conference_start = null;
    if (!payload.conference_end) payload.conference_end = null;
    if (!payload.slug) delete payload.slug; // let the server derive it
    if (!isStaff) {
      // The API rejects these from a guest editor; do not even send them.
      ['is_published', 'production_status', 'series', 'slug'].forEach((k) => delete payload[k]);
    }
    return payload;
  };

  const saveBook = async () => {
    if (!form.title.trim()) {
      setErrors({ title: 'A title is required.' });
      setTab('details');
      return;
    }
    try {
      setSaving(true);
      const payload = buildPayload();
      const saved =
        open === 'new'
          ? await acsApi.catalogue.createBook(payload)
          : await acsApi.catalogue.updateBook(open.id, payload);
      success(open === 'new' ? 'Title created.' : 'Title saved.');
      setWarnings(saved.warnings || []);
      setOpen(saved);
      setForm((prev) => ({ ...prev, slug: saved.slug, production_status: saved.production_status }));
      fetchBooks();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !data.detail) {
        setErrors(
          Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)]),
          ),
        );
        showError('Some fields need fixing.');
      } else {
        showError(describeApiError(err, 'Could not save this title.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const moveToStage = async (stage) => {
    if (open === 'new') {
      setField('production_status', stage);
      return;
    }
    try {
      setSaving(true);
      const saved = await acsApi.catalogue.updateBook(open.id, { production_status: stage });
      setForm((prev) => ({ ...prev, production_status: saved.production_status }));
      setWarnings(saved.warnings || []);
      setOpen(saved);
      success(`Moved to ${saved.production_label}.`);
      fetchBooks();
    } catch (err) {
      showError(describeApiError(err, 'Could not change the stage.'));
    } finally {
      setSaving(false);
    }
  };

  const removeBook = async () => {
    if (open === 'new') return;
    if (!window.confirm(`Delete “${open.title}”? This cannot be undone.`)) return;
    try {
      setSaving(true);
      await acsApi.catalogue.deleteBook(open.id);
      success('Title deleted.');
      setOpen(null);
      fetchBooks();
    } catch (err) {
      showError(describeApiError(err, 'Could not delete this title.'));
    } finally {
      setSaving(false);
    }
  };

  /* ── Contributors ── */
  const saveContributors = async () => {
    try {
      setSaving(true);
      const saved = await acsApi.catalogue.setContributors(open.id, contributors);
      setContributors(saved.contributors || []);
      success('Contributors saved.');
      fetchBooks();
    } catch (err) {
      showError(describeApiError(err, 'Could not save contributors.'));
    } finally {
      setSaving(false);
    }
  };

  /* ── Guest editors ── */
  const inviteGuest = async () => {
    if (!newGuest.name.trim() || !newGuest.email.trim()) return;
    try {
      setSaving(true);
      setGuestErrors({});
      const created = await acsApi.catalogue.inviteGuestEditor(open.id, newGuest);
      setGuestEditors((prev) => [...prev, created]);
      setNewGuest(EMPTY_GUEST);
      success(`Invitation sent to ${created.email}.`);
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields) setGuestErrors(fields);
      else showError(describeApiError(err, 'Could not send that invitation.'));
    } finally {
      setSaving(false);
    }
  };

  const resendGuest = async (guest) => {
    try {
      const updated = await acsApi.catalogue.resendGuestEditor(open.id, guest.id);
      setGuestEditors((prev) => prev.map((g) => (g.id === guest.id ? updated : g)));
      success(`Invitation re-sent to ${guest.email}.`);
    } catch (err) {
      showError(describeApiError(err, 'Could not re-send that invitation.'));
    }
  };

  const removeGuest = async (guest) => {
    if (!window.confirm(`Remove ${guest.name}'s access to this volume?`)) return;
    try {
      await acsApi.catalogue.removeGuestEditor(open.id, guest.id);
      setGuestEditors((prev) => prev.filter((g) => g.id !== guest.id));
      success(`${guest.name} no longer has access.`);
    } catch (err) {
      showError(describeApiError(err, 'Could not remove that guest editor.'));
    }
  };

  /* ── Chapters ── */
  const addChapter = async () => {
    if (!newChapter.title.trim()) return;
    try {
      setSaving(true);
      const payload = { ...newChapter };
      ['start_page', 'end_page'].forEach((k) => {
        payload[k] = payload[k] === '' ? null : Number(payload[k]);
      });
      const created = await acsApi.catalogue.addChapter(open.id, payload);
      setChapters((prev) => [...prev, created]);
      setNewChapter(EMPTY_CHAPTER);
      // The open-choice ratio just changed, so re-read the advisory checks.
      const refreshed = await acsApi.catalogue.getBook(open.id);
      setWarnings(refreshed.warnings || []);
      success('Chapter added.');
    } catch (err) {
      const data = err.response?.data;
      showError(data?.end_page?.[0] || describeApiError(err, 'Could not add that chapter.'));
    } finally {
      setSaving(false);
    }
  };

  const removeChapter = async (chapterId) => {
    try {
      await acsApi.catalogue.deleteChapter(open.id, chapterId);
      setChapters((prev) => prev.filter((c) => c.id !== chapterId));
      const refreshed = await acsApi.catalogue.getBook(open.id);
      setWarnings(refreshed.warnings || []);
      success('Chapter removed.');
    } catch (err) {
      showError(describeApiError(err, 'Could not remove that chapter.'));
    }
  };

  const stageIndex = PIPELINE.findIndex((s) => s.id === form.production_status);

  return (
    <div className="ab-page">
      <header className="ab-header">
        <div>
          <h1 className="ab-title">{isStaff ? 'Catalogue' : 'My volumes'}</h1>
          <p className="ab-subtitle">
            {isStaff
              ? 'Every book and proceedings volume, including titles still in production.'
              : 'The volumes you guest-edit. Publishing and series decisions stay with the editorial team.'}
          </p>
        </div>
        {isStaff && (
          <div className="ab-header-actions">
            <button type="button" className="ab-btn ab-btn-primary" onClick={openNew}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>add</span>
              New title
            </button>
          </div>
        )}
      </header>

      <div className="ab-stats">
        <div className="ab-stat">
          <span className="ab-stat-value">{counts.total}</span>
          <span className="ab-stat-label">Titles</span>
        </div>
        <div className="ab-stat">
          <span className="ab-stat-value">{counts.published}</span>
          <span className="ab-stat-label">Live on the site</span>
        </div>
        <div className="ab-stat">
          <span className="ab-stat-value">{counts.in_production}</span>
          <span className="ab-stat-label">In production</span>
        </div>
      </div>

      {error && (
        <p className="ab-error">
          {error}{' '}
          <button type="button" className="ab-inline-retry" onClick={fetchBooks}>Try again</button>
        </p>
      )}

      <div className="ab-filters">
        <button
          type="button"
          className={`ab-chip ${production === 'all' ? 'is-active' : ''}`}
          onClick={() => setProduction('all')}
        >
          All stages
        </button>
        {PIPELINE.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`ab-chip ${production === s.id ? 'is-active' : ''}`}
            onClick={() => setProduction(s.id)}
          >
            {s.label}
          </button>
        ))}
        <input
          className="ab-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, ISBN, conference…"
          aria-label="Search the catalogue"
        />
      </div>

      <div className="ab-filters">
        {VISIBILITY.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`ab-chip ${visibility === v.id ? 'is-active' : ''}`}
            onClick={() => setVisibility(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="ab-table-wrap">
        {loading ? (
          <p className="ab-loading">Loading catalogue…</p>
        ) : books.length === 0 ? (
          <p className="ab-empty">No titles match these filters.</p>
        ) : (
          <table className="ab-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Series</th>
                <th>ISBN</th>
                <th>Chapters</th>
                <th>Stage</th>
                <th>Visibility</th>
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => openBook(b)}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') openBook(b); }}
                >
                  <td>
                    <div className="ab-row-title">{b.title}</div>
                    <div className="ab-row-sub">{b.contributors?.map((c) => c.name).join(', ') || '—'}</div>
                  </td>
                  <td className="ab-mono">{b.kind_label}</td>
                  <td className="ab-mono">{b.series_abbreviation || '—'}</td>
                  <td className="ab-mono">{b.isbn || '—'}</td>
                  <td className="ab-mono">{b.chapter_count}</td>
                  <td>
                    <span className={`ab-badge ab-prod-${b.production_status}`}>
                      {b.production_label}
                    </span>
                  </td>
                  <td>
                    <span className={`ab-badge ${b.is_published ? 'ab-vis-live' : 'ab-vis-hidden'}`}>
                      {b.is_published ? 'Live' : 'Hidden'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <div className="ab-overlay" onClick={() => setOpen(null)} role="presentation">
          <aside className="ab-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="ab-drawer-head">
              <div>
                <span className="ab-drawer-kicker">
                  {open === 'new' ? 'New title' : form.production_status.replace(/_/g, ' ')}
                </span>
                <h2>{form.title || 'Untitled'}</h2>
              </div>
              <button type="button" className="ab-close" onClick={() => setOpen(null)} aria-label="Close">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="ab-tabs">
              {['details', 'guest editors', 'contributors', 'chapters'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`ab-tab ${tab === t ? 'is-active' : ''}`}
                  onClick={() => setTab(t)}
                  disabled={open === 'new' && t !== 'details'}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                  {t === 'guest editors' && guestEditors.length > 0 ? ` (${guestEditors.length})` : ''}
                </button>
              ))}
            </div>

            <div className="ab-drawer-body">
              {warnings.length > 0 && (
                <div className="ab-warn">
                  <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>
                    warning
                  </span>
                  <div>
                    {warnings.map((w) => <p key={w}>{w}</p>)}
                  </div>
                </div>
              )}

              {tab === 'details' && (
                <>
                  {open !== 'new' && isStaff && (
                    <section className="ab-block">
                      <h3>Production stage</h3>
                      <div className="ab-pipeline">
                        {PIPELINE.map((s, i) => (
                          <button
                            key={s.id}
                            type="button"
                            disabled={saving}
                            onClick={() => moveToStage(s.id)}
                            className={`ab-stage ${
                              s.id === form.production_status
                                ? 'is-current'
                                : i < stageIndex
                                  ? 'is-done'
                                  : ''
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                      <p className="ab-help" style={{ marginTop: '0.75rem' }}>
                        Stages are the internal pipeline. A title only appears on the public site
                        when &ldquo;Visible on the public site&rdquo; below is ticked.
                      </p>
                    </section>
                  )}

                  <section className="ab-block">
                    <h3>Metadata</h3>
                    <div className="ab-grid">
                      <div className={`ab-field ab-field-wide ${errors.title ? 'ab-field-error' : ''}`}>
                        <label className="ab-label" htmlFor="title">Title</label>
                        <input id="title" className="ab-input" value={form.title}
                          onChange={(e) => setField('title', e.target.value)} />
                        {errors.title && <span className="ab-err">{errors.title}</span>}
                      </div>

                      <div className="ab-field ab-field-wide">
                        <label className="ab-label" htmlFor="subtitle">Subtitle</label>
                        <input id="subtitle" className="ab-input" value={form.subtitle}
                          onChange={(e) => setField('subtitle', e.target.value)} />
                      </div>

                      <div className="ab-field">
                        <label className="ab-label" htmlFor="kind">Type</label>
                        <select id="kind" className="ab-select" value={form.kind}
                          onChange={(e) => setField('kind', e.target.value)}>
                          {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                        </select>
                      </div>

                      <div className="ab-field" hidden={!isStaff}>
                        <label className="ab-label" htmlFor="series">Series</label>
                        <select id="series" className="ab-select" value={form.series ?? ''}
                          onChange={(e) => setField('series', e.target.value)}>
                          <option value="">None</option>
                          {series.map((s) => (
                            <option key={s.id} value={s.id}>{s.abbreviation} — {s.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="ab-field">
                        <label className="ab-label" htmlFor="volume_no">Volume number</label>
                        <input id="volume_no" className="ab-input" type="number" value={form.volume_no ?? ''}
                          onChange={(e) => setField('volume_no', e.target.value)} />
                      </div>

                      <div className="ab-field">
                        <label className="ab-label" htmlFor="edition">Edition</label>
                        <input id="edition" className="ab-input" value={form.edition}
                          onChange={(e) => setField('edition', e.target.value)} placeholder="e.g. 2nd edition" />
                      </div>

                      <div className={`ab-field ${errors.slug ? 'ab-field-error' : ''}`} hidden={!isStaff}>
                        <label className="ab-label" htmlFor="slug">URL slug</label>
                        <input id="slug" className="ab-input" value={form.slug}
                          onChange={(e) => setField('slug', e.target.value)}
                          placeholder="Left blank, derived from the title" />
                        {errors.slug ? <span className="ab-err">{errors.slug}</span>
                          : <span className="ab-help">/books/{form.slug || '…'}</span>}
                      </div>

                      <div className="ab-field">
                        <label className="ab-label" htmlFor="language">Language</label>
                        <input id="language" className="ab-input" value={form.language}
                          onChange={(e) => setField('language', e.target.value)} />
                      </div>

                      <div className="ab-field">
                        <label className="ab-label" htmlFor="isbn">ISBN (print)</label>
                        <input id="isbn" className="ab-input" value={form.isbn}
                          onChange={(e) => setField('isbn', e.target.value)} />
                      </div>

                      <div className="ab-field">
                        <label className="ab-label" htmlFor="eisbn">eISBN</label>
                        <input id="eisbn" className="ab-input" value={form.eisbn}
                          onChange={(e) => setField('eisbn', e.target.value)} />
                        <span className="ab-help">Required for ONIX and library feeds.</span>
                      </div>

                      <div className="ab-field">
                        <label className="ab-label" htmlFor="doi">DOI</label>
                        <input id="doi" className="ab-input" value={form.doi}
                          onChange={(e) => setField('doi', e.target.value)} />
                      </div>

                      <div className="ab-field">
                        <label className="ab-label" htmlFor="pages">Extent (pages)</label>
                        <input id="pages" className="ab-input" type="number" value={form.pages ?? ''}
                          onChange={(e) => setField('pages', e.target.value)} />
                      </div>

                      <div className="ab-field">
                        <label className="ab-label" htmlFor="published_on">Publication date</label>
                        <input id="published_on" className="ab-input" type="date" value={form.published_on || ''}
                          onChange={(e) => setField('published_on', e.target.value)} />
                        <span className="ab-help">Day-level precision, as ONIX expects.</span>
                      </div>

                      <div className="ab-field ab-field-wide">
                        <label className="ab-label" htmlFor="abstract">Abstract</label>
                        <textarea id="abstract" className="ab-textarea" value={form.abstract}
                          onChange={(e) => setField('abstract', e.target.value)} />
                      </div>

                      <div className="ab-field">
                        <label className="ab-check">
                          <input type="checkbox" checked={form.is_open_access}
                            onChange={(e) => setField('is_open_access', e.target.checked)} />
                          Open access
                        </label>
                      </div>

                      <div className="ab-field" hidden={!isStaff}>
                        <label className="ab-check">
                          <input type="checkbox" checked={form.is_published}
                            onChange={(e) => setField('is_published', e.target.checked)} />
                          Visible on the public site
                        </label>
                      </div>
                    </div>

                    <div className="ab-actions" style={{ marginTop: '1.25rem' }}>
                      {open !== 'new' && isStaff && (
                        <button type="button" className="ab-btn ab-btn-danger" onClick={removeBook} disabled={saving}>
                          Delete
                        </button>
                      )}
                      <span className="ab-actions-spacer" />
                      <button type="button" className="ab-btn" onClick={() => setOpen(null)}>Close</button>
                      <button type="button" className="ab-btn ab-btn-primary" onClick={saveBook} disabled={saving}>
                        {saving ? 'Saving…' : open === 'new' ? 'Create title' : 'Save changes'}
                      </button>
                    </div>
                  </section>

                  {form.kind === 'proceedings' && (
                    <section className="ab-block">
                      <h3>Conference</h3>
                      <p className="ab-help" style={{ marginBottom: '1rem' }}>
                        Crossref registers proceedings as a distinct record type. The conference
                        name is required for that deposit; the rest is strongly encouraged.
                      </p>
                      <div className="ab-grid">
                        <div className="ab-field ab-field-wide">
                          <label className="ab-label" htmlFor="conference_name">Conference name</label>
                          <input id="conference_name" className="ab-input" value={form.conference_name}
                            onChange={(e) => setField('conference_name', e.target.value)}
                            placeholder="e.g. International Conference on Computational Intelligence 2027" />
                        </div>
                        <div className="ab-field">
                          <label className="ab-label" htmlFor="conference_acronym">Acronym</label>
                          <input id="conference_acronym" className="ab-input" value={form.conference_acronym}
                            onChange={(e) => setField('conference_acronym', e.target.value)} placeholder="e.g. ICCIS" />
                        </div>
                        <div className="ab-field">
                          <label className="ab-label" htmlFor="conference_number">Edition number</label>
                          <input id="conference_number" className="ab-input" type="number" value={form.conference_number ?? ''}
                            onChange={(e) => setField('conference_number', e.target.value)} placeholder="e.g. 12" />
                        </div>
                        <div className="ab-field">
                          <label className="ab-label" htmlFor="conference_start">First day</label>
                          <input id="conference_start" className="ab-input" type="date" value={form.conference_start || ''}
                            onChange={(e) => setField('conference_start', e.target.value)} />
                        </div>
                        <div className="ab-field">
                          <label className="ab-label" htmlFor="conference_end">Last day</label>
                          <input id="conference_end" className="ab-input" type="date" value={form.conference_end || ''}
                            onChange={(e) => setField('conference_end', e.target.value)} />
                        </div>
                        <div className="ab-field">
                          <label className="ab-label" htmlFor="conference_venue">Venue</label>
                          <input id="conference_venue" className="ab-input" value={form.conference_venue}
                            onChange={(e) => setField('conference_venue', e.target.value)} placeholder="City, or Online" />
                        </div>
                        <div className="ab-field">
                          <label className="ab-label" htmlFor="conference_organiser">Organiser</label>
                          <input id="conference_organiser" className="ab-input" value={form.conference_organiser}
                            onChange={(e) => setField('conference_organiser', e.target.value)} />
                        </div>
                        <div className="ab-field ab-field-wide">
                          <label className="ab-label" htmlFor="conference_url">Conference website</label>
                          <input id="conference_url" className="ab-input" type="url" value={form.conference_url}
                            onChange={(e) => setField('conference_url', e.target.value)} placeholder="https://" />
                        </div>
                      </div>
                    </section>
                  )}
                </>
              )}

              {tab === 'guest editors' && open !== 'new' && (
                <>
                  <section className="ab-block">
                    <h3>Guest editors ({guestEditors.length})</h3>
                    <p className="ab-help" style={{ marginBottom: '1rem' }}>
                      Guest editors can sign in and manage this volume&apos;s details,
                      contributors and chapters. They cannot publish it, delete it, or change
                      its series — those stay with the publishing team. A volume can have as
                      many guest editors as it needs.
                    </p>
                    {guestEditors.length === 0 ? (
                      <p className="ab-help">Nobody has been invited yet.</p>
                    ) : (
                      <div className="ab-rows">
                        {guestEditors.map((g) => (
                          <div className="ab-chapter-row" key={g.id}>
                            <div className="ab-row-title">
                              {g.name}{' '}
                              <span className={`ab-badge ab-guest-${g.status}`}>
                                {g.is_expired ? 'Expired' : g.status_label}
                              </span>
                            </div>
                            <div className="ab-row-sub">
                              {g.email}
                              {g.affiliation ? ` · ${g.affiliation}` : ''}
                              {g.account_email ? '' : ' · no account yet'}
                            </div>
                            {g.decline_reason && (
                              <div className="ab-row-sub">Declined: {g.decline_reason}</div>
                            )}
                            <div className="ab-actions">
                              <span className="ab-actions-spacer" />
                              {g.status !== 'active' && (
                                <button type="button" className="ab-btn" onClick={() => resendGuest(g)}>
                                  Re-send invitation
                                </button>
                              )}
                              <button type="button" className="ab-btn ab-btn-danger"
                                onClick={() => removeGuest(g)}>
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="ab-block">
                    <h3>Invite a guest editor</h3>
                    <div className="ab-grid">
                      <div className={`ab-field ${guestErrors.name ? 'ab-field-error' : ''}`}>
                        <label className="ab-label" htmlFor="ge-name">Name</label>
                        <input id="ge-name" className="ab-input" value={newGuest.name}
                          onChange={(e) => setNewGuest((p) => ({ ...p, name: e.target.value }))} />
                        {guestErrors.name && <span className="ab-err">{guestErrors.name}</span>}
                      </div>
                      <div className={`ab-field ${guestErrors.email ? 'ab-field-error' : ''}`}>
                        <label className="ab-label" htmlFor="ge-email">Email</label>
                        <input id="ge-email" className="ab-input" type="email" value={newGuest.email}
                          onChange={(e) => setNewGuest((p) => ({ ...p, email: e.target.value }))} />
                        {guestErrors.email ? <span className="ab-err">{guestErrors.email}</span>
                          : <span className="ab-help">The invitation is tied to this address.</span>}
                      </div>
                      <div className="ab-field ab-field-wide">
                        <label className="ab-label" htmlFor="ge-affil">Affiliation</label>
                        <input id="ge-affil" className="ab-input" value={newGuest.affiliation}
                          onChange={(e) => setNewGuest((p) => ({ ...p, affiliation: e.target.value }))} />
                      </div>
                      <div className="ab-field ab-field-wide">
                        <label className="ab-label" htmlFor="ge-msg">Message</label>
                        <textarea id="ge-msg" className="ab-textarea" value={newGuest.invitation_message}
                          onChange={(e) => setNewGuest((p) => ({ ...p, invitation_message: e.target.value }))}
                          placeholder="Included in the invitation email." />
                      </div>
                    </div>
                    <div className="ab-actions" style={{ marginTop: '1rem' }}>
                      <span className="ab-actions-spacer" />
                      <button type="button" className="ab-btn ab-btn-primary" onClick={inviteGuest}
                        disabled={saving || !newGuest.name.trim() || !newGuest.email.trim()}>
                        {saving ? 'Sending…' : 'Send invitation'}
                      </button>
                    </div>
                  </section>
                </>
              )}

              {tab === 'contributors' && open !== 'new' && (
                <section className="ab-block">
                  <h3>Authors &amp; editors</h3>
                  <div className="ab-rows">
                    {contributors.map((c, i) => (
                      <div className="ab-row" key={c.id ?? `new-${i}`}>
                        <input className="ab-input" value={c.name} placeholder="Name"
                          onChange={(e) => setContributors((p) =>
                            p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                        <input className="ab-input" value={c.affiliation || ''} placeholder="Affiliation"
                          onChange={(e) => setContributors((p) =>
                            p.map((x, j) => (j === i ? { ...x, affiliation: e.target.value } : x)))} />
                        <select className="ab-select" value={c.role}
                          onChange={(e) => setContributors((p) =>
                            p.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}>
                          <option value="author">Author</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button type="button" className="ab-icon-btn" aria-label="Remove"
                          onClick={() => setContributors((p) => p.filter((_, j) => j !== i))}>
                          <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="ab-actions" style={{ marginTop: '1rem' }}>
                    <button type="button" className="ab-btn"
                      onClick={() => setContributors((p) => [...p, { name: '', affiliation: '', role: 'author' }])}>
                      <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>add</span>
                      Add contributor
                    </button>
                    <span className="ab-actions-spacer" />
                    <button type="button" className="ab-btn ab-btn-primary" onClick={saveContributors} disabled={saving}>
                      {saving ? 'Saving…' : 'Save contributors'}
                    </button>
                  </div>
                  <p className="ab-help" style={{ marginTop: '0.75rem' }}>
                    Order is the byline order. Rows left blank are discarded on save.
                  </p>
                </section>
              )}

              {tab === 'chapters' && open !== 'new' && (
                <>
                  <section className="ab-block">
                    <h3>Chapters ({chapters.length})</h3>
                    {chapters.length === 0 ? (
                      <p className="ab-help">
                        No chapters yet. Chapter-level DOIs are what make individual contributions
                        to an edited volume discoverable.
                      </p>
                    ) : (
                      <div className="ab-rows">
                        {chapters.map((c, i) => (
                          <div className="ab-chapter-row" key={c.id}>
                            <div className="ab-row-title">{i + 1}. {c.title}</div>
                            <div className="ab-row-sub">
                              {c.authors || 'No authors recorded'}
                              {c.doi ? ` · ${c.doi}` : ''}
                              {c.start_page && c.end_page ? ` · pp. ${c.start_page}–${c.end_page}` : ''}
                              {c.is_open_access ? ' · Open access' : ''}
                            </div>
                            <div className="ab-actions">
                              <span className="ab-actions-spacer" />
                              <button type="button" className="ab-icon-btn" aria-label="Delete chapter"
                                onClick={() => removeChapter(c.id)}>
                                <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>delete</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="ab-block">
                    <h3>Add a chapter</h3>
                    <div className="ab-chapter-grid">
                      <input className="ab-input" placeholder="Chapter title" value={newChapter.title}
                        onChange={(e) => setNewChapter((p) => ({ ...p, title: e.target.value }))} />
                      <input className="ab-input" placeholder="Authors" value={newChapter.authors}
                        onChange={(e) => setNewChapter((p) => ({ ...p, authors: e.target.value }))} />
                      <input className="ab-input" type="number" placeholder="First pg" value={newChapter.start_page}
                        onChange={(e) => setNewChapter((p) => ({ ...p, start_page: e.target.value }))} />
                      <input className="ab-input" type="number" placeholder="Last pg" value={newChapter.end_page}
                        onChange={(e) => setNewChapter((p) => ({ ...p, end_page: e.target.value }))} />
                    </div>
                    <div className="ab-actions" style={{ marginTop: '0.6rem' }}>
                      <input className="ab-input" placeholder="Chapter DOI" value={newChapter.doi}
                        onChange={(e) => setNewChapter((p) => ({ ...p, doi: e.target.value }))} />
                      <label className="ab-check" style={{ whiteSpace: 'nowrap' }}>
                        <input type="checkbox" checked={newChapter.is_open_access}
                          onChange={(e) => setNewChapter((p) => ({ ...p, is_open_access: e.target.checked }))} />
                        Open access
                      </label>
                      <button type="button" className="ab-btn ab-btn-primary" onClick={addChapter}
                        disabled={saving || !newChapter.title.trim()}>
                        Add
                      </button>
                    </div>
                    <p className="ab-help" style={{ marginTop: '0.6rem' }}>
                      Marking papers open access matters: above 40% of a volume, publish the whole
                      volume open access instead of using open choice.
                    </p>
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

export default AdminBooks;
