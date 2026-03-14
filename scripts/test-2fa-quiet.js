const config = require('../src/config/config');
const emailService = require('../src/services/emailService');
const otpService = require('../src/services/otpService');

/**
 * Quiet test script for 2FA functionality (production-friendly)
 */
async function test2FAQuiet() {
  try {
    // Test 1: Configuration Check
    if (!config.otp.enabled) {
      console.log('❌ OTP disabled');
      return;
    }

    if (!config.email.enabled) {
      console.log('❌ Email disabled');
      return;
    }

    if (!config.adminEmail) {
      console.log('❌ Admin email not configured');
      return;
    }

    // Test 2: OTP Generation
    const otp = emailService.generateOTP();
    if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
      console.log('❌ OTP generation failed');
      return;
    }

    // Test 3: Email Service
    try {
      await emailService.sendOTP(config.adminEmail, '123456', config.adminUsername);
      console.log('✅ 2FA system operational');
    } catch (error) {
      console.log('❌ Email service failed');
      return;
    }

    // Test 4: Database
    try {
      await otpService.getOTPStats();
      console.log('✅ Database connected');
    } catch (error) {
      console.log('❌ Database error');
      return;
    }

    console.log('✅ All systems ready');

  } catch (error) {
    console.log('❌ System check failed');
  }
}

// Run the quiet test
test2FAQuiet().catch(() => console.log('❌ Test failed'));