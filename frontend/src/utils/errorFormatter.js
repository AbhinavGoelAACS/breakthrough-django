import { ERROR_MESSAGES, HTTP_STATUS } from '../constants/authConstants';

/**
 * Format API errors from backend responses
 */
export const formatApiError = (error) => {
  let generalError = null;
  let fieldErrors = {};

  // Axios error handling
  if (error.response) {
    const { status, data } = error.response;

    // Handle different status codes
    switch (status) {
      case HTTP_STATUS.UNPROCESSABLE_ENTITY: // 422 - Validation errors
        if (data.detail && Array.isArray(data.detail)) {
          // Handle FastAPI validation errors
          data.detail.forEach((err) => {
            const fieldName = err.loc ? err.loc[err.loc.length - 1] : 'general';
            fieldErrors[fieldName] = err.msg || 'Invalid value';
          });
        } else if (data.detail && typeof data.detail === 'string') {
          generalError = data.detail;
        }
        break;

      case HTTP_STATUS.UNAUTHORIZED: // 401
        generalError = data.detail || ERROR_MESSAGES.INVALID_CREDENTIALS;
        break;

      case HTTP_STATUS.CONFLICT: // 409
        generalError = data.detail || 'This email is already registered';
        break;

      case HTTP_STATUS.BAD_REQUEST: // 400
        if (data.detail && typeof data.detail === 'string') {
          generalError = data.detail;
        } else if (data.detail && typeof data.detail === 'object') {
          fieldErrors = data.detail;
        }
        break;

      case HTTP_STATUS.SERVER_ERROR: // 500
        generalError = 'Server error. Please try again later.';
        break;

      default:
        generalError = data.detail || 'An error occurred. Please try again.';
    }
  } else if (error.request) {
    // Request made but no response
    generalError = ERROR_MESSAGES.NETWORK_ERROR;
  } else {
    // Error in request setup
    generalError = error.message || 'An unexpected error occurred';
  }

  return {
    general: generalError,
    fields: fieldErrors,
    hasFieldErrors: Object.keys(fieldErrors).length > 0,
  };
};

/**
 * Format validation errors
 */
export const formatValidationErrors = (errors) => {
  return {
    general: null,
    fields: errors,
    hasFieldErrors: Object.keys(errors).length > 0,
  };
};

/**
 * Get single field error or null
 */
export const getFieldError = (fieldErrors, fieldName) => {
  return fieldErrors && fieldErrors[fieldName] ? fieldErrors[fieldName] : null;
};

/**
 * Check if there are any errors
 */
export const hasErrors = (errorObject) => {
  if (!errorObject) return false;
  return Boolean(errorObject.general || (errorObject.fields && Object.keys(errorObject.fields).length > 0));
};
