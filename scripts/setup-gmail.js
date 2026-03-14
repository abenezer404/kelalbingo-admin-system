const fs = require('fs');
const path = require('path');

/**
 * Gmail Setup Helper Script
 */
function setupGmail() {
  console.log('📧 Gmail Setup for KELALBINGO 2FA\n');

  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found');
    return;
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check current configuration
  const emailService = envContent.match(/EMAIL_SERVICE=(.+)/);
  const emailUser = envContent.match(/EMAIL_USER=(.+)/);
  const emailPassword = envContent.match(/EMAIL_PASSWORD=(.+)/);
  const adminEmail = envContent.match(/ADMIN_EMAIL=(.+)/);

  console.log('📋 Current Configuration:');
  console.log('- Email Service:', emailService ? emailService[1] : 'Not set');
  console.log('- Email User:', emailUser ? emailUser[1] : 'Not set');
  console.log('- Email Password:', emailPassword && emailPassword[1] && emailPassword[1] !== 'YOUR_APP_SPECIFIC_PASSWORD' ? '✅ Set' : '❌ Not set');
  console.log('- Admin Email:', adminEmail ? adminEmail[1] : 'Not set');

  console.log('\n🔧 Setup Steps:');
  
  if (!emailService || emailService[1] !== 'gmail') {
    console.log('❌ 1. EMAIL_SERVICE should be "gmail"');
  } else {
    console.log('✅ 1. EMAIL_SERVICE is correctly set to "gmail"');
  }

  if (!emailUser || !emailUser[1] || emailUser[1].trim() === '') {
    console.log('❌ 2. EMAIL_USER is not set');
  } else {
    console.log('✅ 2. EMAIL_USER is set to:', emailUser[1]);
  }

  if (!emailPassword || !emailPassword[1] || emailPassword[1] === 'YOUR_APP_SPECIFIC_PASSWORD') {
    console.log('❌ 3. EMAIL_PASSWORD needs to be set with your Gmail App-Specific Password');
    console.log('');
    console.log('   📱 To get Gmail App-Specific Password:');
    console.log('   1. Go to: https://myaccount.google.com/security');
    console.log('   2. Enable "2-Step Verification" if not already enabled');
    console.log('   3. Click "App passwords"');
    console.log('   4. Select "Mail" and click "Generate"');
    console.log('   5. Copy the 16-character password (format: xxxx-xxxx-xxxx-xxxx)');
    console.log('   6. Replace YOUR_APP_SPECIFIC_PASSWORD in .env file');
    console.log('');
  } else {
    console.log('✅ 3. EMAIL_PASSWORD is set');
  }

  if (!adminEmail || !adminEmail[1] || adminEmail[1].trim() === '') {
    console.log('❌ 4. ADMIN_EMAIL is not set');
  } else {
    console.log('✅ 4. ADMIN_EMAIL is set to:', adminEmail[1]);
  }

  console.log('\n🧪 Testing:');
  console.log('After setting up your app-specific password:');
  console.log('1. npm run test-2fa');
  console.log('2. npm start');
  console.log('3. Go to http://localhost:3000 and try logging in');

  console.log('\n📖 Detailed Guide:');
  console.log('See GMAIL_SETUP_GUIDE.md for complete instructions');

  // Check if ready to test
  const isReady = emailService && emailService[1] === 'gmail' &&
                  emailUser && emailUser[1] && emailUser[1].trim() !== '' &&
                  emailPassword && emailPassword[1] && emailPassword[1] !== 'YOUR_APP_SPECIFIC_PASSWORD' &&
                  adminEmail && adminEmail[1] && adminEmail[1].trim() !== '';

  if (isReady) {
    console.log('\n🎉 Configuration looks complete!');
    console.log('Run "npm run test-2fa" to test the setup.');
  } else {
    console.log('\n⚠️  Configuration incomplete. Please follow the steps above.');
  }
}

setupGmail();