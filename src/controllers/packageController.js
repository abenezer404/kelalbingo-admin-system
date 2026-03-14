const { db } = require('../config/database');

/**
 * Get all packages
 */
const getPackages = async (req, res) => {
  try {
    const sql = `SELECT * FROM packages WHERE is_active = 1 ORDER BY amount ASC`;
    
    db.all(sql, [], (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      res.json({
        success: true,
        packages: rows
      });
    });
  } catch (error) {
    // Get packages error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Assign package to user (admin only)
 */
const assignPackage = async (req, res) => {
  try {
    const { userId, packageId } = req.body;

    if (!userId || !packageId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Package ID are required'
      });
    }

    // Get package details
    db.get('SELECT * FROM packages WHERE id = ?', [packageId], (err, pkg) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (!pkg) {
        return res.status(404).json({
          success: false,
          message: 'Package not found'
        });
      }

      // Assign package to user
      const sql = `INSERT INTO user_packages (user_id, package_id, amount, assigned_by) VALUES (?, ?, ?, ?)`;
      const adminUsername = req.user?.username || 'admin';
      
      db.run(sql, [userId, packageId, pkg.amount, adminUsername], function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Failed to assign package'
          });
        }

        res.json({
          success: true,
          message: 'Package assigned successfully',
          packageAssignment: {
            id: this.lastID,
            userId,
            packageId,
            amount: pkg.amount
          }
        });
      });
    });
  } catch (error) {
    // Assign package error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get user's unredeemed packages
 */
const getUserPackages = async (req, res) => {
  try {
    const { userId } = req.params;

    const sql = `
      SELECT 
        up.id,
        up.amount,
        up.is_redeemed,
        up.created_at,
        p.name as package_name,
        p.description
      FROM user_packages up
      LEFT JOIN packages p ON up.package_id = p.id
      WHERE up.user_id = ?
      ORDER BY up.created_at DESC
    `;
    
    db.all(sql, [userId], (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      res.json({
        success: true,
        packages: rows
      });
    });
  } catch (error) {
    // Get user packages error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Sync balance - get unredeemed packages for user (API for desktop app)
 */
const syncBalance = async (req, res) => {
  try {
    const { username, machineSerial } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    // Validate machine serial
    if (!machineSerial) {
      return res.status(400).json({
        success: false,
        message: 'Machine serial number is required'
      });
    }

    // Get user by username and machine serial
    db.get('SELECT id, machine_serial FROM pending_users WHERE username = ? AND machine_serial = ?', [username, machineSerial], (err, user) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found for this machine'
        });
      }

      // User found with correct serial - no additional validation needed

      // Get unredeemed packages (including custom adjustments with NULL package_id)
      const sql = `
        SELECT 
          up.id,
          up.amount,
          p.name as package_name
        FROM user_packages up
        LEFT JOIN packages p ON up.package_id = p.id
        WHERE up.user_id = ? AND up.is_redeemed = 0
        ORDER BY up.created_at ASC
      `;
      
      db.all(sql, [user.id], (err, packages) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        // Calculate total unredeemed balance
        const totalBalance = packages.reduce((sum, pkg) => sum + pkg.amount, 0);

        // Mark packages as redeemed
        if (packages.length > 0) {
          const packageIds = packages.map(p => p.id).join(',');
          const updateSql = `UPDATE user_packages SET is_redeemed = 1, redeemed_at = CURRENT_TIMESTAMP WHERE id IN (${packageIds})`;
          
          db.run(updateSql, [], (err) => {
            // Error logging removed for production
          });

          // Log balance sync
          db.run('INSERT INTO balance_sync_logs (user_id, amount_synced, ip_address, machine_serial) VALUES (?, ?, ?, ?)', 
            [user.id, totalBalance, ipAddress, machineSerial]);
        }

        res.json({
          success: true,
          balance: totalBalance,
          packages: packages,
          message: packages.length > 0 ? `${packages.length} package(s) redeemed` : 'No new packages'
        });
      });
    });
  } catch (error) {
    // Sync balance error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get balance sync logs (admin only)
 */
const getBalanceSyncLogs = async (req, res) => {
  try {
    const sql = `
      SELECT 
        bsl.id,
        bsl.user_id,
        bsl.amount_synced,
        bsl.ip_address,
        bsl.machine_serial,
        bsl.synced_at as created_at,
        pu.username
      FROM balance_sync_logs bsl
      LEFT JOIN pending_users pu ON bsl.user_id = pu.id
      ORDER BY bsl.synced_at DESC
      LIMIT 100
    `;
    
    db.all(sql, [], (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      res.json({
        success: true,
        logs: rows
      });
    });
  } catch (error) {
    // Get balance sync logs error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Report current balance from desktop app (API for desktop app)
 */
const reportBalance = async (req, res) => {
  try {
    const { username, machineSerial, currentBalance } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!username || !machineSerial || currentBalance === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Username, machine serial, and current balance are required'
      });
    }

    // Get user by username and machine serial
    db.get('SELECT id FROM pending_users WHERE username = ? AND machine_serial = ?', [username, machineSerial], (err, user) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update or insert balance
      const sql = `
        INSERT INTO user_balances (user_id, current_balance, last_updated)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
          current_balance = excluded.current_balance,
          last_updated = CURRENT_TIMESTAMP
      `;
      
      db.run(sql, [user.id, currentBalance], (err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Failed to update balance'
          });
        }

        res.json({
          success: true,
          message: 'Balance reported successfully'
        });
      });
    });
  } catch (error) {
    // Report balance error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get all package assignments (admin only)
 */
const getPackageAssignments = async (req, res) => {
  try {
    const sql = `
      SELECT 
        up.id,
        up.user_id,
        up.package_id,
        up.amount,
        up.is_redeemed,
        up.assigned_by,
        up.created_at,
        up.redeemed_at,
        pu.username,
        pu.machine_serial,
        p.name as package_name
      FROM user_packages up
      LEFT JOIN pending_users pu ON up.user_id = pu.id
      LEFT JOIN packages p ON up.package_id = p.id
      ORDER BY up.created_at DESC
      LIMIT 100
    `;
    
    db.all(sql, [], (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      res.json({
        success: true,
        assignments: rows
      });
    });
  } catch (error) {
    // Get package assignments error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Adjust user balance with custom amount (admin only)
 * Allows positive (add) or negative (deduct) amounts
 */
const adjustBalance = async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;

    if (!userId || amount === undefined || !reason) {
      return res.status(400).json({
        success: false,
        message: 'User ID, amount, and reason are required'
      });
    }

    if (amount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount cannot be zero'
      });
    }

    const adminUsername = req.user?.username || 'admin';
    const packageName = amount > 0 ? 'Balance Addition' : 'Balance Deduction';
    
    // Insert custom balance adjustment as a user package
    const sql = `INSERT INTO user_packages (user_id, package_id, amount, assigned_by) VALUES (?, NULL, ?, ?)`;
    
    db.run(sql, [userId, amount, adminUsername], function(err) {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Failed to adjust balance'
        });
      }

      res.json({
        success: true,
        message: 'Balance adjusted successfully',
        adjustment: {
          id: this.lastID,
          userId,
          amount,
          reason,
          assignedBy: adminUsername
        }
      });
    });
  } catch (error) {
    // Adjust balance error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Cancel/return a pending package (admin only)
 * Removes the package from pending list without applying it
 */
const cancelPendingPackage = async (req, res) => {
  try {
    const { packageAssignmentId } = req.body;

    if (!packageAssignmentId) {
      return res.status(400).json({
        success: false,
        message: 'Package assignment ID is required'
      });
    }

    // Check if package exists and is not redeemed
    db.get('SELECT * FROM user_packages WHERE id = ? AND is_redeemed = 0', [packageAssignmentId], (err, pkg) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (!pkg) {
        return res.status(404).json({
          success: false,
          message: 'Package not found or already redeemed'
        });
      }

      // Delete the pending package
      db.run('DELETE FROM user_packages WHERE id = ?', [packageAssignmentId], function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Failed to cancel package'
          });
        }

        res.json({
          success: true,
          message: 'Package cancelled successfully',
          cancelledPackage: {
            id: packageAssignmentId,
            amount: pkg.amount,
            userId: pkg.user_id
          }
        });
      });
    });
  } catch (error) {
    // Cancel pending package error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getPackages,
  assignPackage,
  getUserPackages,
  syncBalance,
  getBalanceSyncLogs,
  reportBalance,
  getPackageAssignments,
  adjustBalance,
  cancelPendingPackage
};
