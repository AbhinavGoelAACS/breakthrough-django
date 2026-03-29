import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatusChips from '../StatusChips/StatusChips';
import { formatDateIST } from '../../utils/dateUtils';
import styles from './PaperCard.module.css';

/**
 * Reusable Paper Card component for displaying paper information
 * @param {Object} paper - Paper data object
 * @param {String} actions - Action type: 'admin', 'editor', 'author', 'minimal'
 * @param {Function} onManage - Callback when manage button is clicked
 * @param {Function} onView - Callback when view button is clicked
 * @param {String} role - Current user role for filtering available actions
 */
const PaperCard = ({ paper, actions = 'minimal', onManage, onView, role }) => {
  const navigate = useNavigate();

  if (!paper) return null;

  const title = paper.title || paper.name || 'Untitled Paper';
  const dateValue = paper.added_on || paper.submitted_date;
  const date = formatDateIST(dateValue);
  const paperType = paper.paper_type || 'Full Length Article';
  const journalName = paper.journal_name || (typeof paper.journal === 'string' ? paper.journal : paper.journal?.name) || null;

  const handleManage = () => {
    // Navigate to details page for admin/editor, use callback for others
    if (actions === 'admin' || actions === 'editor') {
      const routes = {
        admin: `/admin/submissions/${paper.id}`,
        editor: `/editor/papers/${paper.id}`,
      };
      navigate(routes[actions]);
    } else if (onManage) {
      onManage(paper.id);
    }
  };

  const handleView = () => {
    if (onView) {
      onView(paper.id);
    } else {
      // Default navigate based on role
      const routes = {
        admin: `/admin/submissions/${paper.id}`,
        editor: `/editor/papers/${paper.id}`,
        author: `/author/submissions/${paper.id}`,
        reviewer: `/reviewer/assignments/${paper.id}`,
      };
      const route = routes[role] || `/paper/${paper.id}`;
      navigate(route);
    }
  };

  return (
    <div className={styles.paperCard}>
      <div className={styles.cardContent}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>{title}</h3>
        </div>

        <div className={styles.metaSection}>
          <div className={styles.metaLeft}>
            <span className={styles.metaItem}>
              <span className="material-symbols-rounded">calendar_today</span>
              {date}
            </span>
            {journalName && (
              <span className={styles.metaItem}>
                <span className="material-symbols-rounded">book</span>
                {journalName}
              </span>
            )}
            <div className={styles.chipsGroup}>
              <StatusChips status={paper.status} />
              <span className={styles.paperTypeChip}>
                {paperType}
              </span>
              {/* Review Status Chip for Admin/Editor */}
              {(actions === 'admin' || actions === 'editor') && paper.review_status && (
                <span className={`${styles.reviewStatusChip} ${styles[`review_${paper.review_status}`]}`}>
                  {paper.review_status === 'not_assigned' ? 'Not Assigned' :
                   paper.review_status === 'pending' ? 'Review Pending' :
                   paper.review_status === 'partial' ? `Reviewed ${paper.completed_reviews}/${paper.total_reviewers}` :
                   `Reviewed ${paper.completed_reviews}/${paper.total_reviewers}`}
                </span>
              )}
            </div>
          </div>

          <div className={styles.metaRight}>
          </div>
        </div>
      </div>

      {/* Admin Actions: MANAGE button */}
      {(actions === 'admin' || actions === 'editor') && (
        <button
          className={`${styles.actionBtn} ${styles.manageBtn}`}
          onClick={handleManage}
        >
          <span>Manage</span>
          <span className="material-symbols-rounded">chevron_right</span>
        </button>
      )}

      {/* Author Actions: VIEW ONLY */}
      {actions === 'author' && (
        <button
          className={`${styles.actionBtn} ${styles.viewOnlyBtn}`}
          onClick={handleView}
        >
          <span>VIEW</span>
          <span className="material-symbols-rounded">open_in_new</span>
        </button>
      )}

      {/* Reviewer Actions: REVIEW button */}
      {actions === 'reviewer' && (
        <button
          className={`${styles.actionBtn} ${styles.reviewBtn}`}
          onClick={handleManage}
        >
          <span>REVIEW</span>
          <span className="material-symbols-rounded">edit_note</span>
        </button>
      )}
    </div>
  );
};

export default PaperCard;
