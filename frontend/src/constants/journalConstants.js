/**
 * Journal Constants
 * Configuration and constants for journal-related operations
 */

export const JOURNAL_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DRAFT: 'draft',
  ARCHIVED: 'archived',
};

export const JOURNAL_FIELDS = {
  // Database field mappings
  ID: 'id',
  NAME: 'name',
  SHORT_FORM: 'short_form',
  ISSN_PRINT: 'issn_prt',
  ISSN_ONLINE: 'issn_ol',
  DESCRIPTION: 'description',
  CHIEF_EDITOR: 'chief_editor',
  EDITOR_EMAIL: 'editor_email',
  EDITOR_NAME: 'editor_name',
  SUBJECT_AREA: 'subject_area',
  FREQUENCY: 'frequency',
  LANGUAGE: 'language',
  URL: 'url',
  COUNTRY: 'country',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
};

export const JOURNAL_FREQUENCY = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  SEMI_ANNUAL: 'semi-annual',
  ANNUAL: 'annual',
};

export const JOURNAL_LANGUAGES = {
  ENGLISH: 'English',
  SPANISH: 'Spanish',
  FRENCH: 'French',
  GERMAN: 'German',
  CHINESE: 'Chinese',
  JAPANESE: 'Japanese',
  PORTUGUESE: 'Portuguese',
};

export const JOURNAL_SUBJECT_AREAS = [
  'Mathematical Sciences',
  'Computer Science',
  'Applied Sciences',
  'Engineering',
  'Medicine',
  'Biology',
  'Chemistry',
  'Physics',
  'Environmental Science',
  'Business & Economics',
  'Social Sciences',
  'Humanities',
  'Arts',
  'Other',
];

export const JOURNAL_PAGINATION = {
  DEFAULT_LIMIT: 10,
  DEFAULT_SKIP: 0,
  MAX_LIMIT: 100,
};

export const JOURNAL_SORT_OPTIONS = {
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  RECENT: 'recent',
  POPULAR: 'popular',
};

export const JOURNAL_ERROR_MESSAGES = {
  FETCH_FAILED: 'Failed to fetch journals',
  CREATE_FAILED: 'Failed to create journal',
  UPDATE_FAILED: 'Failed to update journal',
  DELETE_FAILED: 'Failed to delete journal',
  NOT_FOUND: 'Journal not found',
  INVALID_DATA: 'Invalid journal data',
  DUPLICATE_ISSN: 'ISSN already exists',
};

export const JOURNAL_SUCCESS_MESSAGES = {
  CREATED: 'Journal created successfully',
  UPDATED: 'Journal updated successfully',
  DELETED: 'Journal deleted successfully',
  FETCHED: 'Journal data loaded successfully',
};
