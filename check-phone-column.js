#!/usr/bin/env node

// Quick script to check if the phone column exists in the database
// Uses your existing database configuration

const { db } = require('./src/config/database');

async function checkPhoneColumn() {
    console.log('🔍 Checking Phone Column Status');
    console.log('==============================');
    console.log(`📡 Database Type: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}`);
    console.log('');
    
    return new Promise((resolve, reject) => {
        // Check if pending_users table exists and get its structure
        const tableInfoQuery = process.env.DATABASE_URL ?
            `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'pending_users' AND table_schema = 'public' ORDER BY ordinal_position` :
            `PRAGMA table_info(pending_users)`;
        
        db.all(tableInfoQuery, [], (err, columns) => {
            if (err) {
                console.error('❌ Error checking database:', err.message);
                reject(err);
                return;
            }
            
            if (columns.length === 0) {
                console.log('❌ pending_users table does not exist!');
                console.log('   This might not be the correct database.');
                reject(new Error('Table not found'));
                return;
            }
            
            console.log('✅ pending_users table found');
            console.log('');
            console.log('📋 Current columns in pending_users table:');
            console.log('==========================================');
            
            let phoneColumnExists = false;
            
            columns.forEach((col, index) => {
                let columnInfo;
                if (process.env.DATABASE_URL) {
                    // PostgreSQL format
                    const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                    const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                    columnInfo = `${col.column_name} (${col.data_type}) ${nullable}${defaultVal}`;
                    
                    if (col.column_name === 'phone') {
                        phoneColumnExists = true;
                    }
                } else {
                    // SQLite format
                    const nullable = col.notnull === 0 ? 'NULL' : 'NOT NULL';
                    const defaultVal = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
                    columnInfo = `${col.name} (${col.type || 'TEXT'}) ${nullable}${defaultVal}`;
                    
                    if (col.name === 'phone') {
                        phoneColumnExists = true;
                    }
                }
                
                console.log(`${index + 1}. ${columnInfo}`);
            });
            
            console.log('');
            
            if (phoneColumnExists) {
                console.log('✅ PHONE COLUMN EXISTS!');
                console.log('📱 Phone number functionality should be working.');
                
                // Check if there are any users with phone numbers
                db.all('SELECT COUNT(*) as total_users, COUNT(phone) as users_with_phone FROM pending_users', [], (statsErr, statsRows) => {
                    if (!statsErr && statsRows.length > 0) {
                        const stats = statsRows[0];
                        const usersWithoutPhone = stats.total_users - stats.users_with_phone;
                        
                        console.log('');
                        console.log('📊 Phone Number Statistics:');
                        console.log(`   Total users: ${stats.total_users}`);
                        console.log(`   Users with phone: ${stats.users_with_phone}`);
                        console.log(`   Users without phone: ${usersWithoutPhone}`);
                    }
                    resolve();
                });
                
            } else {
                console.log('❌ PHONE COLUMN MISSING!');
                console.log('📱 Phone number functionality will not work.');
                console.log('');
                console.log('💡 To fix this, run the migration:');
                console.log('   node migrate-add-phone-column.js');
                resolve();
            }
        });
    });
}

checkPhoneColumn()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Check failed:', error.message);
        process.exit(1);
    });