#!/usr/bin/env node

// Quick script to check if the phone column exists in the database
// Run this to verify the current state before/after migration

const { Pool } = require('pg');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'kelalbingo',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

async function checkPhoneColumn() {
    console.log('🔍 Checking Phone Column Status');
    console.log('==============================');
    console.log(`📡 Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    console.log('');
    
    const pool = new Pool(dbConfig);
    
    try {
        const client = await pool.connect();
        console.log('✅ Database connection established');
        
        // Check if pending_users table exists
        const tableExistsQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'pending_users'
        `;
        
        const tableExists = await client.query(tableExistsQuery);
        
        if (tableExists.rows.length === 0) {
            console.log('❌ pending_users table does not exist!');
            console.log('   This might not be the correct database.');
            client.release();
            await pool.end();
            process.exit(1);
            return;
        }
        
        console.log('✅ pending_users table found');
        
        // Check all columns in pending_users table
        const columnsQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'pending_users' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `;
        
        const columns = await client.query(columnsQuery);
        
        console.log('');
        console.log('📋 Current columns in pending_users table:');
        console.log('==========================================');
        
        let phoneColumnExists = false;
        
        columns.rows.forEach((col, index) => {
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
            console.log(`${index + 1}. ${col.column_name} (${col.data_type}) ${nullable}${defaultVal}`);
            
            if (col.column_name === 'phone') {
                phoneColumnExists = true;
            }
        });
        
        console.log('');
        
        if (phoneColumnExists) {
            console.log('✅ PHONE COLUMN EXISTS!');
            console.log('📱 Phone number functionality should be working.');
            
            // Check if there are any users with phone numbers
            const phoneDataQuery = `
                SELECT COUNT(*) as total_users, 
                       COUNT(phone) as users_with_phone,
                       COUNT(*) - COUNT(phone) as users_without_phone
                FROM pending_users
            `;
            
            const phoneData = await client.query(phoneDataQuery);
            const stats = phoneData.rows[0];
            
            console.log('');
            console.log('📊 Phone Number Statistics:');
            console.log(`   Total users: ${stats.total_users}`);
            console.log(`   Users with phone: ${stats.users_with_phone}`);
            console.log(`   Users without phone: ${stats.users_without_phone}`);
            
        } else {
            console.log('❌ PHONE COLUMN MISSING!');
            console.log('📱 Phone number functionality will not work.');
            console.log('');
            console.log('💡 To fix this, run the migration:');
            console.log('   node run-phone-migration.js');
        }
        
        // Check for phone index
        const indexQuery = `
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'pending_users' 
            AND indexname LIKE '%phone%'
        `;
        
        const phoneIndex = await client.query(indexQuery);
        
        if (phoneIndex.rows.length > 0) {
            console.log('✅ Phone index exists for performance');
        } else if (phoneColumnExists) {
            console.log('⚠️  Phone index missing (optional, but recommended for performance)');
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error checking database:', error.message);
        console.error('');
        console.error('💡 Common issues:');
        console.error('   - Wrong database credentials');
        console.error('   - Database server not running');
        console.error('   - Network connectivity issues');
        console.error('   - Wrong database name');
        
        await pool.end();
        process.exit(1);
    }
}

checkPhoneColumn();