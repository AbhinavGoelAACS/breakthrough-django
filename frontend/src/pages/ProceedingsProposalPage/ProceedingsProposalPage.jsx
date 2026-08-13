import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import acsApi from '../../api/apiService';
import { describeApiError, fieldErrors } from '../../utils/apiError';
import { useAuth } from '../../hooks/useAuth';
import {
  Field,
  SelectField,
  SignInGate,
  Stepper,
  SuccessPanel,
  TextArea,
  TextField,
} from '../../components/proposal/ProposalFields';
import { proposalStyles as styles } from '../../components/proposal/proposalStyles';

const STEPS = ['The conference', 'You & submit'];

const CONFERENCE_TYPES = [
  { value: 'national', label: 'National' },
  { value: 'international', label: 'International' },
];

const SELECTION_PROCESSES = [
  { value: 'peer_reviewed', label: 'Peer-reviewed' },
  { value: 'non_reviewed', label: 'Not peer-reviewed' },
];

const EMPTY = {
  conference_name: '',
  conference_type: '',
  organising_body: '',
  subject_area: '',
  conference_start: '',
  conference_end: '',
  venue: '',
  expected_papers: '',
  selection_process: '',
  website: '',
  announcement_url: '',
  message: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  contact_designation: '',
};

// Which fields block which step
const STEP_REQUIRED = [
  ['conference_name', 'conference_type', 'organising_body', 'conference_start', 'conference_end', 'selection_process'],
  ['contact_name', 'contact_email'],
];

export const ProceedingsProposalPage = () => {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [result, setResult] = useState(null);

  // Signed in, so the contact details are already known — prefill them.
  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      contact_name: prev.contact_name || `${user.fname || ''} ${user.lname || ''}`.trim(),
      contact_email: prev.contact_email || user.email || '',
      contact_designation: prev.contact_designation || user.affiliation || '',
    }));
  }, [user]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
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
    if (form.conference_start && form.conference_end && form.conference_end < form.conference_start) {
      found.conference_end = 'The end date cannot be before the start date.';
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

    const found = validate([...STEP_REQUIRED[0], ...STEP_REQUIRED[1]]);
    if (!consent) found.consent_given = 'You must agree before submitting.';
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError('Some required details are missing. Check the highlighted fields.');
      return;
    }

    const payload = { ...form, consent_given: true };
    if (payload.expected_papers) payload.expected_papers = Number(payload.expected_papers);
    else delete payload.expected_papers;
    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') delete payload[key];
    });

    try {
      setSubmitting(true);
      const created = await acsApi.proceedings.submitProposal(payload);
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
    ? `CP-${new Date(result.submitted_on).getFullYear()}-${String(result.id).padStart(6, '0')}`
    : null;

  return (
    <div className={styles.pageWrapper}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <Link to="/proceedings" className={styles.heroBack}>
            <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>arrow_back</span>
            Conference proceedings
          </Link>
          <h1 className={styles.heroTitle}>Propose a proceedings volume</h1>
          <p className={styles.heroSubtitle}>
            Tell us about your conference. Proposing costs nothing, and you do not need a finished
            manuscript — only the details of the event and how papers are selected.
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
              title="Sign in to propose a volume"
              message="Proposals are tied to your account so you can track them and we know who to reply to."
              returnTo="/proceedings/propose"
            />
          ) : result ? (
            <SuccessPanel
              reference={reference}
              email={result.contact_email}
              backTo="/proceedings"
              backLabel="Back to proceedings"
            >
              <p className={styles.successBody}>
                An editor will read your proposal and reply with a decision and a series
                recommendation. The stages and how long each takes are set out on the proceedings
                page.
              </p>
            </SuccessPanel>
          ) : (
            <form className={styles.card} onSubmit={handleSubmit} noValidate>
              {step === 0 && (
                <>
                  <h2 className={styles.stepHeading}>About the conference</h2>
                  <p className={styles.stepIntro}>
                    Everything here helps us judge fit and scale. If the conference has not been
                    announced publicly yet, say so in the message on the next step.
                  </p>

                  <div className={styles.fields}>
                    <Field label="Conference name" name="conference_name" error={errors.conference_name}>
                      <TextField name="conference_name" value={form.conference_name} onChange={setField} error={errors.conference_name} placeholder="e.g. International Conference on Computational Intelligence 2027" />
                    </Field>

                    <div className={styles.row}>
                      <Field label="Conference type" name="conference_type" error={errors.conference_type}>
                        <SelectField name="conference_type" value={form.conference_type} onChange={setField} error={errors.conference_type} options={CONFERENCE_TYPES} placeholder="Select…" />
                      </Field>
                      <Field label="Organising body" name="organising_body" error={errors.organising_body}>
                        <TextField name="organising_body" value={form.organising_body} onChange={setField} error={errors.organising_body} placeholder="University, department or society" />
                      </Field>
                    </div>

                    <div className={styles.row}>
                      <Field label="Start date" name="conference_start" error={errors.conference_start}>
                        <TextField name="conference_start" type="date" value={form.conference_start} onChange={setField} error={errors.conference_start} />
                      </Field>
                      <Field label="End date" name="conference_end" error={errors.conference_end}>
                        <TextField name="conference_end" type="date" value={form.conference_end} onChange={setField} error={errors.conference_end} />
                      </Field>
                    </div>

                    <div className={styles.row}>
                      <Field label="Venue" name="venue" optional error={errors.venue}>
                        <TextField name="venue" value={form.venue} onChange={setField} error={errors.venue} placeholder="City, or “Online”" />
                      </Field>
                      <Field label="Subject area" name="subject_area" optional error={errors.subject_area}>
                        <TextField name="subject_area" value={form.subject_area} onChange={setField} error={errors.subject_area} placeholder="e.g. Computer science" />
                      </Field>
                    </div>

                    <div className={styles.row}>
                      <Field
                        label="How are papers selected?"
                        name="selection_process"
                        error={errors.selection_process}
                        help="We can only publish volumes whose papers were peer-reviewed by your programme committee."
                      >
                        <SelectField name="selection_process" value={form.selection_process} onChange={setField} error={errors.selection_process} options={SELECTION_PROCESSES} placeholder="Select…" />
                      </Field>
                      <Field label="Expected number of papers" name="expected_papers" optional error={errors.expected_papers}>
                        <TextField name="expected_papers" type="number" min="1" value={form.expected_papers} onChange={setField} error={errors.expected_papers} placeholder="e.g. 30" />
                      </Field>
                    </div>

                    <Field label="Conference website" name="website" optional error={errors.website}>
                      <TextField name="website" type="url" value={form.website} onChange={setField} error={errors.website} placeholder="https://" />
                    </Field>

                    <Field
                      label="Announcement page"
                      name="announcement_url"
                      optional
                      error={errors.announcement_url}
                      help="A link to the call for papers or the announcement on your institution's site. It speeds up our review considerably."
                    >
                      <TextField name="announcement_url" type="url" value={form.announcement_url} onChange={setField} error={errors.announcement_url} placeholder="https://" />
                    </Field>
                  </div>

                  <div className={styles.actions}>
                    <Link to="/proceedings" className={styles.btnSecondary}>Cancel</Link>
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
                  <h2 className={styles.stepHeading}>Your details</h2>
                  <p className={styles.stepIntro}>
                    We reply to this address. Taken from your account — change anything that is out
                    of date.
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

                    <div className={styles.row}>
                      <Field label="Designation & affiliation" name="contact_designation" optional error={errors.contact_designation}>
                        <TextField name="contact_designation" value={form.contact_designation} onChange={setField} error={errors.contact_designation} placeholder="e.g. Conference Chair, IIT Delhi" />
                      </Field>
                      <Field label="Phone" name="contact_phone" optional error={errors.contact_phone}>
                        <TextField name="contact_phone" type="tel" value={form.contact_phone} onChange={setField} error={errors.contact_phone} />
                      </Field>
                    </div>

                    <Field
                      label="Anything else we should know"
                      name="message"
                      optional
                      error={errors.message}
                      help="Special requirements, a target publication date, or anything unusual about the volume."
                    >
                      <TextArea name="message" value={form.message} onChange={setField} error={errors.message} />
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
                          I confirm these details are accurate and agree that Breakthrough
                          Publishers may contact me about this proposal, as described in the{' '}
                          <Link to="/privacy-policy">privacy policy</Link>.
                        </span>
                      </label>
                      {errors.consent_given && <span className={styles.error}>{errors.consent_given}</span>}
                    </div>
                  </div>

                  {formError && <p className={styles.formError}>{formError}</p>}

                  <div className={styles.actions}>
                    <button type="button" className={styles.btnSecondary} onClick={() => setStep(0)}>
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

export default ProceedingsProposalPage;
