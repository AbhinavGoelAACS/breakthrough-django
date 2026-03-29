import React from 'react';
import styles from './ReviewerGuidelines.module.css';

const ReviewerGuidelines = () => {
  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1>Reviewer Guidelines</h1>
        <p>Complete guide to reviewing papers on our platform</p>
      </header>

      {/* Quick Stats */}
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statValue}>14</span>
          <span className={styles.statLabel}>days to review</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>5</span>
          <span className={styles.statLabel}>rating criteria</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>50+</span>
          <span className={styles.statLabel}>chars min comments</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>24h</span>
          <span className={styles.statLabel}>support response</span>
        </div>
      </div>

      {/* How to Review - App Flow */}
      <section className={styles.section}>
        <h2>
          <span className="material-symbols-rounded">computer</span>
          How to Submit a Review (Step-by-Step)
        </h2>
        <div className={styles.appFlow}>
          <div className={styles.flowStep}>
            <div className={styles.flowIcon}>
              <span className="material-symbols-rounded">mail</span>
            </div>
            <div className={styles.flowContent}>
              <h3>1. Accept Invitation</h3>
              <p>Go to <strong>Invitations</strong> from the sidebar. Review the paper details and click <strong>"Accept"</strong> to begin. You can also decline if there's a conflict of interest.</p>
            </div>
          </div>

          <div className={styles.flowStep}>
            <div className={styles.flowIcon}>
              <span className="material-symbols-rounded">assignment</span>
            </div>
            <div className={styles.flowContent}>
              <h3>2. Access from My Assignments</h3>
              <p>Once accepted, find the paper in <strong>My Assignments</strong>. Click on the paper to view details, then click <strong>"Start Review"</strong> or <strong>"Continue Review"</strong>.</p>
            </div>
          </div>

          <div className={styles.flowStep}>
            <div className={styles.flowIcon}>
              <span className="material-symbols-rounded">description</span>
            </div>
            <div className={styles.flowContent}>
              <h3>3. Read the Manuscript</h3>
              <p>The paper viewer shows the manuscript on the left side. Read carefully at least twice, noting strengths and areas for improvement.</p>
            </div>
          </div>

          <div className={styles.flowStep}>
            <div className={styles.flowIcon}>
              <span className="material-symbols-rounded">star_rate</span>
            </div>
            <div className={styles.flowContent}>
              <h3>4. Provide Ratings (Tab 1)</h3>
              <p>Rate the paper on 5 criteria using a 1-5 scale. All ratings are <strong>required</strong> before submission.</p>
              <ul className={styles.ratingsList}>
                <li><strong>Technical Quality:</strong> Soundness of methodology, accuracy of results</li>
                <li><strong>Clarity:</strong> Writing quality, organization, figures & tables</li>
                <li><strong>Originality:</strong> Novelty of contribution, innovation</li>
                <li><strong>Significance:</strong> Impact on the field, relevance</li>
                <li><strong>Overall Rating:</strong> Your overall assessment of the paper</li>
              </ul>
            </div>
          </div>

          <div className={styles.flowStep}>
            <div className={styles.flowIcon}>
              <span className="material-symbols-rounded">comment</span>
            </div>
            <div className={styles.flowContent}>
              <h3>5. Write Comments (Tab 2)</h3>
              <p>Provide detailed feedback in two separate sections:</p>
              <div className={styles.commentsInfo}>
                <div className={styles.commentType}>
                  <span className="material-symbols-rounded">visibility</span>
                  <div>
                    <strong>Comments to Authors</strong>
                    <p>Constructive feedback visible to authors. Include specific suggestions for improvement.</p>
                  </div>
                </div>
                <div className={styles.commentType}>
                  <span className="material-symbols-rounded">visibility_off</span>
                  <div>
                    <strong>Confidential Comments</strong>
                    <p>Private notes for the editor only. Use for concerns about ethics, methodology issues, or sensitive matters.</p>
                  </div>
                </div>
              </div>
              <p className={styles.requirement}><span className="material-symbols-rounded">info</span> Minimum 50 characters total required across both comment fields.</p>
            </div>
          </div>

          <div className={styles.flowStep}>
            <div className={styles.flowIcon}>
              <span className="material-symbols-rounded">gavel</span>
            </div>
            <div className={styles.flowContent}>
              <h3>6. Select Recommendation (Tab 3)</h3>
              <p>Choose your final recommendation:</p>
              <div className={styles.recommendationsGrid}>
                <div className={`${styles.recCard} ${styles.accept}`}>
                  <span className="material-symbols-rounded">check_circle</span>
                  <strong>Accept</strong>
                  <p>Ready for publication as-is or with minor formatting changes</p>
                </div>
                <div className={`${styles.recCard} ${styles.minor}`}>
                  <span className="material-symbols-rounded">edit</span>
                  <strong>Minor Revisions</strong>
                  <p>Small changes needed; no re-review required</p>
                </div>
                <div className={`${styles.recCard} ${styles.major}`}>
                  <span className="material-symbols-rounded">refresh</span>
                  <strong>Major Revisions</strong>
                  <p>Significant changes needed; paper will be re-reviewed</p>
                </div>
                <div className={`${styles.recCard} ${styles.reject}`}>
                  <span className="material-symbols-rounded">cancel</span>
                  <strong>Reject</strong>
                  <p>Paper is not suitable for publication in this journal</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.flowStep}>
            <div className={styles.flowIcon}>
              <span className="material-symbols-rounded">upload_file</span>
            </div>
            <div className={styles.flowContent}>
              <h3>7. Upload Review Report (Optional)</h3>
              <p>You can optionally upload a detailed review report as a PDF file. This is useful for complex reviews with annotated manuscripts or detailed technical comments.</p>
            </div>
          </div>

          <div className={styles.flowStep}>
            <div className={styles.flowIcon}>
              <span className="material-symbols-rounded">send</span>
            </div>
            <div className={styles.flowContent}>
              <h3>8. Submit Review</h3>
              <p>Click <strong>"Submit Review"</strong> when complete. Your review cannot be edited after submission. Use <strong>"Save Draft"</strong> anytime to save progress.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Review Process Overview */}
      <section className={styles.section}>
        <h2>
          <span className="material-symbols-rounded">route</span>
          Review Process Overview
        </h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepNum}>1</span>
            <div>
              <h3>Editor Assigns Paper</h3>
              <p>The editor reviews submissions and assigns papers to qualified reviewers based on expertise</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>2</span>
            <div>
              <h3>Receive Invitation</h3>
              <p>You receive an email and in-app notification with paper abstract and 14-day deadline</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>3</span>
            <div>
              <h3>Accept or Decline</h3>
              <p>Review the abstract and accept if qualified, or decline with reason if there's a conflict</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>4</span>
            <div>
              <h3>Complete Review</h3>
              <p>Read manuscript, provide ratings, write comments, and submit your recommendation</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>5</span>
            <div>
              <h3>Editor Decision</h3>
              <p>Editor consolidates reviews and makes final decision on the paper</p>
            </div>
          </div>
        </div>
      </section>

      {/* Rating Scale Guide */}
      <section className={styles.section}>
        <h2>
          <span className="material-symbols-rounded">analytics</span>
          Rating Scale Guide
        </h2>
        <div className={styles.scaleGrid}>
          <div className={styles.scaleItem}>
            <span className={styles.scaleNum}>5</span>
            <div>
              <strong>Excellent</strong>
              <p>Outstanding quality, exceeds expectations in this area</p>
            </div>
          </div>
          <div className={styles.scaleItem}>
            <span className={styles.scaleNum}>4</span>
            <div>
              <strong>Good</strong>
              <p>Above average, minor improvements possible</p>
            </div>
          </div>
          <div className={styles.scaleItem}>
            <span className={styles.scaleNum}>3</span>
            <div>
              <strong>Average</strong>
              <p>Acceptable but needs improvement</p>
            </div>
          </div>
          <div className={styles.scaleItem}>
            <span className={styles.scaleNum}>2</span>
            <div>
              <strong>Below Average</strong>
              <p>Significant weaknesses that need addressing</p>
            </div>
          </div>
          <div className={styles.scaleItem}>
            <span className={styles.scaleNum}>1</span>
            <div>
              <strong>Poor</strong>
              <p>Major deficiencies, does not meet standards</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ethics & Confidentiality */}
      <section className={styles.section}>
        <h2>
          <span className="material-symbols-rounded">shield</span>
          Ethics & Confidentiality
        </h2>
        <ul className={styles.list}>
          <li>
            <span className="material-symbols-rounded">lock</span>
            Keep all manuscript content strictly confidential until publication
          </li>
          <li>
            <span className="material-symbols-rounded">verified</span>
            Disclose any conflicts of interest immediately to the editor
          </li>
          <li>
            <span className="material-symbols-rounded">balance</span>
            Provide objective, unbiased assessments based on scientific merit
          </li>
          <li>
            <span className="material-symbols-rounded">edit_note</span>
            Be constructive and professional in all feedback
          </li>
          <li>
            <span className="material-symbols-rounded">delete</span>
            Securely delete all manuscript copies after the review process
          </li>
          <li>
            <span className="material-symbols-rounded">block</span>
            Do not use ideas from unpublished manuscripts for your own work
          </li>
        </ul>
      </section>

      {/* Best Practices */}
      <section className={styles.section}>
        <h2>
          <span className="material-symbols-rounded">tips_and_updates</span>
          Best Practices
        </h2>
        <div className={styles.practicesGrid}>
          <div className={styles.practice}>
            <span className="material-symbols-rounded">schedule</span>
            <h4>Be Timely</h4>
            <p>Submit reviews within the 14-day deadline. Request extensions early if needed.</p>
          </div>
          <div className={styles.practice}>
            <span className="material-symbols-rounded">psychology</span>
            <h4>Be Thorough</h4>
            <p>Read the paper at least twice. Note both major issues and minor suggestions.</p>
          </div>
          <div className={styles.practice}>
            <span className="material-symbols-rounded">lightbulb</span>
            <h4>Be Constructive</h4>
            <p>Offer specific feedback that helps authors improve their work.</p>
          </div>
          <div className={styles.practice}>
            <span className="material-symbols-rounded">handshake</span>
            <h4>Be Fair</h4>
            <p>Evaluate based on scientific merit, not personal preferences.</p>
          </div>
          <div className={styles.practice}>
            <span className="material-symbols-rounded">format_list_numbered</span>
            <h4>Be Specific</h4>
            <p>Reference page numbers, sections, or figures when pointing out issues.</p>
          </div>
          <div className={styles.practice}>
            <span className="material-symbols-rounded">sync</span>
            <h4>Be Consistent</h4>
            <p>Ensure your ratings align with your comments and recommendation.</p>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className={styles.section}>
        <h2>
          <span className="material-symbols-rounded">calendar_month</span>
          Review Timeline
        </h2>
        <div className={styles.timeline}>
          <div className={styles.timelineItem}>
            <span className={styles.day}>Day 1</span>
            <p>Receive invitation and accept/decline within 48 hours</p>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.day}>Day 2-3</span>
            <p>First read of the manuscript, note initial impressions</p>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.day}>Day 4-10</span>
            <p>Detailed review, complete ratings and draft comments</p>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.day}>Day 11-12</span>
            <p>Second read, finalize comments, decide recommendation</p>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.day}>Day 13-14</span>
            <p>Final review of your submission, submit review</p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className={styles.contact}>
        <span className="material-symbols-rounded">mail</span>
        <div>
          <h3>Need Help?</h3>
          <p>Contact the editorial office at <a href="mailto:editor@breakthroughpublishers.com">editor@breakthroughpublishers.com</a></p>
          <p className={styles.response}>We respond within 24 hours on business days.</p>
        </div>
      </section>
    </div>
  );
};

export default ReviewerGuidelines;
