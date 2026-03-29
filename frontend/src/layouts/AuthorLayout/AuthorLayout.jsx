import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import '../shared/PortalLayout.css';

const AuthorLayout = () => {
  const authorSections = [
    {
      items: [
        { icon: 'dashboard', label: 'Dashboard', path: '/author' }
      ]
    },
    {
      title: 'Papers',
      items: [
        { icon: 'description', label: 'My Submissions', path: '/author/submissions' }
      ]
    },
    {
      title: 'Quick Links',
      items: [
        { icon: 'add_circle', label: 'Submit Paper', path: '/submit' },
        { icon: 'menu_book', label: 'Author Guidelines', path: '/author/guidelines' }
      ]
    }
  ];

  return (
    <div className="portal-layout">
      <Navbar sections={authorSections} portalName="Author Portal" />
      <main className="portal-main">
        <div className="portal-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AuthorLayout;
