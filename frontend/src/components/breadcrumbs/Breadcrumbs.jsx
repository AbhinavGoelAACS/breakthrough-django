import React from 'react';
import { Link } from 'react-router-dom';
import './Breadcrumbs.css';

const Breadcrumbs = ({ items }) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {items.map((item, index) => (
          <li key={index} className="breadcrumbs-item">
            {index < items.length - 1 ? (
              <>
                <Link to={item.path} className="breadcrumbs-link">
                  {item.label}
                </Link>
                <span className="breadcrumbs-separator">/</span>
              </>
            ) : (
              <span className="breadcrumbs-current">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
