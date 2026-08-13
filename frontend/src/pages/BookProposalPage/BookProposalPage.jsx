import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import acsApi from '../../api/apiService';
import { describeApiError, fieldErrors } from '../../utils/apiError';
import { useAuth } from '../../hooks/useAuth';
import {
  Field,
  FileField,
  SelectField,
  SignInGate,
  Stepper,
  SuccessPanel,
  TextArea,
  TextField,
} from '../../components/proposal/ProposalFields';
import { proposalStyles as styles } from '../../components/proposal/proposalStyles';

const STEPS = ['The book', 'The content', 'You', 'Attachments'];

// Must match Book.KIND_CHOICES in backend/api/models.py
const KINDS = [
  { value: 'monograph', label: 'Monograph' },
  { value: 'edited', label: 'Edited volume' },
  { value: 'textbook', label: 'Textbook' },
  { value: 'proceedings', label: 'Proceedings' },
];

// Must match BookProposal.COMPLETION_CHOICES
const COMPLETION = [
  { value: 'idea', label: 'Idea stage' },
  { value: 'partial', label: 'Partially drafted' },
  { value: 'substantially', label: 'Substantially complete' },
  { value: 'complete', label: 'Complete manuscript' },
];

const EMPTY = {
  title: '',
  kind: 'monograph',
  series: '',
  synopsis: '',
  audience: '',
  outline: '',
  comparable_works: '',
  estimated_words: '',
  estimated_pages: '',
  illustration_count: '',
  previously_published: '',
  contact_name: '',
  contact_email: '',
  affiliation: '',
  author_bio: '',
  suggested_reviewers: '',
  completion_status: '',
  expected_delivery: '',
};

const STEP_REQUIRED = [
  ['title', 'kind', 'synopsis', 'audience'],
  ['outline'],
  ['contact_name', 'contact_email'],
  [],
];

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.odt', '.rtf'];

export const BookProposalPage = () => {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState({ cv_file: null, sample_chapter_file: null, outline_file: null });
  const [series, setSeries] = useState([]);
  const [errors, setErrors] = useState({});
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const data = await acsApi.books.listSeries();
        setSeries(Array.isArray(data) ? data : data?.series || []);
      } catch (err) {
        console.error('Error fetching book series:', err);
        setSeries([]);
      }
    };
    fetchSeries();
  }, []);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      contact_name: prev.contact_name || `${user.fname || ''} ${user.lname || ''}`.trim(),
      contact_email: prev.contact_email || user.email || '',
      affiliation: prev.affiliation || user.affiliation || '',
    }));
  }, [user]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  // Checked before upload so a large file fails instantly rather than after a wait
  const setFile = (name, file) => {
    if (file) {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) {
        setErrors((prev) => ({ ...prev, [name]: `Use one of: ${ALLOWED_EXT.join(', ')}` }));
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setErrors((prev) => ({ ...prev, [name]: 'That file is larger than 10 MB.' }));
        return;
      }
    }
    setFiles((prev) => ({ ...prev, [name]: file }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = (fields) => {
    const found = {};
    fields.forEach((name) => {
      if (!String(form[name] || '').trim()) found[name] = 'This field is required.';
    });
    if (fields.includes('contact_email') && form.contact_email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) {
        found.contact_email = 'Enter a valid email address.';
      }
    }
    return found;
  };

  const handleNext = () => {
    const found = validate(STEP_REQUIRED[step]);
    setErrors(found);
    if (Object.keys(found).length === 0) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    const found = validate(STEP_REQUIRED.flat());
    if (!consent) found.consent_given = 'You must agree before submitting.';
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError('Some required details are missing. Step back to check the highlighted fields.');
      return;
    }

    // multipart, because the optional CV and sample chapter ride along
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== '' && value !== null) payload.append(key, value);
    });
    payload.append('consent_given', 'true');
    Object.entries(files).forEach(([key, file]) => {
      if (file) payload.append(key, file);
    });

    try {
      setSubmitting(true);
      const created = await acsApi.books.submitProposal(payload);
      setResult(created);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields) {
        setErrors(fields);
        setFormError('The server rejected some fields. Your answers are still here — fix them and resubmit.');
      } else {
        // Nothing is lost on failure: the form keeps every value, and the
        // mailto is a genuine fallback for a 20-minute form.
        setFormError(
          `${describeApiError(err, 'We could not submit your proposal.')} `
          + 'Your answers are still here — try again, or email breakthroughpublishersindia@gmail.com.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reference = result
    ? `BP-${new Date(result.submitted_on).getFullYear()}-${String(result.id).padStart(6, '0')}`
    : null;

  const seriesOptions = series.map((s) => ({ value: String(s.id), label: `${s.abbreviation} — ${s.name}` }));

  return (
    <div className={styles.pageWrapper}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <Link to="/books" className={styles.heroBack}>
            <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>arrow_back</span>
            Books
          </Link>
          <h1 className={styles.heroTitle}>Propose a book</h1>
          <p className={styles.heroSubtitle}>
            You do not need a finished manuscript. A synopsis, a chapter outline and an honest read
            on who buys the book is enough for a commissioning editor to work with.
          </p>
          {!result && isAuthenticated && <Stepper steps={STEPS} current={step} />}
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.formInner}>
          {authLoading ? (
            <p>Loading…</p>
          ) : !isAuthenticated ? (
            <SignInGate
              title="Sign in to propose a book"
              message="Proposals are tied to your account so you can track them and we know who to reply to."
              returnTo="/books/propose"
            />
          ) : result ? (
            <SuccessPanel
              reference={reference}
              email={result.contact_email}
              backTo="/books"
              backLabel="Back to books"
            >
              <p className={styles.successBody}>
                A commissioning editor will read your proposal. The stages it goes through, and how
                long each takes, are set out on the books page.
              </p>
            </SuccessPanel>
          ) : (
            <form className={styles.card} onSubmit={handleSubmit} noValidate>
              {step === 0 && (
                <>
                  <h2 className={styles.stepHeading}>The book</h2>
                  <p className={styles.stepIntro}>
                    Start with what it is and who it is for. The synopsis is the single most
                    important thing on this form — write it like back-cover copy.
                  </p>
                  <div className={styles.fields}>
                    <Field label="Working title" name="title" error={errors.title}>
                      <TextField name="title" value={form.title} onChange={setField} error={errors.title} />
                    </Field>

                    <div className={styles.row}>
                      <Field label="Type of book" name="kind" error={errors.kind}>
                        <SelectField name="kind" value={form.kind} onChange={setField} error={errors.kind} options={KINDS} />
                      </Field>
                      <Field
                        label="Series"
                        name="series"
                        optional
                        error={errors.series}
                        help="A proposal that fits an existing series is reviewed by that series editor directly."
                      >
                        <SelectField name="series" value={form.series} onChange={setField} error={errors.series} options={seriesOptions} placeholder="Not sure / none" />
                      </Field>
                    </div>

                    <Field
                      label="Synopsis"
                      name="synopsis"
                      error={errors.synopsis}
                      help="Around 200 words — what the book argues and why it matters."
                    >
                      <TextArea name="synopsis" rows={7} value={form.synopsis} onChange={setField} error={errors.synopsis} />
                    </Field>

                    <Field
                      label="Audience"
                      name="audience"
                      error={errors.audience}
                      help="Specialists, postgraduates, undergraduates, or general readers? If it is a course text, say which courses."
                    >
                      <TextArea name="audience" rows={4} value={form.audience} onChange={setField} error={errors.audience} />
                    </Field>
                  </div>

                  <div className={styles.actions}>
                    <Link to="/books" className={styles.btnSecondary}>Cancel</Link>
                    <span className={styles.actionsSpacer} />
                    <button type="button" className={styles.btnPrimary} onClick={handleNext}>
                      Continue
                      <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>arrow_forward</span>
                    </button>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <h2 className={styles.stepHeading}>The content</h2>
                  <p className={styles.stepIntro}>
                    The chapter outline and the comparable titles are what an editor weighs most
                    heavily. Be specific rather than generous.
                  </p>
                  <div className={styles.fields}>
                    <Field
                      label="Chapter outline"
                      name="outline"
                      error={errors.outline}
                      help="A paragraph per chapter, showing what each contributes and how they connect."
                    >
                      <TextArea name="outline" rows={9} value={form.outline} onChange={setField} error={errors.outline} />
                    </Field>

                    <Field
                      label="Comparable and competing books"
                      name="comparable_works"
                      optional
                      error={errors.comparable_works}
                      help="Four to six titles from the last five years, and how yours differs from each."
                    >
                      <TextArea name="comparable_works" rows={6} value={form.comparable_works} onChange={setField} error={errors.comparable_works} />
                    </Field>

                    <div className={styles.row}>
                      <Field label="Estimated word count" name="estimated_words" optional error={errors.estimated_words}>
                        <TextField name="estimated_words" type="number" min="0" value={form.estimated_words} onChange={setField} error={errors.estimated_words} placeholder="Including notes" />
                      </Field>
                      <Field label="Estimated pages" name="estimated_pages" optional error={errors.estimated_pages}>
                        <TextField name="estimated_pages" type="number" min="0" value={form.estimated_pages} onChange={setField} error={errors.estimated_pages} />
                      </Field>
                    </div>

                    <div className={styles.row}>
                      <Field label="Number of illustrations" name="illustration_count" optional error={errors.illustration_count}>
                        <TextField name="illustration_count" type="number" min="0" value={form.illustration_count} onChange={setField} error={errors.illustration_count} placeholder="Figures, tables, plates" />
                      </Field>
                      <Field
                        label="Previously published material"
                        name="previously_published"
                        optional
                        error={errors.previously_published}
                        help="Any chapter that has appeared elsewhere, so we can clear permissions."
                      >
                        <TextField name="previously_published" value={form.previously_published} onChange={setField} error={errors.previously_published} />
                      </Field>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <button type="button" className={styles.btnSecondary} onClick={() => setStep(0)}>
                      <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>arrow_back</span>
                      Back
                    </button>
                    <span className={styles.actionsSpacer} />
                    <button type="button" className={styles.btnPrimary} onClick={handleNext}>
                      Continue
                      <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>arrow_forward</span>
                    </button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className={styles.stepHeading}>You</h2>
                  <p className={styles.stepIntro}>
                    Why you are the right author for this book, and who could assess it.
                  </p>
                  <div className={styles.fields}>
                    <div className={styles.row}>
                      <Field label="Your name" name="contact_name" error={errors.contact_name}>
                        <TextField name="contact_name" value={form.contact_name} onChange={setField} error={errors.contact_name} />
                      </Field>
                      <Field label="Email" name="contact_email" error={errors.contact_email}>
                        <TextField name="contact_email" type="email" value={form.contact_email} onChange={setField} error={errors.contact_email} />
                      </Field>
                    </div>

                    <Field label="Affiliation" name="affiliation" optional error={errors.affiliation}>
                      <TextField name="affiliation" value={form.affiliation} onChange={setField} error={errors.affiliation} />
                    </Field>

                    <Field
                      label="Short biography"
                      name="author_bio"
                      optional
                      error={errors.author_bio}
                      help="Your relevant work and previous publications. You can attach a full CV on the next step."
                    >
                      <TextArea name="author_bio" rows={5} value={form.author_bio} onChange={setField} error={errors.author_bio} />
                    </Field>

                    <Field
                      label="Suggested reviewers"
                      name="suggested_reviewers"
                      optional
                      error={errors.suggested_reviewers}
                      help="Names, affiliations and emails of scholars qualified to assess this. Suggesting reviewers can save weeks."
                    >
                      <TextArea name="suggested_reviewers" rows={5} value={form.suggested_reviewers} onChange={setField} error={errors.suggested_reviewers} />
                    </Field>
                  </div>

                  <div className={styles.actions}>
                    <button type="button" className={styles.btnSecondary} onClick={() => setStep(1)}>
                      <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>arrow_back</span>
                      Back
                    </button>
                    <span className={styles.actionsSpacer} />
                    <button type="button" className={styles.btnPrimary} onClick={handleNext}>
                      Continue
                      <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>arrow_forward</span>
                    </button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <h2 className={styles.stepHeading}>Timing and attachments</h2>
                  <p className={styles.stepIntro}>
                    Every attachment here is optional — a proposal without them is still a complete
                    proposal. Send them if you have them ready.
                  </p>
                  <div className={styles.fields}>
                    <div className={styles.row}>
                      <Field label="How far along is it?" name="completion_status" optional error={errors.completion_status}>
                        <SelectField name="completion_status" value={form.completion_status} onChange={setField} error={errors.completion_status} options={COMPLETION} placeholder="Select…" />
                      </Field>
                      <Field label="Expected delivery date" name="expected_delivery" optional error={errors.expected_delivery}>
                        <TextField name="expected_delivery" type="date" value={form.expected_delivery} onChange={setField} error={errors.expected_delivery} />
                      </Field>
                    </div>

                    <Field label="Curriculum vitae" name="cv_file" optional error={errors.cv_file} help="PDF or Word, up to 10 MB.">
                      <FileField name="cv_file" file={files.cv_file} onSelect={setFile} error={errors.cv_file} />
                    </Field>

                    <Field label="Sample chapter" name="sample_chapter_file" optional error={errors.sample_chapter_file} help="One or two chapters, if you have a draft.">
                      <FileField name="sample_chapter_file" file={files.sample_chapter_file} onSelect={setFile} error={errors.sample_chapter_file} />
                    </Field>

                    <Field label="Full outline or proposal document" name="outline_file" optional error={errors.outline_file} help="If you have already written a formal proposal, attach it here.">
                      <FileField name="outline_file" file={files.outline_file} onSelect={setFile} error={errors.outline_file} />
                    </Field>

                    <div className={styles.field}>
                      <label className={styles.consent}>
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => {
                            setConsent(e.target.checked);
                            setErrors((prev) => ({ ...prev, consent_given: undefined }));
                          }}
                        />
                        <span>
                          I confirm this proposal is my own work and agree that Breakthrough
                          Publishers may contact me about it, as described in the{' '}
                          <Link to="/privacy-policy">privacy policy</Link>.
                        </span>
                      </label>
                      {errors.consent_given && <span className={styles.error}>{errors.consent_given}</span>}
                    </div>
                  </div>

                  {formError && <p className={styles.formError}>{formError}</p>}

                  <div className={styles.actions}>
                    <button type="button" className={styles.btnSecondary} onClick={() => setStep(2)}>
                      <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>arrow_back</span>
                      Back
                    </button>
                    <span className={styles.actionsSpacer} />
                    <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                      {submitting ? 'Submitting…' : 'Submit proposal'}
                      {!submitting && <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>send</span>}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </section>
    </div>
  );
};

export default BookProposalPage;
