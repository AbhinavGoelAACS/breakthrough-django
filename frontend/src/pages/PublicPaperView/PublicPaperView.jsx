import React, { useEffect, useState, useCallback, useRef } from 'react';
import { renderAsync } from 'docx-preview';
import { useParams, useNavigate, Link } from 'react-router-dom';
import acsApi from '../../api/apiService';
import { API_BASE_URL } from '../../api/axios';
import { formatDateIST } from '../../utils/dateUtils';
import styles from './PublicPaperView.module.css';

const PublicPaperView = () => {
  const { id: paperCode } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState(''); // 'pdf' | 'docx' | ''
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [docArrayBuffer, setDocArrayBuffer] = useState(null);
  const [fileUrl, setFileUrl] = useState('');
  const docxContainerRef = useRef(null);

  const fetchArticle = useCallback(async () => {
    try {
      setLoading(true);
      const data = await acsApi.articles.getDetail(paperCode);
      setArticle(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching article:', err);
      setError('Failed to load article. It may not exist or has been removed.');
    } finally {
      setLoading(false);
    }
  }, [paperCode]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (previewType === 'docx' && docArrayBuffer && docxContainerRef.current) {
      docxContainerRef.current.innerHTML = '';
      renderAsync(docArrayBuffer, docxContainerRef.current, null, {
        className: 'docx-wrapper',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: true,
      }).catch((err) => {
        console.error('DOCX render error:', err);
        setPreviewType('');
        setPreviewError('Document preview is not available right now. You can still use the download button.');
      });
    }
  }, [previewType, docArrayBuffer]);

  const parseAuthors = (authorString) => {
    if (!authorString) return [];
    return authorString.split(',').map((a) => a.trim()).filter((a) => a);
  };

  const parseCoAuthorsJson = (jsonString) => {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  };

  const parseKeywords = (keywordString) => {
    if (!keywordString) return [];
    return keywordString.split(',').map((k) => k.trim()).filter((k) => k);
  };

  const parseReferences = (refString) => {
    if (!refString) return [];
    return refString
      .split('\n')
      .map((ref) => ref.trim())
      .filter((ref) => ref.length > 5);
  };

  const isZipDocx = (arrayBuffer) => {
    if (!arrayBuffer || arrayBuffer.byteLength < 4) {
      return false;
    }
    const bytes = new Uint8Array(arrayBuffer, 0, 4);
    return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  };

  const formatDate = (dateStr) => formatDateIST(dateStr);

  const getTimelineTone = (item) => {
    const icon = item?.icon;
    const event = item?.event?.toLowerCase() || '';

    if (icon === 'check_circle' || event.includes('accepted')) return styles.timelineSuccess;
    if (icon === 'publish' || event.includes('published')) return styles.timelinePrimary;
    if (icon === 'rate_review' || event.includes('review')) return styles.timelineReview;
    return styles.timelineNeutral;
  };

  const isOpenAccess = article?.access_type === 'open';

  useEffect(() => {
    if (!article?.id || !isOpenAccess) {
      setPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return '';
      });
      setPreviewType('');
      setPreviewError('');
      setPreviewLoading(false);
      setDocArrayBuffer(null);
      setFileUrl('');
      return;
    }

    const controller = new AbortController();

    const getCandidateUrls = () => {
      const candidates = [`${API_BASE_URL}/api/v1/articles/${article.id}/pdf`];
      const paperPath = (article.paper || '').trim();

      if (paperPath) {
        const cleanPath = paperPath.replace(/^\/+/, '');
        if (/^https?:\/\//i.test(paperPath)) {
          candidates.push(paperPath);
        } else {
          candidates.push(`${API_BASE_URL}/${cleanPath}`);
          candidates.push(`${API_BASE_URL}/media/${cleanPath}`);
          candidates.push(`${API_BASE_URL}/uploads/${cleanPath}`);
          candidates.push(`${API_BASE_URL}/published/${cleanPath}`);
        }
      }

      return [...new Set(candidates)];
    };

    const fetchFirstAvailable = async () => {
      const candidates = getCandidateUrls();
      for (const url of candidates) {
        try {
          const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
          });
          if (response.ok) {
            return { response, url };
          }
        } catch (err) {
          if (err.name === 'AbortError') {
            throw err;
          }
        }
      }
      throw new Error('Document unavailable (404)');
    };

    const loadDocumentPreview = async () => {
      try {
        setPreviewLoading(true);
        setPreviewError('');

        const { response, url } = await fetchFirstAvailable();
        setFileUrl(url);

        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        const contentDisposition = (response.headers.get('content-disposition') || '').toLowerCase();
        const blob = await response.blob();
        const blobType = (blob.type || '').toLowerCase();

        const isPdf =
          contentType.includes('pdf')
          || blobType.includes('pdf')
          || contentDisposition.includes('.pdf');

        const isDocxMime =
          contentType.includes('officedocument.wordprocessingml.document')
          || contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
          || blobType.includes('officedocument.wordprocessingml.document');

        const isDocxByName = contentDisposition.includes('.docx');
        const isLegacyDoc = contentType.includes('application/msword') || contentDisposition.includes('.doc');
        const isDocx = isDocxMime || isDocxByName;

        if (isLegacyDoc && !isDocx) {
          throw new Error('Legacy .doc preview is not supported');
        }

        if (isDocx && !isPdf) {
          const buffer = await blob.arrayBuffer();
          if (!isZipDocx(buffer)) {
            throw new Error('Invalid DOCX content');
          }

          setDocArrayBuffer(buffer);
          setPreviewType('docx');
          setPreviewUrl((previous) => {
            if (previous) URL.revokeObjectURL(previous);
            return '';
          });
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        setPreviewUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return objectUrl;
        });
        setPreviewType('pdf');
        setDocArrayBuffer(null);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Error loading embedded document:', err);
        setPreviewError('Document preview is not available right now. You can still use the download button.');
        setPreviewType('');
        setDocArrayBuffer(null);
        setFileUrl('');
      } finally {
        setPreviewLoading(false);
      }
    };

    loadDocumentPreview();

    return () => {
      controller.abort();
    };
  }, [article?.id, isOpenAccess]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <span className="material-icons">hourglass_empty</span>
          <p>Loading article...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <span className="material-icons">error_outline</span>
          <h2>Article Not Found</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/journals')} className={styles.backBtn}>
            <span className="material-icons">arrow_back</span>
            Browse Journals
          </button>
        </div>
      </div>
    );
  }

  const authors = parseAuthors(article?.author);
  const structuredAuthors = parseCoAuthorsJson(article?.co_authors_json);
  const keywords = parseKeywords(article?.keyword);

  const handleDownloadFile = () => {
    window.open(fileUrl || `${API_BASE_URL}/api/v1/articles/${article.id}/pdf`, '_blank');
  };

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumb}>
        <Link to="/journals">Journals</Link>
        <span className="material-icons">chevron_right</span>
        {article?.journal_id && (
          <>
            <Link to={`/journal/${article.journal_id}`}>{article.journal}</Link>
            <span className="material-icons">chevron_right</span>
          </>
        )}
        <span>Article</span>
      </nav>

      <header className={styles.header}>
        <div className={styles.badges}>
          {article?.doi && (
            <span className={styles.doiBadge}>
              <span className="material-icons">verified</span>
              DOI
            </span>
          )}
          <span className={`${styles.accessBadge} ${isOpenAccess ? styles.openAccess : styles.subscription}`}>
            <span className="material-icons">{isOpenAccess ? 'lock_open' : 'lock'}</span>
            {isOpenAccess ? 'Open Access' : 'Subscription'}
          </span>
          {article?.paper_code && <span className={styles.paperCodeBadge}>{article.paper_code}</span>}
        </div>

        <h1 className={styles.title}>{article?.title}</h1>

        {structuredAuthors && structuredAuthors.length > 0 ? (
          <div className={styles.authorsSection}>
            <div className={styles.authorChips}>
              {structuredAuthors.map((author, idx) => (
                <span key={idx} className={styles.authorChip}>
                  <span className={styles.authorNumber}>{idx + 1}</span>
                  <span className={styles.authorNameText}>{author.name}</span>
                  {author.is_corresponding && <span className={styles.corrStar} title="Corresponding Author">*</span>}
                  <span className={styles.authorDetail}>
                    <span className={styles.detailName}>{author.name}</span>
                    {author.email && (
                      <span className={styles.detailRow}>
                        <span className="material-icons">email</span>
                        <a href={`mailto:${author.email}`}>{author.email}</a>
                      </span>
                    )}
                    {author.affiliation && (
                      <span className={styles.detailRow}>
                        <span className="material-icons">business</span>
                        {author.affiliation}
                      </span>
                    )}
                    {author.is_corresponding && <span className={styles.detailCorr}>Corresponding Author</span>}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ) : authors.length > 0 ? (
          <div className={styles.authorChips}>
            {authors.map((author, idx) => (
              <span key={idx} className={styles.authorChip}>
                <span className={styles.authorNumber}>{idx + 1}</span>
                <span className={styles.authorNameText}>{author}</span>
              </span>
            ))}
          </div>
        ) : null}

        {!structuredAuthors && article?.affiliation && (
          <p className={styles.legacyAffiliation}>{article.affiliation}</p>
        )}

        <div className={styles.pubInfo}>
          <span className={styles.pubItem}>
            <span className="material-icons">calendar_today</span>
            {formatDate(article?.date)}
          </span>
          {article?.journal && (
            <span className={styles.pubItem}>
              <span className="material-icons">library_books</span>
              {article.journal}
            </span>
          )}
          {article?.volume && article?.issue && (
            <span className={styles.pubItem}>
              <span className="material-icons">bookmark</span>
              Vol. {article.volume}, Issue {article.issue}
            </span>
          )}
          {article?.pages && (
            <span className={styles.pubItem}>
              <span className="material-icons">description</span>
              Pages: {article.pages}
            </span>
          )}
        </div>

        {article?.doi && (
          <div className={styles.doiSection}>
            <strong>DOI:</strong>
            <a
              href={`https://doi.org/${article.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.doiLink}
            >
              https://doi.org/{article.doi}
            </a>
          </div>
        )}
      </header>

      <div className={styles.actions}>
        {isOpenAccess && (
          <button onClick={handleDownloadFile} className={`${styles.actionBtn} ${styles.primaryBtn}`}>
            <span className="material-icons">download</span>
            Download Full File
          </button>
        )}
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className={styles.actionBtn}
        >
          <span className="material-icons">link</span>
          Copy Link
        </button>
      </div>

      {isOpenAccess && article?.id && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className="material-icons">description</span>
            Manuscript
          </h2>
          <div className={styles.pdfContainer}>
            {previewLoading && <p className={styles.pdfStatus}>Loading document preview...</p>}
            {!previewLoading && previewError && <p className={styles.pdfStatusError}>{previewError}</p>}
            {!previewLoading && !previewError && previewType === 'pdf' && previewUrl && (
              <iframe src={previewUrl} title="Article PDF" className={styles.pdfViewer} />
            )}
            {!previewLoading && !previewError && previewType === 'docx' && (
              <div ref={docxContainerRef} className={styles.docxContainer} />
            )}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className="material-icons">subject</span>
          Abstract
        </h2>
        <div className={styles.abstract}>{article?.abstract || 'No abstract available.'}</div>
      </section>

      {keywords.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className="material-icons">label</span>
            Keywords
          </h2>
          <div className={styles.keywords}>
            {keywords.map((keyword, idx) => (
              <span key={idx} className={styles.keyword}>{keyword}</span>
            ))}
          </div>
        </section>
      )}

      {article?.p_reference && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className="material-icons">format_quote</span>
            References
          </h2>
          <div className={styles.references}>
            <ol className={styles.referencesList}>
              {parseReferences(article.p_reference).map((ref, idx) => (
                <li key={idx} className={styles.referenceItem}>{ref}</li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {article?.timeline?.length > 0 && (
        <section className={`${styles.section} ${styles.timelineSection}`}>
          <h2 className={styles.sectionTitle}>
            <span className="material-symbols-rounded">timeline</span>
            Article Timeline
          </h2>
          <div className={styles.timeline}>
            {article.timeline.map((item, idx) => (
              <div key={`${item.event}-${item.date}-${idx}`} className={styles.timelineItem}>
                <div className={styles.timelineConnector}>
                  <div className={`${styles.timelineDot} ${getTimelineTone(item)}`}>
                    <span className="material-symbols-rounded">{item.icon || 'schedule'}</span>
                  </div>
                  {idx < article.timeline.length - 1 && <div className={styles.timelineLine} />}
                </div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineEvent}>{item.event}</div>
                  <div className={styles.timelineDate}>{formatDate(item.date)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className="material-icons">format_quote</span>
          How to Cite
        </h2>
        <div className={styles.citation}>
          <p className={styles.citationText}>
            {article?.author} ({new Date(article?.date).getFullYear()}).
            {article?.title}. <em>{article?.journal}</em>,
            {article?.volume}({article?.issue}), {article?.pages || 'pp. N/A'}.
            {article?.doi && ` https://doi.org/${article.doi}`}
          </p>
          <button
            onClick={() => navigator.clipboard.writeText(
              `${article?.author} (${new Date(article?.date).getFullYear()}). ${article?.title}. ${article?.journal}, ${article?.volume}(${article?.issue}), ${article?.pages || 'pp. N/A'}.${article?.doi ? ` https://doi.org/${article.doi}` : ''}`
            )}
            className={styles.copyBtn}
          >
            <span className="material-icons">content_copy</span>
            Copy Citation
          </button>
        </div>
      </section>

      <div className={styles.footer}>
        <button onClick={() => navigate(-1)} className={styles.backBtn}>
          <span className="material-icons">arrow_back</span>
          Back
        </button>
      </div>
    </div>
  );
};

export default PublicPaperView;
