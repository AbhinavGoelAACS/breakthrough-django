import { useState, useRef, useEffect } from 'react';
import { useOrganizationSearch } from '../../hooks/useOrganizationSearch';
import styles from './OrganizationAutocomplete.module.css';

/**
 * Autocomplete component for organization search using ROR API
 * @param {Object} props
 * @param {string} props.value - Current input value
 * @param {function} props.onChange - Callback when value changes (receives value string)
 * @param {function} props.onSelect - Optional callback when organization is selected (receives organization object)
 * @param {string} props.placeholder - Input placeholder text
 * @param {string} props.className - Additional CSS class for the container
 * @param {boolean} props.required - Whether the field is required
 * @param {boolean} props.disabled - Whether the field is disabled
 * @param {string} props.id - Input element id
 * @param {string} props.name - Input element name
 */
const OrganizationAutocomplete = ({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Search for an organization...',
  className = '',
  required = false,
  disabled = false,
  id,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const { organizations, loading, error } = useOrganizationSearch(inputValue);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.children[activeIndex];
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleSelectOrganization = (org) => {
    setInputValue(org.name);
    onChange?.(org.name);
    onSelect?.(org);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleUseCustomValue = () => {
    onChange?.(inputValue);
    onSelect?.({ name: inputValue, isCustom: true });
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    const totalItems = organizations.length + (inputValue.trim() ? 1 : 0); // +1 for custom option

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < organizations.length) {
          handleSelectOrganization(organizations[activeIndex]);
        } else if (activeIndex === organizations.length && inputValue.trim()) {
          handleUseCustomValue();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  };

  const handleFocus = () => {
    if (inputValue.trim().length >= 2) {
      setIsOpen(true);
    }
  };

  const showDropdown = isOpen && (loading || organizations.length > 0 || (inputValue.trim() && !loading));

  return (
    <div 
      className={`${styles.container} ${className}`} 
      ref={containerRef}
    >
      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          className={styles.input}
        />
        {loading && <span className={styles.loadingSpinner}></span>}
      </div>

      {showDropdown && (
        <ul 
          ref={listRef}
          className={styles.dropdown}
          role="listbox"
          aria-label="Organization suggestions"
        >
          {loading ? (
            <li className={styles.loadingItem}>Searching organizations...</li>
          ) : (
            <>
              {organizations.map((org, index) => (
                <li
                  key={org.id || org.rorId || index}
                  role="option"
                  aria-selected={activeIndex === index}
                  className={`${styles.option} ${activeIndex === index ? styles.active : ''}`}
                  onClick={() => handleSelectOrganization(org)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className={styles.orgName}>{org.name}</div>
                  {(org.country || org.types?.length > 0) && (
                    <div className={styles.orgMeta}>
                      {org.country && <span className={styles.country}>{org.country}</span>}
                      {org.types?.length > 0 && (
                        <span className={styles.type}>{org.types[0]}</span>
                      )}
                    </div>
                  )}
                </li>
              ))}

              {inputValue.trim() && (
                <li
                  role="option"
                  aria-selected={activeIndex === organizations.length}
                  className={`${styles.option} ${styles.customOption} ${activeIndex === organizations.length ? styles.active : ''}`}
                  onClick={handleUseCustomValue}
                  onMouseEnter={() => setActiveIndex(organizations.length)}
                >
                  <div className={styles.customLabel}>
                    Use &ldquo;{inputValue}&rdquo;
                  </div>
                  <div className={styles.customHint}>
                    Organization not in database
                  </div>
                </li>
              )}

              {!loading && organizations.length === 0 && !inputValue.trim() && (
                <li className={styles.noResults}>
                  Type to search organizations
                </li>
              )}
            </>
          )}

          {error && <li className={styles.errorItem}>{error}</li>}
        </ul>
      )}
    </div>
  );
};

export default OrganizationAutocomplete;
