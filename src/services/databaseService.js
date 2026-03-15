const { DatabaseAdapter } = require('../config/database-postgres');

class DatabaseService {
  constructor() {
    this.db = new DatabaseAdapter();
    this.initialized = false;
  }

  async init() {
    if (!this.initialized) {
      await this.db.init();
      this.initialized = true;
    }
    return this.db;
  }

  // User management
  async createUser(username, passwordHash, machineSerial, registrationCode = null) {
    if (this.db.isPostgres) {
      const sql = `
        INSERT INTO pending_users (username, password_hash, machine_serial, registration_code, is_synced)
        VALUES ($1, $2, $3, $4, $5) RETURNING id
      `;
      return await this.db.run(sql, [username, passwordHash, machineSerial, registrationCode, true]);
    } else {
      const sql = `
        INSERT INTO pending_users (username, password_hash, machine_serial, registration_code, is_synced)
        VALUES (?, ?, ?, ?, ?)
      `;
      return await this.db.run(sql, [username, passwordHash, machineSerial, registrationCode, true]);
    }
  }

  async getUserByUsername(username, machineSerial = null) {
    if (this.db.isPostgres) {
      let sql = 'SELECT * FROM pending_users WHERE username = $1';
      let params = [username];
      
      if (machineSerial) {
        sql += ' AND machine_serial = $2';
        params.push(machineSerial);
      }
      
      return await this.db.get(sql, params);
    } else {
      let sql = 'SELECT * FROM pending_users WHERE username = ?';
      let params = [username];
      
      if (machineSerial) {
        sql += ' AND machine_serial = ?';
        params.push(machineSerial);
      }
      
      return await this.db.get(sql, params);
    }
  }

  async getAllUsers() {
    const sql = 'SELECT id, username, machine_serial, created_at, is_synced FROM pending_users ORDER BY created_at DESC';
    return await this.db.query(sql);
  }

  async deleteUser(userId) {
    if (this.db.isPostgres) {
      const sql = 'DELETE FROM pending_users WHERE id = $1';
      return await this.db.run(sql, [userId]);
    } else {
      const sql = 'DELETE FROM pending_users WHERE id = ?';
      return await this.db.run(sql, [userId]);
    }
  }

  async updateUserPassword(userId, newPasswordHash) {
    if (this.db.isPostgres) {
      const sql = 'UPDATE pending_users SET password_hash = $1 WHERE id = $2';
      return await this.db.run(sql, [newPasswordHash, userId]);
    } else {
      const sql = 'UPDATE pending_users SET password_hash = ? WHERE id = ?';
      return await this.db.run(sql, [newPasswordHash, userId]);
    }
  }

  // Package management
  async createPackage(name, amount, description) {
    if (this.db.isPostgres) {
      const sql = 'INSERT INTO packages (name, amount, description, is_active) VALUES ($1, $2, $3, $4) RETURNING id';
      return await this.db.run(sql, [name, amount, description, true]);
    } else {
      const sql = 'INSERT INTO packages (name, amount, description, is_active) VALUES (?, ?, ?, ?)';
      return await this.db.run(sql, [name, amount, description, 1]);
    }
  }

  async getAllPackages() {
    if (this.db.isPostgres) {
      const sql = 'SELECT * FROM packages WHERE is_active = $1 ORDER BY amount ASC';
      return await this.db.query(sql, [true]);
    } else {
      const sql = 'SELECT * FROM packages WHERE is_active = ? ORDER BY amount ASC';
      return await this.db.query(sql, [1]);
    }
  }

  async assignPackage(userId, packageId, amount, assignedBy) {
    if (this.db.isPostgres) {
      const sql = `
        INSERT INTO user_packages (user_id, package_id, amount, assigned_by, is_redeemed)
        VALUES ($1, $2, $3, $4, $5) RETURNING id
      `;
      return await this.db.run(sql, [userId, packageId, amount, assignedBy, false]);
    } else {
      const sql = `
        INSERT INTO user_packages (user_id, package_id, amount, assigned_by, is_redeemed)
        VALUES (?, ?, ?, ?, ?)
      `;
      return await this.db.run(sql, [userId, packageId, amount, assignedBy, false]);
    }
  }

  async getUserPackages(userId) {
    if (this.db.isPostgres) {
      const sql = `
        SELECT up.*, p.name as package_name 
        FROM user_packages up 
        LEFT JOIN packages p ON up.package_id = p.id 
        WHERE up.user_id = $1 
        ORDER BY up.created_at DESC
      `;
      return await this.db.query(sql, [userId]);
    } else {
      const sql = `
        SELECT up.*, p.name as package_name 
        FROM user_packages up 
        LEFT JOIN packages p ON up.package_id = p.id 
        WHERE up.user_id = ? 
        ORDER BY up.created_at DESC
      `;
      return await this.db.query(sql, [userId]);
    }
  }

  async getPackageAssignments() {
    const sql = `
      SELECT up.*, u.username, p.name as package_name
      FROM user_packages up
      JOIN pending_users u ON up.user_id = u.id
      LEFT JOIN packages p ON up.package_id = p.id
      ORDER BY up.created_at DESC
      LIMIT 100
    `;
    return await this.db.query(sql);
  }

  // Device management
  async addAuthorizedDevice(deviceSerial, deviceName, licenseType, expiresAt) {
    if (this.db.isPostgres) {
      const sql = `
        INSERT INTO authorized_devices (device_serial, device_name, license_type, expires_at, is_active)
        VALUES ($1, $2, $3, $4, $5) RETURNING id
      `;
      return await this.db.run(sql, [deviceSerial, deviceName, licenseType, expiresAt, true]);
    } else {
      const sql = `
        INSERT INTO authorized_devices (device_serial, device_name, license_type, expires_at, is_active)
        VALUES (?, ?, ?, ?, ?)
      `;
      return await this.db.run(sql, [deviceSerial, deviceName, licenseType, expiresAt, 1]);
    }
  }

  async getAuthorizedDevices() {
    const sql = `
      SELECT device_serial, device_name, device_fingerprint, license_type, 
             expires_at, created_at, last_access, access_count, is_active
      FROM authorized_devices 
      ORDER BY created_at DESC
    `;
    return await this.db.query(sql);
  }

  async getAuthorizedDevice(deviceSerial) {
    if (this.db.isPostgres) {
      const sql = 'SELECT * FROM authorized_devices WHERE device_serial = $1 AND is_active = $2';
      return await this.db.get(sql, [deviceSerial, true]);
    } else {
      const sql = 'SELECT * FROM authorized_devices WHERE device_serial = ? AND is_active = ?';
      return await this.db.get(sql, [deviceSerial, 1]);
    }
  }

  async updateDeviceAccess(deviceSerial, deviceFingerprint = null) {
    if (this.db.isPostgres) {
      const sql = `
        UPDATE authorized_devices 
        SET device_fingerprint = $1, last_access = CURRENT_TIMESTAMP, access_count = access_count + 1
        WHERE device_serial = $2
      `;
      return await this.db.run(sql, [deviceFingerprint, deviceSerial]);
    } else {
      const sql = `
        UPDATE authorized_devices 
        SET device_fingerprint = ?, last_access = CURRENT_TIMESTAMP, access_count = access_count + 1
        WHERE device_serial = ?
      `;
      return await this.db.run(sql, [deviceFingerprint, deviceSerial]);
    }
  }

  async removeDevice(deviceSerial) {
    if (this.db.isPostgres) {
      const sql = 'UPDATE authorized_devices SET is_active = $1 WHERE device_serial = $2';
      return await this.db.run(sql, [false, deviceSerial]);
    } else {
      const sql = 'UPDATE authorized_devices SET is_active = ? WHERE device_serial = ?';
      return await this.db.run(sql, [0, deviceSerial]);
    }
  }

  async logDeviceAccess(deviceSerial, deviceFingerprint, success, message) {
    if (this.db.isPostgres) {
      const sql = `
        INSERT INTO device_access_logs (device_serial, device_fingerprint, success, message, accessed_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `;
      return await this.db.run(sql, [deviceSerial, deviceFingerprint, success, message]);
    } else {
      const sql = `
        INSERT INTO device_access_logs (device_serial, device_fingerprint, success, message, accessed_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      return await this.db.run(sql, [deviceSerial, deviceFingerprint, success ? 1 : 0, message]);
    }
  }

  async getDeviceAccessLogs(limit = 100) {
    if (this.db.isPostgres) {
      const sql = `
        SELECT device_serial, device_fingerprint, success, message, accessed_at
        FROM device_access_logs 
        ORDER BY accessed_at DESC 
        LIMIT $1
      `;
      return await this.db.query(sql, [limit]);
    } else {
      const sql = `
        SELECT device_serial, device_fingerprint, success, message, accessed_at
        FROM device_access_logs 
        ORDER BY accessed_at DESC 
        LIMIT ?
      `;
      return await this.db.query(sql, [limit]);
    }
  }

  // Statistics
  async getStats() {
    if (this.db.isPostgres) {
      const userCount = await this.db.get('SELECT COUNT(*) as count FROM pending_users');
      const packageCount = await this.db.get('SELECT COUNT(*) as count FROM packages WHERE is_active = $1', [true]);
      const deviceCount = await this.db.get('SELECT COUNT(*) as count FROM authorized_devices WHERE is_active = $1', [true]);
      
      return {
        totalUsers: userCount?.count || 0,
        totalPackages: packageCount?.count || 0,
        totalDevices: deviceCount?.count || 0
      };
    } else {
      const userCount = await this.db.get('SELECT COUNT(*) as count FROM pending_users');
      const packageCount = await this.db.get('SELECT COUNT(*) as count FROM packages WHERE is_active = ?', [1]);
      const deviceCount = await this.db.get('SELECT COUNT(*) as count FROM authorized_devices WHERE is_active = ?', [1]);
      
      return {
        totalUsers: userCount?.count || 0,
        totalPackages: packageCount?.count || 0,
        totalDevices: deviceCount?.count || 0
      };
    }
  }

  // Initialize default data
  async initializeDefaultData() {
    console.log('🔄 Initializing default data...');
    
    // Check and create default packages
    let packageCount;
    if (this.db.isPostgres) {
      packageCount = await this.db.get('SELECT COUNT(*) as count FROM packages WHERE is_active = $1', [true]);
    } else {
      packageCount = await this.db.get('SELECT COUNT(*) as count FROM packages WHERE is_active = ?', [1]);
    }
    
    if (packageCount.count === 0) {
      console.log('📦 Creating default packages...');
      
      const defaultPackages = [
        { name: '100 ብር Package', amount: 100, description: 'Small package for beginners' },
        { name: '500 ብር Package', amount: 500, description: 'Medium package for regular players' },
        { name: '1000 ብር Package', amount: 1000, description: 'Large package for active players' },
        { name: '2000 ብር Package', amount: 2000, description: 'Extra large package for premium players' },
        { name: '5000 ብር Package', amount: 5000, description: 'Premium package for VIP players' }
      ];
      
      for (const pkg of defaultPackages) {
        await this.createPackage(pkg.name, pkg.amount, pkg.description);
        console.log(`✅ Created package: ${pkg.name}`);
      }
    }

    // Initialize default devices from environment variables
    const defaultDevices = process.env.DEFAULT_AUTHORIZED_DEVICES;
    if (defaultDevices) {
      try {
        const devices = JSON.parse(defaultDevices);
        console.log(`🔐 Initializing ${devices.length} default authorized devices...`);
        
        for (const device of devices) {
          const existing = await this.getAuthorizedDevice(device.serial);
          if (!existing) {
            await this.addAuthorizedDevice(
              device.serial,
              device.name || 'Default Device',
              device.licenseType || 'premium',
              device.expiresAt || null
            );
            console.log(`✅ Authorized device: ${device.serial} (${device.name || 'Default Device'})`);
          }
        }
      } catch (error) {
        console.error('Error parsing DEFAULT_AUTHORIZED_DEVICES:', error);
      }
    }

    console.log('✅ Default data initialization completed');
  }
}

// Singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;