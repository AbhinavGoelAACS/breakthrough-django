import React from 'react';

/**
 * Reusable Form Input Component
 * Supports text, email, password, textarea, and select inputs
 */
export const FormInput = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  maxLength,
  required = false,
  hint,
  showCount = false,
  rows = 4,
  options = [],
  className = '',
  disabled = false,
}) => {
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  const renderInput = () => {
    const baseClass = `form-control ${className}`;

    // Select dropdown
    if (type === 'select') {
      return (
        <select
          id={id}
          value={value}
          onChange={handleChange}
          className={baseClass}
          disabled={disabled}
        >
          <option value="">-- Select --</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    // Textarea
    if (type === 'textarea') {
      return (
        <textarea
          id={id}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={rows}
          className={baseClass}
          disabled={disabled}
        />
      );
    }

    // Default text/email/password input
    return (
      <input
        id={id}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={maxLength}
        className={baseClass}
        disabled={disabled}
      />
    );
  };

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={id}>
          {label} {required && '*'}
        </label>
      )}
      {renderInput()}
      {(hint || showCount) && (
        <small>
          {hint}
          {showCount && maxLength && ` ${value?.length || 0}/${maxLength} characters`}
        </small>
      )}
    </div>
  );
};

export default FormInput;
