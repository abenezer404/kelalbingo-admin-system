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
    const sql = `
      INSERT INTO pending_users (username, password_hash, machine_serial, registration_code, is_synced)
      VALUES (?, ?, ?, ?, ?)
    `;
    return await this.db.run(sql, [username, passwordHash, machineSerial, registrationCode, true]);
  }

  async getUserByUsername(username, machineSerial = null) {
    let sql = 'SELECT * FROM pending_users WHERE username = ?';
    let params = [username];
    
    if (machineSerial) {
      sql += ' AND machine_serial = ?';
      params.push(machineSerial);
    }
    
    return await this.db.get(sql, params);
  }

  async getAllUsers() {
    const sql = 'SELECT id, username, machine_serial, created_at, is_synced FROM pending_users ORDER BY created_at DESC';
    return await this.db.query(sql);
  }

  async deleteUser(userId) {
    const sql = 'DELETE FROM pending_users WHERE id = ?';
    return await this.db.run(sql, [userId]);
  }

  async updateUserPassword(userId, newPasswordHash) {
    const sql = 'UPDATE pending_users SET password_hash = ? WHERE id = ?';
    return await this.db.run(sql, [newPasswordHash, userId]);
  }

  // Package management
  async createPackage(name, amount, description) {
    const sql = 'INSERT INTO packages (name, amount, description, is_active) VALUES (?, ?, ?, ?)';
    return await this.db.run(sql, [name, amount, description, true]);
  }

  async getAllPackages() {
    const sql = 'SELECT * FROM packages WHERE is_active = ? ORDER BY amount ASC';
    return await this.db.query(sql, [true]);
  }

  async assignPackage(userId, packageId, amount, assignedBy) {
    const sql = `
      INSERT INTO user_packages (user_id, package_id, amount, assigned_by, is_redeemed)
      VALUES (?, ?, ?, ?, ?)
    `;
    return await this.db.run(sql, [userId, packageId, amount, assignedBy, false]);
  }

  async getUserPackages(userId) {
    const sql = `
      SELECT up.*, p.name as package_name 
      FROM user_packages up 
      LEFT JOIN packages p ON up.package_id = p.id 
      WHERE up.user_id = ? 
      ORDER BY up.created_at DESC
    `;
    return await this.db.query(sql, [userId]);
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
    const sql = `
      INSERT INTO authorized_devices (device_serial, device_name, license_type, expires_at, is_active)
      VALUES (?, ?, ?, ?, ?)
    `;
    return await this.db.run(sql, [deviceSerial, deviceName, licenseType, expiresAt, true]);
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
    const sql = 'SELECT * FROM authorized_devices WHERE device_serial = ? AND is_active = ?';
    return await this.db.get(sql, [deviceSerial, true]);
  }

  async updateDeviceAccess(deviceSerial, deviceFingerprint = null) {
    const sql = `
      UPDATE authorized_devices 
      SET device_fingerprint = ?, last_access = CURRENT_TIMESTAMP, access_count = access_count + 1
      WHERE device_serial = ?
    `;
    return await this.db.run(sql, [deviceFingerprint, deviceSerial]);
  }

  async removeDevice(deviceSerial) {
    const sql = 'UPDATE authorized_devices SET is_active = ? WHERE device_serial = ?';
    return await this.db.run(sql, [false, deviceSerial]);
  }

  async logDeviceAccess(deviceSerial, deviceFingerprint, success, message) {
    const sql = `
      INSERT INTO device_access_logs (device_serial, device_fingerprint, success, message, accessed_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    return await this.db.run(sql, [deviceSerial, deviceFingerprint, success ? 1 : 0, message]);
  }

  async getDeviceAccessLogs(limit = 100) {
    const sql = `
      SELECT device_serial, device_fingerprint, success, message, accessed_at
      FROM device_access_logs 
      ORDER BY accessed_at DESC 
      LIMIT ?
    `;
    return await this.db.query(sql, [limit]);
  }

  // Statistics
  async getStats() {
    const userCount = await this.db.get('SELECT COUNT(*) as count FROM pending_users');
    const packageCount = await this.db.get('SELECT COUNT(*) as count FROM packages WHERE is_active = ?', [true]);
    const deviceCount = await this.db.get('SELECT COUNT(*) as count FROM authorized_devices WHERE is_active = ?', [true]);
    
    return {
      totalUsers: userCount?.count || 0,
      totalPackages: packageCount?.count || 0,
      totalDevices: deviceCount?.count || 0
    };
  }

  // Initialize default data
  async initializeDefaultData() {
    console.log('🔄 Initializing default data...');
    
    // Check and create default packages
    const packageCount = await this.db.get('SELECT COUNT(*) as count FROM packages WHERE is_active = ?', [true]);
    
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