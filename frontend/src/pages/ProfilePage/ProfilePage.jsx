import React, { useEffect, useState } from 'react';
import { apiService } from '../../api/apiService';
import { useToast } from '../../hooks/useToast';
import styles from './ProfilePage.module.css';

const ProfilePage = () => {
  const { success, error: showError } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiService.get('/api/v1/auth/me');
        setProfile(data);
        setEditData(data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const data = await apiService.put('/api/v1/auth/me', {
        fname: editData.fname || '',
        lname: editData.lname || '',
        mname: editData.mname || '',
        title: editData.title || '',
        salutation: editData.salutation || '',
        designation: editData.designation || '',
        department: editData.department || '',
        organisation: editData.organisation || '',
        affiliation: editData.affiliation || '',
        specialization: editData.specialization || '',
        contact: editData.contact || '',
        address: editData.address || '',
      });
      setProfile(data);
      setEditData(data);
      setIsEditing(false);
      success('Profile updated successfully');
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
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

  const fullName = [profile?.fname, profile?.mname, profile?.lname].filter(Boolean).join(' ') || 'User';
  const roleLabel = profile?.role || 'User';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>My Profile</h1>
        <p>Manage your account information</p>
      </div>

      {profile && (
        <>
          {/* Profile Card */}
          <div className={styles.profileCard}>
            <div className={styles.profileHeader}>
              <div className={styles.profileAvatar}>
                {(profile.fname?.charAt(0) || profile.email?.charAt(0) || 'U').toUpperCase()}
              </div>
              <div className={styles.profileInfo}>
                <h2>{fullName}</h2>
                <p className={styles.email}>{profile.email}</p>
                <span className={styles.roleBadge}>{roleLabel}</span>
              </div>
              <button
                className={styles.editBtn}
                onClick={() => {
                  if (isEditing) {
                    setEditData(profile);
                  }
                  setIsEditing(!isEditing);
                }}
              >
                <span className="material-symbols-rounded">
                  {isEditing ? 'close' : 'edit'}
                </span>
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            {isEditing ? (
              <div className={styles.editForm}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Salutation</label>
                    <select
                      value={editData.salutation || ''}
                      onChange={(e) => handleChange('salutation', e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="Mr.">Mr.</option>
                      <option value="Ms.">Ms.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Dr.">Dr.</option>
                      <option value="Prof.">Prof.</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>First Name</label>
                    <input
                      type="text"
                      value={editData.fname || ''}
                      onChange={(e) => handleChange('fname', e.target.value)}
                      placeholder="First Name"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Middle Name</label>
                    <input
                      type="text"
                      value={editData.mname || ''}
                      onChange={(e) => handleChange('mname', e.target.value)}
                      placeholder="Middle Name"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={editData.lname || ''}
                      onChange={(e) => handleChange('lname', e.target.value)}
                      placeholder="Last Name"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Title</label>
                    <input
                      type="text"
                      value={editData.title || ''}
                      onChange={(e) => handleChange('title', e.target.value)}
                      placeholder="e.g., Dr., Prof."
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Designation</label>
                    <input
                      type="text"
                      value={editData.designation || ''}
                      onChange={(e) => handleChange('designation', e.target.value)}
                      placeholder="e.g., Professor, Researcher"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Department</label>
                    <input
                      type="text"
                      value={editData.department || ''}
                      onChange={(e) => handleChange('department', e.target.value)}
                      placeholder="Department"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Organisation</label>
                    <input
                      type="text"
                      value={editData.organisation || ''}
                      onChange={(e) => handleChange('organisation', e.target.value)}
                      placeholder="Organisation"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Affiliation</label>
                    <input
                      type="text"
                      value={editData.affiliation || ''}
                      onChange={(e) => handleChange('affiliation', e.target.value)}
                      placeholder="University or Institution"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Specialization</label>
                    <input
                      type="text"
                      value={editData.specialization || ''}
                      onChange={(e) => handleChange('specialization', e.target.value)}
                      placeholder="Area of expertise"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Contact Number</label>
                    <input
                      type="tel"
                      value={editData.contact || ''}
                      onChange={(e) => handleChange('contact', e.target.value)}
                      placeholder="Phone number"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Address</label>
                    <input
                      type="text"
                      value={editData.address || ''}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="Address"
                    />
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => { setEditData(profile); setIsEditing(false); }}
                  >
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
                  <span className={styles.label}>Salutation</span>
                  <span className={styles.value}>{profile.salutation || 'Not set'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Title</span>
                  <span className={styles.value}>{profile.title || 'Not set'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Designation</span>
                  <span className={styles.value}>{profile.designation || 'Not set'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Department</span>
                  <span className={styles.value}>{profile.department || 'Not set'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Organisation</span>
                  <span className={styles.value}>{profile.organisation || 'Not set'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Affiliation</span>
                  <span className={styles.value}>{profile.affiliation || 'Not set'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Specialization</span>
                  <span className={styles.value}>{profile.specialization || 'Not set'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Contact</span>
                  <span className={styles.value}>{profile.contact || 'Not set'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Address</span>
                  <span className={styles.value}>{profile.address || 'Not set'}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ProfilePage;
