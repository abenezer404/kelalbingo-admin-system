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
        
        // === PENDING_USERS TABLE MIGRATIONS ===
        
        // Check and add phone column to pending_users
        const phoneCheck = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'pending_users' AND column_name = 'phone'
        `);
        
        if (phoneCheck.rows.length === 0) {
            await client.query('ALTER TABLE pending_users ADD COLUMN phone VARCHAR(20) DEFAULT NULL');
            console.log('✅ Phone column added to pending_users table');
        }
        
        // Check and add address column to pending_users
        const addressCheck = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'pending_users' AND column_name = 'address'
        `);
        
        if (addressCheck.rows.length === 0) {
            await client.query('ALTER TABLE pending_users ADD COLUMN address VARCHAR(255) DEFAULT NULL');
            console.log('✅ Address column added to pending_users table');
        }
        
        // === AGENTS TABLE MIGRATIONS ===
        
        // Check and add phone column to agents
        const agentPhoneCheck = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'agents' AND column_name = 'phone'
        `);
        
        if (agentPhoneCheck.rows.length === 0) {
            await client.query('ALTER TABLE agents ADD COLUMN phone VARCHAR(20) DEFAULT NULL');
            console.log('✅ Phone column added to agents table');
        }
        
        // Check and add address column to agents (should exist but verify)
        const agentAddressCheck = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'agents' AND column_name = 'address'
        `);
        
        if (agentAddressCheck.rows.length === 0) {
            await client.query('ALTER TABLE agents ADD COLUMN address VARCHAR(255) DEFAULT NULL');
            console.log('✅ Address column added to agents table');
        }
        
        // Create indexes silently
        try {
            await client.query('CREATE INDEX IF NOT EXISTS idx_pending_users_phone ON pending_users(phone)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_pending_users_address ON pending_users(address)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_agents_phone ON agents(phone)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_agents_address ON agents(address)');
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