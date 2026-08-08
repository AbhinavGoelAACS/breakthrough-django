/**
 * Static copy for the conference proceedings page.
 *
 * Only the downloads list is dynamic (fetched from
 * `/api/v1/proceedings/downloads/`) — the process, specification and FAQ
 * below are editorial copy that changes rarely.
 *
 * The turnaround weeks and page bounds are proposed defaults. Confirm them
 * with editorial before this page goes live, since they read as commitments.
 */

export const PROCESS_STEPS = [
  {
    step: '01',
    title: 'Proposal & scope review',
    body: 'Send the conference name, dates, organising body, subject area and the expected number of accepted papers. Editorial replies within ten working days with a decision and a series recommendation.',
    meta: 'Editor submits · Editorial reviews · 2 weeks',
  },
  {
    step: '02',
    title: 'Publishing agreement',
    body: 'One agreement per volume, granting exclusive publication rights. We cannot accept modified agreements — if a clause is a problem, raise it before signing rather than editing the document.',
    meta: 'Editor signs · 1 week',
  },
  {
    step: '03',
    title: 'Call for papers & peer review',
    body: 'Link the author guidelines on your conference site so contributors format correctly from the start. Your programme committee runs peer review and decides what goes into the volume.',
    meta: 'Programme committee · runs to your conference timeline',
  },
  {
    step: '04',
    title: 'Compilation & handover',
    body: 'Assemble the final source files, the front matter, the permissions checklist and one signed licence per paper. Incomplete handovers are the single largest cause of delay at this stage.',
    meta: 'Editor compiles · Editorial checks completeness · 2 weeks',
  },
  {
    step: '05',
    title: 'Production & proofs',
    body: 'Copy-editing, typesetting, similarity check and an accessibility pass. Corresponding authors receive proofs and have five working days to return corrections.',
    meta: 'Production · Authors proof · 4–6 weeks',
  },
  {
    step: '06',
    title: 'Publication, DOIs & indexing',
    body: 'The volume goes live with an ISBN, a DOI for the volume and one per chapter, and is submitted for indexing. Editors and chapter authors receive a complimentary e-book of the volume.',
    meta: 'Breakthrough · 1 week',
  },
];

export const EDITOR_POINTS = [
  'Send us a proposal with scope, dates and expected paper count',
  'Sign the publishing agreement — one per volume, unmodified',
  'Collect a signed licence to publish from every contributor',
  'Compile the front matter from our template and hand over final files',
];

export const AUTHOR_POINTS = [
  'Write in our Word or LaTeX template — do not change the style files',
  'Add alternative text to every figure, illustration and table',
  'Clear permissions for any third-party figures you reuse',
  'Sign the licence to publish and return it to your volume editor',
];

export const SPECS = [
  { label: 'Minimum extent', value: '120 pp', note: 'Below this we would merge volumes' },
  { label: 'Maximum extent', value: '500 pp', note: 'Longer runs split into parts' },
  { label: 'Source files', value: 'Mixed', note: 'Word and LaTeX may coexist' },
  { label: 'Paper length', value: 'Yours', note: 'Set by the conference, not by us' },
  { label: 'Open-access papers', value: '< 40%', note: 'Above this, publish the whole volume OA' },
  { label: 'Publication fee', value: 'None', note: 'Standard volumes only' },
];

export const FAQS = [
  {
    q: 'Can I submit my paper straight to Breakthrough?',
    a: "No. We don't select papers for a proceedings volume — your conference's programme committee does. Submit through your conference, and your volume editor passes the accepted papers to us.",
  },
  {
    q: 'Can I publish an extended version of my paper as a journal article?',
    a: 'Yes, provided the extended version adds at least 30% new material, cites the original proceedings paper, and states explicitly what has been added.',
  },
  {
    q: 'Can one volume mix Word and LaTeX papers?',
    a: 'Yes. Authors use whichever template suits them, as long as nobody edits the style files.',
  },
  {
    q: 'Can I put my paper in my institutional repository?',
    a: 'It depends on the licence you signed. Check your licence to publish first — it states which version you may deposit and when.',
  },
  {
    q: 'Do you check for plagiarism?',
    a: 'Every volume goes through a similarity check during production. Volume editors can request access earlier, at the compilation stage, through their editorial contact.',
  },
  {
    q: "What if I can't write alt text for my figures?",
    a: "Write it if you can — you know what the figure means. If you can't, production will generate it with an AI-assisted tool and your editor will review it before publication.",
  },
];
