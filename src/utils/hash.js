const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Hash a password
 */
const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare password with hash
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Generate random registration code
 */
const generateRegistrationCode = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

module.exports = {
  hashPassword,
  comparePassword,
  generateRegistrationCode
};
