/**
 * Validate username
 */
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: 'Username is required' };
  }
  if (username.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters' };
  }
  if (username.length > 50) {
    return { valid: false, message: 'Username must be less than 50 characters' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
  }
  return { valid: true };
};

/**
 * Validate password
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 4) {
    return { valid: false, message: 'Password must be at least 4 characters' };
  }
  if (password.length > 100) {
    return { valid: false, message: 'Password must be less than 100 characters' };
  }
  return { valid: true };
};

module.exports = {
  validateUsername,
  validatePassword
};
