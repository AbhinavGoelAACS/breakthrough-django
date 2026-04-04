import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../api/axios';
import Header from '../../components/header/Header';
import Footer from '../../components/footer/Footer';
import '../AuthPages.css';
import './CompleteProfilePage.css';

const CompleteProfilePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  const [form, setForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    salutation: '',
    designation: '',
    department: '',
    organisation: '',
    affiliation: '',
    specialization: '',
    contact: '',
    address: '',
    password: '',
    confirm_password: '',
  });

  const [email, setEmail] = useState('');

  useEffect(() => {
    const loadTokenData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/coauthor-token/${token}`);
        if (!res.ok) {
          setTokenInvalid(true);
          setError('This link is invalid or has already been used.');
          return;
        }
        const data = await res.json();
        setEmail(data.email || '');
        setForm((prev) => ({
          ...prev,
          first_name: data.first_name || '',
          middle_name: data.middle_name || '',
          last_name: data.last_name || '',
          salutation: data.salutation || '',
          designation: data.designation || '',
          department: data.department || '',
          organisation: data.organisation || '',
          affiliation: data.affiliation || '',
          specialization: data.specialization || '',
          contact: data.contact || '',
          address: data.address || '',
        }));
      } catch {
        setTokenInvalid(true);
        setError('Failed to load your profile data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    loadTokenData();
  }, [token]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.password || !form.confirm_password) {
      setError('Please set a password.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/complete-profile/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || 'Something went wrong. Please try again.');
        return;
      }

      // Store tokens and redirect
      if (data.access_token) {
        localStorage.setItem('authToken', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refreshToken', data.refresh_token);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/author', { replace: true });
      }, 2000);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="auth-page">
          <div className="complete-profile-loading">
            <div className="spinner"></div>
            <p>Loading your profile...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (tokenInvalid) {
    return (
      <>
        <Header />
        <div className="auth-page">
          <div className="complete-profile-card">
            <div className="auth-header">
              <h1>Invalid Link</h1>
              <p>{error || 'This link is invalid or has already been used.'}</p>
            </div>
            <div className="auth-footer">
              <p>
                Already have an account?{' '}
                <a href="/login" className="auth-link">Sign in</a>
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (success) {
    return (
      <>
        <Header />
        <div className="auth-page">
          <div className="complete-profile-card">
            <div className="auth-header">
              <h1>Profile Complete!</h1>
              <p>Your account has been set up successfully. Redirecting to your dashboard...</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="auth-page">
        <div className="complete-profile-card">
          <div className="auth-header">
            <h1>Complete Your Profile</h1>
            <p>You've been added as a co-author. Set your password and complete your profile to get started.</p>
          </div>

          {error && <div className="cp-error">{error}</div>}

          <form onSubmit={handleSubmit} className="cp-form">
            {/* Email (read-only) */}
            <div className="cp-field">
              <label>Email</label>
              <input type="email" value={email} disabled className="cp-input cp-input-disabled" />
            </div>

            {/* Password section */}
            <h3 className="cp-section-title">Set Your Password</h3>
            <div className="cp-row">
              <div className="cp-field">
                <label>Password <span className="cp-required">*</span></label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  className="cp-input"
                  required
                />
              </div>
              <div className="cp-field">
                <label>Confirm Password <span className="cp-required">*</span></label>
                <input
                  type="password"
                  name="confirm_password"
                  value={form.confirm_password}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  className="cp-input"
                  required
                />
              </div>
            </div>

            {/* Profile section */}
            <h3 className="cp-section-title">Profile Information</h3>
            <div className="cp-row">
              <div className="cp-field cp-field-small">
                <label>Salutation</label>
                <select name="salutation" value={form.salutation} onChange={handleChange} className="cp-input">
                  <option value="">Select</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Dr.">Dr.</option>
                  <option value="Prof.">Prof.</option>
                </select>
              </div>
              <div className="cp-field">
                <label>First Name</label>
                <input type="text" name="first_name" value={form.first_name} onChange={handleChange} className="cp-input" />
              </div>
              <div className="cp-field">
                <label>Middle Name</label>
                <input type="text" name="middle_name" value={form.middle_name} onChange={handleChange} className="cp-input" />
              </div>
              <div className="cp-field">
                <label>Last Name</label>
                <input type="text" name="last_name" value={form.last_name} onChange={handleChange} className="cp-input" />
              </div>
            </div>

            <div className="cp-row">
              <div className="cp-field">
                <label>Designation</label>
                <input type="text" name="designation" value={form.designation} onChange={handleChange} className="cp-input" placeholder="e.g. Professor, Researcher" />
              </div>
              <div className="cp-field">
                <label>Department</label>
                <input type="text" name="department" value={form.department} onChange={handleChange} className="cp-input" />
              </div>
            </div>

            <div className="cp-row">
              <div className="cp-field">
                <label>Organisation</label>
                <input type="text" name="organisation" value={form.organisation} onChange={handleChange} className="cp-input" />
              </div>
              <div className="cp-field">
                <label>Affiliation</label>
                <input type="text" name="affiliation" value={form.affiliation} onChange={handleChange} className="cp-input" />
              </div>
            </div>

            <div className="cp-row">
              <div className="cp-field">
                <label>Specialization</label>
                <input type="text" name="specialization" value={form.specialization} onChange={handleChange} className="cp-input" />
              </div>
              <div className="cp-field">
                <label>Contact Number</label>
                <input type="text" name="contact" value={form.contact} onChange={handleChange} className="cp-input" />
              </div>
            </div>

            <div className="cp-field">
              <label>Address</label>
              <textarea name="address" value={form.address} onChange={handleChange} className="cp-input cp-textarea" rows={2} />
            </div>

            <button type="submit" className="cp-submit-btn" disabled={submitting}>
              {submitting ? 'Setting up your account...' : 'Complete Profile & Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <a href="/login" className="auth-link">Sign in</a>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CompleteProfilePage;
