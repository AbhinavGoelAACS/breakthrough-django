// Authentication configuration and constants

export const AUTH_ENDPOINTS = {
  LOGIN: '/api/v1/auth/login',
  SIGNUP: '/api/v1/auth/signup',
  ME: '/api/v1/auth/me',
  REFRESH: '/api/v1/auth/refresh',
};

export const REDIRECT_URLS = {
  LOGIN_PAGE: '/login',
  SIGNUP_PAGE: '/signup',
  DASHBOARD: '/home',
  AUTHOR_PORTAL: '/author',
  EDITOR_PORTAL: '/editor',
  LANDING_PAGE: '/',
  UNAUTHORIZED: '/unauthorized',
};

export const USER_ROLES = {
  AUTHOR: 'Author',
  EDITOR: 'Editor',
  REVIEWER: 'Reviewer',
  USER: 'User',
};

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_EXISTS: 'Email already registered',
  WEAK_PASSWORD: 'Password does not meet requirements',
  NETWORK_ERROR: 'Network connection error',
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Invalid email address',
  PASSWORD_MISMATCH: 'Passwords do not match',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  SESSION_EXPIRED: 'Your session has expired. Please login again',
  UNAUTHORIZED: 'You do not have permission to access this page',
};

export const VALIDATION_RULES = {
  EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  PASSWORD: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChar: true,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    message:
      'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  },
  NAME: {
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z\s'-]+$/,
    message: 'Name can only contain letters, spaces, hyphens, and apostrophes',
  },
  AFFILIATION: {
    maxLength: 255,
  },
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  TOKEN_EXPIRY: 'tokenExpiry',
};

export const API_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  SERVER_ERROR: 500,
};
