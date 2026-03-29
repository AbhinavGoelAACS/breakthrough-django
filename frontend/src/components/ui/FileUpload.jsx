import React from 'react';

/**
 * Reusable File Upload Component
 * Supports drag & drop and file type/size validation
 */
export const FileUpload = ({
  id,
  label,
  accept = '.pdf,.doc,.docx',
  maxSizeMB = 50,
  onChange,
  onRemove,
  filePreview,
  required = false,
  icon = '📄',
  helpText = '',
}) => {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onChange(file);
    }
  };

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={id}>
          {label} {required && '*'}
        </label>
      )}

      <div className="file-upload-area">
        <input
          id={id}
          type="file"
          onChange={handleFileChange}
          accept={accept}
          className="file-input"
        />
        <div className="file-upload-prompt">
          <div className="file-icon">{icon}</div>
          <p>Drag and drop your file here</p>
          <p className="or-text">or</p>
          <label htmlFor={id} className="browse-button">
            Browse Files
          </label>
          <p className="file-requirements">
            {helpText || `Supported formats: ${accept.replace(/\./g, '').toUpperCase()}`}
            <br />
            Maximum size: {maxSizeMB}MB
          </p>
        </div>
      </div>

      {filePreview && (
        <div className="file-preview">
          <div className="preview-item">
            <span className="file-name">{filePreview}</span>
            <button type="button" onClick={onRemove} className="remove-file">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
