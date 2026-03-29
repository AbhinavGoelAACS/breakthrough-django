import { VALIDATION_RULES, ERROR_MESSAGES } from '../constants/authConstants';

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
  }

  if (!VALIDATION_RULES.EMAIL.pattern.test(email)) {
    return { isValid: false, error: VALIDATION_RULES.EMAIL.message };
  }

  return { isValid: true, error: null };
};

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  if (!password || password.trim() === '') {
    return { isValid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
  }

  if (password.length < VALIDATION_RULES.PASSWORD.minLength) {
    return {
      isValid: false,
      error: `Password must be at least ${VALIDATION_RULES.PASSWORD.minLength} characters`,
    };
  }

  if (!VALIDATION_RULES.PASSWORD.pattern.test(password)) {
    return { isValid: false, error: VALIDATION_RULES.PASSWORD.message };
  }

  return { isValid: true, error: null };
};

/**
 * Validate name format
 */
export const validateName = (name) => {
  if (!name || name.trim() === '') {
    return { isValid: false, error: ERROR_MESSAGES.REQUIRED_FIELD };
  }

  if (name.length < VALIDATION_RULES.NAME.minLength) {
    return {
      isValid: false,
      error: `Name must be at least ${VALIDATION_RULES.NAME.minLength} characters`,
    };
  }

  if (name.length > VALIDATION_RULES.NAME.maxLength) {
    return {
      isValid: false,
      error: `Name must not exceed ${VALIDATION_RULES.NAME.maxLength} characters`,
    };
  }

  if (!VALIDATION_RULES.NAME.pattern.test(name)) {
    return { isValid: false, error: VALIDATION_RULES.NAME.message };
  }

  return { isValid: true, error: null };
};

/**
 * Validate password confirmation
 */
export const validatePasswordMatch = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    return { isValid: false, error: ERROR_MESSAGES.PASSWORD_MISMATCH };
  }

  return { isValid: true, error: null };
};

/**
 * Validate affiliation (optional field)
 */
export const validateAffiliation = (affiliation) => {
  if (affiliation && affiliation.length > VALIDATION_RULES.AFFILIATION.maxLength) {
    return {
      isValid: false,
      error: `Affiliation must not exceed ${VALIDATION_RULES.AFFILIATION.maxLength} characters`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate login form data
 */
export const validateLoginForm = (formData) => {
  const errors = {};

  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
  }

  const passwordValidation = validatePassword(formData.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate signup form data
 */
export const validateSignupForm = (formData) => {
  const errors = {};

  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
  }

  const passwordValidation = validatePassword(formData.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error;
  }

  const confirmValidation = validatePasswordMatch(formData.password, formData.confirm_password);
  if (!confirmValidation.isValid) {
    errors.confirm_password = confirmValidation.error;
  }

  const fnameValidation = validateName(formData.fname);
  if (!fnameValidation.isValid) {
    errors.fname = fnameValidation.error;
  }

  const lnameValidation = validateName(formData.lname);
  if (!lnameValidation.isValid) {
    errors.lname = lnameValidation.error;
  }

  if (formData.mname) {
    const mnameValidation = validateName(formData.mname);
    if (!mnameValidation.isValid) {
      errors.mname = mnameValidation.error;
    }
  }

  if (formData.affiliation) {
    const affiliationValidation = validateAffiliation(formData.affiliation);
    if (!affiliationValidation.isValid) {
      errors.affiliation = affiliationValidation.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
