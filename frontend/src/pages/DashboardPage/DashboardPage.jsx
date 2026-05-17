import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import acsApi from '../../api/apiService';
import { useAuth } from '../../hooks/useAuth';
import { formatAnnouncementContent } from '../../utils/announcementContent';
import styles from './DashboardPage.module.css';

const GUIDELINES_BY_ROLE = {
  author: { label: 'Author Guidelines', path: '/author/guidelines' },
  reviewer: { label: 'Reviewer Guidelines', path: '/reviewer/guidelines' },
  editor: { label: 'Editor Guidelines', path: '/editor/guidelines' },
  admin: { label: 'Author Guidelines', path: '/author/guidelines' },
};

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
};

export const DashboardPage = () => {
  const { activeRole } = useAuth();
  const [journals, setJournals] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const formatDate = (isoDate) => {
    if (!isoDate) return '';
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const journalsData = await acsApi.journals.listJournals(0, 6);
        const journalsList = journalsData?.journals || journalsData || [];
        setJournals(Array.isArray(journalsList) ? journalsList : []);
      } catch (err) {
        console.error('Error fetching journals:', err);
        setJournals([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setAnnouncementsLoading(true);
        const newsData = await acsApi.news.list(0, 6);
        const normalized = Array.isArray(newsData)
          ? newsData
          : Array.isArray(newsData?.news)
            ? newsData.news
            : [];
        setAnnouncements(normalized);
      } catch (err) {
        console.error('Error fetching announcements:', err);
        setAnnouncements([]);
      } finally {
        setAnnouncementsLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  return (
    <div className={styles.pageWrapper}>
      {/* ── Hero Section ── */}
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyX8FmJuzfZegkek-zlZRtFv1aMdJJdYjr_9acQ_WpBb5aShjOeplZoSgiL2ZNsH8LxBfyUf0e_qaNMtRiXzOTrEUyQ2NwdgXMRLwUM52gjoye35c7eWnSd7F9skb1ADeCV1B7bwWe7sNRGBWEBjfI_cuFN-QsjhjMYg28mep5-R90xhKp_i3MZQE_bjeaAF8HwkpgMXJ-o0ihMrPhAJZbnvXUXFgcjgzp2HgW43bS57qUDqiFmr2Xm33kaI_RGiG2ciwaMP5vrQ"
            alt="Library interior"
            className={styles.heroBgImage}
          />
          <div className={styles.heroBgOverlay} />
        </div>
        <div className={styles.heroContent}>
          <div className={styles.heroCard}>
            <h1 className={styles.heroTitle}>Breakthrough Publishers India</h1>
            <p className={styles.heroSubtitle}>
              Advancing the frontiers of scholarly communication through rigorous peer review and global archival excellence.
            </p>
            <p className={styles.heroBody}>
              We provide a platform for researchers to disseminate groundbreaking discoveries that shape the future of their respective disciplines.
            </p>
          </div>
        </div>
      </section>

      {/* ── Our Journals Section ── */}
      <section className={styles.journals}>
        <div className={styles.journalsInner}>
          <div className={styles.journalsHeader}>
            <span className={styles.journalsLabel}>Catalogue</span>
            <h2 className={styles.journalsTitle}>Our Journals</h2>
          </div>

          <div className={styles.journalsGrid}>
            {loading ? (
              <p className={styles.journalsLoading}>Loading journals...</p>
            ) : journals.length > 0 ? (
              journals.map((journal, index) => (
                <div key={journal.id || index} className={styles.journalCard}>
                  <div>
                    <h3 className={styles.journalCardTitle}>
                      {journal.name || `Journal ${index + 1}`}
                    </h3>
                    <p className={styles.journalCardDesc}>
                      {stripHtml(journal.description || journal.about || 'Dedicated to publishing high-quality peer-reviewed research in specialized fields.')}
                    </p>
                  </div>
                  <Link
                    to={`/j/${journal.short_form || 'TEST'}`}
                    className={styles.journalCardLink}
                  >
                    View Journal
                    <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>arrow_forward</span>
                  </Link>
                </div>
              ))
            ) : (
              <p className={styles.journalsLoading}>No journals available.</p>
            )}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <div className={styles.ctaIconWrap}>
            <span className="material-symbols-rounded" style={{ fontSize: '2.25rem', fontVariationSettings: "'FILL' 1" }}>edit_document</span>
          </div>
          <h2 className={styles.ctaTitle}>Ready to Submit Your Manuscript?</h2>
          <p className={styles.ctaBody}>
            Join our community of world-class scholars. We offer a streamlined submission process, expert peer review, and global distribution.
          </p>
          <div className={styles.ctaButtons}>
            <Link to="/submit" className={styles.ctaBtnPrimary}>
              Submit Manuscript
              <span className="material-symbols-rounded">upload</span>
            </Link>
            <Link
              to={(GUIDELINES_BY_ROLE[activeRole?.toLowerCase()] || GUIDELINES_BY_ROLE.author).path}
              className={styles.ctaBtnSecondary}
            >
              {(GUIDELINES_BY_ROLE[activeRole?.toLowerCase()] || GUIDELINES_BY_ROLE.author).label}
              <span className="material-symbols-rounded">menu_book</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Asymmetric Detail Section ── */}
      <section className={styles.detail}>
        <div className={styles.detailInner}>
          <div className={styles.detailImage}>
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-9Tczv0nuL5SYnU1um236_zN5t9Bvuwhj4uNMHuoRsgJtVTXt1cT0h6-3ncDdRnZBNoAkuMp2dCuQRkKh0YAHSnBsFAPROaf6mdBi1AvTVM9qKLKvRIJe2tmeUF8BX0Mt8cJ0hkYFpH1iYGvCC4OlWXRwjEHhWOQvBQ1G9ZMRxWFbCXXr53cOLiWel5btP9e-pjvgY7-AoHlARr0sIb0hFIr0qwGx5C6sERlZgc63k_avg30lbWDq29fa66x4QPsVWO7QZxbp8A"
              alt="Editorial detail"
              className={styles.detailImg}
            />
          </div>
          <div className={styles.detailContent}>
            <span className={styles.detailLabel}>Excellence in Publishing</span>
            <h2 className={styles.detailTitle}>Preserving the integrity of research for future generations.</h2>
            <p className={styles.detailBody}>
              Our archival standards exceed international benchmarks, ensuring that every published work is digitally preserved and perpetually accessible. We believe in the enduring value of scientific discovery.
            </p>
            <div className={styles.detailFeatures}>
              <div className={styles.detailFeature}>
                <span className="material-symbols-rounded">verified</span>
                <span>Rigorous Peer Review</span>
              </div>
              <div className={styles.detailFeature}>
                <span className="material-symbols-rounded">public</span>
                <span>Global Indexed Reach</span>
              </div>
              <div className={styles.detailFeature}>
                <span className="material-symbols-rounded">lock</span>
                <span>Permanent DOI Assignment</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Announcements Section ── */}
      <section className={styles.announcements}>
        <div className={styles.announcementsInner}>
          <div className={styles.announcementsHeader}>
            <span className={styles.announcementsLabel}>Updates</span>
            <h2 className={styles.announcementsTitle}>Announcements</h2>
          </div>

          {announcementsLoading ? (
            <p className={styles.announcementsEmpty}>Loading announcements...</p>
          ) : announcements.length > 0 ? (
            <div className={styles.announcementsBannerList}>
              {announcements.map((item) => (
                <article key={item.id} className={styles.announcementBanner}>
                  <div className={styles.announcementBannerAccent} aria-hidden="true" />
                  <div className={styles.announcementBannerContent}>
                    <h3 className={styles.announcementBannerTitle}>{item.title || 'Announcement'}</h3>
                    <p className={styles.announcementBannerBody}>
                      {formatAnnouncementContent(item.description || 'No description available.')}
                    </p>
                  </div>
                  <div className={styles.announcementBannerMeta}>
                    <span>{formatDate(item.added_on)}</span>
                    {item.journal_name ? <span>{item.journal_name}</span> : <span>General</span>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.announcementsEmpty}>No announcements available right now.</p>
          )}
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
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardPage;
