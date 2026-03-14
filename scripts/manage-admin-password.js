const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

/**
 * Admin Password Management Script
 * 
 * Commands:
 * - hash: Generate hash for a password
 * - verify: Verify a password against a hash
 * - update: Update .env file with new hashed password
 */

const SALT_ROUNDS = 10;

async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

function updateEnvFile(hash) {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found');
    return false;
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Replace existing ADMIN_PASSWORD_HASH or add it
  if (envContent.includes('ADMIN_PASSWORD_HASH=')) {
    envContent = envContent.replace(/ADMIN_PASSWORD_HASH=.*$/m, `ADMIN_PASSWORD_HASH=${hash}`);
  } else {
    envContent += `\nADMIN_PASSWORD_HASH=${hash}\n`;
  }
  
  // Comment out plain text password if it exists
  if (envContent.includes('ADMIN_PASSWORD=') && !envContent.includes('# ADMIN_PASSWORD=')) {
    envContent = envContent.replace(/^ADMIN_PASSWORD=/m, '# ADMIN_PASSWORD=');
  }
  
  fs.writeFileSync(envPath, envContent);
  return true;
}

async function main() {
  const command = process.argv[2];
  const password = process.argv[3];
  const hash = process.argv[4];

  console.log('\n🔐 KELALBINGO Admin Password Manager\n');

  switch (command) {
    case 'hash':
      if (!password) {
        console.log('Usage: node scripts/manage-admin-password.js hash "your-password"');
        return;
      }
      
      try {
        const hashedPassword = await hashPassword(password);
        console.log('✅ Password hashed successfully!');
        console.log('📋 Hashed Password:', hashedPassword);
        console.log('\n📝 Add this to your .env file:');
        console.log(`ADMIN_PASSWORD_HASH=${hashedPassword}`);
      } catch (error) {
        console.error('❌ Error hashing password:', error.message);
      }
      break;

    case 'verify':
      if (!password || !hash) {
        console.log('Usage: node scripts/manage-admin-password.js verify "password" "hash"');
        return;
      }
      
      try {
        const isValid = await verifyPassword(password, hash);
        if (isValid) {
          console.log('✅ Password is valid!');
        } else {
          console.log('❌ Password is invalid!');
        }
      } catch (error) {
        console.error('❌ Error verifying password:', error.message);
      }
      break;

    case 'update':
      if (!password) {
        console.log('Usage: node scripts/manage-admin-password.js update "new-password"');
        return;
      }
      
      try {
        console.log('🔄 Generating hash...');
        const hashedPassword = await hashPassword(password);
        
        console.log('📝 Updating .env file...');
        const success = updateEnvFile(hashedPassword);
        
        if (success) {
          console.log('✅ .env file updated successfully!');
          console.log('🔄 Please restart the server to apply changes.');
          console.log('\n📋 New hash:', hashedPassword);
        } else {
          console.log('❌ Failed to update .env file');
        }
      } catch (error) {
        console.error('❌ Error updating password:', error.message);
      }
      break;

    default:
      console.log('Available commands:');
      console.log('  hash "password"           - Generate hash for password');
      console.log('  verify "password" "hash"  - Verify password against hash');
      console.log('  update "password"         - Update .env with new hashed password');
      console.log('\nExamples:');
      console.log('  node scripts/manage-admin-password.js hash "MyNewPassword123"');
      console.log('  node scripts/manage-admin-password.js update "MyNewPassword123"');
      break;
  }
  
  console.log('');
}

main().catch(console.error);