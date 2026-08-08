import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './ProposalForm.module.css';

/**
 * Shared building blocks for the book and proceedings proposal forms.
 * Presentational only — all state lives in the page component.
 */

export const Field = ({ label, name, error, help, optional = false, children }) => (
  <div className={styles.field}>
    <label className={styles.label} htmlFor={name}>
      {label}
      {optional && <span className={styles.optional}> (optional)</span>}
    </label>
    {children}
    {help && !error && <span className={styles.help}>{help}</span>}
    {error && <span className={styles.error}>{error}</span>}
  </div>
);

export const TextField = ({ name, value, onChange, onBlur, error, type = 'text', ...rest }) => (
  <input
    id={name}
    name={name}
    type={type}
    value={value}
    onChange={(e) => onChange(name, e.target.value)}
    onBlur={() => onBlur?.(name)}
    className={`${styles.input} ${error ? styles.inputError : ''}`}
    aria-invalid={Boolean(error)}
    {...rest}
  />
);

export const TextArea = ({ name, value, onChange, onBlur, error, rows = 5, ...rest }) => (
  <textarea
    id={name}
    name={name}
    rows={rows}
    value={value}
    onChange={(e) => onChange(name, e.target.value)}
    onBlur={() => onBlur?.(name)}
    className={`${styles.textarea} ${error ? styles.inputError : ''}`}
    aria-invalid={Boolean(error)}
    {...rest}
  />
);

export const SelectField = ({ name, value, onChange, onBlur, error, options, placeholder }) => (
  <select
    id={name}
    name={name}
    value={value}
    onChange={(e) => onChange(name, e.target.value)}
    onBlur={() => onBlur?.(name)}
    className={`${styles.select} ${error ? styles.inputError : ''}`}
    aria-invalid={Boolean(error)}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

const formatBytes = (bytes) => {
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

export const FileField = ({ name, file, onSelect, error, accept = '.pdf,.doc,.docx,.odt,.rtf' }) => {
  const inputRef = useRef(null);

  return (
    <>
      <div className={styles.fileField}>
        <button
          type="button"
          className={styles.filePick}
          onClick={() => inputRef.current?.click()}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>
            attach_file
          </span>
          {file ? 'Replace file' : 'Choose file'}
        </button>
        <span className={styles.fileName}>
          {file ? `${file.name} · ${formatBytes(file.size)}` : 'No file chosen'}
        </span>
        {file && (
          <button type="button" className={styles.fileClear} onClick={() => onSelect(name, null)}>
            Remove
          </button>
        )}
        <input
          ref={inputRef}
          id={name}
          name={name}
          type="file"
          accept={accept}
          className={styles.hiddenInput}
          onChange={(e) => onSelect(name, e.target.files?.[0] || null)}
        />
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </>
  );
};

export const Stepper = ({ steps, current }) => (
  <div className={styles.stepper}>
    {steps.map((label, index) => {
      const state =
        index === current ? styles.stepPillActive : index < current ? styles.stepPillDone : '';
      return (
        <span key={label} className={`${styles.stepPill} ${state}`}>
          <span className={styles.stepPillNum}>{index + 1}</span>
          {label}
        </span>
      );
    })}
  </div>
);

export const SignInGate = ({ title, message, returnTo }) => (
  <div className={styles.gate}>
    <div className={styles.successIcon}>
      <span className="material-symbols-rounded">lock</span>
    </div>
    <h2 className={styles.successTitle}>{title}</h2>
    <p className={styles.successBody}>{message}</p>
    <div className={styles.successActions}>
      <Link to="/login" state={{ from: returnTo }} className={styles.btnPrimary}>
        <span className="material-symbols-rounded">login</span>
        Sign in
      </Link>
      <Link to="/signup" className={styles.btnSecondary}>Create an account</Link>
    </div>
  </div>
);

export const SuccessPanel = ({ reference, email, children, backTo, backLabel }) => (
  <div className={styles.success}>
    <div className={styles.successIcon}>
      <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
        check
      </span>
    </div>
    <h2 className={styles.successTitle}>Proposal received</h2>
    {reference && <span className={styles.reference}>{reference}</span>}
    <p className={styles.successBody}>
      We have sent a confirmation to <strong>{email}</strong>. Quote your reference number in any
      correspondence about this proposal.
    </p>
    {children}
    <div className={styles.successActions}>
      <Link to={backTo} className={styles.btnSecondary}>{backLabel}</Link>
    </div>
  </div>
);
