import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useJournals } from '../../hooks/useJournals';
import JournalCard from '../../components/journal-list/JournalCard';
import Pagination from '../../components/pagination/Pagination';
import Breadcrumbs from '../../components/breadcrumbs/Breadcrumbs';
import './JournalsPage.css';

export const JournalsPage = () => {
  const { journals, loading, error, getAllJournals } = useJournals();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredJournals, setFilteredJournals] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    // Fetch all journals on component mount
    getAllJournals(0, 100);
  }, []);

  useEffect(() => {
    // Filter journals based on search term
    if (searchTerm.trim() === '') {
      setFilteredJournals(journals);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = journals.filter(
        (journal) =>
          journal.name?.toLowerCase().includes(term) ||
          journal.short_form?.toLowerCase().includes(term) ||
          journal.chief_editor?.toLowerCase().includes(term) ||
          journal.description?.toLowerCase().includes(term)
      );
      setFilteredJournals(filtered);
    }
    // Reset to first page when search term changes
    setCurrentPage(1);
  }, [searchTerm, journals]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredJournals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentJournals = filteredJournals.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top of journals grid
    const gridElement = document.querySelector('.journals-grid');
    if (gridElement) {
      gridElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const breadcrumbItems = [
    { label: 'Home', path: '/' },
    { label: 'Journals', path: '/journals' },
  ];

  return (
    <div className="journals-page">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="journals-header-wrapper">
        <div className="journals-page-header">
          <h1>All Journals</h1>
          <p>Browse our collection of peer-reviewed academic journals</p>
        </div>

        <div className="journals-search-container">
          <input
            type="text"
            className="journals-search-input"
            placeholder="Search journals by name, abbreviation, or editor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="journals-search-icon material-symbols-rounded">search</span>
        </div>
      </div>

      {error && (
        <div className="journals-error">
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="journals-loading">
          <div className="spinner"></div>
          <p>Loading journals...</p>
        </div>
      )}

      {!loading && filteredJournals.length === 0 && (
        <div className="journals-empty">
          <p>No journals found matching your search.</p>
        </div>
      )}

      <div className="journals-grid">
        {currentJournals.map((journal) => (
          <JournalCard key={journal.id} journal={journal} />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          isLoading={loading}
          itemsPerPage={itemsPerPage}
          totalItems={filteredJournals.length}
        />
      )}
    </div>
  );
};

export default JournalsPage;
