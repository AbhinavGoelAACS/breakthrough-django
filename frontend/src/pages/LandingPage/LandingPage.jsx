import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import acsApi from '../../api/apiService';
import './LandingPage.css';

const LandingPage = () => {
  const [journals, setJournals] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const journalsData = await acsApi.journals.listJournals();
        setJournals(journalsData.slice(0, 3) || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, []);

  // Default journals if API returns empty
  const defaultJournals = [
    {
      id: 1,
      name: 'Breakthrough: A Multidisciplinary Journal',
      description: 'Committed to advancing knowledge across a broad range of academic disciplines, promoting synergy between fields.',
    },
    {
      id: 2,
      name: 'Breakthrough: Journal of Energy Research',
      description: 'Focused on advancing innovative research in energy science, renewable technologies, and sustainable systems.',
    },
    {
      id: 3,
      name: 'Breakthrough: XYZ Journal',
      description: 'Dedicated to publishing peer-reviewed scholarly research across emerging and specialized interdisciplinary frontiers.',
    },
  ];

  const displayJournals = journals.length > 0 ? journals : defaultJournals;

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <img
            src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
            alt="Library background"
            className="hero-bg-image"
          />
          <div className="hero-overlay"></div>
        </div>
        <div className="hero-content">
          <div className="hero-card">
            <h1 className="hero-title">Breakthrough Publishers India</h1>
            <p className="hero-description">
              Committed to redefining scholarly communication by fostering high-quality, ethical, and interdisciplinary research that 
              addresses real-world challenges. Through rigorous peer review and accessible models, we transform ideas into meaningful 
              contributions.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <span className="stat-number">25+</span>
            <span className="stat-label">Peer Reviewed</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">10+</span>
            <span className="stat-label">Journals</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">500+</span>
            <span className="stat-label">Articles</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">100+</span>
            <span className="stat-label">Editors</span>
          </div>
        </div>
      </section>

      {/* Our Journals Section */}
      <section className="journals-section">
        <div className="journals-container">
          <div className="journals-header">
            <h2 className="journals-title">Our Journals</h2>
            <div className="journals-title-underline"></div>
          </div>
          
          <div className="journals-grid">
            {displayJournals.map((journal, index) => (
              <div key={journal.id || index} className="journal-card">
                <h3 className="journal-card-title">
                  {journal.name || journal.title || `Breakthrough: Journal ${index + 1}`}
                </h3>
                <p className="journal-card-description">
                  {journal.description || journal.about || 'Dedicated to publishing high-quality peer-reviewed research in specialized fields.'}
                </p>
                <div className="journal-card-btn-wrapper">
                  <Link 
                    to={`/journal/${journal.id}`}
                    className="journal-card-btn"
                  >
                    View Journal
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-background">
          <img
            src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
            alt="Books background"
            className="cta-bg-image"
          />
          <div className="cta-overlay"></div>
        </div>
        <div className="cta-content">
          <h2 className="cta-title">Ready to Submit Your Manuscript?</h2>
          <p className="cta-description">
            Join our global research community and publish with us. We offer a streamlined 
            submission process and expert editorial guidance.
          </p>
          <div className="cta-buttons">
            <Link to="/submit" className="cta-btn cta-btn-primary">
              <span className="material-symbols-rounded">upload_file</span>
              Submit Manuscript
            </Link>
            <Link to="/author-guidelines" className="cta-btn cta-btn-outline">
              Author Guidelines
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-main">
          <div className="footer-container">
            <div className="footer-grid">
              {/* Company Info */}
              <div className="footer-company">
                <h3 className="footer-brand">BreakThrough Publishers India</h3>
                <p className="footer-tagline">
                  Empowering researchers globally through excellence in academic 
                  publishing. Our platform ensures rigorous peer review and maximum 
                  visibility for your work.
                </p>
              </div>

              {/* Resources Links */}
              <div className="footer-links-section">
                <h4 className="footer-links-title">RESOURCES</h4>
                <ul className="footer-links-list">
                  <li><Link to="/author-guidelines">For Authors</Link></li>
                  <li><Link to="/reviewer-guidelines">For Reviewers</Link></li>
                  <li><Link to="/libraries">For Libraries</Link></li>
                  <li><Link to="/open-access">Open Access</Link></li>
                </ul>
              </div>

              {/* Legal Links */}
              <div className="footer-links-section">
                <h4 className="footer-links-title">LEGAL</h4>
                <ul className="footer-links-list">
                  <li><Link to="/privacy-policy">Privacy Policy</Link></li>
                  <li><Link to="/terms-of-service">Terms of Service</Link></li>
                  <li><Link to="/cookie-policy">Cookie Policy</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-container">
            <div className="footer-bottom-content">
              <p className="footer-copyright">
                © 2024 BREAKTHROUGH PUBLISHERS INDIA. ALL RIGHTS RESERVED.
              </p>
              <div className="footer-social">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link">TWITTER</a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-link">LINKEDIN</a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-link">FACEBOOK</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
