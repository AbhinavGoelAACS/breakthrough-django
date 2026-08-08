/**
 * Static copy for the books page.
 *
 * The catalogue and series list are fetched from `/api/v1/books/` and
 * `/api/v1/book-series/`. Only the editorial copy below is static, because
 * it changes rarely and is not worth a table.
 *
 * The turnaround times in PROPOSAL_STEPS are commitments — confirm them with
 * editorial before this page goes live.
 */

// Must match Book.KIND_CHOICES in backend/api/models.py
export const BOOK_KINDS = [
  { id: 'all', label: 'All' },
  { id: 'monograph', label: 'Monographs' },
  { id: 'edited', label: 'Edited volumes' },
  { id: 'textbook', label: 'Textbooks' },
  { id: 'proceedings', label: 'Proceedings' },
];

export const PROPOSAL_STEPS = [
  {
    step: '01',
    title: 'Send a proposal',
    body: 'A synopsis, a chapter outline, your CV, and an honest read on who buys this book. Two sample chapters help but are not required at this stage.',
    meta: 'Author · reply in 3 weeks',
  },
  {
    step: '02',
    title: 'Peer review',
    body: 'Two external reviewers assess the proposal and samples. You see the reports and get a chance to respond before the decision is made.',
    meta: 'Series editor · 6–8 weeks',
  },
  {
    step: '03',
    title: 'Contract and manuscript',
    body: 'We agree an extent, a delivery date and royalty terms. You write; your editor checks in at the halfway mark rather than waiting for the full draft.',
    meta: 'Author and editor · as agreed',
  },
  {
    step: '04',
    title: 'Production and release',
    body: 'Copy-editing, typesetting, indexing, cover design and proofs, then simultaneous print and e-book release with an ISBN and DOI.',
    meta: 'Production · 4–5 months',
  },
];
