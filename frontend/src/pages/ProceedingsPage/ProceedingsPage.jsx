import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import acsApi from '../../api/apiService';
import {
  AUTHOR_POINTS,
  EDITOR_POINTS,
  FAQS,
  PROCESS_STEPS,
  SPECS,
} from './proceedingsData';
import styles from './ProceedingsPage.module.css';

export const ProceedingsPage = () => {
  const [downloads, setDownloads] = useState([]);
  const [downloadsLoading, setDownloadsLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    const fetchDownloads = async () => {
      try {
        setDownloadsLoading(true);
        const data = await acsApi.proceedings.listDownloads();
        const list = Array.isArray(data) ? data : data?.downloads || [];
        setDownloads(list);
      } catch (err) {
        console.error('Error fetching proceedings downloads:', err);
        setDownloads([]);
      } finally {
        setDownloadsLoading(false);
      }
    };
    fetchDownloads();
  }, []);

  const formatRevised = (isoDate) => {
    if (!isoDate) return '';
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };

  const downloadMeta = (asset) => {
    const parts = [asset.file_format, asset.size_label].filter(Boolean);
    const revised = formatRevised(asset.revised_on);
    if (revised) parts.push(`rev. ${revised}`);
    if (asset.note) parts.push(asset.note);
    return parts.join(' · ');
  };

  const groupedDownloads = useMemo(
    () => downloads.slice().sort((a, b) => a.audience.localeCompare(b.audience)),
    [downloads],
  );

  return (
    <div className={styles.pageWrapper}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <span className={styles.heroLabel}>Conference proceedings</span>
            <h1 className={styles.heroTitle}>
              Publish the proceedings of your conference — indexed, archived, and free to publish.
            </h1>
            <div className={styles.heroDivider} />
            <p className={styles.heroSubtitle}>
              We publish edited volumes from academic conferences held in India and across South
              Asia. There is no publication fee for a standard volume; open-access volumes are
              priced separately.
            </p>
            <div className={styles.heroButtons}>
              <Link to="/proceedings/propose" className={`${styles.btnPrimary} ${styles.btnOnDark}`}>
                <span className="material-symbols-rounded">campaign</span>
                Propose a volume
              </Link>
              <a href="#authors" className={`${styles.btnSecondary} ${styles.btnGhostOnDark}`}>
                <span className="material-symbols-rounded">download</span>
                I&apos;m an author — get the templates
              </a>
            </div>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>120–500</span>
              <span className={styles.heroStatLabel}>Pages per volume</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>10–14 weeks</span>
              <span className={styles.heroStatLabel}>Manuscript to publication</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>ISBN + DOI</span>
              <span className={styles.heroStatLabel}>On every volume and chapter</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Two doors ── */}
      <section className={`${styles.section} ${styles.sectionSurface}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Start here</span>
            <h2 className={styles.sectionTitle}>Which one are you?</h2>
            <p className={styles.sectionBody}>
              Volume editors and contributing authors need almost nothing from each other&apos;s
              instructions. Pick your side.
            </p>
          </div>

          <div className={styles.doors}>
            <div className={styles.door} id="editors">
              <span className={styles.doorLabel}>Volume editors</span>
              <h3 className={styles.doorTitle}>You are organising the conference</h3>
              <p className={styles.doorBody}>
                You select the papers, we publish the volume. Editorial does not re-select papers —
                that is your programme committee&apos;s job.
              </p>
              <ul className={styles.doorList}>
                {EDITOR_POINTS.map((point) => (
                  <li key={point} className={styles.doorItem}>{point}</li>
                ))}
              </ul>
              <a href="#downloads" className={styles.doorLink}>
                Editor guidelines &amp; downloads
                <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>
                  arrow_forward
                </span>
              </a>
            </div>

            <div className={styles.door} id="authors">
              <span className={styles.doorLabel}>Contributing authors</span>
              <h3 className={styles.doorTitle}>Your paper was accepted</h3>
              <p className={styles.doorBody}>
                Submit to your conference, not to us. What you need from this page is the template
                and the formatting rules.
              </p>
              <ul className={styles.doorList}>
                {AUTHOR_POINTS.map((point) => (
                  <li key={point} className={styles.doorItem}>{point}</li>
                ))}
              </ul>
              <a href="#downloads" className={styles.doorLink}>
                Author guidelines &amp; templates
                <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>
                  arrow_forward
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Process ── */}
      <section className={`${styles.section} ${styles.sectionSurface}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>The process</span>
            <h2 className={styles.sectionTitle}>From proposal to published volume</h2>
            <p className={styles.sectionBody}>
              Six stages. The weeks shown are typical for a 200-page volume of around 30 papers,
              and assume files arrive complete.
            </p>
          </div>

          <div className={styles.steps}>
            {PROCESS_STEPS.map((item) => (
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

      {/* ── Downloads ── */}
      <section id="downloads" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Downloads</span>
            <h2 className={styles.sectionTitle}>Templates, guidelines and forms</h2>
            <p className={styles.sectionBody}>
              Link this section directly from your conference website. Every file is versioned —
              check the revision date before circulating it.
            </p>
          </div>

          <div className={styles.downloadGrid}>
            {downloadsLoading ? (
              <p className={styles.downloadEmpty}>Loading downloads...</p>
            ) : groupedDownloads.length === 0 ? (
              <p className={styles.downloadEmpty}>
                No files are published yet. Contact editorial for the current templates.
              </p>
            ) : (
              groupedDownloads.map((asset) => (
                // asset.file is already an absolute URL — the serializer builds
                // it from the request, because the API is on another origin.
                <a
                  key={asset.id}
                  className={styles.download}
                  href={asset.file}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={styles.downloadAudience}>{asset.audience_label}</span>
                  <span className={styles.downloadLabel}>{asset.label}</span>
                  <span className={styles.downloadMeta}>{downloadMeta(asset)}</span>
                </a>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── Specification ── */}
      <section className={`${styles.section} ${styles.sectionSurface}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Specification</span>
            <h2 className={styles.sectionTitle}>What we can and cannot fit</h2>
          </div>

          <div className={styles.specGrid}>
            {SPECS.map((spec) => (
              <div key={spec.label} className={styles.spec}>
                <span className={styles.specLabel}>{spec.label}</span>
                <span className={styles.specValue}>{spec.value}</span>
                <span className={styles.specNote}>{spec.note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Questions</span>
            <h2 className={styles.sectionTitle}>Before you ask editorial</h2>
          </div>

          <div className={styles.faqList}>
            {FAQS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={item.q} className={styles.faqItem}>
                  <button
                    type="button"
                    className={styles.faqQuestion}
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                  >
                    <span
                      className={`material-symbols-rounded ${styles.faqIcon} ${
                        isOpen ? styles.faqIconOpen : ''
                      }`}
                    >
                      expand_more
                    </span>
                    {item.q}
                  </button>
                  {isOpen && <p className={styles.faqAnswer}>{item.a}</p>}
                </div>
              );
            })}
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
              groups
            </span>
          </div>
          <h2 className={styles.ctaTitle}>Have a conference coming up?</h2>
          <p className={styles.ctaBody}>
            Send us the scope and dates. Editorial replies within ten working days, and proposing
            costs you nothing. You will need to be signed in, and we will email you a reference
            number as soon as your proposal arrives.
          </p>
          <div className={styles.ctaButtons}>
            <Link to="/proceedings/propose" className={styles.btnPrimary}>
              <span className="material-symbols-rounded">send</span>
              Propose a volume
            </Link>
            <Link to="/books" className={styles.btnSecondary}>
              <span className="material-symbols-rounded">menu_book</span>
              Browse our books
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
            <Link to="/books">Books</Link>
            <Link to="/journals">Journals</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ProceedingsPage;
