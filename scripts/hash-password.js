const bcrypt = require('bcrypt');

/**
 * Script to generate hashed password for admin user
 * Usage: node scripts/hash-password.js "your-password"
 */

const SALT_ROUNDS = 10;

async function hashPassword(password) {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    console.log('\n=== PASSWORD HASH GENERATOR ===');
    console.log('Original Password:', password);
    console.log('Hashed Password:', hash);
    console.log('\nAdd this to your .env file:');
    console.log(`ADMIN_PASSWORD_HASH=${hash}`);
    console.log('\nRemove the old ADMIN_PASSWORD line from .env');
    console.log('===============================\n');
  } catch (error) {
    console.error('Error hashing password:', error);
  }
}

// Get password from command line argument
const password = process.argv[2];

if (!password) {
  console.log('\nUsage: node scripts/hash-password.js "your-password"');
  console.log('Example: node scripts/hash-password.js "Hellobingo@7991"');
  process.exit(1);
}

hashPassword(password);