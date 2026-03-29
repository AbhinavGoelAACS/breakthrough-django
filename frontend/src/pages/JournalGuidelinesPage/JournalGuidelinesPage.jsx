/**
 * JournalGuidelinesPage Component
 * 
 * Guidelines page for journal pages (accessed via /j/:shortForm route).
 * Displays submission guidelines, author instructions, etc.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useJournalContext } from '../../contexts/JournalContext';
import './JournalGuidelinesPage.css';

const JournalGuidelinesPage = () => {
  const { currentJournal, journalDetails, loading } = useJournalContext();

  // Render HTML content safely
  const renderHtml = (html) => {
    if (!html) return null;
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  if (loading) {
    return (
      <div className="guidelines-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!currentJournal) {
    return (
      <div className="guidelines-error">
        <h2>Journal not found</h2>
      </div>
    );
  }

  return (
    <div className="journal-guidelines-page">
      {/* Page Header */}
      <header className="guidelines-page-header">
        <div className="guidelines-header-content">
          <h1>Author Guidelines</h1>
          <p>Submission instructions for {currentJournal.short_form}</p>
        </div>
      </header>

      <div className="guidelines-content">
        {/* Quick Links */}
        <nav className="guidelines-nav">
          <h3>Quick Links</h3>
          <ul>
            <li><a href="#general">General Guidelines</a></li>
            <li><a href="#manuscript">Manuscript Preparation</a></li>
            <li><a href="#submission">Submission Process</a></li>
            <li><a href="#review">Review Process</a></li>
            <li><a href="#ethics">Publication Ethics</a></li>
          </ul>
          <Link to="/submit" className="submit-cta-btn">
            <span className="material-symbols-rounded">edit_document</span>
            Submit Manuscript
          </Link>
        </nav>

        {/* Guidelines Content */}
        <main className="guidelines-main">
          {/* Journal-specific guidelines */}
          {(journalDetails?.guidelines || currentJournal.guidelines) && (
            <section id="general" className="guidelines-section">
              <h2>General Guidelines</h2>
              <div className="section-content">
                {journalDetails?.guidelines 
                  ? renderHtml(journalDetails.guidelines)
                  : renderHtml(currentJournal.guidelines)
                }
              </div>
            </section>
          )}

          {/* Manuscript Preparation - Default content */}
          <section id="manuscript" className="guidelines-section">
            <h2>Manuscript Preparation</h2>
            <div className="section-content">
              <h3>Format Requirements</h3>
              <ul>
                <li>Manuscripts should be submitted in Microsoft Word (.doc or .docx) or PDF format</li>
                <li>Use Times New Roman, 12-point font size</li>
                <li>Double-space the entire document</li>
                <li>Include page numbers on all pages</li>
                <li>Margins should be at least 1 inch (2.54 cm) on all sides</li>
              </ul>

              <h3>Structure</h3>
              <p>Research articles should typically include the following sections:</p>
              <ul>
                <li><strong>Title Page:</strong> Include title, author names, affiliations, and corresponding author details</li>
                <li><strong>Abstract:</strong> Maximum 250 words summarizing the research</li>
                <li><strong>Keywords:</strong> 4-6 keywords for indexing</li>
                <li><strong>Introduction:</strong> Background and objectives of the study</li>
                <li><strong>Methods:</strong> Detailed description of methodology</li>
                <li><strong>Results:</strong> Presentation of findings</li>
                <li><strong>Discussion:</strong> Interpretation and implications</li>
                <li><strong>Conclusion:</strong> Summary of key findings</li>
                <li><strong>References:</strong> Following journal citation style</li>
              </ul>

              <h3>Figures and Tables</h3>
              <ul>
                <li>Figures should be high resolution (at least 300 DPI)</li>
                <li>Tables should be editable (not images)</li>
                <li>Number all figures and tables consecutively</li>
                <li>Include captions for all figures and tables</li>
              </ul>
            </div>
          </section>

          {/* Submission Process */}
          <section id="submission" className="guidelines-section">
            <h2>Submission Process</h2>
            <div className="section-content">
              <ol className="numbered-steps">
                <li>
                  <strong>Register/Login:</strong> Create an account or log in to the submission system
                </li>
                <li>
                  <strong>Select Journal:</strong> Choose {currentJournal.short_form} as your target journal
                </li>
                <li>
                  <strong>Upload Manuscript:</strong> Upload your manuscript file and any supplementary materials
                </li>
                <li>
                  <strong>Enter Metadata:</strong> Provide title, abstract, keywords, and author information
                </li>
                <li>
                  <strong>Submit:</strong> Review your submission and confirm
                </li>
                <li>
                  <strong>Confirmation:</strong> You will receive a confirmation email with your submission ID
                </li>
              </ol>

              <div className="submission-cta">
                <p>Ready to submit your manuscript?</p>
                <Link to="/submit" className="btn-primary">
                  Start Submission
                </Link>
              </div>
            </div>
          </section>

          {/* Review Process */}
          <section id="review" className="guidelines-section">
            <h2>Review Process</h2>
            <div className="section-content">
              <p>{currentJournal.short_form} employs a rigorous peer-review process to ensure the quality and integrity of published research.</p>
              
              <h3>Review Timeline</h3>
              <ul>
                <li><strong>Initial Review:</strong> 1-2 weeks for editorial assessment</li>
                <li><strong>Peer Review:</strong> 4-8 weeks for expert evaluation</li>
                <li><strong>Decision:</strong> Authors notified of accept, revise, or reject</li>
                <li><strong>Revision:</strong> If revisions are requested, authors typically have 4 weeks to respond</li>
              </ul>

              <h3>Review Criteria</h3>
              <ul>
                <li>Originality and significance of the research</li>
                <li>Scientific rigor and methodology</li>
                <li>Clarity of presentation</li>
                <li>Relevance to the journal's scope</li>
                <li>Proper citations and ethical standards</li>
              </ul>
            </div>
          </section>

          {/* Publication Ethics */}
          <section id="ethics" className="guidelines-section">
            <h2>Publication Ethics</h2>
            <div className="section-content">
              <p>All submissions must adhere to the highest standards of publication ethics:</p>
              
              <h3>Author Responsibilities</h3>
              <ul>
                <li>Ensure originality - plagiarism is strictly prohibited</li>
                <li>Properly cite all sources and previous work</li>
                <li>Disclose any conflicts of interest</li>
                <li>Ensure all listed authors have contributed significantly</li>
                <li>Do not submit the same work to multiple journals simultaneously</li>
              </ul>

              <h3>Ethical Approvals</h3>
              <p>Research involving human subjects or animals must have appropriate ethical approvals, which should be stated in the manuscript.</p>
            </div>
          </section>

          {/* Contact Information */}
          <section className="guidelines-section contact-section">
            <h2>Need Help?</h2>
            <div className="section-content">
              <p>If you have questions about the submission process or guidelines, please contact:</p>
              <p className="contact-email">
                <span className="material-symbols-rounded">mail</span>
                info@breakthroughpublishers.com
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default JournalGuidelinesPage;
