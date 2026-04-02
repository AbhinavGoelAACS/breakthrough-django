import React from 'react';
import Footer from '../../components/footer/Footer';
import styles from './TermsOfService.module.css';

const TermsOfService = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Terms of Service</h1>
          <p>Last updated: April 2, 2026</p>
        </div>
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using the BreakThrough Publishers India platform ("Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not use the Platform.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Description of Service</h2>
          <p>
            BreakThrough Publishers India provides an academic publishing platform that facilitates manuscript submission, peer review, editorial management, and publication of scholarly articles across various journals.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. User Accounts</h2>
          <p>
            To access certain features of the Platform, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:
          </p>
          <ul>
            <li>Provide accurate, current, and complete information during registration.</li>
            <li>Update your information to keep it accurate and current.</li>
            <li>Notify us immediately of any unauthorized use of your account.</li>
            <li>Not share your account credentials with any third party.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. User Roles and Responsibilities</h2>
          <h3>4.1 Authors</h3>
          <p>
            Authors submitting manuscripts warrant that the work is original, has not been published elsewhere, and does not infringe upon the intellectual property rights of any third party. Authors are responsible for obtaining all necessary permissions for any copyrighted material included in their submissions.
          </p>
          <h3>4.2 Reviewers</h3>
          <p>
            Reviewers agree to provide objective, constructive, and timely reviews. Reviewers must maintain the confidentiality of manuscripts under review and disclose any conflicts of interest.
          </p>
          <h3>4.3 Editors</h3>
          <p>
            Editors are responsible for making fair and unbiased editorial decisions based on the merit of submitted manuscripts and reviewer recommendations.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Intellectual Property</h2>
          <p>
            All content on the Platform, including but not limited to text, graphics, logos, and software, is the property of BreakThrough Publishers India or its content suppliers and is protected by intellectual property laws. Authors retain copyright of their published works unless otherwise agreed upon through a copyright transfer agreement.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Manuscript Submission and Publication</h2>
          <ul>
            <li>Submitted manuscripts undergo peer review at the discretion of the editorial board.</li>
            <li>BreakThrough Publishers India reserves the right to reject any submission without providing a reason.</li>
            <li>Published articles are made available according to the access model of the respective journal (open access or subscription-based).</li>
            <li>Authors must complete any required copyright forms prior to publication.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>7. Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Submit plagiarized, fabricated, or falsified research.</li>
            <li>Engage in any form of academic misconduct.</li>
            <li>Use the Platform for any unlawful purpose.</li>
            <li>Attempt to gain unauthorized access to any part of the Platform.</li>
            <li>Interfere with or disrupt the Platform's operations or servers.</li>
            <li>Upload malicious code, viruses, or harmful content.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>8. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, BreakThrough Publishers India shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or in connection with your use of the Platform. The Platform is provided "as is" and "as available" without warranties of any kind.
          </p>
        </section>

        <section className={styles.section}>
          <h2>9. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account and access to the Platform at our sole discretion, without notice, for conduct that we determine violates these Terms, is harmful to other users, or is otherwise objectionable.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify users of any material changes by posting the updated Terms on the Platform with a revised "Last updated" date. Continued use of the Platform after changes constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2>11. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts in India.
          </p>
        </section>

        <section className={styles.section}>
          <h2>12. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <p className={styles.contactInfo}>
            <strong>BreakThrough Publishers India</strong><br />
            Email: legal@breakthroughpublishers.in
          </p>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default TermsOfService;
