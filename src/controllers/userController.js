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

    if (!machineSerial || machineSerial.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Machine serial number is required'
      });
    }

    // Get user from database by username + machine serial
    // (ensures we return the correct address for the device)
    const user = await User.getByUsernameAndSerial(username, machineSerial.trim());

    if (!user) {
      // Log failed attempt
      logSync(null, ipAddress, 'no-device-check', false);
      return res.status(404).json({
        success: false,
        message: 'User not found. Please contact administrator.'
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
      logSync(user.id, ipAddress, 'no-device-check', false);
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Mark as synced
    await User.markAsSynced(user.id);

    // Log successful sync
    logSync(user.id, ipAddress, 'no-device-check', true);

    // Log address info for debugging
    console.log(`📍 User address from DB: "${user.address}" (type: ${typeof user.address})`);
    
    // Ensure address is properly handled
    const userAddress = user.address !== undefined && user.address !== null && user.address !== '' 
      ? String(user.address).trim() 
      : null;
    
    console.log(`📍 Processed address: "${userAddress}"`);

    // Return user data with plain text password and creation timestamp
    res.json({
      success: true,
      message: 'User synced successfully',
      user: {
        id: user.id,
        username: user.username,
        password: password, // Return plain text password instead of hash
        address: userAddress,
        phone: user.phone || null, // Include phone if column exists, null otherwise
        updated_at: user.created_at // Use created_at since updated_at doesn't exist in production
      }
    });
  } catch (error) {
    console.error('Sync user error:', error);
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
    const { username, password, machineSerial, expiresInDays, address } = req.body;

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
    const user = await User.createWithMachineSerial(
      username,
      passwordHash,
      machineSerial.trim(),
      expiresAt,
      address ? address.trim() : null
    );

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
    console.log('Getting stats...');
    const stats = await User.getStats();
    console.log('Stats retrieved:', stats);
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
// Check if user data has been updated since last sync
const checkUserUpdates = async (req, res) => {
    try {
        const { username, machineSerial, currentAddress, currentPhone } = req.body;

        if (!username || !machineSerial) {
            return res.status(400).json({
                success: false,
                message: 'Username and machine serial are required'
            });
        }

        // Get user from database
        const user = await User.getByUsernameAndSerial(username, machineSerial.trim());

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prepare server data
        const serverAddress = user.address !== undefined && user.address !== null && user.address !== ''
            ? String(user.address).trim()
            : null;

        const serverPhone = user.phone !== undefined && user.phone !== null && user.phone !== ''
            ? String(user.phone).trim()
            : null;

        // Normalize current data from client
        const clientAddress = currentAddress && String(currentAddress).trim() !== '' 
            ? String(currentAddress).trim() 
            : null;
            
        const clientPhone = currentPhone && String(currentPhone).trim() !== '' 
            ? String(currentPhone).trim() 
            : null;

        // Compare server data with client data to determine if update is needed
        const addressChanged = serverAddress !== clientAddress;
        const phoneChanged = serverPhone !== clientPhone;
        const needsUpdate = addressChanged || phoneChanged;

        console.log(`📋 Update check for ${username}:`);
        console.log(`   Server address: "${serverAddress}" | Client address: "${clientAddress}" | Changed: ${addressChanged}`);
        console.log(`   Server phone: "${serverPhone}" | Client phone: "${clientPhone}" | Changed: ${phoneChanged}`);
        console.log(`   Update needed: ${needsUpdate}`);

        res.json({
            success: true,
            needsUpdate: needsUpdate,
            user: {
                id: user.id,
                username: user.username,
                address: serverAddress,
                phone: serverPhone,
                updated_at: user.created_at // Use created_at since updated_at doesn't exist
            }
        });

    } catch (error) {
        console.error('Check user updates error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
// Update user data (address and phone - username is read-only)
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { address, phone } = req.body;

        // Only address and phone can be updated - username is read-only for security
        const trimmedAddress = address ? address.trim() : null;
        const trimmedPhone = phone ? phone.trim() : null;

        // Try to update both address and phone, with fallback for missing phone column
        const updateWithPhoneSql = 'UPDATE pending_users SET address = ?, phone = ? WHERE id = ?';
        const updateAddressOnlySql = 'UPDATE pending_users SET address = ? WHERE id = ?';

        // First try with phone column
        db.run(updateWithPhoneSql, [trimmedAddress, trimmedPhone, id], function(err) {
            if (err && err.message.includes('column "phone" of relation "pending_users" does not exist')) {
                // Phone column doesn't exist, fallback to address only
                console.log('⚠️ Phone column not found, updating address only');
                
                db.run(updateAddressOnlySql, [trimmedAddress, id], function(fallbackErr) {
                    if (fallbackErr) {
                        console.error('Database error updating user (fallback):', fallbackErr);
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
                        message: 'User address updated successfully (phone not supported)'
                    });
                });
            } else if (err) {
                console.error('Database error updating user:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            } else {
                if (this.changes === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }

                res.json({
                    success: true,
                    message: 'User information updated successfully'
                });
            }
        });

    } catch (error) {
        console.error('Update user error:', error);
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
  updateUser,
  checkUserUpdates,
  updateUserPassword,
  getPasswordResetLogs
};
