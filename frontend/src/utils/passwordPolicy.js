const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p) => /\d/.test(p) },
  { key: 'special', label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(p) },
];

export const validatePasswordPolicy = (password) => {
  return PASSWORD_RULES.every((rule) => rule.test(password));
};

export const getPasswordPolicyErrors = (password) => {
  return PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.label);
};

export { PASSWORD_RULES };
