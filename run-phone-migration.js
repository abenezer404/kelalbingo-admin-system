#!/usr/bin/env node

// Simple script to run the phone column migration
// This script loads environment variables and runs the migration

const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Phone Column Migration Runner');
console.log('================================');
console.log('');

// Check if we're in the right directory
const migrationFile = path.join(__dirname, 'migrate-add-phone-column.js');
const fs = require('fs');

if (!fs.existsSync(migrationFile)) {
    console.error('❌ Migration file not found!');
    console.error('   Make sure you\'re running this from the bingo-admin-server directory');
    process.exit(1);
}

console.log('📋 Environment Variables:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`   DB_HOST: ${process.env.DB_HOST || 'not set (will use localhost)'}`);
console.log(`   DB_PORT: ${process.env.DB_PORT || 'not set (will use 5432)'}`);
console.log(`   DB_NAME: ${process.env.DB_NAME || 'not set (will use kelalbingo)'}`);
console.log(`   DB_USER: ${process.env.DB_USER || 'not set (will use postgres)'}`);
console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '***set***' : 'not set'}`);
console.log('');

console.log('⚠️  IMPORTANT: Make sure your database credentials are set correctly!');
console.log('');

// Ask for confirmation
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Do you want to proceed with the migration? (y/N): ', (answer) => {
    rl.close();
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('❌ Migration cancelled by user');
        process.exit(0);
    }
    
    console.log('🔄 Running migration...');
    console.log('');
    
    try {
        // Run the migration script
        execSync('node migrate-add-phone-column.js', { 
            stdio: 'inherit',
            cwd: __dirname 
        });
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
});