/**
 * Migration script to update user_packages table to allow NULL package_id
 * Run this script if you have an existing database with the old schema
 * 
 * Usage: node migrate-user-packages.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('./src/config/config');

const db = new sqlite3.Database(config.databasePath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Check if migration is needed
db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='user_packages'", [], (err, row) => {
  if (err) {
    console.error('Error checking table schema:', err.message);
    db.close();
    process.exit(1);
  }

  if (!row) {
    console.log('user_packages table does not exist. No migration needed.');
    db.close();
    process.exit(0);
  }

  if (!row.sql.includes('package_id INTEGER NOT NULL')) {
    console.log('user_packages table already allows NULL package_id. No migration needed.');
    db.close();
    process.exit(0);
  }

  console.log('Starting migration...');
  console.log('Current schema:', row.sql);

  db.serialize(() => {
    // Create temporary table with new schema
    db.run(`
      CREATE TABLE user_packages_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        package_id INTEGER,
        amount REAL NOT NULL,
        is_redeemed BOOLEAN DEFAULT 0,
        redeemed_at DATETIME,
        assigned_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES pending_users(id),
        FOREIGN KEY (package_id) REFERENCES packages(id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating new table:', err.message);
        db.close();
        process.exit(1);
      }
      console.log('✓ Created new table with updated schema');
    });

    // Copy data from old table to new table
    db.run(`
      INSERT INTO user_packages_new (id, user_id, package_id, amount, is_redeemed, redeemed_at, assigned_by, created_at)
      SELECT id, user_id, package_id, amount, is_redeemed, redeemed_at, assigned_by, created_at
      FROM user_packages
    `, (err) => {
      if (err) {
        console.error('Error copying data:', err.message);
        db.close();
        process.exit(1);
      }
      console.log('✓ Copied all data to new table');
    });

    // Drop old table
    db.run('DROP TABLE user_packages', (err) => {
      if (err) {
        console.error('Error dropping old table:', err.message);
        db.close();
        process.exit(1);
      }
      console.log('✓ Dropped old table');
    });

    // Rename new table to original name
    db.run('ALTER TABLE user_packages_new RENAME TO user_packages', (err) => {
      if (err) {
        console.error('Error renaming table:', err.message);
        db.close();
        process.exit(1);
      }
      console.log('✓ Renamed new table to user_packages');
      console.log('\n✅ Migration completed successfully!');
      console.log('The user_packages table now allows NULL package_id for custom balance adjustments.');
      
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        }
        process.exit(0);
      });
    });
  });
});
