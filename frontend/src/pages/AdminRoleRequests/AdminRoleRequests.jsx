import React, { useState, useEffect, useCallback } from 'react';
import acsApi from '../../api/apiService';
import { useToast } from '../../hooks/useToast';
import { formatDateTimeIST } from '../../utils/dateUtils';
import './AdminRoleRequests.css';

const ROLE_CONFIG = {
  author: { label: 'Author', icon: 'edit_document', color: '#3b82f6' },
  reviewer: { label: 'Reviewer', icon: 'rate_review', color: '#10b981' },
  editor: { label: 'Editor', icon: 'edit_note', color: '#f59e0b' },
  admin: { label: 'Admin', icon: 'admin_panel_settings', color: '#ef4444' }
};

const AdminRoleRequests = () => {
  const { success, error: showError } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [stats, setStats] = useState({ total: 0, pending: 0 });
  const [processingId, setProcessingId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [journalId, setJournalId] = useState('');
  const [journals, setJournals] = useState([]);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await acsApi.roles.listRequests(statusFilter);
      setRequests(response.requests || []);
      setStats({ total: response.total, pending: response.pending });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load role requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchJournals = async () => {
    try {
      const response = await acsApi.journals.list(0, 100);
      setJournals(response || []);
    } catch (err) {
      console.error('Failed to load journals:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchJournals();
  }, [fetchRequests]);

  const handleProcess = async (requestId, action) => {
    try {
      setProcessingId(requestId);
      await acsApi.roles.processRequest(
        requestId, 
        action, 
        adminNotes,
        action === 'approve' && selectedRequest?.requested_role === 'editor' ? parseInt(journalId) || null : null
      );
      
      // Refresh list
      await fetchRequests();
      success(`Request ${action}d successfully`);
      
      // Reset state
      setSelectedRequest(null);
      setAdminNotes('');
      setJournalId('');
    } catch (err) {
      showError(err.response?.data?.detail || `Failed to ${action} request`);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateStr) => {
    return formatDateTimeIST(dateStr);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { icon: 'schedule', class: 'pending' },
      approved: { icon: 'check_circle', class: 'approved' },
      rejected: { icon: 'cancel', class: 'rejected' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`status-badge ${config.class}`}>
        <span className="material-symbols-rounded">{config.icon}</span>
        {status}
      </span>
    );
  };

  if (loading && requests.length === 0) {
    return (
      <div className="admin-role-requests">
        <div className="loading-state">
          <span className="material-symbols-rounded spinning">sync</span>
          <span>Loading role requests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-role-requests">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <h1>
            <span className="material-symbols-rounded">how_to_reg</span>
            Role Requests
          </h1>
          <p>Manage user role access requests</p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Requests</span>
          </div>
          <div className="stat-item pending">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <span className="material-symbols-rounded">filter_list</span>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <span className="material-symbols-rounded">expand_more</span>
        </div>
        <button className="refresh-btn" onClick={fetchRequests} disabled={loading}>
          <span className={`material-symbols-rounded ${loading ? 'spinning' : ''}`}>refresh</span>
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <span className="material-symbols-rounded">error</span>
          {error}
          <button onClick={() => setError(null)}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
      )}

      {/* Requests Table */}
      <div className="requests-table-container">
        {requests.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-rounded">inbox</span>
            <h3>No requests found</h3>
            <p>There are no {statusFilter !== 'all' ? statusFilter : ''} role requests at the moment.</p>
          </div>
        ) : (
          <table className="requests-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Requested Role</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const roleConfig = ROLE_CONFIG[request.requested_role] || {};
                const isProcessing = processingId === request.id;
                
                return (
                  <tr key={request.id} className={isProcessing ? 'processing' : ''}>
                    <td className="user-cell">
                      <span className="material-symbols-rounded user-icon">person</span>
                      <div className="user-info">
                        <span className="user-name">{request.user_name || `User #${request.user_id}`}</span>
                        <span className="user-email">{request.user_email || ''}</span>
                      </div>
                    </td>
                    <td className="role-cell">
                      <span 
                        className="role-badge"
                        style={{ '--role-color': roleConfig.color }}
                      >
                        <span className="material-symbols-rounded">{roleConfig.icon || 'person'}</span>
                        {roleConfig.label || request.requested_role}
                      </span>
                    </td>
                    <td className="reason-cell">
                      <span className="reason-text">{request.reason || 'No reason provided'}</span>
                    </td>
                    <td className="status-cell">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="date-cell">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="actions-cell">
                      {request.status === 'pending' ? (
                        <div className="action-buttons">
                          <button
                            className="approve-btn"
                            onClick={() => setSelectedRequest(request)}
                            disabled={isProcessing}
                          >
                            <span className="material-symbols-rounded">check</span>
                            Approve
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => handleProcess(request.id, 'reject')}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <span className="material-symbols-rounded spinning">sync</span>
                            ) : (
                              <span className="material-symbols-rounded">close</span>
                            )}
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="processed-info">
                          {request.status === 'approved' ? 'Approved' : 'Rejected'}
                          {request.processed_at && ` on ${formatDate(request.processed_at)}`}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Approval Modal */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="approval-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <span className="material-symbols-rounded">check_circle</span>
                Approve Role Request
              </h3>
              <button className="close-btn" onClick={() => setSelectedRequest(null)}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="request-summary">
                <div className="summary-item">
                  <label>User</label>
                  <span>{selectedRequest.user_name || `User #${selectedRequest.user_id}`}</span>
                </div>
                <div className="summary-item">
                  <label>Requested Role</label>
                  <span 
                    className="role-badge"
                    style={{ '--role-color': ROLE_CONFIG[selectedRequest.requested_role]?.color }}
                  >
                    <span className="material-symbols-rounded">
                      {ROLE_CONFIG[selectedRequest.requested_role]?.icon || 'person'}
                    </span>
                    {ROLE_CONFIG[selectedRequest.requested_role]?.label || selectedRequest.requested_role}
                  </span>
                </div>
                <div className="summary-item full-width">
                  <label>Reason</label>
                  <span>{selectedRequest.reason || 'No reason provided'}</span>
                </div>
              </div>

              {/* Journal Selection for Editor Role */}
              {selectedRequest.requested_role === 'editor' && (
                <div className="form-group">
                  <label htmlFor="journal">
                    <span className="material-symbols-rounded">library_books</span>
                    Assign to Journal (Optional)
                  </label>
                  <select
                    id="journal"
                    value={journalId}
                    onChange={(e) => setJournalId(e.target.value)}
                  >
                    <option value="">No specific journal</option>
                    {journals.map((journal) => (
                      <option key={journal.id} value={journal.id}>
                        {journal.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="notes">
                  <span className="material-symbols-rounded">notes</span>
                  Admin Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about this approval..."
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="secondary-btn" 
                onClick={() => setSelectedRequest(null)}
              >
                Cancel
              </button>
              <button 
                className="primary-btn approve"
                onClick={() => handleProcess(selectedRequest.id, 'approve')}
                disabled={processingId === selectedRequest.id}
              >
                {processingId === selectedRequest.id ? (
                  <>
                    <span className="material-symbols-rounded spinning">sync</span>
                    Approving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-rounded">check</span>
                    Approve Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRoleRequests;
