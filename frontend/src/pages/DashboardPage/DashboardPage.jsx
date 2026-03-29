import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import acsApi from '../../api/apiService';
import Footer from '../../components/footer/Footer';
import styles from './DashboardPage.module.css';

export const DashboardPage = () => {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const journalsData = await acsApi.journals.listJournals(0, 3);
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

  return (
    <div className={styles.dashboardPageWrapper}>
      <div className={styles.dashboardContainer}>
        {/* Hero Section */}
        <header className={styles.heroSection}>
          <div className={styles.heroGradient}></div>
          <div className={styles.heroCard}>
            <h2 className={styles.heroTitle}>Breakthrough Publishers India</h2>
            <p className={styles.heroDescription}>
              Committed to redefining scholarly communication by fostering high-quality, ethical, and interdisciplinary research that addresses real-world challenges. Through rigorous peer review and accessible models, we transform ideas into meaningful contributions.
            </p>
          </div>
        </header>

        {/* Journals Section */}
        <section className={styles.journalsSection}>
          <div className={styles.journalsContainer}>
            <div className={styles.journalsHeader}>
              <h2 className={styles.journalsTitle}>Our Journals</h2>
              <div className={styles.journalsUnderline}></div>
            </div>

            <div className={styles.journalsGrid}>
              {loading ? (
                <p>Loading journals...</p>
              ) : journals.length > 0 ? (
                journals.map((journal, index) => (
                  <div key={journal.id || index} className={styles.journalCard}>
                    <h3 className={styles.journalCardTitle}>
                      {journal.name || journal.title || `Breakthrough: Journal ${index + 1}`}
                    </h3>
                    <p className={styles.journalCardDescription}>
                      {journal.description || journal.about || 'Dedicated to publishing high-quality peer-reviewed research in specialized fields.'}
                    </p>
                    <Link
                      to={`/j/${journal.short_form || 'TEST'}`}
                      className={styles.journalCardBtn}
                    >
                      View Journal
                    </Link>
                  </div>
                ))
              ) : (
                <p>No journals available.</p>
              )}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaContainer}>
            <div className={styles.ctaBlur1}></div>
            <div className={styles.ctaBlur2}></div>
            <div className={styles.ctaContent}>
              <h2 className={styles.ctaTitle}>Ready to Submit Your Manuscript?</h2>
              <p className={styles.ctaDescription}>
                Join our global research community and publish with us. We offer a streamlined submission process and expert editorial guidance.
              </p>
              <div className={styles.ctaButtons}>
                <Link to="/submit" className={styles.ctaBtnPrimary}>
                  <span className="material-icons">upload_file</span>
                  Submit Manuscript
                </Link>
                <Link to="/author/guidelines" className={styles.ctaBtnSecondary}>
                  Author Guidelines
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default DashboardPage;
