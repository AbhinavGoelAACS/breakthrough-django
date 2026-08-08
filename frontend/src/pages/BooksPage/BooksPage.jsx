import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import acsApi from '../../api/apiService';
import { BOOK_KINDS, PROPOSAL_STEPS } from './booksData';
import styles from './BooksPage.module.css';

// Cover tints cycle through the brand green range; the API has no cover
// image for most titles yet, so the index picks the tone deterministically.
const TONE_COUNT = 6;

export const BooksPage = () => {
  const [activeKind, setActiveKind] = useState('all');
  const [books, setBooks] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const data = await acsApi.books.list({ kind: activeKind, limit: 24 });
        const list = Array.isArray(data) ? data : data?.books || [];
        setBooks(list);
      } catch (err) {
        console.error('Error fetching books:', err);
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [activeKind]);

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const data = await acsApi.books.listSeries();
        const list = Array.isArray(data) ? data : data?.series || [];
        setSeries(list);
      } catch (err) {
        console.error('Error fetching book series:', err);
        setSeries([]);
      }
    };
    fetchSeries();
  }, []);

  return (
    <div className={styles.pageWrapper}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <span className={styles.heroLabel}>Books</span>
            <h1 className={styles.heroTitle}>
              Monographs, edited volumes and textbooks in the sciences and social sciences.
            </h1>
            <div className={styles.heroDivider} />
            <p className={styles.heroSubtitle}>
              Every title carries an ISBN and a DOI, is archived permanently, and is available in
              print and as an e-book. Browse the catalogue, or send us a proposal.
            </p>
            <div className={styles.heroButtons}>
              <a href="#catalogue" className={`${styles.btnPrimary} ${styles.btnOnDark}`}>
                <span className="material-symbols-rounded">menu_book</span>
                Browse the catalogue
              </a>
              <a href="#propose" className={`${styles.btnSecondary} ${styles.btnGhostOnDark}`}>
                <span className="material-symbols-rounded">edit_document</span>
                Propose a book
              </a>
            </div>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>{series.length || '—'}</span>
              <span className={styles.heroStatLabel}>Book series</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>Print + e-book</span>
              <span className={styles.heroStatLabel}>Every title</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>6–9 months</span>
              <span className={styles.heroStatLabel}>Contract to publication</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Catalogue ── */}
      <section id="catalogue" className={`${styles.section} ${styles.sectionSurface}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Catalogue</span>
            <h2 className={styles.sectionTitle}>Recently published</h2>
          </div>

          <div className={styles.filters} role="group" aria-label="Filter books by type">
            {BOOK_KINDS.map((kind) => (
              <button
                key={kind.id}
                type="button"
                onClick={() => setActiveKind(kind.id)}
                aria-pressed={activeKind === kind.id}
                className={`${styles.filterChip} ${
                  activeKind === kind.id ? styles.filterChipActive : ''
                }`}
              >
                {kind.label}
              </button>
            ))}
            <span className={styles.filterCount}>
              {loading ? 'Loading…' : `${books.length} ${books.length === 1 ? 'title' : 'titles'}`}
            </span>
          </div>

          <div className={styles.bookGrid}>
            {loading ? (
              <p className={styles.bookEmpty}>Loading catalogue...</p>
            ) : books.length === 0 ? (
              <p className={styles.bookEmpty}>No titles in this category yet.</p>
            ) : (
              books.map((book, index) => (
                <Link key={book.id} to={`/books/${book.slug}`} className={styles.bookCard}>
                  {book.cover_image ? (
                    <img
                      className={styles.bookCoverImage}
                      src={book.cover_image}
                      alt={`Cover of ${book.title}`}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className={`${styles.bookCover} ${styles[`tone${(index % TONE_COUNT) + 1}`]}`}
                    >
                      <span className={styles.bookCoverSeries}>{book.series_line}</span>
                      <div>
                        <h3 className={styles.bookCoverTitle}>{book.title}</h3>
                        <p className={styles.bookCoverAuthor}>{book.contributors_line}</p>
                      </div>
                    </div>
                  )}

                  <p className={styles.bookTitle}>{book.title}</p>
                  <p className={styles.bookMeta}>
                    {book.contributors_line}
                    {book.year ? ` · ${book.year}` : ''}
                    <br />
                    {[book.isbn, book.pages ? `${book.pages} pp` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <div className={styles.bookTags}>
                    <span className={styles.bookBadge}>{book.kind_label}</span>
                    {book.is_open_access && (
                      <span className={`${styles.bookBadge} ${styles.bookBadgeOa}`}>
                        Open access
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── Series ── */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Series</span>
            <h2 className={styles.sectionTitle}>Our book series</h2>
            <p className={styles.sectionBody}>
              A proposal that fits an existing series moves faster, because the series editor
              reviews it directly.
            </p>
          </div>

          <div className={styles.seriesList}>
            {series.length === 0 ? (
              <p className={styles.bookEmpty}>No series published yet.</p>
            ) : (
              series.map((item) => (
                <div key={item.id || item.abbreviation} className={styles.seriesRow}>
                  <span className={styles.seriesAbbr}>{item.abbreviation}</span>
                  <div>
                    <p className={styles.seriesName}>{item.name}</p>
                    <p className={styles.seriesDesc}>{item.description}</p>
                  </div>
                  <span className={styles.seriesCount}>
                    {item.volumes} {item.volumes === 1 ? 'volume' : 'volumes'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── Publish with us ── */}
      <section id="propose" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Publish with us</span>
            <h2 className={styles.sectionTitle}>How a book proposal works</h2>
            <p className={styles.sectionBody}>
              Four stages, and the first one costs you an afternoon rather than a manuscript. You
              will need a Breakthrough account to submit — proposing is free, and a CV and sample
              chapters are welcome but not required at this stage.
            </p>
          </div>

          <div className={styles.steps}>
            {PROPOSAL_STEPS.map((item) => (
              <article key={item.step} className={styles.step}>
                <div className={styles.stepMark}>
                  <span className={styles.stepNum}>{item.step}</span>
                </div>
                <div className={styles.stepBody}>
                  <h3 className={styles.stepTitle}>{item.title}</h3>
                  <p className={styles.stepText}>{item.body}</p>
                  <p className={styles.stepMeta}>{item.meta}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <div className={styles.ctaIconWrap}>
            <span
              className="material-symbols-rounded"
              style={{ fontSize: '1.75rem', fontVariationSettings: "'FILL' 1" }}
            >
              auto_stories
            </span>
          </div>
          <h2 className={styles.ctaTitle}>Writing something longer than an article?</h2>
          <p className={styles.ctaBody}>
            Send a synopsis and a chapter outline. You will hear back from a commissioning editor
            within three weeks. You will need to be signed in, and we will email you a reference
            number as soon as your proposal arrives.
          </p>
          <div className={styles.ctaButtons}>
            <Link to="/books/propose" className={styles.btnPrimary}>
              <span className="material-symbols-rounded">upload</span>
              Propose a book
            </Link>
            <Link to="/journals" className={styles.btnSecondary}>
              <span className="material-symbols-rounded">library_books</span>
              Browse our journals
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.footerName}>Breakthrough Publishers India</span>
            <p className={styles.footerCopyright}>
              &copy; {new Date().getFullYear()} Breakthrough Publishers India. Excellence in Academic Publishing.
            </p>
          </div>
          <div className={styles.footerLinks}>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-of-service">Terms of Service</Link>
            <a href="#">Open Access Policy</a>
            <a href="#">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BooksPage;
