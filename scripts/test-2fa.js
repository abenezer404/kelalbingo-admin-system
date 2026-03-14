const config = require('../src/config/config');
const emailService = require('../src/services/emailService');
const otpService = require('../src/services/otpService');

/**
 * Test script for 2FA functionality
 */
async function test2FA() {
  console.log('🔐 Testing 2FA System\n');

  // Test 1: Configuration
  console.log('📋 Configuration Check:');
  console.log('- OTP Enabled:', config.otp.enabled);
  console.log('- Email Enabled:', config.email.enabled);
  console.log('- Email Service:', config.email.service);
  console.log('- Admin Email:', config.adminEmail || 'Not configured');
  console.log('- OTP Expiry:', config.otp.expiryMinutes, 'minutes');
  console.log('- Max Attempts:', config.otp.maxAttempts);
  console.log('');

  if (!config.otp.enabled) {
    console.log('❌ OTP is disabled. Enable it in .env file:');
    console.log('OTP_ENABLED=true');
    return;
  }

  if (!config.email.enabled) {
    console.log('❌ Email is disabled. Enable it in .env file:');
    console.log('EMAIL_ENABLED=true');
    return;
  }

  if (!config.adminEmail) {
    console.log('❌ Admin email not configured. Add to .env file:');
    console.log('ADMIN_EMAIL=your-email@domain.com');
    return;
  }

  // Test 2: OTP Generation
  console.log('🔢 Testing OTP Generation:');
  try {
    const otp = emailService.generateOTP();
    console.log('✅ OTP Generated:', otp);
    console.log('- Length:', otp.length);
    console.log('- Type:', typeof otp);
    console.log('- Is Numeric:', /^\d+$/.test(otp));
  } catch (error) {
    console.log('❌ OTP Generation Failed:', error.message);
  }
  console.log('');

  // Test 3: Email Service
  console.log('📧 Testing Email Service:');
  try {
    const testOTP = '123456';
    const result = await emailService.sendOTP(config.adminEmail, testOTP, config.adminUsername);
    
    if (result.success) {
      console.log('✅ Email sent successfully');
      console.log('- Message ID:', result.messageId);
      if (result.previewUrl) {
        console.log('- Preview URL:', result.previewUrl);
        console.log('📧 Open the preview URL to see the email');
      }
    }
  } catch (error) {
    console.log('❌ Email sending failed:', error.message);
    
    if (config.email.service === 'gmail') {
      console.log('\n💡 Gmail Setup Tips:');
      console.log('1. Enable 2FA on your Gmail account');
      console.log('2. Generate App-Specific Password');
      console.log('3. Use app password, not your regular password');
    }
  }
  console.log('');

  // Test 4: Database Connection
  console.log('🗄️ Testing Database:');
  try {
    const stats = await otpService.getOTPStats();
    console.log('✅ Database connected');
    console.log('- Total OTPs (24h):', stats.total_otps);
    console.log('- Used OTPs:', stats.used_otps);
    console.log('- Expired OTPs:', stats.expired_otps);
    console.log('- Failed OTPs:', stats.failed_otps);
  } catch (error) {
    console.log('❌ Database error:', error.message);
  }
  console.log('');

  console.log('🎯 Test Complete!');
  console.log('\nNext Steps:');
  console.log('1. Start the server: npm start');
  console.log('2. Go to: http://localhost:3000');
  console.log('3. Try logging in with your credentials');
  console.log('4. Check your email for the OTP code');
  console.log('5. Complete the 2FA process');
}

// Run the test
test2FA().catch(console.error);