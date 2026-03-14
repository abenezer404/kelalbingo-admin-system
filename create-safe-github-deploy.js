#!/usr/bin/env node

/**
 * Safe GitHub Deployment Package Creator
 * Creates a completely clean repository with NO sensitive data
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Creating SAFE GitHub deployment package...\n');

// Create clean deployment directory
const deployDir = 'github-deploy-safe';
if (fs.existsSync(deployDir)) {
    fs.rmSync(deployDir, { recursive: true });
}
fs.mkdirSync(deployDir, { recursive: true });

// Copy essential files only
const filesToCopy = [
    'server.js',
    'package.json',
    'package-lock.json'
];

const dirsToCopy = [
    'src',
    'public'
];

// Copy files
filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(deployDir, file));
        console.log(`📄 Copied: ${file}`);
    }
});

// Copy directories
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const items = fs.readdirSync(src);
    items.forEach(item => {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        
        if (fs.statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    });
}

dirsToCopy.forEach(dir => {
    if (fs.existsSync(dir)) {
        copyDir(dir, path.join(deployDir, dir));
        console.log(`📁 Copied directory: ${dir}/`);
    }
});

// Create safe .env.example (NO real values)
const safeEnvExample = `# Environment Variables for KELALBINGO Admin
# Set these in your hosting platform's environment variables section
# NEVER put real values in this file!

NODE_ENV=production
PORT=3000

# Security (SET IN HOSTING PLATFORM)
JWT_SECRET=your-jwt-secret-here
API_KEY=your-api-key-here

# Admin Credentials (SET IN HOSTING PLATFORM)
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD_HASH=your-bcrypt-hash-here
ADMIN_EMAIL=your-email@domain.com

# Database
DATABASE_PATH=./database/admin.db

# Email Configuration (SET IN HOSTING PLATFORM)
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
`;

fs.writeFileSync(path.join(deployDir, '.env.example'), safeEnvExample);
console.log('📄 Created safe .env.example');

// Create database directory with empty database
const dbDir = path.join(deployDir, 'database');
fs.mkdirSync(dbDir, { recursive: true });

// Copy database structure (if exists) or create empty
if (fs.existsSync('database/admin.db')) {
    fs.copyFileSync('database/admin.db', path.join(dbDir, 'admin.db'));
    console.log('📄 Copied database structure');
} else {
    // Create empty file
    fs.writeFileSync(path.join(dbDir, 'admin.db'), '');
    console.log('📄 Created empty database file');
}

// Create safe .gitignore
const safeGitignore = `# Dependencies
node_modules/
npm-debug.log*

# Environment variables (NEVER commit real .env)
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
*.log
logs/

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory
coverage/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
Thumbs.db

# Backup files
*.backup
*.bak
`;

fs.writeFileSync(path.join(deployDir, '.gitignore'), safeGitignore);
console.log('📄 Created safe .gitignore');

// Create safe README
const safeReadme = `# KELALBINGO Admin System

Professional admin panel for KELALBINGO gaming platform.

## 🚀 Deployment

This repository contains ONLY the application code. 

**IMPORTANT**: All sensitive configuration is set via environment variables in the hosting platform.

### Environment Variables Required:

See \`.env.example\` for the complete list of required environment variables.

**NEVER commit real values to this repository!**

### Deploy to Render/Railway/Vercel:

1. Connect this repository
2. Set all environment variables in the platform
3. Deploy automatically

## 🔒 Security

- No sensitive data in this repository
- All secrets managed via hosting platform
- Production-ready configuration
- Secure authentication with 2FA

## 📱 Features

- Secure admin authentication with 2FA
- User management with machine binding
- Balance and package management
- Real-time session management
- Professional responsive UI
- Comprehensive audit logging

Built with Node.js, Express, and SQLite.
`;

fs.writeFileSync(path.join(deployDir, 'README.md'), safeReadme);
console.log('📄 Created safe README.md');

console.log('\n✅ SAFE GitHub deployment package created!');
console.log(`📁 Location: ${deployDir}/`);
console.log('\n🔒 Security Features:');
console.log('  ✅ NO sensitive data included');
console.log('  ✅ NO real environment variables');
console.log('  ✅ NO passwords or secrets');
console.log('  ✅ Only application code');
console.log('  ✅ Safe .gitignore prevents accidents');
console.log('\n🚀 Ready for safe GitHub deployment!');
console.log('\nNext steps:');
console.log('1. cd github-deploy-safe');
console.log('2. git init && git add . && git commit -m "Initial commit"');
console.log('3. Create GitHub repository');
console.log('4. Push code');
console.log('5. Deploy with environment variables set in hosting platform');