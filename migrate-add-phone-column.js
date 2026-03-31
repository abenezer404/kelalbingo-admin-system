// Database migration script to add phone column to production database
// This script works with your existing database configuration

const { db } = require('./src/config/database');

async function addPhoneColumn() {
    console.log('🔄 Starting phone column migration...');
    console.log('📡 Using existing database configuration');
    
    return new Promise((resolve, reject) => {
        // Check if phone column already exists
        console.log('🔍 Checking if phone column exists...');
        
        // For PostgreSQL, check information_schema; for SQLite, check PRAGMA table_info
        const checkColumnQuery = process.env.DATABASE_URL ? 
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'pending_users' AND column_name = 'phone'` :
            `PRAGMA table_info(pending_users)`;
        
        db.all(checkColumnQuery, [], (err, rows) => {
            if (err) {
                console.error('❌ Error checking column existence:', err.message);
                reject(err);
                return;
            }
            
            let phoneColumnExists = false;
            
            if (process.env.DATABASE_URL) {
                // PostgreSQL: check if any rows returned
                phoneColumnExists = rows.length > 0;
            } else {
                // SQLite: check if 'phone' column exists in table info
                phoneColumnExists = rows.some(row => row.name === 'phone');
            }
            
            if (phoneColumnExists) {
                console.log('✅ Phone column already exists!');
                console.log('📱 Phone number functionality is already available.');
                resolve();
                return;
            }
            
            console.log('📋 Phone column not found. Adding phone column to pending_users table...');
            
            // Add phone column
            const addColumnQuery = process.env.DATABASE_URL ?
                `ALTER TABLE pending_users ADD COLUMN phone VARCHAR(20) DEFAULT NULL` :
                `ALTER TABLE pending_users ADD COLUMN phone TEXT`;
            
            db.run(addColumnQuery, [], (addErr) => {
                if (addErr) {
                    console.error('❌ Error adding phone column:', addErr.message);
                    reject(addErr);
                    return;
                }
                
                console.log('✅ Phone column added successfully!');
                
                // Add index for performance (optional)
                console.log('📊 Creating index for phone column...');
                const addIndexQuery = process.env.DATABASE_URL ?
                    `CREATE INDEX IF NOT EXISTS idx_pending_users_phone ON pending_users(phone)` :
                    `CREATE INDEX IF NOT EXISTS idx_pending_users_phone ON pending_users(phone)`;
                
                db.run(addIndexQuery, [], (indexErr) => {
                    if (indexErr) {
                        console.log('⚠️ Warning: Could not create phone index:', indexErr.message);
                    } else {
                        console.log('✅ Phone index created successfully!');
                    }
                    
                    // Verify the column was added
                    console.log('🔍 Verifying column was added...');
                    db.all(checkColumnQuery, [], (verifyErr, verifyRows) => {
                        if (verifyErr) {
                            console.error('❌ Error verifying column:', verifyErr.message);
                            reject(verifyErr);
                            return;
                        }
                        
                        let verified = false;
                        if (process.env.DATABASE_URL) {
                            verified = verifyRows.length > 0;
                        } else {
                            verified = verifyRows.some(row => row.name === 'phone');
                        }
                        
                        if (verified) {
                            console.log('🎉 Migration completed successfully!');
                            console.log('📱 Phone number functionality is now available.');
                            console.log('');
                            console.log('✅ Next steps:');
                            console.log('   1. Restart your admin server');
                            console.log('   2. Test phone number editing in admin panel');
                            console.log('   3. Verify phone sync to desktop application');
                            resolve();
                        } else {
                            console.log('❌ Migration verification failed');
                            reject(new Error('Migration verification failed'));
                        }
                    });
                });
            });
        });
    });
}

// Display configuration info
console.log('📋 Database Migration: Add Phone Column');
console.log('=====================================');
console.log(`Database Type: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}`);
console.log(`Database URL: ${process.env.DATABASE_URL ? 'Set (PostgreSQL)' : 'Not set (SQLite)'}`);
console.log('');

// Run migration
addPhoneColumn()
    .then(() => {
        console.log('✅ Migration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Migration failed:', error.message);
        console.error('');
        console.error('💡 Troubleshooting tips:');
        console.error('   1. Check database connection settings');
        console.error('   2. Ensure you have ALTER TABLE permissions');
        console.error('   3. Verify the pending_users table exists');
        console.error('   4. Check if you\'re connected to the correct database');
        process.exit(1);
    });