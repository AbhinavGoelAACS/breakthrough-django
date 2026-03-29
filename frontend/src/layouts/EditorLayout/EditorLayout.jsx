import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import '../shared/PortalLayout.css';

const EditorLayout = () => {
  const editorSections = [
    {
      items: [
        { icon: 'dashboard', label: 'Dashboard', path: '/editor/dashboard' }
      ]
    },
    {
      title: 'Journals',
      items: [
        { icon: 'library_books', label: 'My Journals', path: '/editor/my-journals' }
      ]
    },
    {
      title: 'Papers',
      items: [
        { icon: 'assignment', label: 'Paper Queue', path: '/editor/papers' },
        { icon: 'done_all', label: 'Pending Decision', path: '/editor/papers/pending-decision' },
        { icon: 'publish', label: 'Publishing', path: '/editor/publishing' }
      ]
    },
    {
      title: 'Team',
      items: [
        { icon: 'group', label: 'Reviewers', path: '/editor/reviewers' },
        { icon: 'help', label: 'Guidelines', path: '/editor/guidelines' }
      ]
    }
  ];

  return (
    <div className="portal-layout">
      <Navbar sections={editorSections} portalName="Editor Portal" />
      <main className="portal-main">
        <div className="portal-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default EditorLayout;
