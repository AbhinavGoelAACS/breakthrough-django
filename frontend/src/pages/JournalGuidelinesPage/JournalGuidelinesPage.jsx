import React from 'react';
import { Link } from 'react-router-dom';
import { useJournalContext } from '../../contexts/JournalContext';
import './JournalGuidelinesPage.css';

const JournalGuidelinesPage = () => {
  const { currentJournal, journalDetails, loading } = useJournalContext();

  const renderHtml = (html) => {
    if (!html) return null;
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  if (loading) {
    return (
      <div className="gl-loading">
        <div className="spinner"></div>
        <p>Loading…</p>
      </div>
    );
  }

  if (!currentJournal) {
    return (
      <div className="gl-loading">
        <h2>Journal not found</h2>
      </div>
    );
  }

  const journalBasePath = `/j/${currentJournal?.short_form || ''}`;

  return (
    <div className="gl-page">

      {/* ── Sidebar ── */}
      <aside className="gl-sidebar">
        <div className="gl-sidebar-sticky">
          <div className="gl-quick-links">
            <h3 className="gl-sidebar-heading">Quick Links</h3>
            <ul className="gl-link-list">
              <li>
                <a href="#general" className="gl-link">
                  <span>General Guidelines</span>
                  <span className="material-symbols-rounded gl-link-arrow">arrow_forward</span>
                </a>
              </li>
              <li>
                <a href="#manuscript" className="gl-link">
                  <span>Manuscript Preparation</span>
                  <span className="material-symbols-rounded gl-link-arrow">arrow_forward</span>
                </a>
              </li>
              <li>
                <a href="#submission" className="gl-link">
                  <span>Submission Process</span>
                  <span className="material-symbols-rounded gl-link-arrow">arrow_forward</span>
                </a>
              </li>
              <li>
                <a href="#review" className="gl-link">
                  <span>Peer Review Process</span>
                  <span className="material-symbols-rounded gl-link-arrow">arrow_forward</span>
                </a>
              </li>
              <li>
                <a href="#ethics" className="gl-link">
                  <span>Publication Ethics</span>
                  <span className="material-symbols-rounded gl-link-arrow">arrow_forward</span>
                </a>
              </li>
            </ul>
          </div>
          <div className="gl-help-card">
            <p className="gl-help-title">Need assistance?</p>
            <p className="gl-help-text">Our editorial office is available for queries regarding technical submission hurdles.</p>
            <a href="mailto:breakthroughpublishers@gmail.com" className="gl-help-link">Contact Support</a>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <article className="gl-main">

        {/* Header */}
        <header className="gl-header">
          <span className="gl-badge">RESOURCES</span>
          <h1 className="gl-title">Manuscript Preparation</h1>
          <p className="gl-subtitle">
            Ensuring technical precision and structural integrity for {currentJournal.name || currentJournal.short_form}.
          </p>
        </header>

        <div className="gl-sections">

          {/* Section: General Guidelines (dynamic) */}
          {(journalDetails?.guidelines || currentJournal.guidelines) && (
            <section id="general" className="gl-section gl-section-grid">
              <div className="gl-section-label">
                <h2 className="gl-section-title">General Guidelines</h2>
              </div>
              <div className="gl-section-body">
                <div className="gl-dynamic-content">
                  {journalDetails?.guidelines
                    ? renderHtml(journalDetails.guidelines)
                    : renderHtml(currentJournal.guidelines)
                  }
                </div>
              </div>
            </section>
          )}

          {/* Section 01: Technical Formatting */}
          <section id="manuscript" className="gl-section gl-section-grid">
            <div className="gl-section-label">
              <h2 className="gl-section-title">01. Technical Formatting</h2>
            </div>
            <div className="gl-section-body">
              <p className="gl-body-text">
                Manuscripts must be submitted as editable <em className="gl-serif-italic">Microsoft Word</em> or <em className="gl-serif-italic">LaTeX</em> files. Please adhere to the following baseline constraints:
              </p>
              <div className="gl-checklist-card">
                <ul className="gl-checklist">
                  <li>
                    <span className="material-symbols-rounded gl-check-icon">check_circle</span>
                    <span>Standard A4 or Letter page size with 2.5cm (1 inch) margins on all sides.</span>
                  </li>
                  <li>
                    <span className="material-symbols-rounded gl-check-icon">check_circle</span>
                    <span>Double-line spacing throughout, including references and block quotations.</span>
                  </li>
                  <li>
                    <span className="material-symbols-rounded gl-check-icon">check_circle</span>
                    <span>12pt Serif font (e.g., Times New Roman) for body text.</span>
                  </li>
                  <li>
                    <span className="material-symbols-rounded gl-check-icon">check_circle</span>
                    <span>Include page numbers on all pages.</span>
                  </li>
                </ul>
              </div>

              <h3 className="gl-subsection-title">Structure</h3>
              <p className="gl-body-text">Research articles should typically include the following sections:</p>
              <ul className="gl-plain-list">
                <li><strong>Title Page:</strong> Include title, author names, affiliations, and corresponding author details</li>
                <li><strong>Abstract:</strong> Maximum 250 words summarizing the research</li>
                <li><strong>Keywords:</strong> 4–6 keywords for indexing</li>
                <li><strong>Introduction:</strong> Background and objectives of the study</li>
                <li><strong>Methods:</strong> Detailed description of methodology</li>
                <li><strong>Results:</strong> Presentation of findings</li>
                <li><strong>Discussion:</strong> Interpretation and implications</li>
                <li><strong>Conclusion:</strong> Summary of key findings</li>
                <li><strong>References:</strong> Following journal citation style</li>
              </ul>
            </div>
          </section>

          {/* Section 02: Abstract & Metadata (bento) */}
          <section className="gl-section">
            <h2 className="gl-section-title">02. Abstract &amp; Metadata</h2>
            <div className="gl-bento-row">
              <div className="gl-bento-dark">
                <h3 className="gl-bento-dark-title">The Summary Statement</h3>
                <p className="gl-bento-dark-text">
                  The abstract should not exceed 250 words and must present a self-contained summary of the research objectives, methodology, key findings, and intellectual contribution.
                </p>
                <div className="gl-bento-tags">
                  <span className="gl-bento-tag">Concise</span>
                  <span className="gl-bento-tag">Standalone</span>
                  <span className="gl-bento-tag">Scholarly</span>
                </div>
                <span className="material-symbols-rounded gl-bento-watermark">history_edu</span>
              </div>
              <div className="gl-bento-side">
                <h3 className="gl-bento-side-title">Keywords</h3>
                <p className="gl-bento-side-text">
                  Provide 5 to 7 keywords that reflect the primary themes and intersections of the work.
                </p>
              </div>
            </div>
          </section>

          {/* Section 03: Visual Documentation */}
          <section className="gl-section gl-section-visual">
            <div className="gl-visual-content">
              <h2 className="gl-section-title">03. Visual Documentation</h2>
              <p className="gl-body-text">
                Images, charts, and digital artifacts should be submitted as high-resolution files (minimum 300 DPI) and referenced within the text using sequential numbering.
              </p>
              <div className="gl-format-tags">
                <div className="gl-format-tag">
                  <span className="material-symbols-rounded">image</span>
                  <span>TIFF/PNG</span>
                </div>
                <div className="gl-format-tag">
                  <span className="material-symbols-rounded">draw</span>
                  <span>SVG/EPS</span>
                </div>
              </div>
            </div>
            <div className="gl-visual-placeholder">
              <span className="material-symbols-rounded">photo_camera</span>
              <p>Figures &amp; tables must be numbered consecutively with captions</p>
            </div>
          </section>

          {/* Section 04: Citations */}
          <section className="gl-section">
            <div className="gl-citation-header">
              <h2 className="gl-section-title">04. Citations &amp; References</h2>
              <span className="gl-citation-style">APA / Journal Style</span>
            </div>
            <div className="gl-citation-block">
              <span className="material-symbols-rounded gl-citation-quote-icon">format_quote</span>
              <div className="gl-citation-inner">
                <p className="gl-citation-text">
                  "{currentJournal.name || currentJournal.short_form} follows standard referencing conventions. All cited works must be listed in a reference section at the end of the manuscript."
                </p>
                <div className="gl-citation-examples">
                  <div>
                    <h4>In-Text Example</h4>
                    <code>(Smith, 2023, p. 142)</code>
                  </div>
                  <div>
                    <h4>Reference Example</h4>
                    <code>Smith, J. (2023). <em>The Future of Ink</em>. London: Archivist Press.</code>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Submission Process */}
          <section id="submission" className="gl-section gl-section-grid">
            <div className="gl-section-label">
              <h2 className="gl-section-title">Submission Process</h2>
            </div>
            <div className="gl-section-body">
              <ol className="gl-numbered-steps">
                <li><strong>Register / Login:</strong> Create an account or log in to the submission system</li>
                <li><strong>Select Journal:</strong> Choose {currentJournal.short_form} as your target journal</li>
                <li><strong>Upload Manuscript:</strong> Upload your manuscript file and any supplementary materials</li>
                <li><strong>Enter Metadata:</strong> Provide title, abstract, keywords, and author information</li>
                <li><strong>Submit:</strong> Review your submission and confirm</li>
                <li><strong>Confirmation:</strong> You will receive a confirmation email with your submission ID</li>
              </ol>
            </div>
          </section>

          {/* Section: Peer Review Process */}
          <section id="review" className="gl-section gl-section-grid">
            <div className="gl-section-label">
              <h2 className="gl-section-title">Peer Review Process</h2>
            </div>
            <div className="gl-section-body">
              <p className="gl-body-text">
                {currentJournal.short_form} employs a rigorous peer-review process to ensure the quality and integrity of published research.
              </p>
              <h3 className="gl-subsection-title">Review Timeline</h3>
              <ul className="gl-plain-list">
                <li><strong>Initial Review:</strong> 1–2 weeks for editorial assessment</li>
                <li><strong>Peer Review:</strong> 4–8 weeks for expert evaluation</li>
                <li><strong>Decision:</strong> Authors notified of accept, revise, or reject</li>
                <li><strong>Revision:</strong> Authors typically have 4 weeks to respond if revisions are requested</li>
              </ul>
              <h3 className="gl-subsection-title">Review Criteria</h3>
              <ul className="gl-plain-list">
                <li>Originality and significance of the research</li>
                <li>Scientific rigor and methodology</li>
                <li>Clarity of presentation</li>
                <li>Relevance to the journal's scope</li>
                <li>Proper citations and ethical standards</li>
              </ul>
            </div>
          </section>

          {/* Section: Publication Ethics */}
          <section id="ethics" className="gl-section">
            <div className="gl-ethics-block">
              <span className="material-symbols-rounded gl-ethics-icon">format_quote</span>
              <div>
                <h2 className="gl-section-title">Publication Ethics</h2>
                <p className="gl-body-text">
                  All submissions must adhere to the highest standards of publication ethics:
                </p>
                <ul className="gl-plain-list">
                  <li>Ensure originality — plagiarism is strictly prohibited</li>
                  <li>Properly cite all sources and previous work</li>
                  <li>Disclose any conflicts of interest</li>
                  <li>Ensure all listed authors have contributed significantly</li>
                  <li>Do not submit the same work to multiple journals simultaneously</li>
                </ul>
                <p className="gl-body-text">
                  Research involving human subjects or animals must have appropriate ethical approvals, which should be stated in the manuscript.
                </p>
              </div>
            </div>
          </section>

        </div>

        {/* Ready to Submit? */}
        <footer className="gl-submit-footer">
          <div className="gl-submit-info">
            <p className="gl-submit-heading">Ready to submit?</p>
            <p className="gl-submit-text">Ensure your file meets all requirements before starting the upload.</p>
          </div>
          <div className="gl-submit-actions">
            <Link to="/submit" className="gl-btn-primary">Submit Now</Link>
          </div>
        </footer>
      </article>

      {/* ── Page Footer ── */}
      <footer className="gl-footer">
        <div className="gl-footer-inner">
          <div className="gl-footer-brand">
            <span className="gl-footer-name">{currentJournal?.name || currentJournal?.short_form}</span>
            <p className="gl-footer-copy">
              &copy; {new Date().getFullYear()} {currentJournal?.name || currentJournal?.short_form}. All research licensed under Creative Commons.
            </p>
          </div>
          <div className="gl-footer-links">
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-of-service">Terms of Service</Link>
            <a href="mailto:breakthroughpublishers@gmail.com">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default JournalGuidelinesPage;
