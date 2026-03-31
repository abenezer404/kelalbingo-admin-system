// Auto-migration script that runs on server startup
// This ensures the phone and address columns exist in production

const { Pool } = require('pg');

async function autoMigrate() {
    // Only run in production with PostgreSQL
    if (!process.env.DATABASE_URL) {
        console.log('📋 Skipping auto-migration (SQLite detected)');
        return;
    }
    
    console.log('🔄 Running auto-migration for production database...');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    try {
        const client = await pool.connect();
        
        // Check and add phone column
        const phoneCheck = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'pending_users' AND column_name = 'phone'
        `);
        
        if (phoneCheck.rows.length === 0) {
            await client.query('ALTER TABLE pending_users ADD COLUMN phone VARCHAR(20) DEFAULT NULL');
            console.log('✅ Phone column added to production database');
        }
        
        // Check and add address column
        const addressCheck = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'pending_users' AND column_name = 'address'
        `);
        
        if (addressCheck.rows.length === 0) {
            await client.query('ALTER TABLE pending_users ADD COLUMN address VARCHAR(255) DEFAULT NULL');
            console.log('✅ Address column added to production database');
        }
        
        // Create indexes silently
        try {
            await client.query('CREATE INDEX IF NOT EXISTS idx_pending_users_phone ON pending_users(phone)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_pending_users_address ON pending_users(address)');
        } catch (e) {
            // Ignore index errors
        }
        
        client.release();
        await pool.end();
        
        console.log('✅ Auto-migration completed');
        
    } catch (error) {
        console.error('⚠️ Auto-migration failed:', error.message);
        // Don't exit - let the server continue starting
    }
}

module.exports = { autoMigrate };