import React, { useEffect, useState } from 'react';
import acsApi from '../../api/apiService';
import Pagination from '../../components/pagination/Pagination';
import { useToast } from '../../hooks/useToast';
import { formatDateIST } from '../../utils/dateUtils';
import styles from './ReviewerInvitations.module.css';

const ReviewerInvitations = () => {
  const { success, error: showError } = useToast();
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invitationActionLoading, setInvitationActionLoading] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    skip: 0,
    limit: 20,
    currentPage: 1,
  });

  const fetchInvitations = async (skip = 0) => {
    try {
      setLoading(true);
      setError(null);
      const invitationsData = await acsApi.reviewer.getPendingInvitations(skip, 20);
      setPendingInvitations(invitationsData?.invitations || []);
      setPagination({
        total: invitationsData?.total || 0,
        skip: invitationsData?.skip || skip,
        limit: invitationsData?.limit || 20,
        currentPage: Math.floor((invitationsData?.skip || skip) / (invitationsData?.limit || 20)) + 1,
        totalPages: Math.ceil((invitationsData?.total || 0) / (invitationsData?.limit || 20)),
      });
    } catch (err) {
      console.error('Failed to load pending invitations:', err);
      setError(err.response?.data?.detail || 'Failed to load invitations');
      setPendingInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations(0);
  }, []);

  const handleAcceptInvitation = async (invitationId) => {
    try {
      setInvitationActionLoading(invitationId);
      const response = await acsApi.reviewer.acceptInvitation(invitationId);
      success(response.message || 'Invitation accepted successfully!');
      // Remove from pending invitations
      setPendingInvitations(pendingInvitations.filter(inv => inv.id !== invitationId));
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: prev.total - 1,
      }));
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to accept invitation';
      showError(errorMsg);
    } finally {
      setInvitationActionLoading(null);
    }
  };

  const handleDeclineInvitation = async (invitationId) => {
    try {
      setInvitationActionLoading(invitationId);
      await acsApi.reviewer.declineInvitation(invitationId);
      success('Invitation declined');
      // Remove from pending invitations
      setPendingInvitations(pendingInvitations.filter(inv => inv.id !== invitationId));
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: prev.total - 1,
      }));
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to decline invitation';
      showError(errorMsg);
    } finally {
      setInvitationActionLoading(null);
    }
  };

  const handlePageChange = (page) => {
    const skip = (page - 1) * pagination.limit;
    fetchInvitations(skip);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>My Invitations</h1>
        <p>Review and manage your pending review invitations</p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className={styles.loading}>
          <span className="material-symbols-rounded">hourglass_empty</span>
          <p>Loading invitations...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className={styles.error}>
          <span className="material-symbols-rounded">error_outline</span>
          <p>{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && pendingInvitations.length === 0 && (
        <div className={styles.empty}>
          <span className="material-symbols-rounded">inbox</span>
          <p>No pending invitations</p>
        </div>
      )}

      {/* Invitations List */}
      {!loading && pendingInvitations.length > 0 && (
        <>
          <div className={styles.invitationsGrid}>
            {pendingInvitations.map((invitation) => (
              <div key={invitation.id} className={styles.invitationCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.iconContainer}>
                    <span className="material-symbols-rounded">mail_outline</span>
                  </div>
                  <div className={styles.titleContainer}>
                    <h3 className={styles.paperTitle}>{invitation.paper_title || 'Untitled Paper'}</h3>
                    <p className={styles.journal}>{invitation.journal || 'No Journal'}</p>
                  </div>
                </div>

                <div className={styles.cardContent}>
                  <div className={styles.infoSection}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Author:</span>
                      <span className={styles.infoValue}>{invitation.author || 'Unknown'}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Invited on:</span>
                      <span className={styles.infoValue}>
                        {formatDateIST(invitation.invited_on)}
                      </span>
                    </div>
                    {invitation.token_expiry && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Expires:</span>
                        <span className={styles.infoValue}>
                          {formatDateIST(invitation.token_expiry)}
                        </span>
                      </div>
                    )}
                  </div>

                  {invitation.invitation_message && (
                    <div className={styles.messageSection}>
                      <p className={styles.message}>{invitation.invitation_message}</p>
                    </div>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <button
                    className={styles.acceptBtn}
                    onClick={() => handleAcceptInvitation(invitation.id)}
                    disabled={invitationActionLoading === invitation.id}
                  >
                    <span className="material-symbols-rounded">check_circle</span>
                    {invitationActionLoading === invitation.id ? 'Accepting...' : 'Accept'}
                  </button>
                  <button
                    className={styles.declineBtn}
                    onClick={() => handleDeclineInvitation(invitation.id)}
                    disabled={invitationActionLoading === invitation.id}
                  >
                    <span className="material-symbols-rounded">cancel</span>
                    {invitationActionLoading === invitation.id ? 'Declining...' : 'Decline'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className={styles.paginationContainer}>
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                isLoading={loading}
                itemsPerPage={pagination.limit}
                totalItems={pagination.total}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReviewerInvitations;
