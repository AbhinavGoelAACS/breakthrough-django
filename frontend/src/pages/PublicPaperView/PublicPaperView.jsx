import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import acsApi from '../../api/apiService';
import { API_BASE_URL } from '../../api/axios';
import { formatDateIST } from '../../utils/dateUtils';
import styles from './PublicPaperView.module.css';

const PublicPaperView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchArticle = useCallback(async () => {
    try {
      setLoading(true);
      const data = await acsApi.articles.getDetail(id);
      setArticle(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching article:', err);
      setError('Failed to load article. It may not exist or has been removed.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  const formatDate = (dateStr) => {
    return formatDateIST(dateStr);
  };

  const parseAuthors = (authorString) => {
    if (!authorString) return [];
    return authorString.split(',').map(a => a.trim()).filter(a => a);
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
    return keywordString.split(',').map(k => k.trim()).filter(k => k);
  };

  // Parse references - they come from backend as newline-separated text
  const parseReferences = (refString) => {
    if (!refString) return [];
    
    // Split by newlines (backend converts <div> tags to newlines)
    return refString
      .split('\n')
      .map(ref => ref.trim())
      .filter(ref => ref.length > 5); // Filter out empty or very short fragments
  };

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
  const isOpenAccess = article?.access_type === 'open';

  // Handle PDF download for open access
  const handleDownloadPdf = () => {
    window.open(`${API_BASE_URL}/api/v1/articles/${article.id}/pdf`, '_blank');
  };

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
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

      {/* Article Header */}
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
        </div>

        <h1 className={styles.title}>{article?.title}</h1>

        {/* Authors — numbered names, hover to expand */}
        {structuredAuthors && structuredAuthors.length > 0 ? (
          <div className={styles.authorsSection}>
            <div className={styles.authorChips}>
              {structuredAuthors.map((author, idx) => (
                <span key={idx} className={styles.authorChip}>
                  <span className={styles.authorNumber}>{idx + 1}</span>
                  <span className={styles.authorNameText}>{author.name}</span>
                  {author.is_corresponding && (
                    <span className={styles.corrStar} title="Corresponding Author">*</span>
                  )}
                  {/* Hover detail card */}
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
                    {author.is_corresponding && (
                      <span className={styles.detailCorr}>Corresponding Author</span>
                    )}
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

        {/* Legacy Affiliation (if no structured authors) */}
        {!structuredAuthors && article?.affiliation && (
          <p className={styles.legacyAffiliation}>
            {article.affiliation}
          </p>
        )}

        {/* Publication Info */}
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

        {/* DOI */}
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

      {/* Action Buttons */}
      <div className={styles.actions}>
        {isOpenAccess && (
          <button 
            onClick={handleDownloadPdf}
            className={`${styles.actionBtn} ${styles.primaryBtn}`}
          >
            <span className="material-icons">picture_as_pdf</span>
            Download Full PDF
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

      {/* Abstract */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className="material-icons">subject</span>
          Abstract
        </h2>
        <div className={styles.abstract}>
          {article?.abstract || 'No abstract available.'}
        </div>
      </section>

      {/* Keywords */}
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

      {/* References */}
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

      {/* Article Timeline */}
      {article?.timeline?.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className="material-icons">timeline</span>
            Article Timeline
          </h2>
          <div className={styles.timeline}>
            {article.timeline.map((item, idx) => (
              <div key={idx} className={styles.timelineItem}>
                <span className={styles.timelineDot}>
                  <span className="material-icons">{item.icon}</span>
                </span>
                <div className={styles.timelineEvent}>{item.event}</div>
                <div className={styles.timelineDate}>{formatDate(item.date)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Citation */}
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

      {/* Back Button */}
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
