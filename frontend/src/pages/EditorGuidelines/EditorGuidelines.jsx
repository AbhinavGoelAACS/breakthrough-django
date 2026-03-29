import React from 'react';
import styles from './EditorGuidelines.module.css';

const EditorGuidelines = () => {
  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1>Editor Guidelines</h1>
        <p>Best practices for managing papers and reviewers</p>
      </header>

      {/* Quick Stats */}
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statValue}>4-6</span>
          <span className={styles.statLabel}>weeks to decision</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>2-3</span>
          <span className={styles.statLabel}>reviewers per paper</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>14</span>
          <span className={styles.statLabel}>days review period</span>
        </div>
      </div>

      {/* Editorial Workflow */}
      <section className={styles.section}>
        <h2>Editorial Workflow</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepNum}>1</span>
            <div>
              <h3>Initial Screening</h3>
              <p>Review submissions for scope, quality, and completeness before assigning reviewers</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>2</span>
            <div>
              <h3>Assign Reviewers</h3>
              <p>Select 2-3 qualified reviewers based on expertise and availability</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>3</span>
            <div>
              <h3>Monitor Progress</h3>
              <p>Track review deadlines and send reminders when needed</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>4</span>
            <div>
              <h3>Make Decision</h3>
              <p>Evaluate reviews and recommend: Accept, Revise, or Reject</p>
            </div>
          </div>
        </div>
      </section>

      {/* Decision Guidelines */}
      <section className={styles.section}>
        <h2>Decision Guidelines</h2>
        <div className={styles.decisionsGrid}>
          <div className={`${styles.decision} ${styles.accept}`}>
            <span className="material-symbols-rounded">check_circle</span>
            <h4>Accept</h4>
            <p>Paper is ready for publication with no or minimal changes</p>
          </div>
          <div className={`${styles.decision} ${styles.minor}`}>
            <span className="material-symbols-rounded">edit</span>
            <h4>Minor Revisions</h4>
            <p>Small corrections needed; no re-review required</p>
          </div>
          <div className={`${styles.decision} ${styles.major}`}>
            <span className="material-symbols-rounded">refresh</span>
            <h4>Major Revisions</h4>
            <p>Significant changes needed; re-review recommended</p>
          </div>
          <div className={`${styles.decision} ${styles.reject}`}>
            <span className="material-symbols-rounded">cancel</span>
            <h4>Reject</h4>
            <p>Paper not suitable for publication in current form</p>
          </div>
        </div>
      </section>

      {/* Key Responsibilities */}
      <section className={styles.section}>
        <h2>Key Responsibilities</h2>
        <ul className={styles.list}>
          <li>
            <span className="material-symbols-rounded">schedule</span>
            Ensure timely progression of papers through the review process
          </li>
          <li>
            <span className="material-symbols-rounded">balance</span>
            Maintain fairness and objectivity in all editorial decisions
          </li>
          <li>
            <span className="material-symbols-rounded">visibility_off</span>
            Protect the integrity of the blind peer review process
          </li>
          <li>
            <span className="material-symbols-rounded">chat</span>
            Communicate clearly with authors and reviewers
          </li>
          <li>
            <span className="material-symbols-rounded">gavel</span>
            Handle conflicts of interest and ethical concerns appropriately
          </li>
        </ul>
      </section>

      {/* Reviewer Management */}
      <section className={styles.section}>
        <h2>Managing Reviewers</h2>
        <div className={styles.tipsGrid}>
          <div className={styles.tip}>
            <span className="material-symbols-rounded">person_search</span>
            <h4>Select Wisely</h4>
            <p>Match papers to reviewers with relevant expertise and low conflict risk.</p>
          </div>
          <div className={styles.tip}>
            <span className="material-symbols-rounded">notifications</span>
            <h4>Send Reminders</h4>
            <p>Follow up on overdue reviews promptly to maintain timelines.</p>
          </div>
          <div className={styles.tip}>
            <span className="material-symbols-rounded">feedback</span>
            <h4>Provide Feedback</h4>
            <p>Guide reviewers on expectations and quality standards.</p>
          </div>
          <div className={styles.tip}>
            <span className="material-symbols-rounded">groups</span>
            <h4>Build Your Pool</h4>
            <p>Maintain a diverse pool of reliable reviewers for your journals.</p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className={styles.contact}>
        <span className="material-symbols-rounded">support_agent</span>
        <div>
          <h3>Need Assistance?</h3>
          <p>Contact the chief editor at <a href="mailto:chief.editor@breakthroughpublishers.com">chief.editor@breakthroughpublishers.com</a></p>
        </div>
      </section>
    </div>
  );
};

export default EditorGuidelines;
