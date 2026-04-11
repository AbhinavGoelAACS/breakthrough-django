import React, { useState, useEffect } from 'react';
import { useJournalContext } from '../../contexts/JournalContext';
import { acsApi } from '../../api/apiService';
import './JournalEditorialBoardPage.css';

const JournalEditorialBoardPage = () => {
  const { currentJournal, journalShortForm, loading: contextLoading } = useJournalContext();
  const [editorialBoard, setEditorialBoard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (journalShortForm) {
      fetchEditorialBoard();
    }
  }, [journalShortForm]);

  const fetchEditorialBoard = async () => {
    try {
      setLoading(true);
      const response = await acsApi.journals.getEditorialBoard(journalShortForm);
      setEditorialBoard(response);
    } catch (err) {
      console.error('Failed to fetch editorial board:', err);
    } finally {
      setLoading(false);
    }
  };

  if (contextLoading || loading) {
    return (
      <div className="eb-page-loading">
        <div className="spinner"></div>
        <p>Loading editorial board...</p>
      </div>
    );
  }

  const hasBoard = editorialBoard && (
    editorialBoard.chief_editor ||
    editorialBoard.co_editors?.length > 0 ||
    editorialBoard.section_editors?.length > 0
  );

  const renderMemberCard = (member, role, roleClass) => (
    <div className={`eb-member-card ${roleClass}`} key={`${roleClass}-${member.name}`}>
      <div className="eb-member-avatar">
        {member.profile_picture ? (
          <img src={member.profile_picture} alt={member.name} />
        ) : (
          <span className="material-symbols-rounded">person</span>
        )}
      </div>
      <div className={`eb-member-badge ${roleClass}`}>{role}</div>
      <h3 className="eb-member-name">{member.name}</h3>
      {member.designation && (
        <p className="eb-member-designation">{member.designation}</p>
      )}
      {member.department && (
        <p className="eb-member-dept">{member.department}</p>
      )}
      {(member.organisation || member.affiliation) && (
        <p className="eb-member-org">{member.organisation || member.affiliation}</p>
      )}
    </div>
  );

  return (
    <div className="eb-page">
      {/* Page Header */}
      <div className="eb-page-header">
        <div className="eb-page-header-content">
          <h1>Editorial Board</h1>
          <p>{currentJournal?.name} — Meet our editorial team</p>
        </div>
      </div>

      {/* Board Content */}
      <div className="eb-page-content">
        {!hasBoard ? (
          <div className="eb-empty-state">
            <span className="material-symbols-rounded">groups</span>
            <h3>Editorial board information is not available yet.</h3>
            <p>Please check back later.</p>
          </div>
        ) : (
          <>
            {/* Chief Editor */}
            {editorialBoard.chief_editor && (
              <section className="eb-section">
                <h2 className="eb-section-title">Editor-in-Chief</h2>
                <div className="eb-grid eb-grid-chief">
                  {renderMemberCard(editorialBoard.chief_editor, 'Editor-in-Chief', 'chief')}
                </div>
              </section>
            )}

            {/* Co-Editors */}
            {editorialBoard.co_editors?.length > 0 && (
              <section className="eb-section">
                <h2 className="eb-section-title">Co-Editors</h2>
                <div className="eb-grid">
                  {editorialBoard.co_editors.map((editor, idx) =>
                    renderMemberCard(editor, 'Co-Editor', 'co-editor')
                  )}
                </div>
              </section>
            )}

            {/* Section Editors */}
            {editorialBoard.section_editors?.length > 0 && (
              <section className="eb-section">
                <h2 className="eb-section-title">Section Editors</h2>
                <div className="eb-grid">
                  {editorialBoard.section_editors.map((editor, idx) =>
                    renderMemberCard(editor, 'Section Editor', 'section-editor')
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default JournalEditorialBoardPage;
