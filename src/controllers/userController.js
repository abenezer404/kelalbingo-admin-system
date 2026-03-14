const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/hash');
const { validateUsername, validatePassword } = require('../utils/validator');
const { db } = require('../config/database');

/**
 * Sync user from server to desktop app
 */
const syncUser = async (req, res) => {
  try {
    const { username, password, machineSerial } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Validate input
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return res.status(400).json({
        success: false,
        message: usernameValidation.message
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Validate machine serial
    if (!machineSerial) {
      logSync(null, ipAddress, machineSerial, false);
      return res.status(400).json({
        success: false,
        message: 'Machine serial number is required'
      });
    }

    // Get user from database by username and machine serial
    const user = await User.getByUsernameAndSerial(username, machineSerial);

    if (!user) {
      // Log failed attempt
      logSync(null, ipAddress, machineSerial, false);
      return res.status(404).json({
        success: false,
        message: 'User not found for this machine. Please contact administrator.'
      });
    }

    // Check if expired
    if (user.expires_at) {
      const expiryDate = new Date(user.expires_at);
      if (expiryDate < new Date()) {
        return res.status(403).json({
          success: false,
          message: 'Registration has expired. Please contact administrator.'
        });
      }
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      logSync(user.id, ipAddress, machineSerial, false);
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // User found with correct serial and password - no additional serial validation needed
    // since we already looked up by username+serial combination

    // Mark as synced
    await User.markAsSynced(user.id);

    // Log successful sync
    logSync(user.id, ipAddress, machineSerial, true);

    // Return user data
    res.json({
      success: true,
      message: 'User synced successfully',
      user: {
        id: user.id,
        username: user.username,
        password_hash: user.password_hash
      }
    });
  } catch (error) {
    // Sync user error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Reset user password from server
 */
const resetPassword = async (req, res) => {
  try {
    const { username, machineSerial } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Validate input
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return res.status(400).json({
        success: false,
        message: usernameValidation.message
      });
    }

    // Validate machine serial
    if (!machineSerial) {
      logPasswordReset(null, ipAddress, machineSerial, false);
      return res.status(400).json({
        success: false,
        message: 'Machine serial number is required'
      });
    }

    // Get user from database by username and machine serial
    const user = await User.getByUsernameAndSerial(username, machineSerial);

    if (!user) {
      // Log failed attempt
      logPasswordReset(null, ipAddress, machineSerial, false);
      return res.status(404).json({
        success: false,
        message: 'User not found for this machine. Please contact administrator.'
      });
    }

    // Check if expired
    if (user.expires_at) {
      const expiryDate = new Date(user.expires_at);
      if (expiryDate < new Date()) {
        return res.status(403).json({
          success: false,
          message: 'Account has expired. Please contact administrator.'
        });
      }
    }

    // User found with correct serial - no additional serial validation needed
    // since we already looked up by username+serial combination

    // Log successful password reset request
    logPasswordReset(user.id, ipAddress, machineSerial, true);

    // Return user data with password hash (client will update local database)
    res.json({
      success: true,
      message: 'Password retrieved successfully',
      user: {
        id: user.id,
        username: user.username,
        password_hash: user.password_hash
      }
    });
  } catch (error) {
    // Reset password error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Create new user (admin only)
 */
const createUser = async (req, res) => {
  try {
    const { username, password, machineSerial, expiresInDays } = req.body;

    // Validate input
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return res.status(400).json({
        success: false,
        message: usernameValidation.message
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Validate machine serial
    if (!machineSerial || machineSerial.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Machine serial number is required'
      });
    }

    // Check if username already exists on this machine serial
    const existingUser = await User.getByUsernameAndSerial(username, machineSerial.trim());
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists on this machine'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Calculate expiry date if provided
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
      expiresAt = expiresAt.toISOString();
    }

    // Create user with machine serial
    const user = await User.createWithMachineSerial(username, passwordHash, machineSerial.trim(), expiresAt);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        username: user.username,
        machineSerial: machineSerial.trim()
      }
    });
  } catch (error) {
    // Create user error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get all users (admin only)
 */
const listUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    res.json({
      success: true,
      users
    });
  } catch (error) {
    // List users error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Delete user (admin only)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const result = await User.delete(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    // Delete user error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get statistics (admin only)
 */
const getStats = async (req, res) => {
  try {
    const stats = await User.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    // Get stats error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Update user password (admin only)
 */
const updateUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Hash the new password
    const passwordHash = await hashPassword(newPassword);

    // Update password in database
    const sql = `UPDATE pending_users SET password_hash = ? WHERE id = ?`;
    db.run(sql, [passwordHash, id], function(err) {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Password updated successfully'
      });
    });
  } catch (error) {
    // Update password error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get password reset logs (admin only)
 */
const getPasswordResetLogs = async (req, res) => {
  try {
    const sql = `
      SELECT 
        prl.id,
        prl.user_id,
        pu.username,
        prl.ip_address,
        prl.machine_serial,
        prl.created_at,
        prl.success
      FROM password_reset_logs prl
      LEFT JOIN pending_users pu ON prl.user_id = pu.id
      ORDER BY prl.created_at DESC
      LIMIT 50
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
    // Get password reset logs error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Helper function to log sync attempts
 */
const logSync = (userId, ipAddress, machineSerial, success) => {
  const sql = `INSERT INTO sync_logs (user_id, ip_address, machine_serial, success) VALUES (?, ?, ?, ?)`;
  db.run(sql, [userId, ipAddress, machineSerial, success ? 1 : 0], (err) => {
    // Error logging removed for production
  });
};

/**
 * Helper function to log password reset attempts
 */
const logPasswordReset = (userId, ipAddress, machineSerial, success) => {
  const sql = `INSERT INTO password_reset_logs (user_id, ip_address, machine_serial, success, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
  db.run(sql, [userId, ipAddress, machineSerial, success ? 1 : 0], (err) => {
    // Error logging removed for production
  });
};

module.exports = {
  syncUser,
  resetPassword,
  createUser,
  listUsers,
  deleteUser,
  getStats,
  updateUserPassword,
  getPasswordResetLogs
};
