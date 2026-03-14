#!/usr/bin/env node

/**
 * MINIMAL Production Deployment Package
 * Includes ONLY files needed to run the admin system
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

console.log('🎯 Creating MINIMAL production package...\n');

// ONLY include these essential files/folders
const includePatterns = [
    'server.js',
    'package.json',
    'package-lock.json',
    'src/',
    'public/',
    'database/admin.db'
];

// Create deployment directory
const deployDir = 'deployment-package';
if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir);
}

// Create zip file
const output = fs.createWriteStream(path.join(deployDir, 'kelalbingo-admin-minimal.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
    console.log('\n✅ MINIMAL production package created!');
    console.log(`📦 File: ${deployDir}/kelalbingo-admin-minimal.zip`);
    console.log(`📊 Size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🚀 Ready for fast deployment!\n`);
    
    console.log('📋 Package contains ONLY:');
    console.log('  ✅ server.js (main application)');
    console.log('  ✅ package.json (dependencies)');
    console.log('  ✅ src/ (backend code)');
    console.log('  ✅ public/ (admin interface)');
    console.log('  ✅ database/admin.db (database structure)');
    console.log('  ❌ No documentation files');
    console.log('  ❌ No development scripts');
    console.log('  ❌ No configuration files');
});

archive.on('error', (err) => {
    throw err;
});

archive.pipe(output);

// Add only essential files
function addEssentialFiles() {
    includePatterns.forEach(pattern => {
        if (pattern.endsWith('/')) {
            // Directory
            const dirName = pattern.slice(0, -1);
            if (fs.existsSync(dirName)) {
                archive.directory(dirName, dirName);
                console.log(`📁 Added directory: ${dirName}/`);
            }
        } else {
            // File
            if (fs.existsSync(pattern)) {
                archive.file(pattern, { name: pattern });
                console.log(`📄 Added file: ${pattern}`);
            }
        }
    });
}

// Add essential files only
addEssentialFiles();

// Finalize the archive
archive.finalize();