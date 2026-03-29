# Author Guidelines Implementation Plan

## Overview
This document outlines the steps to integrate the new Author Guidelines page into the AACS frontend application.

---

## Files Created

### 1. AuthorGuidelines.jsx
**Location:** `frontend/src/pages/AuthorGuidelines/AuthorGuidelines.jsx`

A comprehensive React component with tabbed navigation containing:
- **Manuscript Preparation** - Paper types, required/optional sections
- **Formatting Guidelines** - Document format, figures, tables, citations
- **Submission Process** - Step-by-step guide, timeline, checklist
- **Publication Ethics** - Authorship, plagiarism, data integrity, conflicts
- **FAQ** - Common questions with expandable answers

### 2. AuthorGuidelines.module.css
**Location:** `frontend/src/pages/AuthorGuidelines/AuthorGuidelines.module.css`

Responsive CSS module with:
- Modern card-based design
- Tab navigation system
- Process flow visualization
- Timeline components
- Mobile-responsive layouts

---

## Integration Steps

### Step 1: Add Import to App.jsx

Add the import statement with other page imports:

```jsx
// Add after other page imports (around line 25)
import AuthorGuidelines from './pages/AuthorGuidelines/AuthorGuidelines';
```

### Step 2: Add Route to App.jsx

Add the route in the public routes section (around line 195):

```jsx
{/* Public author guidelines route */}
<Route path="/author-guidelines" element={<AuthorGuidelines />} />
```

### Step 3: Add Navigation Link to Navbar

In `frontend/src/components/Navbar/Navbar.jsx`, add a link to the author guidelines:

```jsx
<Link to="/author-guidelines" className={styles.navLink}>
  <span className="material-symbols-rounded">menu_book</span>
  Author Guidelines
</Link>
```

### Step 4: Add Link to Footer (Optional)

Add a quick link in the footer component:

```jsx
<Link to="/author-guidelines">Author Guidelines</Link>
```

### Step 5: Add Link to Submit Page

In `frontend/src/components/SubmitPaperForm.jsx`, add a link to guidelines:

```jsx
<p className={styles.guidelinesLink}>
  Before submitting, please review our{' '}
  <Link to="/author-guidelines">Author Guidelines</Link>
</p>
```

### Step 6: Add Link to Author Dashboard

In `frontend/src/pages/AuthorDashboard/AuthorDashboard.jsx`, add a quick access card:

```jsx
<Link to="/author-guidelines" className={styles.quickLink}>
  <span className="material-symbols-rounded">menu_book</span>
  View Author Guidelines
</Link>
```

---

## Additional Considerations

### SEO Optimization
Add meta tags for the Author Guidelines page:
```jsx
import { Helmet } from 'react-helmet';

// In component
<Helmet>
  <title>Author Guidelines - AACS</title>
  <meta name="description" content="Complete guide for preparing and submitting manuscripts to AACS journals." />
</Helmet>
```

### Analytics Tracking
Track page views and tab interactions:
```jsx
// Track tab changes
const handleTabChange = (tabId) => {
  setActiveTab(tabId);
  // Analytics event
  trackEvent('author_guidelines', 'tab_change', tabId);
};
```

### Print Stylesheet (Optional)
Add print-friendly styles for authors who want to print guidelines:
```css
@media print {
  .tabNav { display: none; }
  .tabPane { display: block !important; }
  /* Show all content when printing */
}
```

---

## Testing Checklist

- [ ] Route `/author-guidelines` loads correctly
- [ ] All tabs render proper content
- [ ] Navigation from navbar works
- [ ] "Submit Manuscript" links work
- [ ] Mobile responsive layout
- [ ] FAQ accordions function correctly
- [ ] External links open in new tab
- [ ] No console errors

---

## Future Enhancements

1. **Dynamic Content** - Load guidelines from CMS/database
2. **Journal-Specific Templates** - Different guidelines per journal
3. **Downloadable PDF** - Generate printable guidelines
4. **Language Support** - Multi-language guidelines
5. **Checklist Feature** - Interactive submission checklist with local storage

---

## Quick Start Commands

```bash
# Navigate to frontend
cd frontend

# Start development server
npm run dev

# Access the page at:
# http://localhost:5173/author-guidelines
```
