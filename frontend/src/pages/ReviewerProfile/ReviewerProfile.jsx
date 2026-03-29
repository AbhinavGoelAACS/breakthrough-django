import React, { useEffect, useState } from 'react';
import acsApi from '../../api/apiService';
import { useToast } from '../../hooks/useToast';
import { formatDateIST } from '../../utils/dateUtils';
import styles from './ReviewerProfile.module.css';

const ReviewerProfile = () => {
  const { success, error: showError } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const profileData = await acsApi.reviewer.getReviewerProfile();
        setProfile(profileData);
        setEditData(profileData);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError(err.response?.data?.detail || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleEditChange = (field, value) => {
    setEditData({
      ...editData,
      [field]: value,
    });
  };

  const handleSaveProfile = async () => {
    try {
      // TODO: Implement update profile API call when endpoint is available
      success('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      showError('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <span className="material-symbols-rounded">hourglass_empty</span>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <span className="material-symbols-rounded">error_outline</span>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>My Profile</h1>
        <p>Manage your reviewer profile and preferences</p>
      </div>

      {profile && (
        <>
          {/* Profile Card */}
          <div className={styles.profileCard}>
            <div className={styles.profileHeader}>
              <div className={styles.profileAvatar}>
                {profile.fname?.charAt(0)?.toUpperCase()}
              </div>
              <div className={styles.profileInfo}>
                <h2>{profile.fname} {profile.lname || ''}</h2>
                <p className={styles.email}>{profile.email}</p>
                <p className={styles.title}>{profile.title || 'Reviewer'}</p>
              </div>
              <button
                className={styles.editBtn}
                onClick={() => setIsEditing(!isEditing)}
              >
                <span className="material-symbols-rounded">
                  {isEditing ? 'close' : 'edit'}
                </span>
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {/* Edit Form */}
            {isEditing ? (
              <div className={styles.editForm}>
                <div className={styles.formGroup}>
                  <label>First Name</label>
                  <input
                    type="text"
                    value={editData.fname || ''}
                    onChange={(e) => handleEditChange('fname', e.target.value)}
                    placeholder="First Name"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={editData.lname || ''}
                    onChange={(e) => handleEditChange('lname', e.target.value)}
                    placeholder="Last Name"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Title</label>
                  <input
                    type="text"
                    value={editData.title || ''}
                    onChange={(e) => handleEditChange('title', e.target.value)}
                    placeholder="e.g., Dr., Prof."
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Affiliation</label>
                  <input
                    type="text"
                    value={editData.affiliation || ''}
                    onChange={(e) => handleEditChange('affiliation', e.target.value)}
                    placeholder="University or Organization"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Specialization</label>
                  <input
                    type="text"
                    value={editData.specialization || ''}
                    onChange={(e) => handleEditChange('specialization', e.target.value)}
                    placeholder="Your area of expertise"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Contact Number</label>
                  <input
                    type="tel"
                    value={editData.contact || ''}
                    onChange={(e) => handleEditChange('contact', e.target.value)}
                    placeholder="Your contact number"
                  />
                </div>
                <div className={styles.formActions}>
                  <button className={styles.saveBtn} onClick={handleSaveProfile}>
                    Save Changes
                  </button>
                  <button className={styles.cancelBtn} onClick={() => setIsEditing(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.profileDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Email</span>
                  <span className={styles.value}>{profile.email}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Affiliation</span>
                  <span className={styles.value}>{profile.affiliation || 'Not provided'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Specialization</span>
                  <span className={styles.value}>{profile.specialization || 'Not provided'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Contact</span>
                  <span className={styles.value}>{profile.contact || 'Not provided'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Member Since</span>
                  <span className={styles.value}>
                    {formatDateIST(profile.added_on)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Statistics */}
          {profile.stats && (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <span className="material-symbols-rounded">assignment</span>
                </div>
                <div className={styles.statContent}>
                  <h3>Total Reviews</h3>
                  <p className={styles.statNumber}>{profile.stats.total_reviews || 0}</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <span className="material-symbols-rounded">check_circle</span>
                </div>
                <div className={styles.statContent}>
                  <h3>Completed</h3>
                  <p className={styles.statNumber}>{profile.stats.completed_reviews || 0}</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <span className="material-symbols-rounded">schedule</span>
                </div>
                <div className={styles.statContent}>
                  <h3>Avg Review Time</h3>
                  <p className={styles.statNumber}>{profile.stats.avg_review_time || 'N/A'}</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <span className="material-symbols-rounded">star</span>
                </div>
                <div className={styles.statContent}>
                  <h3>Rating</h3>
                  <p className={styles.statNumber}>{profile.stats.reviewer_rating || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReviewerProfile;
