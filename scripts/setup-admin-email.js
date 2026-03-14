const fs = require('fs');
const path = require('path');

/**
 * Setup script to configure admin email for 2FA
 */
function setupAdminEmail() {
  console.log('📧 KELALBINGO Admin Email Setup\n');

  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found. Please create it first.');
    return;
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Get current admin email
  const currentEmailMatch = envContent.match(/ADMIN_EMAIL=(.+)/);
  const currentEmail = currentEmailMatch ? currentEmailMatch[1] : 'Not set';
  
  console.log('Current admin email:', currentEmail);
  console.log('\nTo set up 2FA with your email:');
  console.log('\n1. For Gmail (Recommended):');
  console.log('   - Enable 2FA on your Gmail account');
  console.log('   - Generate App-Specific Password');
  console.log('   - Update .env file:');
  console.log('');
  console.log('   EMAIL_SERVICE=gmail');
  console.log('   EMAIL_USER=your-email@gmail.com');
  console.log('   EMAIL_PASSWORD=your-16-char-app-password');
  console.log('   ADMIN_EMAIL=your-email@gmail.com');
  console.log('');
  console.log('2. For Testing (Ethereal - Current):');
  console.log('   - No setup required');
  console.log('   - Check console for preview URLs');
  console.log('   - Perfect for development');
  console.log('');
  console.log('3. For Custom SMTP:');
  console.log('   EMAIL_SERVICE=smtp');
  console.log('   EMAIL_HOST=smtp.yourdomain.com');
  console.log('   EMAIL_PORT=587');
  console.log('   EMAIL_SECURE=false');
  console.log('   EMAIL_USER=admin@yourdomain.com');
  console.log('   EMAIL_PASSWORD=your-smtp-password');
  console.log('   ADMIN_EMAIL=admin@yourdomain.com');
  console.log('');
  console.log('Current configuration:');
  
  const emailService = envContent.match(/EMAIL_SERVICE=(.+)/);
  const emailUser = envContent.match(/EMAIL_USER=(.+)/);
  const emailEnabled = envContent.match(/EMAIL_ENABLED=(.+)/);
  const otpEnabled = envContent.match(/OTP_ENABLED=(.+)/);
  
  console.log('- Email Service:', emailService ? emailService[1] : 'Not set');
  console.log('- Email User:', emailUser ? emailUser[1] : 'Not set');
  console.log('- Email Enabled:', emailEnabled ? emailEnabled[1] : 'Not set');
  console.log('- OTP Enabled:', otpEnabled ? otpEnabled[1] : 'Not set');
  
  console.log('\n🧪 To test the current setup:');
  console.log('   node scripts/test-2fa.js');
  console.log('\n🚀 To start the server:');
  console.log('   npm start');
  console.log('\n📖 For detailed setup instructions:');
  console.log('   See TWO_FACTOR_AUTH_SETUP.md');
}

setupAdminEmail();