import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import RequestAccessModal from '../RequestAccessModal';
import './RoleSwitcher.css';

const ROLE_CONFIG = {
  author: {
    label: 'Author',
    icon: 'edit_document',
    color: '#41644A',
    dashboardPath: '/author',
    description: 'Submit and manage papers'
  },
  reviewer: {
    label: 'Reviewer',
    icon: 'rate_review',
    color: '#0D4715',
    dashboardPath: '/reviewer',
    description: 'Review assigned papers'
  },
  editor: {
    label: 'Editor',
    icon: 'edit_note',
    color: '#4ade80',
    dashboardPath: '/editor',
    description: 'Manage journal submissions'
  },
  admin: {
    label: 'Admin',
    icon: 'admin_panel_settings',
    color: '#333333',
    dashboardPath: '/admin',
    description: 'System administration'
  }
};

const RoleSwitcher = () => {
  const { roles, activeRole, switchRole } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const approvedRoles = roles.filter(r => r.status === 'approved');
  const currentRoleConfig = ROLE_CONFIG[activeRole?.toLowerCase()] || ROLE_CONFIG.author;
  
  // Check if user has all available roles
  const allRoleKeys = Object.keys(ROLE_CONFIG);
  const approvedRoleNames = approvedRoles.map(r => r.role?.toLowerCase());
  const hasAllRoles = allRoleKeys.every(role => approvedRoleNames.includes(role));

  const handleRoleSwitch = async (newRole) => {
    if (newRole === activeRole?.toLowerCase() || switching) return;

    try {
      setSwitching(true);
      
      // Navigate to the new role's dashboard FIRST (optimistically)
      // This prevents the protected route from redirecting to home
      const config = ROLE_CONFIG[newRole];
      if (config?.dashboardPath) {
        navigate(config.dashboardPath, { replace: true });
      }
      
      // Then complete the role switch API call
      await switchRole(newRole);
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to switch role:', err);
      // If role switch fails, go back to current role's dashboard
      const currentConfig = ROLE_CONFIG[activeRole?.toLowerCase()];
      if (currentConfig?.dashboardPath) {
        navigate(currentConfig.dashboardPath, { replace: true });
      }
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="role-switcher" ref={dropdownRef}>
      <button 
        className="role-switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        style={{ '--role-color': currentRoleConfig.color }}
      >
        <span className="material-symbols-rounded">{currentRoleConfig.icon}</span>
        <span className="role-name">{currentRoleConfig.label}</span>
        <span className={`material-symbols-rounded chevron ${isOpen ? 'open' : ''}`}>
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="role-dropdown">
          <div className="dropdown-header">
            <span>Switch Role</span>
          </div>
          <div className="dropdown-options">
            {approvedRoles.map((roleItem) => {
              const roleName = roleItem.role?.toLowerCase();
              const config = ROLE_CONFIG[roleName];
              if (!config) return null;

              const isActive = activeRole?.toLowerCase() === roleName;

              return (
                <button
                  key={roleItem.id}
                  className={`role-option ${isActive ? 'active' : ''}`}
                  onClick={() => handleRoleSwitch(roleName)}
                  disabled={isActive || switching}
                  style={{ '--role-color': config.color }}
                >
                  <div className="role-option-icon">
                    <span className="material-symbols-rounded">{config.icon}</span>
                  </div>
                  <div className="role-option-info">
                    <span className="role-option-label">{config.label}</span>
                    <span className="role-option-desc">{config.description}</span>
                  </div>
                  {isActive && (
                    <span className="material-symbols-rounded role-check">check</span>
                  )}
                  {switching && !isActive && (
                    <span className="material-symbols-rounded role-loading">sync</span>
                  )}
                </button>
              );
            })}
          </div>
          {!hasAllRoles && (
            <>
              <div className="dropdown-divider"></div>
              <div className="dropdown-footer">
                <button 
                  className="request-access-btn"
                  onClick={() => {
                    setIsOpen(false);
                    setShowRequestModal(true);
                  }}
                >
                  <span className="material-symbols-rounded">add_moderator</span>
                  <span>Request Additional Access</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <RequestAccessModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
      />
    </div>
  );
};

export default RoleSwitcher;
