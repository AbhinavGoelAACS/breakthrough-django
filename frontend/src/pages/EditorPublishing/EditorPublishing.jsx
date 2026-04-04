import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { renderAsync } from 'docx-preview';
import acsApi from '../../api/apiService';
import { API_BASE_URL } from '../../api/axios';
import Pagination from '../../components/pagination/Pagination';
import StatusChips from '../../components/StatusChips/StatusChips';
import { useToast } from '../../hooks/useToast';
import { formatDateIST } from '../../utils/dateUtils';
import styles from './EditorPublishing.module.css';

const EditorPublishing = () => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: 10,
    total: 0,
    currentPage: 1,
    totalPages: 1
  });
  
  // Publish modal state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [publishData, setPublishData] = useState({
    volume: '',
    issue: '',
    page_start: '',
    page_end: '',
    doi_suffix: '',
    publication_date: new Date().toISOString().split('T')[0],
    access_type: 'open',
    references: ''
  });
  const [publishing, setPublishing] = useState(false);
  const [finalPaperFile, setFinalPaperFile] = useState(null);
  
  const { success, error: showError, info } = useToast();

  const fetchReadyToPublish = useCallback(async (skip = 0) => {
    try {
      setLoading(true);
      setError(null);
      const response = await acsApi.editor.getReadyToPublish(skip, pagination.limit);
      setPapers(response.papers || []);
      setPagination(prev => ({
        ...prev,
        skip,
        total: response.total || 0,
        currentPage: Math.floor(skip / prev.limit) + 1,
        totalPages: Math.ceil((response.total || 0) / prev.limit)
      }));
    } catch (err) {
      console.error('Error fetching papers:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to load papers ready for publishing';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  useEffect(() => {
    fetchReadyToPublish(0);
  }, [fetchReadyToPublish]);

  const handlePageChange = (newPage) => {
    const skip = (newPage - 1) * pagination.limit;
    fetchReadyToPublish(skip);
  };

  const openPublishModal = (paper) => {
    setSelectedPaper(paper);
    // Pre-populate DOI suffix with paper code
    setPublishData({
      volume: '',
      issue: '',
      page_start: '',
      page_end: '',
      doi_suffix: paper.paperCode || paper.paper_code || `paper-${paper.id}`,
      publication_date: new Date().toISOString().split('T')[0],
      access_type: 'open',
      references: ''
    });
    setFinalPaperFile(null);
    setShowPublishModal(true);
  };

  const closePublishModal = () => {
    setShowPublishModal(false);
    setSelectedPaper(null);
    setPublishData({
      volume: '',
      issue: '',
      page_start: '',
      page_end: '',
      doi_suffix: '',
      publication_date: new Date().toISOString().split('T')[0],
      access_type: 'open',
      references: ''
    });
    setFinalPaperFile(null);
  };

  const handlePublish = async () => {
    if (!publishData.volume || !publishData.issue) {
      showError('Volume and Issue are required', 3000);
      return;
    }

    if (!finalPaperFile) {
      showError('Please upload the final paper PDF for publishing', 3000);
      return;
    }

    try {
      setPublishing(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('final_paper', finalPaperFile);
      formData.append('volume', publishData.volume);
      formData.append('issue', publishData.issue);
      if (publishData.page_start) formData.append('page_start', publishData.page_start);
      if (publishData.page_end) formData.append('page_end', publishData.page_end);
      if (publishData.doi_suffix) formData.append('doi_suffix', publishData.doi_suffix);
      if (publishData.publication_date) formData.append('publication_date', publishData.publication_date);
      formData.append('access_type', publishData.access_type || 'open');
      if (publishData.references) formData.append('references', publishData.references);
      
      await acsApi.editor.publishPaperWithFile(selectedPaper.id, formData);
      
      success(`Paper "${selectedPaper.title}" published successfully!`, 4000);
      closePublishModal();
      // Refresh the list
      fetchReadyToPublish(pagination.skip);
    } catch (err) {
      console.error('Error publishing paper:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to publish paper';
      showError(errorMsg, 5000);
    } finally {
      setPublishing(false);
    }
  };

  // Document Viewer state
  const [pdfViewerUrl, setPdfViewerUrl] = useState(null);
  const [pdfViewerTitle, setPdfViewerTitle] = useState('');
  const [pdfViewerDocs, setPdfViewerDocs] = useState([]);
  const [activePdfDoc, setActivePdfDoc] = useState(0);
  const [docLoading, setDocLoading] = useState(false);
  const [docType, setDocType] = useState(null); // 'pdf' | 'docx'
  const [docBlobUrl, setDocBlobUrl] = useState(null);
  const [docArrayBuffer, setDocArrayBuffer] = useState(null);
  const [docError, setDocError] = useState(null);
  const docxContainerRef = useRef(null);

  // Render DOCX when arrayBuffer and container are ready
  useEffect(() => {
    if (docType === 'docx' && docArrayBuffer && docxContainerRef.current) {
      docxContainerRef.current.innerHTML = '';
      renderAsync(docArrayBuffer, docxContainerRef.current, null, {
        className: styles.docxWrapper,
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: true,
      }).catch((err) => {
        console.error('DOCX render error:', err);
        setDocError('Failed to render document');
      });
    }
  }, [docType, docArrayBuffer]);

  const fetchAndDisplayDoc = async (apiUrl) => {
    setDocLoading(true);
    setDocError(null);
    setDocType(null);

    // Clean up previous blob URL
    if (docBlobUrl) {
      URL.revokeObjectURL(docBlobUrl);
      setDocBlobUrl(null);
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `Failed to load document (${response.status})`);
      }

      const contentType = response.headers.get('content-type') || '';
      const blob = await response.blob();

      if (contentType.includes('pdf')) {
        const blobUrl = URL.createObjectURL(blob);
        setDocBlobUrl(blobUrl);
        setDocType('pdf');
      } else if (contentType.includes('word') || contentType.includes('openxmlformats')) {
        const arrayBuffer = await blob.arrayBuffer();
        setDocArrayBuffer(arrayBuffer);
        setDocType('docx');
      } else {
        // Fallback: try as PDF
        const blobUrl = URL.createObjectURL(blob);
        setDocBlobUrl(blobUrl);
        setDocType('pdf');
      }
    } catch (err) {
      console.error('Error loading document:', err);
      setDocError(err.message);
    } finally {
      setDocLoading(false);
    }
  };

  const handleViewPaper = (paperId, paperTitle) => {
    const token = localStorage.getItem('authToken');
    const docs = [
      {
        label: 'Blinded Manuscript',
        apiUrl: `${API_BASE_URL}/api/v1/editor/papers/${paperId}/view-blinded-manuscript`,
        openUrl: `${API_BASE_URL}/api/v1/editor/papers/${paperId}/view-blinded-manuscript?token=${token}`,
        icon: 'article'
      },
      {
        label: 'Title Page',
        apiUrl: `${API_BASE_URL}/api/v1/editor/papers/${paperId}/view-title-page`,
        openUrl: `${API_BASE_URL}/api/v1/editor/papers/${paperId}/view-title-page?token=${token}`,
        icon: 'badge'
      }
    ];
    setPdfViewerDocs(docs);
    setActivePdfDoc(0);
    setPdfViewerUrl(docs[0].openUrl);
    setPdfViewerTitle(paperTitle || 'Paper');
    fetchAndDisplayDoc(docs[0].apiUrl);
  };

  const closePdfViewer = () => {
    if (docBlobUrl) URL.revokeObjectURL(docBlobUrl);
    setPdfViewerUrl(null);
    setPdfViewerTitle('');
    setPdfViewerDocs([]);
    setActivePdfDoc(0);
    setDocLoading(false);
    setDocType(null);
    setDocBlobUrl(null);
    setDocArrayBuffer(null);
    setDocError(null);
  };

  const switchPdfDoc = (index) => {
    setActivePdfDoc(index);
    setPdfViewerUrl(pdfViewerDocs[index].openUrl);
    fetchAndDisplayDoc(pdfViewerDocs[index].apiUrl);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>
            <span className="material-symbols-rounded">publish</span>
            Publishing Queue
          </h1>
          <p>Publish accepted papers with DOI registration</p>
        </div>
        <div className={styles.statsCard}>
          <span className={styles.statsNumber}>{pagination.total}</span>
          <span className={styles.statsLabel}>Papers Ready</span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className={styles.loading}>
          <span className="material-symbols-rounded">hourglass_empty</span>
          <p>Loading papers...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className={styles.error}>
          <span className="material-symbols-rounded">error_outline</span>
          <p>{error}</p>
          <button onClick={() => fetchReadyToPublish(0)} className={styles.retryBtn}>
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && papers.length === 0 && (
        <div className={styles.empty}>
          <span className="material-symbols-rounded">inventory_2</span>
          <h3>No papers ready for publishing</h3>
          <p>Accepted papers will appear here once they're ready to be published.</p>
          <Link to="/editor/papers/pending-decision" className={styles.linkBtn}>
            View Papers Pending Decision
          </Link>
        </div>
      )}

      {/* Papers List */}
      {!loading && !error && papers.length > 0 && (
        <>
          <div className={styles.papersList}>
            {papers.map((paper) => (
              <div key={paper.id} className={styles.paperCard}>
                <div className={styles.paperHeader}>
                  <div className={styles.paperMeta}>
                    <span className={styles.paperId}>#{paper.id}</span>
                    {(paper.paper_code || paper.paperCode) && (
                      <span className={styles.paperCode}>{paper.paper_code || paper.paperCode}</span>
                    )}
                  </div>
                  <StatusChips status="accepted" />
                </div>

                <h3 className={styles.paperTitle}>
                  <Link to={`/editor/papers/${paper.id}`}>{paper.title}</Link>
                </h3>

                <div className={styles.paperInfo}>
                  <div className={styles.infoItem}>
                    <span className="material-symbols-rounded">person</span>
                    <span>{typeof paper.author === 'string' ? paper.author : (paper.author?.name || paper.authorName || 'Unknown Author')}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className="material-symbols-rounded">menu_book</span>
                    <span>{typeof paper.journal === 'string' ? paper.journal : (paper.journal?.name || paper.journalName || 'Unknown Journal')}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className="material-symbols-rounded">calendar_today</span>
                    <span>Submitted: {formatDateIST(paper.submitted_date || paper.accepted_date)}</span>
                  </div>
                </div>

                {paper.abstract && (
                  <p className={styles.paperAbstract}>
                    {paper.abstract.length > 200 
                      ? `${paper.abstract.substring(0, 200)}...` 
                      : paper.abstract}
                  </p>
                )}

                {/* Copyright Status */}
                <div className={styles.copyrightStatus}>
                  {paper.copyright_status === 'completed' ? (
                    <span className={styles.copyrightCompleted}>
                      <span className="material-symbols-rounded">check_circle</span>
                      Copyright Form Signed
                    </span>
                  ) : paper.copyright_status === 'pending' ? (
                    <span className={styles.copyrightPending}>
                      <span className="material-symbols-rounded">schedule</span>
                      Copyright Form Pending
                    </span>
                  ) : paper.copyright_status === 'expired' ? (
                    <span className={styles.copyrightExpired}>
                      <span className="material-symbols-rounded">warning</span>
                      Copyright Form Expired
                    </span>
                  ) : (
                    <span className={styles.copyrightNotSent}>
                      <span className="material-symbols-rounded">error_outline</span>
                      Copyright Form Not Sent
                    </span>
                  )}
                </div>

                <div className={styles.paperActions}>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={() => openPublishModal(paper)}
                    disabled={paper.copyright_status !== 'completed'}
                    title={paper.copyright_status !== 'completed' ? 'Copyright form must be completed before publishing' : ''}
                  >
                    <span className="material-symbols-rounded">publish</span>
                    Publish Paper
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => handleViewPaper(paper.id, paper.title)}
                  >
                    <span className="material-symbols-rounded">visibility</span>
                    View Paper
                  </button>
                  <Link
                    to={`/editor/papers/${paper.id}`}
                    className={`${styles.btn} ${styles.btnOutline}`}
                  >
                    <span className="material-symbols-rounded">info</span>
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className={styles.paginationContainer}>
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                isLoading={loading}
                itemsPerPage={pagination.limit}
                totalItems={pagination.total}
              />
            </div>
          )}
        </>
      )}

      {/* Publish Modal */}
      {showPublishModal && selectedPaper && (
        <div className={styles.modalOverlay} onClick={closePublishModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <span className="material-symbols-rounded">publish</span>
                Publish Paper
              </h2>
              <button className={styles.closeBtn} onClick={closePublishModal}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.paperSummary}>
                <h4>{selectedPaper.title}</h4>
                <p>By {selectedPaper.author?.name || selectedPaper.authorName || 'Unknown Author'}</p>
              </div>

              {/* Final Paper Upload */}
              <div className={styles.fileUploadSection}>
                <label className={styles.fileUploadLabel}>
                  <span className="material-symbols-rounded">upload_file</span>
                  Final Paper PDF *
                </label>
                <div className={styles.fileUploadArea}>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFinalPaperFile(e.target.files[0])}
                    disabled={publishing}
                    id="final-paper-upload"
                  />
                  {finalPaperFile ? (
                    <div className={styles.selectedFile}>
                      <span className="material-symbols-rounded">description</span>
                      <span>{finalPaperFile.name}</span>
                      <button 
                        type="button"
                        onClick={() => setFinalPaperFile(null)}
                        className={styles.removeFileBtn}
                      >
                        <span className="material-symbols-rounded">close</span>
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="final-paper-upload" className={styles.uploadPlaceholder}>
                      <span className="material-symbols-rounded">cloud_upload</span>
                      <span>Click to upload the final formatted paper for publishing</span>
                    </label>
                  )}
                </div>
                <p className={styles.fileHint}>Upload the final formatted PDF that will be publicly available</p>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="volume">Volume *</label>
                  <input
                    type="number"
                    id="volume"
                    value={publishData.volume}
                    onChange={(e) => setPublishData({...publishData, volume: e.target.value})}
                    placeholder="e.g., 12"
                    min="1"
                    disabled={publishing}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="issue">Issue *</label>
                  <input
                    type="number"
                    id="issue"
                    value={publishData.issue}
                    onChange={(e) => setPublishData({...publishData, issue: e.target.value})}
                    placeholder="e.g., 3"
                    min="1"
                    disabled={publishing}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="page_start">Start Page</label>
                  <input
                    type="number"
                    id="page_start"
                    value={publishData.page_start}
                    onChange={(e) => setPublishData({...publishData, page_start: e.target.value})}
                    placeholder="e.g., 1"
                    min="1"
                    disabled={publishing}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="page_end">End Page</label>
                  <input
                    type="number"
                    id="page_end"
                    value={publishData.page_end}
                    onChange={(e) => setPublishData({...publishData, page_end: e.target.value})}
                    placeholder="e.g., 15"
                    min="1"
                    disabled={publishing}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label htmlFor="doi_suffix">DOI Suffix</label>
                  <input
                    type="text"
                    id="doi_suffix"
                    value={publishData.doi_suffix}
                    onChange={(e) => setPublishData({...publishData, doi_suffix: e.target.value})}
                    placeholder="e.g., bp-2024-001"
                    disabled={publishing}
                  />
                  <p className={styles.hint}>Final DOI: 10.xxxxx/{publishData.doi_suffix || 'your-suffix'}</p>
                </div>

                <div className={styles.formGroupFull}>
                  <label htmlFor="publication_date">Publication Date</label>
                  <input
                    type="date"
                    id="publication_date"
                    value={publishData.publication_date}
                    onChange={(e) => setPublishData({...publishData, publication_date: e.target.value})}
                    disabled={publishing}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label htmlFor="access_type">Access Type *</label>
                  <div className={styles.accessTypeOptions}>
                    <label className={`${styles.accessTypeOption} ${publishData.access_type === 'open' ? styles.accessTypeSelected : ''}`}>
                      <input
                        type="radio"
                        name="access_type"
                        value="open"
                        checked={publishData.access_type === 'open'}
                        onChange={(e) => setPublishData({...publishData, access_type: e.target.value})}
                        disabled={publishing}
                      />
                      <span className="material-symbols-rounded">lock_open</span>
                      <div>
                        <strong>Open Access</strong>
                        <p>Freely available to all readers</p>
                      </div>
                    </label>
                    <label className={`${styles.accessTypeOption} ${publishData.access_type === 'subscription' ? styles.accessTypeSelected : ''}`}>
                      <input
                        type="radio"
                        name="access_type"
                        value="subscription"
                        checked={publishData.access_type === 'subscription'}
                        onChange={(e) => setPublishData({...publishData, access_type: e.target.value})}
                        disabled={publishing}
                      />
                      <span className="material-symbols-rounded">lock</span>
                      <div>
                        <strong>Subscription</strong>
                        <p>Requires subscription to access</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className={styles.formGroupFull}>
                  <label htmlFor="references">References</label>
                  <textarea
                    id="references"
                    value={publishData.references}
                    onChange={(e) => setPublishData({...publishData, references: e.target.value})}
                    placeholder="Enter references, one per line..."
                    rows="6"
                    className={styles.referencesTextarea}
                    disabled={publishing}
                  />
                  <p className={styles.hint}>Enter each reference on a new line. These will appear on the published article page.</p>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={closePublishModal}
                disabled={publishing}
              >
                Cancel
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handlePublish}
                disabled={publishing || !publishData.volume || !publishData.issue}
              >
                {publishing ? (
                  <>
                    <span className="material-symbols-rounded">hourglass_empty</span>
                    Publishing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-rounded">check_circle</span>
                    Publish Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {pdfViewerUrl && (
        <div className={styles.modalOverlay} onClick={closePdfViewer}>
          <div className={styles.pdfViewerModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <span className="material-symbols-rounded">description</span>
                {pdfViewerTitle}
              </h2>
              <div className={styles.pdfViewerActions}>
                <a
                  href={pdfViewerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.btn} ${styles.btnOutline}`}
                  title="Open in new tab"
                >
                  <span className="material-symbols-rounded">open_in_new</span>
                </a>
                <button className={styles.closeBtn} onClick={closePdfViewer}>
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>
            </div>
            {pdfViewerDocs.length > 1 && (
              <div className={styles.pdfDocTabs}>
                {pdfViewerDocs.map((doc, idx) => (
                  <button
                    key={idx}
                    className={`${styles.pdfDocTab} ${activePdfDoc === idx ? styles.pdfDocTabActive : ''}`}
                    onClick={() => switchPdfDoc(idx)}
                  >
                    <span className="material-symbols-rounded">{doc.icon}</span>
                    {doc.label}
                  </button>
                ))}
              </div>
            )}
            <div className={styles.pdfViewerBody}>
              {docLoading && (
                <div className={styles.docLoading}>
                  <span className="material-symbols-rounded">hourglass_empty</span>
                  <p>Loading document...</p>
                </div>
              )}
              {docError && !docLoading && (
                <div className={styles.docError}>
                  <span className="material-symbols-rounded">error_outline</span>
                  <p>{docError}</p>
                </div>
              )}
              {!docLoading && !docError && docType === 'pdf' && (
                <iframe
                  src={docBlobUrl}
                  title="Paper PDF Viewer"
                  className={styles.pdfIframe}
                />
              )}
              {!docLoading && !docError && docType === 'docx' && (
                <div ref={docxContainerRef} className={styles.docxContainer} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorPublishing;
