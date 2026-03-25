const { db } = require('../config/database');

class User {
  /**
   * Create a new pending user
   */
  static create(username, passwordHash, expiresAt = null) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO pending_users (username, password_hash, expires_at) VALUES (?, ?, ?)`;
      db.run(sql, [username, passwordHash, expiresAt], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, username });
        }
      });
    });
  }

  /**
   * Create a new pending user with machine serial
   */
  static createWithMachineSerial(username, passwordHash, machineSerial, expiresAt = null) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO pending_users (username, password_hash, machine_serial, expires_at) VALUES (?, ?, ?, ?)`;
      db.run(sql, [username, passwordHash, machineSerial, expiresAt], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, username });
        }
      });
    });
  }

  /**
   * Get user by username and machine serial
   */
  static getByUsernameAndSerial(username, machineSerial) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM pending_users WHERE username = ? AND machine_serial = ?`;
      db.get(sql, [username, machineSerial], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Get user by username (for backward compatibility)
   */
  static getByUsername(username) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM pending_users WHERE username = ?`;
      db.get(sql, [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Get user by machine serial (returns first user, for checking if serial exists)
   */
  static getByMachineSerial(machineSerial) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM pending_users WHERE machine_serial = ? LIMIT 1`;
      db.get(sql, [machineSerial], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Count users on a machine serial
   */
  static countByMachineSerial(machineSerial) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT COUNT(*) as count FROM pending_users WHERE machine_serial = ?`;
      db.get(sql, [machineSerial], (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.count : 0);
      });
    });
  }

  /**
   * Get all users with balance information
   */
  static getAll() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          pu.id, 
          pu.username, 
          pu.machine_serial, 
          pu.created_at, 
          pu.expires_at, 
          pu.is_synced, 
          pu.synced_at,
          COALESCE(ub.current_balance, 0) as current_balance,
          ub.last_updated as balance_updated_at,
          COALESCE(
            (SELECT SUM(up.amount) 
             FROM user_packages up 
             WHERE up.user_id = pu.id AND up.is_redeemed = 1), 
            0
          ) as total_redeemed,
          COALESCE(
            (SELECT SUM(up.amount) 
             FROM user_packages up 
             WHERE up.user_id = pu.id AND up.is_redeemed = 0), 
            0
          ) as pending_balance
        FROM pending_users pu
        LEFT JOIN user_balances ub ON pu.id = ub.user_id
        ORDER BY pu.created_at DESC
      `;
      db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Mark user as synced
   */
  static markAsSynced(userId) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE pending_users SET is_synced = 1, synced_at = CURRENT_TIMESTAMP WHERE id = ?`;
      db.run(sql, [userId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  /**
   * Update machine serial for user
   */
  static updateMachineSerial(userId, machineSerial) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE pending_users SET machine_serial = ? WHERE id = ?`;
      db.run(sql, [machineSerial, userId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  /**
   * Delete user and all related records (required for PostgreSQL FK constraints)
   */
  static delete(userId) {
    const runSql = (sql, params) => new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });

    return new Promise(async (resolve, reject) => {
      try {
        // Delete related records first to satisfy foreign key constraints (PostgreSQL)
        await runSql(`DELETE FROM sync_logs WHERE user_id = ?`, [userId]);
        await runSql(`DELETE FROM password_reset_logs WHERE user_id = ?`, [userId]);
        await runSql(`DELETE FROM balance_sync_logs WHERE user_id = ?`, [userId]);
        await runSql(`DELETE FROM user_packages WHERE user_id = ?`, [userId]);
        await runSql(`DELETE FROM user_balances WHERE user_id = ?`, [userId]);

        // Now delete the user
        const result = await runSql(`DELETE FROM pending_users WHERE id = ?`, [userId]);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Check if user is synced
   */
  static isSynced(username) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT is_synced FROM pending_users WHERE username = ?`;
      db.get(sql, [username], (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.is_synced === 1 : false);
      });
    });
  }

  /**
   * Get statistics
   */
  static getStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_synced = 1 THEN 1 ELSE 0 END) as synced,
          SUM(CASE WHEN is_synced = 0 THEN 1 ELSE 0 END) as pending
        FROM pending_users
      `;
      db.get(sql, [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
}

module.exports = User;
