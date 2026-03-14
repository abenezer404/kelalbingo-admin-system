/**
 * Clear OTP Rate Limiting - Emergency Script
 * Run this to clear stuck OTP requests
 */

const { db } = require('./src/config/database');

console.log('🔧 Clearing OTP rate limiting...');

// Clear all OTP records to reset rate limiting
db.run('DELETE FROM admin_otp', [], function(err) {
  if (err) {
    console.error('❌ Error clearing OTP records:', err.message);
  } else {
    console.log(`✅ Cleared ${this.changes} OTP records`);
    console.log('🎯 Rate limiting reset - you can try OTP login again');
  }
  
  // Close database connection
  db.close();
});