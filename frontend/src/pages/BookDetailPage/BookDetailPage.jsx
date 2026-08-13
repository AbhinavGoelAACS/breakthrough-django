import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import acsApi from '../../api/apiService';
import { describeApiError, isNotFound } from '../../utils/apiError';
import styles from './BookDetailPage.module.css';

const Fact = ({ label, value }) =>
  value ? (
    <div className={styles.fact}>
      <span className={styles.factLabel}>{label}</span>
      <span className={styles.factValue}>{value}</span>
    </div>
  ) : null;

export const BookDetailPage = () => {
  const { slug } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  // A missing title and an unreachable server are different problems with
  // different fixes, so they are never collapsed into one state.
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true);
        setNotFound(false);
        setError(null);
        const data = await acsApi.books.getDetail(slug);
        setBook(data);
      } catch (err) {
        if (isNotFound(err)) {
          setNotFound(true);
        } else {
          console.error('Error fetching book:', err);
          setError(describeApiError(err, 'We could not load this title.'));
        }
        setBook(null);
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [slug, reloadKey]);

  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.state}>
          <p className={styles.stateBody}>Loading…</p>
        </div>
      </div>
    );
  }

  // Server or network failure — the title may well exist, so offer a retry
  // rather than telling the reader it is missing.
  if (error) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.state}>
          <h1 className={styles.stateTitle}>We couldn&apos;t load this title</h1>
          <p className={styles.stateBody}>{error}</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className={styles.btnPrimary}
              style={{ border: 0, cursor: 'pointer' }}
              onClick={() => setReloadKey((k) => k + 1)}
            >
              <span className="material-symbols-rounded">refresh</span>
              Try again
            </button>
            <Link to="/books" className={styles.btnPrimary} style={{ background: 'transparent', color: 'inherit', border: '1.5px solid currentColor' }}>
              Back to the catalogue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !book) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.state}>
          <h1 className={styles.stateTitle}>We can&apos;t find that title</h1>
          <p className={styles.stateBody}>
            It may have been moved, or the link may be mistyped. The full catalogue is one click
            away.
          </p>
          <Link to="/books" className={styles.btnPrimary}>
            <span className="material-symbols-rounded">menu_book</span>
            Browse the catalogue
          </Link>
        </div>
      </div>
    );
  }

  const chapters = book.chapters || [];
  const contributors = book.contributors || [];
  const editors = contributors.filter((c) => c.role === 'editor');
  const contributorLabel = editors.length > 0 ? 'Editors' : 'Authors';

  return (
    <div className={styles.pageWrapper}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            {book.cover_image ? (
              <img className={styles.coverImage} src={book.cover_image} alt={`Cover of ${book.title}`} />
            ) : (
              <div className={styles.cover}>
                <span className={styles.coverSeries}>{book.series_line}</span>
                <h2 className={styles.coverTitle}>{book.title}</h2>
              </div>
            )}
          </div>

          <div>
            <Link to="/books" className={styles.back}>
              <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>arrow_back</span>
              Books
            </Link>
            <p className={styles.eyebrow}>{book.series_line}</p>
            <h1 className={styles.title}>{book.title}</h1>
            {book.subtitle && <p className={styles.subtitle}>{book.subtitle}</p>}
            {book.contributors_line && <p className={styles.byline}>{book.contributors_line}</p>}

            <div className={styles.badges}>
              <span className={styles.badge}>{book.kind_label}</span>
              {book.year && <span className={styles.badge}>{book.year}</span>}
              {book.is_open_access && (
                <span className={`${styles.badge} ${styles.badgeOa}`}>Open access</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div>
            {book.abstract && (
              <>
                <h2 className={styles.sectionTitle}>About this book</h2>
                <p className={styles.abstract}>{book.abstract}</p>
              </>
            )}

            <h2 className={styles.sectionTitle}>
              {book.kind === 'proceedings' || book.kind === 'edited' ? 'Contents' : 'Chapters'}
            </h2>
            {chapters.length === 0 ? (
              <p className={styles.empty}>
                A chapter listing for this title has not been published yet.
              </p>
            ) : (
              <div className={styles.chapterList}>
                {chapters.map((chapter, index) => (
                  <article key={chapter.id} className={styles.chapter}>
                    <span className={styles.chapterNum}>{index + 1}</span>
                    <div>
                      <h3 className={styles.chapterTitle}>{chapter.title}</h3>
                      {chapter.authors && <p className={styles.chapterAuthors}>{chapter.authors}</p>}
                      {chapter.doi && (
                        <a
                          className={styles.chapterDoi}
                          href={`https://doi.org/${chapter.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {chapter.doi}
                        </a>
                      )}
                    </div>
                    <span className={styles.chapterPages}>
                      {chapter.start_page && chapter.end_page
                        ? `pp. ${chapter.start_page}–${chapter.end_page}`
                        : ''}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className={styles.aside}>
            <h2 className={styles.asideTitle}>Publication details</h2>
            <div className={styles.facts}>
              <Fact label="ISBN" value={book.isbn} />
              <Fact label="DOI" value={book.doi} />
              <Fact label="Pages" value={book.pages} />
              <Fact label="Edition" value={book.edition} />
              <Fact label="Language" value={book.language} />
              <Fact label="Published" value={book.published_on} />
              <Fact label="Series" value={book.series_abbreviation} />
              <Fact label="Conference" value={book.conference_name} />
            </div>

            {contributors.length > 0 && (
              <div className={styles.contributors}>
                <h2 className={styles.asideTitle}>{contributorLabel}</h2>
                {contributors.map((person) => (
                  <p key={person.id} className={styles.contributor}>
                    {person.name}
                    {person.affiliation && (
                      <span className={styles.contributorAffil}>{person.affiliation}</span>
                    )}
                  </p>
                ))}
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
};

export default BookDetailPage;
