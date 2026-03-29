import React, { useState, useEffect } from 'react';
import { fetchJournals } from '../../services/journals';
import './JournalList.css';

const JournalList = ({ limit = null, isCard = false }) => {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredDescriptionId, setHoveredDescriptionId] = useState(null);

  useEffect(() => {
    const loadJournals = async () => {
      try {
        setLoading(true);
        const response = await fetchJournals(0, limit || 100);
        
        // Handle both direct array and paginated response
        const journalData = Array.isArray(response) ? response : response.data || response.journals || [];
        
        // Map backend fields to frontend expected fields
        const mappedJournals = (journalData || []).map(j => ({
          id: j.id,
          title: j.short_form || j.name || 'Untitled',
          fullName: j.name || j.short_form || '',
          chiefEditor: j.chief_editor || j.editor_name || '',
          issnOnline: j.issn_ol || j.issn_online || '',
          issnPrint: j.issn_prt || j.issn_print || '',
          description: j.description || '',
          url: `?journal=${encodeURIComponent((j.short_form || j.title || j.name || 'journal').toLowerCase())}`
        }));
        
        setJournals(limit ? mappedJournals.slice(0, limit) : mappedJournals);
        setError(null);
      } catch (err) {
        console.error('Error fetching journals:', err);
        const staticJournals = getStaticJournals();
        setJournals(limit ? staticJournals.slice(0, limit) : staticJournals);
        setError('Using cached journal data');
      } finally {
        setLoading(false);
      }
    };
    loadJournals();
  }, [limit]);

  const getStaticJournals = () => {
    return [
      {
        id: 1,
        title: 'ITMSC',
        fullName: 'International Transactions in Mathematical Sciences and Computer',
        chiefEditor: 'Chief Editor Name',
        issnOnline: '2321-0001',
        issnPrint: '2321-0009',
        description: 'Mathematical Sciences and Computer research journal',
        url: '?journal=itmsc'
      },
      {
        id: 2,
        title: 'ITAS',
        fullName: 'International Transactions in Applied Sciences',
        chiefEditor: 'Chief Editor Name',
        issnOnline: '2321-0010',
        issnPrint: '2321-0019',
        description: 'Applied Sciences research journal',
        url: '?journal=itas'
      },
      {
        id: 3,
        title: 'IJICM',
        fullName: 'International Journal of Inventory Control and Management',
        chiefEditor: 'Chief Editor Name',
        issnOnline: '2321-0020',
        issnPrint: '2321-0029',
        description: 'Inventory Control and Management journal',
        url: '?journal=ijicm'
      },
      {
        id: 4,
        title: 'IJORO',
        fullName: 'International Journal of Operations Research and Optimization',
        chiefEditor: 'Chief Editor Name',
        issnOnline: '2321-0030',
        issnPrint: '2321-0039',
        description: 'Operations Research and Optimization journal',
        url: '?journal=ijoro'
      },
      {
        id: 5,
        title: 'IJSFM',
        fullName: 'International Journal of Stability and Fluid Mechanics',
        chiefEditor: 'Chief Editor Name',
        issnOnline: '2321-0040',
        issnPrint: '2321-0049',
        description: 'Stability and Fluid Mechanics journal',
        url: '?journal=ijsfm'
      },
      {
        id: 6,
        title: 'ITHSS',
        fullName: 'International Transactions in Humanities and Social Sciences',
        chiefEditor: 'Chief Editor Name',
        issnOnline: '2321-0050',
        issnPrint: '2321-0059',
        description: 'Humanities and Social Sciences journal',
        url: '?journal=ithss'
      }
    ];
  };

  const handleJournalClick = (journal) => {
    // Navigate to journal page on same domain
    window.location.href = journal.url;
  };

  if (loading) {
    return (
      <div className="journal-list-container">
        <div className="text-center">
          <div className="spinner-border text-danger" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p>Loading journals...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          .journal-list-container {
            background-color: ${isCard ? 'transparent' : 'white'};
            border: ${isCard ? 'none' : '1px solid #ddd'};
            border-radius: 5px;
            padding: 20px;
            height: ${isCard ? 'auto' : '550px'};
            overflow-y: ${isCard ? 'visible' : 'auto'};
            display: ${isCard ? 'grid' : 'block'};
            grid-template-columns: ${isCard ? 'repeat(auto-fit, minmax(300px, 1fr))' : 'auto'};
            gap: ${isCard ? '20px' : '0'};
          }
          
          .journal-card {
            background-color: white;
            border: none;
            border-radius: 8px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          
          .journal-card:hover {
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
            transform: translateY(-5px);
          }
          
          .journal-item {
            border-bottom: 1px solid #eee;
            padding: 15px 0;
            cursor: pointer;
            transition: background-color 0.3s;
          }
          
          .journal-item:hover {
            background-color: #f8f9fa;
          }
          
          .journal-item:last-child {
            border-bottom: none;
          }
          
          .journal-title {
            font-size: 18px;
            font-weight: bold;
            color: #C01F25;
            margin-bottom: 5px;
          }
          
          .journal-full-name {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
          }
          
          .journal-description {
            font-size: 13px;
            color: #888;
            line-height: 1.4;
          }
          
          .error-message {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
          }
          
          .journal-description-wrapper {
            position: relative;
          }
          
          .description-tooltip {
            position: absolute;
            bottom: 100%;
            left: 0;
            background-color: #333;
            color: #fff;
            padding: 10px 12px;
            border-radius: 4px;
            font-size: 12px;
            white-space: normal;
            word-wrap: break-word;
            max-width: 300px;
            z-index: 1000;
            margin-bottom: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          }
          
          .description-tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 10px;
            border: 5px solid transparent;
            border-top-color: #333;
          }
        `}
      </style>

      <div className="journal-list-container">
        {error && (
          <div className="error-message">
            <small>{error}</small>
          </div>
        )}
        
        {journals.length === 0 ? (
          <div className="text-center">
            <p>No journals available</p>
          </div>
        ) : (
          journals.map((journal) => (
            <div
              key={journal.id}
              className={isCard ? "journal-card" : "journal-item"}
              onClick={() => handleJournalClick(journal)}
            >
              {isCard ? (
                <div>
                  <div className="journal-title" style={{ textAlign: 'left', margin: '0.5rem', color: 'var(--primary-color)' }}>
                    {journal.fullName}
                  </div>
                  {journal.chiefEditor && (
                    <div style={{ textAlign: 'left', margin: '0.5rem', fontSize: '13px', color: '#666' }}>
                      <strong>Chief Editor:</strong> {journal.chiefEditor}
                    </div>
                  )}
                  {journal.issnOnline && (
                    <div style={{ textAlign: 'left', margin: '0.5rem', fontSize: '13px', color: '#666' }}>
                      <strong>ISSN Online:</strong> {journal.issnOnline}
                    </div>
                  )}
                  {journal.issnPrint && (
                    <div style={{ textAlign: 'left', margin: '0.5rem', fontSize: '13px', color: '#666' }}>
                      <strong>ISSN Print:</strong> {journal.issnPrint}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="journal-title">{journal.title}</div>
                  <div className="journal-full-name">{journal.fullName}</div>
                </>
              )}
              {!isCard && (
                <div
                  className="journal-description-wrapper"
                  onMouseEnter={() => setHoveredDescriptionId(journal.id)}
                  onMouseLeave={() => setHoveredDescriptionId(null)}
                >
                  {hoveredDescriptionId === journal.id && (
                    <div className="description-tooltip">
                      {journal.description.replace(/<[^>]+>/g, '')}
                    </div>
                  )}
                  <div
                    className="journal-description"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'normal',
                      cursor: 'pointer',
                    }}
                    dangerouslySetInnerHTML={{ __html: truncateHtml(journal.description, 2) }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
};

// Helper to truncate HTML to two lines (basic, strips tags for tooltip)
function truncateHtml(html, lines = 2) {
  // Remove tags for line count, but keep HTML for rendering
  const text = html.replace(/<[^>]+>/g, '');
  const words = text.split(' ');
  let result = '';
  let lineCount = 0;
  let charCount = 0;
  for (let i = 0; i < words.length; i++) {
    result += words[i] + ' ';
    charCount += words[i].length + 1;
    if (charCount > 60) { // crude line break after ~60 chars
      lineCount++;
      charCount = 0;
      if (lineCount >= lines) {
        result = result.trim() + '...';
        break;
      }
    }
  }
  return result.trim();
}

export default JournalList;