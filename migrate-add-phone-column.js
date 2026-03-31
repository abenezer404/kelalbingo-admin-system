// Database migration script to add phone column to production PostgreSQL database
// Run this script to add the phone column to the pending_users table

const { Pool } = require('pg');

// Database configuration - update these values for your production database
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'kelalbingo',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

async function addPhoneColumn() {
    console.log('🔄 Starting phone column migration for PostgreSQL...');
    console.log(`📡 Connecting to database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    
    const pool = new Pool(dbConfig);
    
    try {
        // Test connection
        const client = await pool.connect();
        console.log('✅ Database connection established');
        
        // Check if phone column already exists
        console.log('🔍 Checking if phone column exists...');
        const checkColumnQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'pending_users' 
            AND table_schema = 'public'
            AND column_name = 'phone'
        `;
        
        const existingColumn = await client.query(checkColumnQuery);
        
        if (existingColumn.rows.length > 0) {
            console.log('✅ Phone column already exists!');
            console.log('📱 Phone number functionality is already available.');
            client.release();
            await pool.end();
            process.exit(0);
            return;
        }
        
        console.log('📋 Phone column not found. Adding phone column to pending_users table...');
        
        // Add phone column
        const addColumnQuery = `ALTER TABLE pending_users ADD COLUMN phone VARCHAR(20) DEFAULT NULL`;
        await client.query(addColumnQuery);
        console.log('✅ Phone column added successfully!');
        
        // Add index for performance (optional)
        console.log('📊 Creating index for phone column...');
        const addIndexQuery = `CREATE INDEX IF NOT EXISTS idx_pending_users_phone ON pending_users(phone)`;
        await client.query(addIndexQuery);
        console.log('✅ Phone index created successfully!');
        
        // Verify the column was added
        console.log('🔍 Verifying column was added...');
        const verifyColumn = await client.query(checkColumnQuery);
        
        if (verifyColumn.rows.length > 0) {
            console.log('🎉 Migration completed successfully!');
            console.log('📱 Phone number functionality is now available.');
            console.log('');
            console.log('✅ Next steps:');
            console.log('   1. Restart your admin server');
            console.log('   2. Test phone number editing in admin panel');
            console.log('   3. Verify phone sync to desktop application');
        } else {
            console.log('❌ Migration verification failed');
            process.exit(1);
        }
        
        client.release();
        await pool.end();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('');
        console.error('💡 Troubleshooting tips:');
        console.error('   1. Check database connection settings');
        console.error('   2. Ensure you have ALTER TABLE permissions');
        console.error('   3. Verify the pending_users table exists');
        console.error('   4. Check if you\'re connected to the correct database');
        
        await pool.end();
        process.exit(1);
    }
}

// Display configuration info
console.log('📋 Database Migration: Add Phone Column');
console.log('=====================================');
console.log(`Host: ${dbConfig.host}`);
console.log(`Port: ${dbConfig.port}`);
console.log(`Database: ${dbConfig.database}`);
console.log(`User: ${dbConfig.user}`);
console.log(`SSL: ${dbConfig.ssl ? 'enabled' : 'disabled'}`);
console.log('');

// Run migration
addPhoneColumn();