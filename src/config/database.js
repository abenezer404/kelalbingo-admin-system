const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('./config');

let db;
let isPostgres = false;

// Check if PostgreSQL is configured
if (process.env.DATABASE_URL) {
  // Use PostgreSQL
  const { Pool } = require('pg');
  isPostgres = true;
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  // Create a SQLite-compatible interface for PostgreSQL
  db = {
    // Simulate SQLite's db.get method
    get: (sql, params, callback) => {
      // Convert ? to $1, $2, etc. for PostgreSQL
      let pgSql = sql;
      let pgParams = params || [];
      
      if (params && params.length > 0) {
        for (let i = 0; i < params.length; i++) {
          pgSql = pgSql.replace('?', `$${i + 1}`);
        }
      }
      
      pool.query(pgSql, pgParams)
        .then(result => callback(null, result.rows[0] || null))
        .catch(err => callback(err));
    },
    
    // Simulate SQLite's db.all method
    all: (sql, params, callback) => {
      let pgSql = sql;
      let pgParams = params || [];
      
      if (params && params.length > 0) {
        for (let i = 0; i < params.length; i++) {
          pgSql = pgSql.replace('?', `$${i + 1}`);
        }
      }
      
      pool.query(pgSql, pgParams)
        .then(result => callback(null, result.rows))
        .catch(err => callback(err));
    },
    
    // Simulate SQLite's db.run method
    run: (sql, params, callback) => {
      let pgSql = sql;
      let pgParams = params || [];
      
      if (params && params.length > 0) {
        for (let i = 0; i < params.length; i++) {
          pgSql = pgSql.replace('?', `$${i + 1}`);
        }
      }
      
      pool.query(pgSql, pgParams)
        .then(result => {
          if (callback) {
            callback.call({ 
              lastID: result.rows[0]?.id, 
              changes: result.rowCount 
            });
          }
        })
        .catch(err => {
          if (callback) callback(err);
        });
    },
    
    serialize: (callback) => {
      if (callback) callback();
    }
  };
} else {
  // Use SQLite
  // Ensure database directory exists
  const dbDir = path.dirname(config.databasePath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Create database connection
  db = new sqlite3.Database(config.databasePath, (err) => {
    if (err) {
      // Database connection error - handled silently in production
    }
    // Database connected successfully - no console output in production
  });
}

// Initialize database tables
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create pending_users table
      db.run(`
        CREATE TABLE IF NOT EXISTS pending_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          registration_code TEXT UNIQUE,
          machine_serial TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          is_synced BOOLEAN DEFAULT 0,
          synced_at DATETIME,
          UNIQUE(username, machine_serial)
        )
      `, (err) => {
        if (err) reject(err);
      });

      // Add machine_serial column to pending_users if it doesn't exist
      db.run(`ALTER TABLE pending_users ADD COLUMN machine_serial TEXT`, (err) => {
        // Migration completed - column added or already exists
      });

      // Note: For existing databases, the UNIQUE constraint on username needs manual migration
      // New databases will have UNIQUE(username, machine_serial) constraint
      // This allows same username on different machines

      // Create admin_users table
      db.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
      });

      // Create sync_logs table for auditing
      db.run(`
        CREATE TABLE IF NOT EXISTS sync_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          ip_address TEXT,
          machine_serial TEXT,
          synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          success BOOLEAN,
          FOREIGN KEY (user_id) REFERENCES pending_users(id)
        )
      `, (err) => {
        if (err) reject(err);
      });

      // Add machine_serial column to sync_logs if it doesn't exist
      db.run(`ALTER TABLE sync_logs ADD COLUMN machine_serial TEXT`, (err) => {
        // Migration completed - column added or already exists
      });

      // Create password_reset_logs table for auditing
      db.run(`
        CREATE TABLE IF NOT EXISTS password_reset_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          ip_address TEXT,
          machine_serial TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          success BOOLEAN,
          FOREIGN KEY (user_id) REFERENCES pending_users(id)
        )
      `, (err) => {
        if (err) reject(err);
      });

      // Add machine_serial column to password_reset_logs if it doesn't exist
      db.run(`ALTER TABLE password_reset_logs ADD COLUMN machine_serial TEXT`, (err) => {
        // Migration completed - column added or already exists
      });

      // Create packages table
      db.run(`
        CREATE TABLE IF NOT EXISTS packages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          amount REAL NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
      });

      // Create user_packages table
      // Note: package_id can be NULL for custom balance adjustments
      db.run(`
        CREATE TABLE IF NOT EXISTS user_packages (
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
        if (err) reject(err);
      });

      // Create device licensing tables
      db.run(`
        CREATE TABLE IF NOT EXISTS authorized_devices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          device_serial TEXT UNIQUE NOT NULL,
          device_name TEXT,
          device_fingerprint TEXT,
          license_type TEXT DEFAULT 'standard',
          expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_access DATETIME,
          access_count INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT 1
        )
      `, (err) => {
        if (err) reject(err);
      });

      // Create device access logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS device_access_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          device_serial TEXT NOT NULL,
          device_fingerprint TEXT,
          success BOOLEAN NOT NULL,
          message TEXT,
          accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
      });

      // Create balance_sync_logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS balance_sync_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          amount_synced REAL,
          ip_address TEXT,
          machine_serial TEXT,
          synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES pending_users(id)
        )
      `, (err) => {
        if (err) reject(err);
        else {
          // Add machine_serial column to balance_sync_logs if it doesn't exist
          db.run(`ALTER TABLE balance_sync_logs ADD COLUMN machine_serial TEXT`, (alterErr) => {
            // Migration completed - column added or already exists
          });

          // Insert default packages if table is empty
          db.get('SELECT COUNT(*) as count FROM packages', [], (err, row) => {
            if (!err && row.count === 0) {
              const defaultPackages = [
                { name: '100 ብር Package', amount: 100, description: 'Small package' },
                { name: '500 ብር Package', amount: 500, description: 'Medium package' },
                { name: '1000 ብር Package', amount: 1000, description: 'Large package' },
                { name: '2000 ብር Package', amount: 2000, description: 'Extra large package' },
                { name: '5000 ብር Package', amount: 5000, description: 'Premium package' }
              ];
              
              const stmt = db.prepare('INSERT INTO packages (name, amount, description) VALUES (?, ?, ?)');
              defaultPackages.forEach(pkg => {
                stmt.run(pkg.name, pkg.amount, pkg.description);
              });
              stmt.finalize();
            }
          });
          resolve();
        }
      });

      // Create user_balances table for real-time balance tracking
      db.run(`
        CREATE TABLE IF NOT EXISTS user_balances (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE,
          current_balance REAL DEFAULT 0,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES pending_users(id)
        )
      `, (err) => {
        // User balances table created or already exists
      });

      // Create OTP table for admin login security
      db.run(`
        CREATE TABLE IF NOT EXISTS admin_otp (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          email TEXT NOT NULL,
          otp_code TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          used BOOLEAN DEFAULT 0,
          attempts INTEGER DEFAULT 0,
          ip_address TEXT,
          user_agent TEXT
        )
      `, (err) => {
        // OTP table created or already exists
      });

      // Create password change logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS password_change_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        // Password change logs table created or already exists
      });
    });
  });
};

module.exports = {
  db,
  initDatabase
};
