import React from 'react';
import styles from './ActivityTimeline.module.css';
import { formatRelativeDate, formatTimeIST } from '../../utils/dateUtils';

/**
 * ActivityTimeline - Displays paper activity history with visual timeline
 * 
 * @param {Object} props
 * @param {Array} props.events - Array of event objects with type, title, date, time
 */
const ActivityTimeline = ({ events = [] }) => {
  // Map event types to icons and colors
  const getEventStyle = (type) => {
    const eventStyles = {
      submitted: { icon: 'publish', color: 'blue' },
      under_review: { icon: 'visibility', color: 'blue' },
      reviewer_assigned: { icon: 'person_search', color: 'slate' },
      review_completed: { icon: 'rate_review', color: 'green' },
      revision_requested: { icon: 'edit_note', color: 'amber' },
      resubmitted: { icon: 'upload_file', color: 'blue' },
      accepted: { icon: 'check_circle', color: 'green' },
      rejected: { icon: 'cancel', color: 'red' },
      published: { icon: 'public', color: 'green' },
      default: { icon: 'schedule', color: 'slate' }
    };
    return eventStyles[type] || eventStyles.default;
  };

  if (!events || events.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Activity Timeline</h2>
        </div>
        <div className={styles.empty}>
          <span className="material-symbols-outlined">history</span>
          <p>No activity yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Activity Timeline</h2>
      </div>
      <div className={styles.timeline}>
        {events.map((event, index) => {
          const eventStyle = getEventStyle(event.type);
          const isLast = index === events.length - 1;
          
          return (
            <div key={index} className={styles.event}>
              {!isLast && <div className={styles.connector} />}
              <div className={`${styles.iconWrapper} ${styles[eventStyle.color]}`}>
                <span className="material-symbols-outlined">{eventStyle.icon}</span>
              </div>
              <div className={styles.content}>
                <p className={styles.eventTitle}>{event.title}</p>
                <p className={styles.eventTime}>
                  {event.date ? `${formatRelativeDate(event.date)} • ${formatTimeIST(event.date)}` : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityTimeline;
