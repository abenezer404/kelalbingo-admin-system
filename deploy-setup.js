#!/usr/bin/env node

/**
 * KELALBINGO Admin System - Free Hosting Deployment Setup
 * This script helps prepare the admin system for free hosting deployment
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🎯 KELALBINGO Admin System - Free Hosting Setup\n');

// Generate secure secrets
function generateSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
}

// Generate environment variables template
function generateEnvTemplate() {
    const jwtSecret = generateSecret(64);
    const apiKey = generateSecret(32);
    
    const envTemplate = `# KELALBINGO Admin System - Production Environment Variables
# Copy these to your hosting platform's environment variables section

NODE_ENV=production
PORT=10000

# Security Secrets (GENERATED - KEEP SECURE!)
JWT_SECRET=${jwtSecret}
API_KEY=${apiKey}

# Admin Credentials (CHANGE THESE!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$yZTXX0.HSMob/CPaQnnK8e0DPsGn5fEDt7.zxZNHMLPsdz0q7v6rG
ADMIN_EMAIL=your-email@gmail.com

# Database
DATABASE_PATH=./database/admin.db

# Email Configuration (REQUIRED FOR 2FA)
EMAIL_ENABLED=true
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password

# Session Configuration
SESSION_TIMEOUT_MINUTES=15
SESSION_WARNING_MINUTES=2

# OTP Configuration
OTP_ENABLED=true
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=3

# Generated on: ${new Date().toISOString()}
`;

    fs.writeFileSync('.env.deploy', envTemplate);
    console.log('✅ Generated .env.deploy with secure secrets');
}

// Create deployment checklist
function createDeploymentChecklist() {
    const checklist = `# 🚀 KELALBINGO Admin Deployment Checklist

## Pre-Deployment Setup

### 1. Repository Setup
- [ ] Code committed to Git repository
- [ ] Repository pushed to GitHub/GitLab
- [ ] .env.deploy file generated (contains secrets)

### 2. Email Configuration
- [ ] Gmail account ready for admin notifications
- [ ] 2FA enabled on Gmail account
- [ ] App-specific password generated for Gmail
- [ ] Test email sending locally

### 3. Admin Credentials
- [ ] Strong admin password chosen
- [ ] Password hashed using: \`node scripts/hash-password.js "YourPassword"\`
- [ ] Admin email address configured
- [ ] Admin username decided (avoid 'admin' for security)

## Deployment Steps

### 4. Platform Selection
- [ ] **Render.com** (Recommended - Always on, reliable)
- [ ] **Railway** (Good performance, $5 free credit)
- [ ] **Cyclic** (Completely free, good uptime)
- [ ] **Glitch** (Quick testing, sleeps after 5 min)

### 5. Environment Variables Setup
Copy from .env.deploy to your hosting platform:
- [ ] NODE_ENV=production
- [ ] JWT_SECRET (generated secure secret)
- [ ] API_KEY (generated secure secret)
- [ ] ADMIN_USERNAME (your chosen username)
- [ ] ADMIN_PASSWORD_HASH (your hashed password)
- [ ] ADMIN_EMAIL (your email address)
- [ ] EMAIL_USER (your Gmail address)
- [ ] EMAIL_PASSWORD (your Gmail app password)
- [ ] All other variables from .env.deploy

### 6. Deployment Configuration
- [ ] Build Command: \`npm install\`
- [ ] Start Command: \`npm start\`
- [ ] Node.js version: 16+ (automatic on most platforms)
- [ ] Auto-deploy enabled (optional)

## Post-Deployment Testing

### 7. Basic Functionality
- [ ] Admin panel loads successfully
- [ ] HTTPS is working (automatic on free hosting)
- [ ] Login page displays correctly
- [ ] Mobile responsiveness works

### 8. Authentication Testing
- [ ] Admin login with username/password works
- [ ] 2FA email OTP is received
- [ ] OTP verification completes login
- [ ] Session timeout works (15 minutes)
- [ ] Logout functionality works

### 9. Admin Features Testing
- [ ] Dashboard loads with statistics
- [ ] User creation works
- [ ] User password reset works
- [ ] Package assignment works
- [ ] Balance adjustments work
- [ ] All modals display correctly (no browser alerts)

### 10. Security Verification
- [ ] All HTTP requests redirect to HTTPS
- [ ] Environment variables are not exposed
- [ ] Database file is persistent between deployments
- [ ] Admin actions are logged properly
- [ ] Session management works correctly

## Production Readiness

### 11. Performance Check
- [ ] Page load times are acceptable (<3 seconds)
- [ ] API responses are fast (<1 second)
- [ ] Mobile performance is good
- [ ] Multiple concurrent users work

### 12. Monitoring Setup
- [ ] Uptime monitoring configured (UptimeRobot)
- [ ] Error logging reviewed
- [ ] Backup strategy planned
- [ ] Admin contact information updated

## 🎉 Deployment Complete!

Your KELALBINGO Admin System is now live at:
**URL**: https://your-app-name.onrender.com (or your chosen platform)

### Next Steps:
1. **Bookmark** the admin URL
2. **Share** access with authorized personnel
3. **Document** the admin credentials securely
4. **Schedule** regular backups
5. **Monitor** system performance

### Support:
- Check deployment logs on your hosting platform
- Review this checklist if issues occur
- Test locally first if problems persist

**Congratulations! Your admin system is now running on free hosting! 🚀**
`;

    fs.writeFileSync('DEPLOYMENT_CHECKLIST.md', checklist);
    console.log('✅ Created DEPLOYMENT_CHECKLIST.md');
}

// Create .gitignore for deployment
function createGitignore() {
    const gitignore = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.deploy

# Database (keep structure, ignore data)
database/*.db
database/*.db-journal
database/*.db-wal
database/*.db-shm

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Backup files
*.backup
*.bak
*.tmp
`;

    fs.writeFileSync('.gitignore', gitignore);
    console.log('✅ Created .gitignore for deployment');
}

// Main setup function
function main() {
    try {
        console.log('🔧 Setting up KELALBINGO Admin for free hosting deployment...\n');
        
        generateEnvTemplate();
        createDeploymentChecklist();
        createGitignore();
        
        console.log('\n🎉 Setup complete! Next steps:');
        console.log('1. Review .env.deploy file and update admin credentials');
        console.log('2. Follow DEPLOYMENT_CHECKLIST.md for deployment');
        console.log('3. Choose your free hosting platform (Render.com recommended)');
        console.log('4. Deploy and enjoy your admin system!\n');
        
        console.log('📚 Deployment guides available:');
        console.log('- FREE_HOSTING_DEPLOYMENT.md (comprehensive guide)');
        console.log('- DEPLOYMENT_CHECKLIST.md (step-by-step checklist)');
        console.log('- .env.deploy (secure environment variables)\n');
        
        console.log('🚀 Your KELALBINGO Admin System is ready for free hosting!');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Run setup
main();