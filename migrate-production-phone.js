// Production PostgreSQL migration script for Render
// This script adds the phone column to your production database

const { Pool } = require('pg');

async function migrateProductionDatabase() {
    console.log('🔄 Starting production PostgreSQL migration...');
    
    // Check if DATABASE_URL is available (should be set in production)
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL not found!');
        console.error('   This script is meant to run in production with PostgreSQL');
        console.error('   Make sure DATABASE_URL environment variable is set');
        process.exit(1);
    }
    
    console.log('📡 Connecting to production PostgreSQL database...');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    try {
        const client = await pool.connect();
        console.log('✅ Connected to production database');
        
        // Check if phone column exists
        console.log('🔍 Checking if phone column exists...');
        const checkPhoneQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'pending_users' 
            AND table_schema = 'public'
            AND column_name = 'phone'
        `;
        
        const phoneExists = await client.query(checkPhoneQuery);
        
        if (phoneExists.rows.length > 0) {
            console.log('✅ Phone column already exists!');
        } else {
            console.log('📋 Adding phone column...');
            await client.query('ALTER TABLE pending_users ADD COLUMN phone VARCHAR(20) DEFAULT NULL');
            console.log('✅ Phone column added successfully!');
        }
        
        // Check if address column exists
        console.log('🔍 Checking if address column exists...');
        const checkAddressQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'pending_users' 
            AND table_schema = 'public'
            AND column_name = 'address'
        `;
        
        const addressExists = await client.query(checkAddressQuery);
        
        if (addressExists.rows.length > 0) {
            console.log('✅ Address column already exists!');
        } else {
            console.log('📋 Adding address column...');
            await client.query('ALTER TABLE pending_users ADD COLUMN address VARCHAR(255) DEFAULT NULL');
            console.log('✅ Address column added successfully!');
        }
        
        // Create indexes for performance
        console.log('📊 Creating indexes...');
        try {
            await client.query('CREATE INDEX IF NOT EXISTS idx_pending_users_phone ON pending_users(phone)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_pending_users_address ON pending_users(address)');
            console.log('✅ Indexes created successfully!');
        } catch (indexErr) {
            console.log('⚠️ Index creation warning:', indexErr.message);
        }
        
        // Verify both columns exist
        console.log('🔍 Verifying migration...');
        const verifyQuery = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'pending_users' 
            AND table_schema = 'public'
            AND column_name IN ('phone', 'address')
            ORDER BY column_name
        `;
        
        const verification = await client.query(verifyQuery);
        
        if (verification.rows.length === 2) {
            console.log('🎉 Migration completed successfully!');
            console.log('📱 Phone and address functionality is now available');
            
            verification.rows.forEach(col => {
                console.log(`   ✅ ${col.column_name} (${col.data_type})`);
            });
            
            // Show user statistics
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(phone) as users_with_phone,
                    COUNT(address) as users_with_address
                FROM pending_users
            `;
            
            const stats = await client.query(statsQuery);
            const data = stats.rows[0];
            
            console.log('');
            console.log('📊 User Statistics:');
            console.log(`   Total users: ${data.total_users}`);
            console.log(`   Users with phone: ${data.users_with_phone}`);
            console.log(`   Users with address: ${data.users_with_address}`);
            
        } else {
            console.log('❌ Migration verification failed');
            console.log(`   Expected 2 columns, found ${verification.rows.length}`);
        }
        
        client.release();
        await pool.end();
        
        console.log('');
        console.log('✅ Next steps:');
        console.log('   1. The migration is complete');
        console.log('   2. Phone and address editing should now work');
        console.log('   3. No server restart needed - changes are live');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('');
        console.error('💡 Troubleshooting:');
        console.error('   - Check database permissions');
        console.error('   - Verify DATABASE_URL is correct');
        console.error('   - Ensure pending_users table exists');
        
        await pool.end();
        process.exit(1);
    }
}

console.log('🚀 Production Database Migration');
console.log('===============================');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Database URL: ${process.env.DATABASE_URL ? 'Set (PostgreSQL)' : 'Not set'}`);
console.log('');

migrateProductionDatabase();