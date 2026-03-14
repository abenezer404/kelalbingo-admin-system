#!/usr/bin/env node

/**
 * Secure Deployment Package Creator
 * Creates a clean deployment package without sensitive files
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

console.log('🔒 Creating MINIMAL production deployment package...\n');
console.log('📦 Including ONLY essential files for production:\n');

// Files to exclude from deployment package
const excludePatterns = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.deploy',
    '.git',
    'node_modules',
    '*.log',
    '.DS_Store',
    'Thumbs.db',
    '.vscode',
    '.idea',
    'deploy-setup.js',
    'prepare-secure-deploy.js',
    'DEPLOYMENT_CHECKLIST.md',
    'FREE_HOSTING_DEPLOYMENT.md',
    // Exclude ALL documentation files - not needed in production
    '*.md',
    'README.md',
    'CHANGE_PASSWORD_GUIDE.md',
    'DEPLOYMENT_GUIDE.md',
    'GMAIL_SETUP_GUIDE.md',
    'MIGRATION_GUIDE.md',
    'PASSWORD_SECURITY.md',
    'TROUBLESHOOTING.md',
    'TWO_FACTOR_AUTH_SETUP.md',
    // Exclude development/setup scripts
    'scripts/setup-admin-email.js',
    'scripts/setup-gmail.js',
    'scripts/test-2fa.js',
    'scripts/test-2fa-quiet.js',
    'scripts/test-change-password.js',
    'scripts/manage-admin-password.js',
    // Exclude Docker and other deployment configs not needed
    'Dockerfile',
    'docker-compose.yml',
    'ecosystem.config.js',
    'render.yaml',
    // Exclude development files
    'healthcheck.js',
    'migrate-user-packages.js'
];

// Create deployment directory
const deployDir = 'deployment-package';
if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir);
}

// Create zip file
const output = fs.createWriteStream(path.join(deployDir, 'kelalbingo-admin-production.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
    console.log('\n✅ MINIMAL production package created!');
    console.log(`📦 File: ${deployDir}/kelalbingo-admin-production.zip`);
    console.log(`📊 Size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🎯 Contains ONLY production-essential files\n`);
    
    console.log('🚀 Next steps:');
    console.log('1. Upload the ZIP file to Railway.app');
    console.log('2. Set environment variables manually');
    console.log('3. Deploy - much faster with smaller package!');
});

archive.on('error', (err) => {
    throw err;
});

archive.pipe(output);

// Add all files except excluded ones
function shouldExclude(filePath) {
    return excludePatterns.some(pattern => {
        if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return regex.test(filePath);
        }
        return filePath.includes(pattern);
    });
}

function addDirectory(dirPath, archivePath = '') {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const archiveItemPath = archivePath ? path.join(archivePath, item) : item;
        
        if (shouldExclude(fullPath)) {
            console.log(`⏭️  Skipping: ${fullPath}`);
            return;
        }
        
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            addDirectory(fullPath, archiveItemPath);
        } else {
            archive.file(fullPath, { name: archiveItemPath });
            console.log(`📁 Added: ${archiveItemPath}`);
        }
    });
}

// Add all files
addDirectory('.');

// Finalize the archive
archive.finalize();