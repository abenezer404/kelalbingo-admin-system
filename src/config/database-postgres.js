const { Pool } = require('pg');
const config = require('./config');

// PostgreSQL connection pool
let pool = null;

const initPostgresPool = () => {
  if (pool) return pool;
  
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
  }
  
  pool = new Pool({
    connectionString: connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  return pool;
};

// PostgreSQL database initialization
const initPostgresDatabase = async () => {
  console.log('🐘 Initializing PostgreSQL database...');
  
  const client = initPostgresPool();
  
  try {
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS pending_users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        registration_code TEXT UNIQUE,
        machine_serial TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        is_synced BOOLEAN DEFAULT FALSE,
        synced_at TIMESTAMP,
        UNIQUE(username, machine_serial)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES pending_users(id),
        ip_address TEXT,
        machine_serial TEXT,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES pending_users(id),
        ip_address TEXT,
        machine_serial TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS packages (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        amount DECIMAL NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_packages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES pending_users(id),
        package_id INTEGER REFERENCES packages(id),
        amount DECIMAL NOT NULL,
        is_redeemed BOOLEAN DEFAULT FALSE,
        redeemed_at TIMESTAMP,
        assigned_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS authorized_devices (
        id SERIAL PRIMARY KEY,
        device_serial TEXT UNIQUE NOT NULL,
        device_name TEXT,
        device_fingerprint TEXT,
        license_type TEXT DEFAULT 'standard',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_access TIMESTAMP,
        access_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS device_access_logs (
        id SERIAL PRIMARY KEY,
        device_serial TEXT NOT NULL,
        device_fingerprint TEXT,
        success BOOLEAN NOT NULL,
        message TEXT,
        accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS balance_sync_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES pending_users(id),
        amount_synced DECIMAL,
        ip_address TEXT,
        machine_serial TEXT,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_balances (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES pending_users(id),
        current_balance DECIMAL DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_otp (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        otp_code TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        attempts INTEGER DEFAULT 0,
        ip_address TEXT,
        user_agent TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS password_change_logs (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ PostgreSQL database initialized successfully');
    return client;
    
  } catch (error) {
    console.error('❌ PostgreSQL initialization error:', error);
    throw error;
  }
};

// Database adapter that works with both SQLite and PostgreSQL
class DatabaseAdapter {
  constructor() {
    this.isPostgres = !!process.env.DATABASE_URL;
    this.client = null;
  }

  async init() {
    if (this.isPostgres) {
      this.client = await initPostgresDatabase();
    } else {
      // Use existing SQLite setup
      const { db } = require('./database');
      this.client = db;
    }
    return this.client;
  }

  // Unified query method
  async query(sql, params = []) {
    if (this.isPostgres) {
      // Convert SQLite-style queries to PostgreSQL
      const pgSql = this.convertSqlToPostgres(sql);
      const result = await this.client.query(pgSql, params);
      return result.rows;
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.client.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  }

  // Run a single query (INSERT, UPDATE, DELETE)
  async run(sql, params = []) {
    if (this.isPostgres) {
      const pgSql = this.convertSqlToPostgres(sql);
      const result = await this.client.query(pgSql, params);
      return { 
        lastID: result.rows[0]?.id,
        changes: result.rowCount 
      };
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.client.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ 
            lastID: this.lastID, 
            changes: this.changes 
          });
        });
      });
    }
  }

  // Get a single row
  async get(sql, params = []) {
    if (this.isPostgres) {
      const pgSql = this.convertSqlToPostgres(sql);
      const result = await this.client.query(pgSql, params);
      return result.rows[0] || null;
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.client.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      });
    }
  }

  // Convert SQLite queries to PostgreSQL compatible queries
  convertSqlToPostgres(sql) {
    return sql
      .replace(/AUTOINCREMENT/gi, '')
      .replace(/INTEGER PRIMARY KEY/gi, 'SERIAL PRIMARY KEY')
      .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
      .replace(/BOOLEAN DEFAULT 0/gi, 'BOOLEAN DEFAULT FALSE')
      .replace(/BOOLEAN DEFAULT 1/gi, 'BOOLEAN DEFAULT TRUE')
      .replace(/REAL/gi, 'DECIMAL');
  }
}

module.exports = {
  DatabaseAdapter,
  initPostgresDatabase,
  initPostgresPool
};