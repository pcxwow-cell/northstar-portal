/**
 * Password validation and strength assessment.
 * Applied to new passwords only (change/reset), not on login.
 */

/**
 * Validate password meets minimum requirements.
 * @param {string} password
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePassword(password) {
  const errors = [];
  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least 1 uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least 1 lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least 1 number");
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Calculate password strength for UI display.
 * @param {string} password
 * @returns {"weak" | "medium" | "strong"}
 */
function passwordStrength(password) {
  if (!password || password.length < 8) return "weak";

  let criteria = 0;
  if (/[A-Z]/.test(password)) criteria++;
  if (/[a-z]/.test(password)) criteria++;
  if (/[0-9]/.test(password)) criteria++;
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (criteria >= 3 && hasSpecial) return "strong";
  if (criteria >= 2) return "medium";
  return "weak";
}

module.exports = { validatePassword, passwordStrength };
