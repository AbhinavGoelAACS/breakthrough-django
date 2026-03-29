import React from 'react';
import { formatDateIST } from '../../utils/dateUtils';
import styles from './FileViewer.module.css';

const FileViewer = ({ filePath, fileName, fileSize, submittedDate, className = '' }) => {
  if (!filePath) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.noFile}>
          <span className="material-symbols-rounded">description</span>
          <p>No file attached</p>
        </div>
      </div>
    );
  }

  const isPdf = filePath.toLowerCase().endsWith('.pdf');
  const displayFileName = fileName || extractFileName(filePath);
  const formattedSize = formatFileSize(fileSize);
  const formattedDate = submittedDate ? formatDateIST(submittedDate) : 'Unknown';

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.fileHeader}>
        <div className={styles.fileIcon}>
          <span className="material-symbols-rounded">
            {isPdf ? 'picture_as_pdf' : 'description'}
          </span>
        </div>
        
        <div className={styles.fileInfo}>
          <h4 className={styles.fileName}>{displayFileName}</h4>
          <div className={styles.fileMeta}>
            {formattedSize && <span>{formattedSize}</span>}
            {formattedDate !== 'Unknown' && <span>• {formattedDate}</span>}
          </div>
        </div>

        <div className={styles.actions}>
          <a
            href={getFileUrl(filePath)}
            download={displayFileName}
            className={`${styles.actionBtn} ${styles.downloadBtn}`}
            title="Download file"
          >
            <span className="material-symbols-rounded">download</span>
          </a>
        </div>
      </div>
    </div>
  );
};

/**
 * Get full file URL for download/preview
 */
function getFileUrl(filePath) {
  if (!filePath) return '';
  
  // If already a full URL, return as-is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // Construct URL from relative path
  // Assuming files are served from /public/static/ or similar
  return `/public/${filePath}`;
}

/**
 * Extract filename from file path
 */
function extractFileName(filePath) {
  if (!filePath) return 'document';
  return filePath.split('/').pop() || 'document';
}

/**
 * Format file size to human-readable format
 */
function formatFileSize(bytes) {
  if (!bytes) return '';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export default FileViewer;
