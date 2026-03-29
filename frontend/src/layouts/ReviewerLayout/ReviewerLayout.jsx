import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import '../shared/PortalLayout.css';

const ReviewerLayout = () => {
  const reviewerSections = [
    {
      items: [
        { icon: 'dashboard', label: 'Dashboard', path: '/reviewer/dashboard' }
      ]
    },
    {
      title: 'Reviews',
      items: [
        { icon: 'assignment', label: 'My Assignments', path: '/reviewer/assignments' },
        { icon: 'mail', label: 'Invitations', path: '/reviewer/invitations' },
        { icon: 'history', label: 'Review History', path: '/reviewer/history' }
      ]
    },
    {
      title: 'Account',
      items: [
        { icon: 'person', label: 'Profile', path: '/reviewer/profile' },
        { icon: 'help', label: 'Guidelines', path: '/reviewer/guidelines' }
      ]
    }
  ];

  return (
    <div className="portal-layout">
      <Navbar sections={reviewerSections} portalName="Reviewer Portal" />
      <main className="portal-main">
        <div className="portal-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ReviewerLayout;
