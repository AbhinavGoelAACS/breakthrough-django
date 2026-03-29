import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './RequestAccessModal.css';

const ROLE_CONFIG = {
  author: {
    label: 'Author',
    icon: 'edit_document',
    color: '#0D4715',
    description: 'Submit research papers and manage your submissions through the editorial process.',
    benefits: [
      'Submit papers to any journal',
      'Track submission status',
      'Manage revisions and responses',
      'Access publication history'
    ]
  },
  reviewer: {
    label: 'Reviewer',
    icon: 'rate_review',
    color: '#41644A',
    description: 'Review and evaluate research papers assigned to you by editors.',
    benefits: [
      'Review assigned papers',
      'Provide expert feedback',
      'Earn reviewer credits',
      'Build academic reputation'
    ]
  },
  editor: {
    label: 'Editor',
    icon: 'edit_note',
    color: '#4ade80',
    description: 'Manage journal submissions and coordinate the peer review process.',
    benefits: [
      'Manage submissions',
      'Assign reviewers',
      'Make publication decisions',
      'Oversee journal quality'
    ]
  }
};

const RequestAccessModal = ({ isOpen, onClose }) => {
  const { requestRole, pendingRoleRequests, availableRoles } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRole || !reason.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await requestRole(selectedRole, reason);
      setSuccess(true);
      setSelectedRole(null);
      setReason('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit role request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedRole(null);
    setReason('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  const isPending = (role) => {
    return pendingRoleRequests?.some(r => r.requested_role === role);
  };

  return (
    <div className="request-modal-overlay" onClick={handleClose}>
      <div className="request-modal" onClick={(e) => e.stopPropagation()}>
        <div className="request-modal-header">
          <h2>
            <span className="material-symbols-rounded">add_moderator</span>
            Request Role Access
          </h2>
          <button className="close-btn" onClick={handleClose}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {success ? (
          <div className="request-success">
            <span className="material-symbols-rounded success-icon">check_circle</span>
            <h3>Request Submitted!</h3>
            <p>Your request has been submitted and is pending admin approval. You'll be notified once it's processed.</p>
            <button className="primary-btn" onClick={handleClose}>
              Got it
            </button>
          </div>
        ) : (
          <>
            <div className="request-modal-body">
              <p className="modal-description">
                Select a role to request access to. An administrator will review your request.
              </p>

              {/* Pending Requests */}
              {pendingRoleRequests && pendingRoleRequests.length > 0 && (
                <div className="pending-requests">
                  <h4>
                    <span className="material-symbols-rounded">schedule</span>
                    Pending Requests
                  </h4>
                  {pendingRoleRequests.map((request) => {
                    const config = ROLE_CONFIG[request.requested_role];
                    return (
                      <div key={request.id} className="pending-item">
                        <span className="material-symbols-rounded" style={{ color: config?.color }}>
                          {config?.icon || 'person'}
                        </span>
                        <span>{config?.label || request.requested_role}</span>
                        <span className="pending-badge">Pending</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Available Roles */}
              <div className="roles-grid">
                {availableRoles?.map((role) => {
                  const config = ROLE_CONFIG[role];
                  if (!config) return null;
                  
                  const pending = isPending(role);
                  const isSelected = selectedRole === role;

                  return (
                    <div
                      key={role}
                      className={`role-card ${isSelected ? 'selected' : ''} ${pending ? 'pending' : ''}`}
                      onClick={() => !pending && setSelectedRole(role)}
                      style={{ '--role-color': config.color }}
                    >
                      <div className="role-card-header">
                        <span className="material-symbols-rounded role-icon">{config.icon}</span>
                        <h3>{config.label}</h3>
                        {pending && (
                          <span className="pending-tag">
                            <span className="material-symbols-rounded">schedule</span>
                            Pending
                          </span>
                        )}
                        {isSelected && !pending && (
                          <span className="material-symbols-rounded selected-check">check_circle</span>
                        )}
                      </div>
                      <p className="role-description">{config.description}</p>
                      <ul className="role-benefits">
                        {config.benefits.map((benefit, idx) => (
                          <li key={idx}>
                            <span className="material-symbols-rounded">check</span>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* Request Form */}
              {selectedRole && (
                <form className="request-form" onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="reason">
                      Why do you need {ROLE_CONFIG[selectedRole]?.label} access?
                    </label>
                    <textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Please provide a brief explanation for your request..."
                      rows={4}
                      required
                    />
                  </div>

                  {error && (
                    <div className="error-message">
                      <span className="material-symbols-rounded">error</span>
                      {error}
                    </div>
                  )}

                  <div className="form-actions">
                    <button type="button" className="secondary-btn" onClick={() => setSelectedRole(null)}>
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="primary-btn"
                      disabled={loading || !reason.trim()}
                    >
                      {loading ? (
                        <>
                          <span className="material-symbols-rounded spinning">sync</span>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-rounded">send</span>
                          Submit Request
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RequestAccessModal;
