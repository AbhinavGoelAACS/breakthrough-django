import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import '../shared/PortalLayout.css';

const AdminLayout = () => {
  const adminSections = [
    {
      items: [
        { icon: 'dashboard', label: 'Dashboard', path: '/admin' },
        { icon: 'analytics', label: 'Analytics', path: '/admin/analytics' }
      ]
    },
    {
      title: 'Management',
      items: [
        { icon: 'group', label: 'Users', path: '/admin/users' },
        { icon: 'library_books', label: 'Journals', path: '/admin/journals' },
        { icon: 'assignment', label: 'All Submissions', path: '/admin/submissions' },
        { icon: 'how_to_reg', label: 'Role Requests', path: '/admin/role-requests' }
      ]
    },
    {
      title: 'System',
      items: [
        { icon: 'settings', label: 'Settings', path: '/admin/settings' }
      ]
    }
  ];

  return (
    <div className="portal-layout">
      <Navbar sections={adminSections} portalName="Admin Portal" />
      <main className="portal-main">
        <div className="portal-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
