import React from 'react';
import Footer from '../../components/footer/Footer';
import styles from './PrivacyPolicy.module.css';

const PrivacyPolicy = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Privacy Policy</h1>
          <p>Last updated: April 2, 2026</p>
        </div>
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2>1. Introduction</h2>
          <p>
            BreakThrough Publishers India ("we," "us," or "our") is committed to protecting the privacy of our users. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our academic publishing platform ("Platform").
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Information We Collect</h2>
          <h3>2.1 Information You Provide</h3>
          <ul>
            <li><strong>Account Information:</strong> Name, email address, institutional affiliation, and professional credentials when you register for an account.</li>
            <li><strong>Profile Information:</strong> ORCID ID, areas of expertise, academic qualifications, and other professional details you choose to provide.</li>
            <li><strong>Manuscript Data:</strong> Manuscripts, research data, cover letters, and related materials you submit through the Platform.</li>
            <li><strong>Review Data:</strong> Peer review comments, scores, and recommendations provided by reviewers.</li>
            <li><strong>Communications:</strong> Messages and correspondence exchanged through the Platform.</li>
          </ul>
          <h3>2.2 Information Collected Automatically</h3>
          <ul>
            <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the Platform, and interaction patterns.</li>
            <li><strong>Device Information:</strong> Browser type, operating system, device type, and screen resolution.</li>
            <li><strong>Log Data:</strong> IP address, access times, and referring URLs.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. How We Use Your Information</h2>
          <p>We use the collected information for the following purposes:</p>
          <ul>
            <li>To provide and maintain the Platform and its services.</li>
            <li>To manage your account and facilitate the manuscript submission and review process.</li>
            <li>To communicate with you regarding submissions, reviews, editorial decisions, and Platform updates.</li>
            <li>To match manuscripts with appropriate reviewers based on areas of expertise.</li>
            <li>To improve and optimize the Platform's functionality and user experience.</li>
            <li>To ensure the security and integrity of the Platform.</li>
            <li>To comply with legal obligations and enforce our Terms of Service.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. Information Sharing and Disclosure</h2>
          <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
          <ul>
            <li><strong>Editorial Process:</strong> Author information may be shared with editors and reviewers as part of the peer review process, subject to the journal's review model (e.g., double-blind review).</li>
            <li><strong>Publication:</strong> Author names, affiliations, and published manuscript content are made publicly available upon publication.</li>
            <li><strong>Service Providers:</strong> We may share information with trusted third-party service providers who assist us in operating the Platform (e.g., hosting, email services).</li>
            <li><strong>Legal Requirements:</strong> We may disclose information when required by law, legal process, or governmental request.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include encryption of data in transit, secure server infrastructure, and restricted access controls. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Data Retention</h2>
          <p>
            We retain your personal information for as long as your account is active or as needed to provide our services. Published articles and associated metadata are retained indefinitely as part of the scholarly record. You may request deletion of your account data, subject to our legal obligations and legitimate interests in maintaining the integrity of the publication record.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the following rights regarding your personal information:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information.</li>
            <li><strong>Deletion:</strong> Request deletion of your personal information, subject to legal and contractual obligations.</li>
            <li><strong>Data Portability:</strong> Request a copy of your data in a structured, machine-readable format.</li>
            <li><strong>Objection:</strong> Object to certain processing of your personal information.</li>
          </ul>
          <p>
            To exercise any of these rights, please contact us using the information provided below.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. Third-Party Links</h2>
          <p>
            The Platform may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of any third-party sites you visit.
          </p>
        </section>

        <section className={styles.section}>
          <h2>9. Children's Privacy</h2>
          <p>
            The Platform is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child, we will take steps to delete that information.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on the Platform with a revised "Last updated" date. Your continued use of the Platform after changes constitutes acceptance of the revised policy.
          </p>
        </section>

        <section className={styles.section}>
          <h2>11. Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
          </p>
          <p className={styles.contactInfo}>
            <strong>BreakThrough Publishers India</strong><br />
            Email: privacy@breakthroughpublishers.in
          </p>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
