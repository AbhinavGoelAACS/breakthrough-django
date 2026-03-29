import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './AuthorGuidelines.module.css';

const AuthorGuidelines = () => {
  const [activeTab, setActiveTab] = useState('preparation');

  const tabs = [
    { id: 'preparation', label: 'Manuscript Preparation', icon: 'edit_document' },
    { id: 'formatting', label: 'Formatting Guidelines', icon: 'format_align_left' },
    { id: 'submission', label: 'Submission Process', icon: 'upload_file' },
    { id: 'ethics', label: 'Publication Ethics', icon: 'verified' },
    { id: 'faq', label: 'FAQ', icon: 'help' },
  ];

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Author Guidelines</h1>
          <p>Complete guide for preparing and submitting your manuscript</p>
          <Link to="/submit" className={styles.submitBtn}>
            <span className="material-symbols-rounded">edit_document</span>
            Submit Manuscript
          </Link>
        </div>
      </div>

      {/* Quick Overview Cards */}
      <div className={styles.overviewSection}>
        <div className={styles.overviewCards}>
          <div className={styles.overviewCard}>
            <span className="material-symbols-rounded">description</span>
            <h3>Accepted Formats</h3>
            <p>PDF, DOC, DOCX files up to 50MB</p>
          </div>
          <div className={styles.overviewCard}>
            <span className="material-symbols-rounded">schedule</span>
            <h3>Review Timeline</h3>
            <p>Initial decision within 4-6 weeks</p>
          </div>
          <div className={styles.overviewCard}>
            <span className="material-symbols-rounded">groups</span>
            <h3>Peer Review</h3>
            <p>Double-blind peer review process</p>
          </div>
          <div className={styles.overviewCard}>
            <span className="material-symbols-rounded">public</span>
            <h3>Open Access</h3>
            <p>Immediate open access publication</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNav}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="material-symbols-rounded">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {/* Manuscript Preparation Tab */}
        {activeTab === 'preparation' && (
          <div className={styles.tabPane}>
            <h2>Manuscript Preparation</h2>
            
            <section className={styles.section}>
              <h3>Types of Papers Accepted</h3>
              <div className={styles.paperTypes}>
                <div className={styles.paperType}>
                  <h4>Original Research Articles</h4>
                  <p>Full-length papers presenting original research findings with comprehensive methodology, results, and discussion.</p>
                  <span className={styles.wordLimit}>Word Limit: 6,000-8,000 words</span>
                </div>
                <div className={styles.paperType}>
                  <h4>Review Articles</h4>
                  <p>Comprehensive surveys of recent developments in a specific research area with critical analysis.</p>
                  <span className={styles.wordLimit}>Word Limit: 8,000-10,000 words</span>
                </div>
                <div className={styles.paperType}>
                  <h4>Short Communications</h4>
                  <p>Brief reports of significant new findings that warrant rapid publication.</p>
                  <span className={styles.wordLimit}>Word Limit: 2,000-3,000 words</span>
                </div>
                <div className={styles.paperType}>
                  <h4>Case Studies</h4>
                  <p>Detailed analysis of a particular case, project, or implementation with practical implications.</p>
                  <span className={styles.wordLimit}>Word Limit: 4,000-6,000 words</span>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h3>Required Sections</h3>
              <div className={styles.requiredSections}>
                <div className={styles.sectionItem}>
                  <div className={styles.sectionNumber}>1</div>
                  <div className={styles.sectionDetails}>
                    <h4>Title Page</h4>
                    <ul>
                      <li>Concise, informative title (max 20 words)</li>
                      <li>Full names of all authors</li>
                      <li>Institutional affiliations</li>
                      <li>Corresponding author contact details</li>
                      <li>ORCID identifiers (recommended)</li>
                    </ul>
                  </div>
                </div>

                <div className={styles.sectionItem}>
                  <div className={styles.sectionNumber}>2</div>
                  <div className={styles.sectionDetails}>
                    <h4>Abstract</h4>
                    <ul>
                      <li>Structured abstract preferred (Background, Methods, Results, Conclusions)</li>
                      <li>Maximum 250 words</li>
                      <li>No citations or abbreviations</li>
                      <li>Self-contained summary of the work</li>
                    </ul>
                  </div>
                </div>

                <div className={styles.sectionItem}>
                  <div className={styles.sectionNumber}>3</div>
                  <div className={styles.sectionDetails}>
                    <h4>Keywords</h4>
                    <ul>
                      <li>4-6 keywords for indexing</li>
                      <li>Use specific, relevant terms</li>
                      <li>Avoid words from the title</li>
                      <li>Separate with semicolons or commas</li>
                    </ul>
                  </div>
                </div>

                <div className={styles.sectionItem}>
                  <div className={styles.sectionNumber}>4</div>
                  <div className={styles.sectionDetails}>
                    <h4>Introduction</h4>
                    <ul>
                      <li>Background and context of the research</li>
                      <li>Literature review and research gaps</li>
                      <li>Clear statement of objectives</li>
                      <li>Brief overview of methodology</li>
                    </ul>
                  </div>
                </div>

                <div className={styles.sectionItem}>
                  <div className={styles.sectionNumber}>5</div>
                  <div className={styles.sectionDetails}>
                    <h4>Materials & Methods</h4>
                    <ul>
                      <li>Detailed description of methodology</li>
                      <li>Reproducible procedures</li>
                      <li>Statistical methods used</li>
                      <li>Ethical approvals (if applicable)</li>
                    </ul>
                  </div>
                </div>

                <div className={styles.sectionItem}>
                  <div className={styles.sectionNumber}>6</div>
                  <div className={styles.sectionDetails}>
                    <h4>Results</h4>
                    <ul>
                      <li>Clear presentation of findings</li>
                      <li>Supported by figures and tables</li>
                      <li>Statistical significance where relevant</li>
                      <li>No interpretation in this section</li>
                    </ul>
                  </div>
                </div>

                <div className={styles.sectionItem}>
                  <div className={styles.sectionNumber}>7</div>
                  <div className={styles.sectionDetails}>
                    <h4>Discussion</h4>
                    <ul>
                      <li>Interpretation of results</li>
                      <li>Comparison with existing literature</li>
                      <li>Implications and significance</li>
                      <li>Limitations of the study</li>
                    </ul>
                  </div>
                </div>

                <div className={styles.sectionItem}>
                  <div className={styles.sectionNumber}>8</div>
                  <div className={styles.sectionDetails}>
                    <h4>Conclusion</h4>
                    <ul>
                      <li>Summary of key findings</li>
                      <li>Broader implications</li>
                      <li>Future research directions</li>
                      <li>No new data or citations</li>
                    </ul>
                  </div>
                </div>

                <div className={styles.sectionItem}>
                  <div className={styles.sectionNumber}>9</div>
                  <div className={styles.sectionDetails}>
                    <h4>References</h4>
                    <ul>
                      <li>Follow journal citation style</li>
                      <li>Include DOIs where available</li>
                      <li>All citations must be in reference list</li>
                      <li>Recent and relevant sources preferred</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h3>Optional Sections</h3>
              <div className={styles.optionalList}>
                <div className={styles.optionalItem}>
                  <span className="material-symbols-rounded">volunteer_activism</span>
                  <div>
                    <h4>Acknowledgments</h4>
                    <p>Recognize contributors who don't meet authorship criteria, funding sources, and technical assistance.</p>
                  </div>
                </div>
                <div className={styles.optionalItem}>
                  <span className="material-symbols-rounded">attach_money</span>
                  <div>
                    <h4>Funding Statement</h4>
                    <p>Disclose all financial support including grant numbers and funding agencies.</p>
                  </div>
                </div>
                <div className={styles.optionalItem}>
                  <span className="material-symbols-rounded">balance</span>
                  <div>
                    <h4>Conflict of Interest</h4>
                    <p>Declare any potential conflicts or state "The authors declare no conflicts of interest."</p>
                  </div>
                </div>
                <div className={styles.optionalItem}>
                  <span className="material-symbols-rounded">attachment</span>
                  <div>
                    <h4>Supplementary Materials</h4>
                    <p>Additional data, figures, or appendices that support the main manuscript.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Formatting Guidelines Tab */}
        {activeTab === 'formatting' && (
          <div className={styles.tabPane}>
            <h2>Formatting Guidelines</h2>

            <section className={styles.section}>
              <h3>Document Format</h3>
              <div className={styles.formatGrid}>
                <div className={styles.formatItem}>
                  <span className="material-symbols-rounded">text_format</span>
                  <div>
                    <h4>Font</h4>
                    <p>Times New Roman, 12-point throughout the document</p>
                  </div>
                </div>
                <div className={styles.formatItem}>
                  <span className="material-symbols-rounded">format_line_spacing</span>
                  <div>
                    <h4>Line Spacing</h4>
                    <p>Double-spaced (2.0) for the entire manuscript</p>
                  </div>
                </div>
                <div className={styles.formatItem}>
                  <span className="material-symbols-rounded">select_all</span>
                  <div>
                    <h4>Margins</h4>
                    <p>1 inch (2.54 cm) on all sides</p>
                  </div>
                </div>
                <div className={styles.formatItem}>
                  <span className="material-symbols-rounded">format_list_numbered</span>
                  <div>
                    <h4>Page Numbers</h4>
                    <p>Bottom center, starting from page 1</p>
                  </div>
                </div>
                <div className={styles.formatItem}>
                  <span className="material-symbols-rounded">format_paragraph</span>
                  <div>
                    <h4>Alignment</h4>
                    <p>Left-aligned text (not justified)</p>
                  </div>
                </div>
                <div className={styles.formatItem}>
                  <span className="material-symbols-rounded">description</span>
                  <div>
                    <h4>File Format</h4>
                    <p>PDF, DOC, or DOCX (max 50 MB)</p>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h3>Figures & Illustrations</h3>
              <div className={styles.infoBox}>
                <span className="material-symbols-rounded">image</span>
                <div>
                  <h4>Image Requirements</h4>
                  <ul>
                    <li><strong>Resolution:</strong> Minimum 300 DPI for print quality</li>
                    <li><strong>Formats:</strong> TIFF, EPS, PNG, or high-quality JPEG</li>
                    <li><strong>Color Mode:</strong> RGB for online, CMYK for print</li>
                    <li><strong>Size:</strong> Maximum width 17 cm for single column</li>
                    <li><strong>Numbering:</strong> Consecutive (Figure 1, Figure 2, etc.)</li>
                    <li><strong>Captions:</strong> Below figure, descriptive and self-explanatory</li>
                    <li><strong>Placement:</strong> Referenced in text before first appearance</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h3>Tables</h3>
              <div className={styles.infoBox}>
                <span className="material-symbols-rounded">table_chart</span>
                <div>
                  <h4>Table Requirements</h4>
                  <ul>
                    <li><strong>Format:</strong> Editable format (not images)</li>
                    <li><strong>Numbering:</strong> Consecutive (Table 1, Table 2, etc.)</li>
                    <li><strong>Title:</strong> Above table, brief and descriptive</li>
                    <li><strong>Footnotes:</strong> Use lowercase superscript letters</li>
                    <li><strong>Lines:</strong> Only horizontal lines for header and bottom</li>
                    <li><strong>Abbreviations:</strong> Define in table footnotes</li>
                    <li><strong>Placement:</strong> Referenced in text before first appearance</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h3>References & Citations</h3>
              <div className={styles.citationStyles}>
                <h4>Supported Citation Styles</h4>
                <div className={styles.styleCards}>
                  <div className={styles.styleCard}>
                    <h5>APA Style (7th Edition)</h5>
                    <p className={styles.example}>Author, A. A. (Year). Title of article. <em>Journal Name, Volume</em>(Issue), pages. https://doi.org/xxx</p>
                  </div>
                  <div className={styles.styleCard}>
                    <h5>IEEE Style</h5>
                    <p className={styles.example}>[1] A. A. Author, "Title of article," <em>Journal Name</em>, vol. X, no. X, pp. XX-XX, Year.</p>
                  </div>
                  <div className={styles.styleCard}>
                    <h5>Vancouver Style</h5>
                    <p className={styles.example}>1. Author AA. Title of article. Journal Name. Year;Volume(Issue):pages.</p>
                  </div>
                </div>
                <p className={styles.note}>
                  <span className="material-symbols-rounded">info</span>
                  Check individual journal requirements for preferred citation style. Use reference management software (Zotero, Mendeley, EndNote) for consistency.
                </p>
              </div>
            </section>

            <section className={styles.section}>
              <h3>Language & Style</h3>
              <div className={styles.languageGuidelines}>
                <div className={styles.languageItem}>
                  <span className="material-symbols-rounded">spellcheck</span>
                  <div>
                    <h4>Language</h4>
                    <p>American or British English (be consistent throughout)</p>
                  </div>
                </div>
                <div className={styles.languageItem}>
                  <span className="material-symbols-rounded">format_quote</span>
                  <div>
                    <h4>Voice</h4>
                    <p>Active voice preferred; passive voice acceptable in Methods</p>
                  </div>
                </div>
                <div className={styles.languageItem}>
                  <span className="material-symbols-rounded">short_text</span>
                  <div>
                    <h4>Abbreviations</h4>
                    <p>Define at first use; avoid in title and abstract</p>
                  </div>
                </div>
                <div className={styles.languageItem}>
                  <span className="material-symbols-rounded">calculate</span>
                  <div>
                    <h4>Units</h4>
                    <p>SI units; space between number and unit (e.g., 10 mL)</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Submission Process Tab */}
        {activeTab === 'submission' && (
          <div className={styles.tabPane}>
            <h2>Submission Process</h2>

            <section className={styles.section}>
              <h3>Step-by-Step Guide</h3>
              <div className={styles.processSteps}>
                <div className={styles.processStep}>
                  <div className={styles.stepIcon}>
                    <span className="material-symbols-rounded">person_add</span>
                    <span className={styles.stepNum}>1</span>
                  </div>
                  <div className={styles.stepContent}>
                    <h4>Create Account / Login</h4>
                    <p>Register for a new account or log in to your existing account. Complete your author profile with current contact information and ORCID ID.</p>
                  </div>
                </div>

                <div className={styles.processStep}>
                  <div className={styles.stepIcon}>
                    <span className="material-symbols-rounded">menu_book</span>
                    <span className={styles.stepNum}>2</span>
                  </div>
                  <div className={styles.stepContent}>
                    <h4>Select Journal</h4>
                    <p>Choose the appropriate journal based on your research area and scope. Review the journal's specific guidelines and aims before proceeding.</p>
                  </div>
                </div>

                <div className={styles.processStep}>
                  <div className={styles.stepIcon}>
                    <span className="material-symbols-rounded">edit_note</span>
                    <span className={styles.stepNum}>3</span>
                  </div>
                  <div className={styles.stepContent}>
                    <h4>Enter Manuscript Details</h4>
                    <p>Provide title, abstract, keywords, and research area. Add a cover letter or message to the editor if needed.</p>
                  </div>
                </div>

                <div className={styles.processStep}>
                  <div className={styles.stepIcon}>
                    <span className="material-symbols-rounded">group_add</span>
                    <span className={styles.stepNum}>4</span>
                  </div>
                  <div className={styles.stepContent}>
                    <h4>Add Author Information</h4>
                    <p>Enter details for all authors including name, affiliation, and email. Designate the corresponding author who will receive all communications.</p>
                  </div>
                </div>

                <div className={styles.processStep}>
                  <div className={styles.stepIcon}>
                    <span className="material-symbols-rounded">cloud_upload</span>
                    <span className={styles.stepNum}>5</span>
                  </div>
                  <div className={styles.stepContent}>
                    <h4>Upload Files</h4>
                    <p>Upload your main manuscript file (PDF, DOC, or DOCX). Add any supplementary materials, figures, or data files as separate uploads.</p>
                  </div>
                </div>

                <div className={styles.processStep}>
                  <div className={styles.stepIcon}>
                    <span className="material-symbols-rounded">fact_check</span>
                    <span className={styles.stepNum}>6</span>
                  </div>
                  <div className={styles.stepContent}>
                    <h4>Review & Confirm</h4>
                    <p>Review all information for accuracy. Accept the terms and conditions, then submit your manuscript.</p>
                  </div>
                </div>

                <div className={styles.processStep}>
                  <div className={styles.stepIcon}>
                    <span className="material-symbols-rounded">mark_email_read</span>
                    <span className={styles.stepNum}>7</span>
                  </div>
                  <div className={styles.stepContent}>
                    <h4>Confirmation</h4>
                    <p>Receive a confirmation email with your unique submission ID. Track your submission status through your author dashboard.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h3>Review Process Timeline</h3>
              <div className={styles.timeline}>
                <div className={styles.timelineItem}>
                  <div className={styles.timelineMarker}></div>
                  <div className={styles.timelineContent}>
                    <h4>Initial Screening (1-2 weeks)</h4>
                    <p>Editorial office checks for completeness, scope fit, and basic quality. Papers may be desk-rejected at this stage.</p>
                  </div>
                </div>
                <div className={styles.timelineItem}>
                  <div className={styles.timelineMarker}></div>
                  <div className={styles.timelineContent}>
                    <h4>Peer Review (3-4 weeks)</h4>
                    <p>Paper sent to 2-3 independent reviewers with expertise in the field. Double-blind review process.</p>
                  </div>
                </div>
                <div className={styles.timelineItem}>
                  <div className={styles.timelineMarker}></div>
                  <div className={styles.timelineContent}>
                    <h4>Editorial Decision (1 week)</h4>
                    <p>Editor evaluates reviewer feedback and makes decision: Accept, Minor Revision, Major Revision, or Reject.</p>
                  </div>
                </div>
                <div className={styles.timelineItem}>
                  <div className={styles.timelineMarker}></div>
                  <div className={styles.timelineContent}>
                    <h4>Revision (2-4 weeks)</h4>
                    <p>Authors address reviewer comments and submit revised manuscript with response letter.</p>
                  </div>
                </div>
                <div className={styles.timelineItem}>
                  <div className={styles.timelineMarker}></div>
                  <div className={styles.timelineContent}>
                    <h4>Final Decision & Publication (1-2 weeks)</h4>
                    <p>After acceptance, paper goes through copyediting, typesetting, and online publication.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h3>Submission Checklist</h3>
              <div className={styles.checklist}>
                <div className={styles.checklistItem}>
                  <span className="material-symbols-rounded">check_circle</span>
                  <span>Manuscript follows formatting guidelines</span>
                </div>
                <div className={styles.checklistItem}>
                  <span className="material-symbols-rounded">check_circle</span>
                  <span>Title page includes all required information</span>
                </div>
                <div className={styles.checklistItem}>
                  <span className="material-symbols-rounded">check_circle</span>
                  <span>Abstract is within 250 words</span>
                </div>
                <div className={styles.checklistItem}>
                  <span className="material-symbols-rounded">check_circle</span>
                  <span>4-6 keywords provided</span>
                </div>
                <div className={styles.checklistItem}>
                  <span className="material-symbols-rounded">check_circle</span>
                  <span>All figures and tables are cited in text</span>
                </div>
                <div className={styles.checklistItem}>
                  <span className="material-symbols-rounded">check_circle</span>
                  <span>References are complete and properly formatted</span>
                </div>
                <div className={styles.checklistItem}>
                  <span className="material-symbols-rounded">check_circle</span>
                  <span>Author information is accurate</span>
                </div>
                <div className={styles.checklistItem}>
                  <span className="material-symbols-rounded">check_circle</span>
                  <span>Corresponding author designated</span>
                </div>
                <div className={styles.checklistItem}>
                  <span className="material-symbols-rounded">check_circle</span>
                  <span>Conflict of interest statement included</span>
                </div>
                <div className={styles.checklistItem}>
                  <span className="material-symbols-rounded">check_circle</span>
                  <span>Manuscript is original and not under review elsewhere</span>
                </div>
              </div>
            </section>

            <div className={styles.ctaBox}>
              <h3>Ready to Submit?</h3>
              <p>Start your submission and join thousands of researchers who have published with us.</p>
              <Link to="/submit" className={styles.ctaBtn}>
                <span className="material-symbols-rounded">edit_document</span>
                Start Submission
              </Link>
            </div>
          </div>
        )}

        {/* Publication Ethics Tab */}
        {activeTab === 'ethics' && (
          <div className={styles.tabPane}>
            <h2>Publication Ethics</h2>
            <p className={styles.intro}>
              We are committed to maintaining the highest standards of publication ethics. All submitted manuscripts must adhere to the following guidelines.
            </p>

            <section className={styles.section}>
              <h3>Authorship Criteria</h3>
              <div className={styles.ethicsCard}>
                <span className="material-symbols-rounded">groups</span>
                <div>
                  <p>All listed authors must meet ALL of the following criteria (ICMJE guidelines):</p>
                  <ul>
                    <li>Substantial contributions to conception, design, acquisition, analysis, or interpretation of data</li>
                    <li>Drafting or critically revising the manuscript for important intellectual content</li>
                    <li>Final approval of the version to be published</li>
                    <li>Agreement to be accountable for all aspects of the work</li>
                  </ul>
                  <p className={styles.note}>Contributors who do not meet all criteria should be acknowledged in the Acknowledgments section.</p>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h3>Originality & Plagiarism</h3>
              <div className={styles.ethicsCard}>
                <span className="material-symbols-rounded">verified_user</span>
                <div>
                  <ul>
                    <li>All submissions must be original work not published or under consideration elsewhere</li>
                    <li>Manuscripts are screened for plagiarism using industry-standard software</li>
                    <li>Proper attribution is required for all sources; direct quotes must be in quotation marks</li>
                    <li>Self-plagiarism (reusing substantial portions of your own published work) is not permitted</li>
                    <li>Similarity index should typically be below 15%</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h3>Data & Research Integrity</h3>
              <div className={styles.ethicsCard}>
                <span className="material-symbols-rounded">science</span>
                <div>
                  <ul>
                    <li>Authors must accurately report research data and findings</li>
                    <li>Data fabrication or falsification is strictly prohibited</li>
                    <li>Raw data should be available upon request</li>
                    <li>Research involving human subjects requires ethics committee approval</li>
                    <li>Animal research must comply with institutional and national guidelines</li>
                    <li>Informed consent must be obtained where applicable</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h3>Conflict of Interest</h3>
              <div className={styles.ethicsCard}>
                <span className="material-symbols-rounded">balance</span>
                <div>
                  <p>Authors must disclose any potential conflicts including:</p>
                  <ul>
                    <li>Financial relationships (employment, grants, patents, royalties)</li>
                    <li>Personal relationships that may influence the research</li>
                    <li>Competing interests with other organizations</li>
                    <li>Prior involvement with reviewers or editors</li>
                  </ul>
                  <p className={styles.note}>If no conflicts exist, include a statement: "The authors declare no conflicts of interest."</p>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h3>Publication Misconduct</h3>
              <div className={styles.warningBox}>
                <span className="material-symbols-rounded">warning</span>
                <div>
                  <h4>The following are considered serious misconduct:</h4>
                  <ul>
                    <li>Submitting the same manuscript to multiple journals simultaneously</li>
                    <li>Duplicate publication or "salami slicing" of research</li>
                    <li>Ghost authorship or guest authorship</li>
                    <li>Manipulation of citations to inflate metrics</li>
                    <li>Image manipulation or data fabrication</li>
                    <li>Failure to disclose conflicts of interest</li>
                  </ul>
                  <p>Violations may result in rejection, retraction, and notification to authors' institutions.</p>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h3>Copyright & Licensing</h3>
              <div className={styles.ethicsCard}>
                <span className="material-symbols-rounded">copyright</span>
                <div>
                  <ul>
                    <li>Authors retain copyright of their work</li>
                    <li>Published articles are typically licensed under Creative Commons (CC BY 4.0)</li>
                    <li>Third-party content (figures, data) requires permission from copyright holders</li>
                    <li>Authors are responsible for obtaining necessary permissions before submission</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div className={styles.tabPane}>
            <h2>Frequently Asked Questions</h2>

            <div className={styles.faqList}>
              <details className={styles.faqItem}>
                <summary>
                  <span className="material-symbols-rounded">help</span>
                  How long does the review process take?
                </summary>
                <div className={styles.faqAnswer}>
                  <p>The typical review timeline is 4-6 weeks for an initial decision. This includes 1-2 weeks for initial screening and editor assignment, 3-4 weeks for peer review, and additional time if revisions are required. You can track your submission status in real-time through your author dashboard.</p>
                </div>
              </details>

              <details className={styles.faqItem}>
                <summary>
                  <span className="material-symbols-rounded">help</span>
                  Can I submit to multiple journals simultaneously?
                </summary>
                <div className={styles.faqAnswer}>
                  <p>No, simultaneous submission to multiple journals is not permitted. Your manuscript should only be under consideration at one journal at a time. If your paper is rejected, you are then free to submit elsewhere.</p>
                </div>
              </details>

              <details className={styles.faqItem}>
                <summary>
                  <span className="material-symbols-rounded">help</span>
                  What file formats are accepted?
                </summary>
                <div className={styles.faqAnswer}>
                  <p>We accept PDF, DOC, and DOCX files for the main manuscript. Supplementary materials can include additional formats like Excel (XLS, XLSX), images (TIFF, PNG, JPEG), or data files. The maximum file size is 50 MB per file.</p>
                </div>
              </details>

              <details className={styles.faqItem}>
                <summary>
                  <span className="material-symbols-rounded">help</span>
                  How do I add or remove co-authors after submission?
                </summary>
                <div className={styles.faqAnswer}>
                  <p>After submission, authorship changes require written consent from all current authors and approval from the editor. Contact the editorial office with your request, including justification for the change and signed statements from all affected authors.</p>
                </div>
              </details>

              <details className={styles.faqItem}>
                <summary>
                  <span className="material-symbols-rounded">help</span>
                  What is the acceptance rate?
                </summary>
                <div className={styles.faqAnswer}>
                  <p>Acceptance rates vary by journal and are influenced by submission quality and journal scope. On average, our journals have acceptance rates between 20-40%. High-quality, well-prepared manuscripts that align with journal scope have the best chances of acceptance.</p>
                </div>
              </details>

              <details className={styles.faqItem}>
                <summary>
                  <span className="material-symbols-rounded">help</span>
                  Are there any publication fees?
                </summary>
                <div className={styles.faqAnswer}>
                  <p>Submission and peer review are free. Some journals may have Article Processing Charges (APCs) for open access publication. Check the specific journal's information page for fee details. Fee waivers may be available for authors from low-income countries.</p>
                </div>
              </details>

              <details className={styles.faqItem}>
                <summary>
                  <span className="material-symbols-rounded">help</span>
                  Can I withdraw my submission?
                </summary>
                <div className={styles.faqAnswer}>
                  <p>Yes, you can withdraw your submission at any time before final acceptance. Log into your author dashboard, select the submission, and request withdrawal. Please note that withdrawal after review has begun is discouraged as it wastes reviewer resources.</p>
                </div>
              </details>

              <details className={styles.faqItem}>
                <summary>
                  <span className="material-symbols-rounded">help</span>
                  How do I respond to reviewer comments?
                </summary>
                <div className={styles.faqAnswer}>
                  <p>Submit a point-by-point response letter addressing each reviewer comment. For each point: quote the original comment, describe the changes made (with page/line numbers), or provide a respectful rebuttal if you disagree. Upload the revised manuscript with tracked changes.</p>
                </div>
              </details>

              <details className={styles.faqItem}>
                <summary>
                  <span className="material-symbols-rounded">help</span>
                  What happens after acceptance?
                </summary>
                <div className={styles.faqAnswer}>
                  <p>After acceptance, your paper enters production: 1) Copyediting for grammar and style, 2) Typesetting into journal format, 3) Proof review by authors, 4) Online publication with DOI assignment, 5) Indexing in databases. This process typically takes 1-2 weeks.</p>
                </div>
              </details>

              <details className={styles.faqItem}>
                <summary>
                  <span className="material-symbols-rounded">help</span>
                  Who should I contact for questions?
                </summary>
                <div className={styles.faqAnswer}>
                  <p>For general inquiries, use the contact form on our website or email the editorial office. For submission-specific questions, use the "Contact Editorial" feature in your author dashboard. For technical issues, contact our support team.</p>
                </div>
              </details>
            </div>

            <div className={styles.contactBox}>
              <h3>Still Have Questions?</h3>
              <p>Our editorial team is here to help. Contact us for any questions not covered above.</p>
              <Link to="/contact" className={styles.contactBtn}>
                <span className="material-symbols-rounded">mail</span>
                Contact Editorial Office
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthorGuidelines;
