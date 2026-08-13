import React, { useEffect, useRef, useState } from 'react';
import acsApi from '../../api/apiService';
import { useToast } from '../../hooks/useToast';
import { describeApiError } from '../../utils/apiError';
import '../AdminBooks/AdminBooks.css';

// Must match DownloadAsset.AUDIENCE_CHOICES in backend/api/models.py
const AUDIENCES = [
  { value: 'author', label: 'Authors' },
  { value: 'editor', label: 'Editors' },
  { value: 'forms', label: 'Forms' },
  { value: 'reference', label: 'Reference' },
];

const formatBytes = (bytes) => {
  if (!bytes) return '—';
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

const AdminDownloads = () => {
  const { success, error: showError } = useToast();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [label, setLabel] = useState('');
  const [audience, setAudience] = useState('author');
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  const replaceRefs = useRef({});

  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await acsApi.catalogue.listDownloads();
      setAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(describeApiError(err, 'Could not load the downloads.'));
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const upload = async () => {
    if (!label.trim() || !file) return;
    const payload = new FormData();
    payload.append('label', label.trim());
    payload.append('audience', audience);
    if (note.trim()) payload.append('note', note.trim());
    payload.append('file', file);

    try {
      setSaving(true);
      await acsApi.catalogue.createDownload(payload);
      success('File uploaded.');
      setLabel('');
      setNote('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      fetchAssets();
    } catch (err) {
      const data = err.response?.data;
      showError(data?.file?.[0] || describeApiError(err, 'Could not upload that file.'));
    } finally {
      setSaving(false);
    }
  };

  // Replacing the file stamps a new revision date server-side
  const replaceFile = async (asset, selected) => {
    if (!selected) return;
    const payload = new FormData();
    payload.append('file', selected);
    try {
      setSaving(true);
      await acsApi.catalogue.updateDownload(asset.id, payload);
      success(`${asset.label} replaced.`);
      fetchAssets();
    } catch (err) {
      const data = err.response?.data;
      showError(data?.file?.[0] || describeApiError(err, 'Could not replace that file.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (asset) => {
    try {
      await acsApi.catalogue.updateDownload(asset.id, { is_active: !asset.is_active });
      fetchAssets();
    } catch (err) {
      showError(describeApiError(err, 'Could not change that file.'));
    }
  };

  const remove = async (asset) => {
    if (!window.confirm(`Delete “${asset.label}”? The public link will stop working.`)) return;
    try {
      await acsApi.catalogue.deleteDownload(asset.id);
      success('Download deleted.');
      fetchAssets();
    } catch (err) {
      showError(describeApiError(err, 'Could not delete that file.'));
    }
  };

  return (
    <div className="ab-page">
      <header className="ab-header">
        <div>
          <h1 className="ab-title">Proceedings downloads</h1>
          <p className="ab-subtitle">
            The templates, guidelines and forms listed on the public proceedings page. Replacing a
            file publishes it immediately and stamps a new revision date.
          </p>
        </div>
      </header>

      {error && (
        <p className="ab-error">
          {error}{' '}
          <button type="button" className="ab-inline-retry" onClick={fetchAssets}>Try again</button>
        </p>
      )}

      <section className="ab-block" style={{ marginBottom: '1.5rem' }}>
        <h3>Upload a file</h3>
        <div className="ab-grid">
          <div className="ab-field">
            <label className="ab-label" htmlFor="dl-label">Label</label>
            <input id="dl-label" className="ab-input" value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Paper template — Word" />
          </div>
          <div className="ab-field">
            <label className="ab-label" htmlFor="dl-audience">Section</label>
            <select id="dl-audience" className="ab-select" value={audience}
              onChange={(e) => setAudience(e.target.value)}>
              {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div className="ab-field">
            <label className="ab-label" htmlFor="dl-note">Note</label>
            <input id="dl-note" className="ab-input" value={note}
              onChange={(e) => setNote(e.target.value)} placeholder="e.g. One per paper" />
          </div>
          <div className="ab-field">
            <label className="ab-label" htmlFor="dl-file">File</label>
            <input id="dl-file" ref={fileRef} className="ab-input" type="file"
              accept=".pdf,.doc,.docx,.odt,.rtf,.zip,.tex,.xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <span className="ab-help">Up to 25 MB.</span>
          </div>
        </div>
        <div className="ab-actions" style={{ marginTop: '1rem' }}>
          <span className="ab-actions-spacer" />
          <button type="button" className="ab-btn ab-btn-primary" onClick={upload}
            disabled={saving || !label.trim() || !file}>
            {saving ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </section>

      <div className="ab-table-wrap">
        {loading ? (
          <p className="ab-loading">Loading downloads…</p>
        ) : assets.length === 0 ? (
          <p className="ab-empty">
            Nothing uploaded yet. The proceedings page will show an empty downloads section.
          </p>
        ) : (
          <table className="ab-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Section</th>
                <th>File</th>
                <th>Size</th>
                <th>Revised</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} style={{ cursor: 'default' }}>
                  <td>
                    <div className="ab-row-title">{a.label}</div>
                    {a.note && <div className="ab-row-sub">{a.note}</div>}
                  </td>
                  <td className="ab-mono">{a.audience_label}</td>
                  <td className="ab-mono">
                    <a href={a.file_url} target="_blank" rel="noopener noreferrer">
                      {a.file_format || 'File'}
                    </a>
                  </td>
                  <td className="ab-mono">{formatBytes(a.size_bytes)}</td>
                  <td className="ab-mono">{a.revised_on || '—'}</td>
                  <td>
                    <span className={`ab-badge ${a.is_active ? 'ab-vis-live' : 'ab-vis-hidden'}`}>
                      {a.is_active ? 'Listed' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <div className="ab-actions">
                      <button type="button" className="ab-btn" disabled={saving}
                        onClick={() => replaceRefs.current[a.id]?.click()}>
                        Replace
                      </button>
                      <input
                        type="file"
                        style={{ display: 'none' }}
                        accept=".pdf,.doc,.docx,.odt,.rtf,.zip,.tex,.xlsx,.xls,.csv"
                        ref={(el) => { replaceRefs.current[a.id] = el; }}
                        onChange={(e) => {
                          replaceFile(a, e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                      <button type="button" className="ab-btn" onClick={() => toggleActive(a)}>
                        {a.is_active ? 'Hide' : 'List'}
                      </button>
                      <button type="button" className="ab-btn ab-btn-danger" onClick={() => remove(a)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminDownloads;
