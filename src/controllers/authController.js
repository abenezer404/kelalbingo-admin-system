const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { hashPassword, comparePassword } = require('../utils/hash');
const { db } = require('../config/database');
const emailService = require('../services/emailService');
const otpService = require('../services/otpService');

// In-memory session store (for production, use Redis or database)
const activeSessions = new Map();

// Session timeout in milliseconds
const SESSION_TIMEOUT = config.session.inactivityTimeoutMinutes * 60 * 1000;

/**
 * Generate session ID
 */
function generateSessionId() {
  return require('crypto').randomBytes(32).toString('hex');
}

/**
 * Create secure session
 */
function createSession(username, req) {
  const sessionId = generateSessionId();
  const session = {
    id: sessionId,
    username,
    createdAt: new Date(),
    lastActivity: new Date(),
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent') || 'Unknown'
  };
  
  activeSessions.set(sessionId, session);
  
  // Auto-cleanup expired sessions (configurable timeout)
  setTimeout(() => {
    activeSessions.delete(sessionId);
  }, SESSION_TIMEOUT);
  
  return sessionId;
}

/**
 * Validate session
 */
function validateSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (!session) return null;
  
  // Check if session expired (configurable timeout)
  const now = new Date();
  const inactivityLimit = SESSION_TIMEOUT;
  
  if (now - session.lastActivity > inactivityLimit) {
    activeSessions.delete(sessionId);
    return null;
  }
  
  // Update last activity
  session.lastActivity = now;
  return session;
}

/**
 * Admin login with 2FA (Password + OTP)
 * Step 1: Verify password and send OTP
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    let isValidUser = false;
    let validUsername = null;
    let adminEmail = null;

    // Check against environment variables first
    if (username === config.adminUsername) {
      // Use hashed password if available, otherwise fallback to plain text (development only)
      if (config.adminPasswordHash) {
        // Production: use hashed password
        isValidUser = await comparePassword(password, config.adminPasswordHash);
      } else {
        // Development fallback: plain text comparison
        isValidUser = password === config.adminPassword;
      }
      
      if (isValidUser) {
        validUsername = username;
        adminEmail = config.adminEmail;
      }
    }

    if (!isValidUser) {
      // Check database for additional admin users
      const sql = `SELECT * FROM admin_users WHERE username = ?`;
      
      return new Promise((resolve) => {
        db.get(sql, [username], async (err, admin) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message: 'Database error'
            });
          }

          if (admin && await comparePassword(password, admin.password_hash)) {
            isValidUser = true;
            validUsername = admin.username;
            adminEmail = admin.email;
          }

          if (isValidUser) {
            // Password is correct - proceed with OTP if enabled
            if (config.otp.enabled && adminEmail) {
              try {
                const otpResult = await otpService.generateAndSendOTP(
                  validUsername, 
                  adminEmail, 
                  ipAddress, 
                  userAgent
                );

                return res.json({
                  success: true,
                  requiresOTP: true,
                  message: 'Password verified. OTP sent to your email.',
                  otpSent: true,
                  expiresAt: otpResult.expiresAt,
                  username: validUsername
                });
              } catch (otpError) {
                return res.status(500).json({
                  success: false,
                  message: `OTP generation failed: ${otpError.message}`
                });
              }
            } else {
              // OTP disabled - direct login (not recommended for production)
              const token = jwt.sign(
                { 
                  username: validUsername,
                  role: 'admin'
                },
                config.jwtSecret,
                { expiresIn: config.jwtExpiresIn }
              );

              return res.json({
                success: true,
                message: 'Login successful',
                token: token,
                username: validUsername,
                requiresOTP: false
              });
            }
          } else {
            return res.status(401).json({
              success: false,
              message: 'Invalid username or password'
            });
          }
        });
      });
    } else {
      // Environment admin user - proceed with OTP if enabled
      if (config.otp.enabled && adminEmail) {
        try {
          const otpResult = await otpService.generateAndSendOTP(
            validUsername, 
            adminEmail, 
            ipAddress, 
            userAgent
          );

          return res.json({
            success: true,
            requiresOTP: true,
            message: 'Password verified. OTP sent to your email.',
            otpSent: true,
            expiresAt: otpResult.expiresAt,
            username: validUsername
          });
        } catch (otpError) {
          return res.status(500).json({
            success: false,
            message: `OTP generation failed: ${otpError.message}`
          });
        }
      } else {
        // OTP disabled or no email configured
        if (!adminEmail && config.otp.enabled) {
          return res.status(500).json({
            success: false,
            message: 'Admin email not configured. Cannot send OTP.'
          });
        }

        const token = jwt.sign(
          { 
            username: validUsername,
            role: 'admin'
          },
          config.jwtSecret,
          { expiresIn: config.jwtExpiresIn }
        );

        return res.json({
          success: true,
          message: 'Login successful',
          token: token,
          username: validUsername,
          requiresOTP: false
        });
      }
    }
  } catch (error) {
    // Login error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Verify OTP and complete login
 * Step 2: Verify OTP and issue JWT token
 */
const verifyOTP = async (req, res) => {
  try {
    const { username, otpCode } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!username || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Username and OTP code are required'
      });
    }

    // Verify OTP
    const otpResult = await otpService.verifyOTP(username, otpCode, ipAddress);

    if (otpResult.success) {
      // OTP verified - issue JWT token
      const token = jwt.sign(
        { 
          username: username,
          role: 'admin',
          otpVerified: true
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      // Send security notification (optional)
      if (config.adminEmail) {
        emailService.sendSecurityAlert(config.adminEmail, username, {
          event: 'Successful admin login with 2FA',
          timestamp: new Date().toISOString(),
          ip: ipAddress,
          userAgent: req.get('User-Agent') || 'Unknown'
        });
      }

      return res.json({
        success: true,
        message: 'Login completed successfully',
        token: token,
        username: username
      });
    }

  } catch (error) {
    // OTP verification error - handled by response
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Admin logout
 */
const logout = async (req, res) => {
  try {
    const sessionId = req.cookies.adminSession;
    
    if (sessionId) {
      // Remove session from memory
      activeSessions.delete(sessionId);
    }
    
    // Clear cookie
    res.clearCookie('adminSession', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    // Logout error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Check authentication status
 */
const checkAuth = async (req, res) => {
  try {
    const sessionId = req.cookies.adminSession;
    const session = validateSession(sessionId);
    
    if (session) {
      res.json({
        success: true,
        authenticated: true,
        username: session.username
      });
    } else {
      res.status(401).json({
        success: false,
        authenticated: false,
        message: 'Not authenticated'
      });
    }
  } catch (error) {
    // Auth check error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Change admin password (requires current password + 2FA)
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, otpCode } = req.body;
    const username = req.user.username; // From JWT token
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!currentPassword || !newPassword || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password, and OTP code are required'
      });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    // Verify current password first
    let isCurrentPasswordValid = false;
    
    // Check against environment admin
    if (username === config.adminUsername) {
      if (config.adminPasswordHash) {
        isCurrentPasswordValid = await comparePassword(currentPassword, config.adminPasswordHash);
      } else {
        isCurrentPasswordValid = currentPassword === config.adminPassword;
      }
    }

    if (!isCurrentPasswordValid) {
      // Check database admin users
      const sql = `SELECT * FROM admin_users WHERE username = ?`;
      const admin = await new Promise((resolve, reject) => {
        db.get(sql, [username], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (admin) {
        isCurrentPasswordValid = await comparePassword(currentPassword, admin.password_hash);
      }
    }

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Verify OTP for password change
    try {
      await otpService.verifyOTP(username, otpCode, ipAddress);
    } catch (otpError) {
      return res.status(400).json({
        success: false,
        message: `OTP verification failed: ${otpError.message}`
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password based on user type
    if (username === config.adminUsername) {
      // Environment admin - update .env file
      const success = await updateEnvPassword(newPasswordHash);
      if (!success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update environment password'
        });
      }
    } else {
      // Database admin - update database
      const updateSql = `UPDATE admin_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?`;
      await new Promise((resolve, reject) => {
        db.run(updateSql, [newPasswordHash, username], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Log password change
    logPasswordChange(username, ipAddress, req.get('User-Agent'));

    // Send security notification
    if (config.adminEmail) {
      emailService.sendSecurityAlert(config.adminEmail, username, {
        event: 'Password changed successfully',
        timestamp: new Date().toISOString(),
        ip: ipAddress,
        userAgent: req.get('User-Agent') || 'Unknown'
      });
    }

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again with your new password.'
    });

  } catch (error) {
    // Change password error - handled by response
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Request OTP for password change
 */
const requestPasswordChangeOTP = async (req, res) => {
  try {
    const username = req.user.username; // From JWT token
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';

    if (!config.adminEmail) {
      return res.status(500).json({
        success: false,
        message: 'Admin email not configured'
      });
    }

    // Generate and send OTP
    const otpResult = await otpService.generateAndSendOTP(
      username, 
      config.adminEmail, 
      ipAddress, 
      userAgent
    );

    res.json({
      success: true,
      message: 'OTP sent to your email for password change verification',
      expiresAt: otpResult.expiresAt
    });

  } catch (error) {
    // Password change OTP error - handled by response
    res.status(500).json({
      success: false,
      message: `Failed to send OTP: ${error.message}`
    });
  }
};
/**
 * Update environment password in .env file
 */
async function updateEnvPassword(newPasswordHash) {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '../../.env');
    
    if (!fs.existsSync(envPath)) {
      return false;
    }

    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update password hash
    if (envContent.includes('ADMIN_PASSWORD_HASH=')) {
      envContent = envContent.replace(/ADMIN_PASSWORD_HASH=.*$/m, `ADMIN_PASSWORD_HASH=${newPasswordHash}`);
    } else {
      envContent += `\nADMIN_PASSWORD_HASH=${newPasswordHash}\n`;
    }
    
    // Comment out plain text password if it exists
    if (envContent.includes('ADMIN_PASSWORD=') && !envContent.includes('# ADMIN_PASSWORD=')) {
      envContent = envContent.replace(/^ADMIN_PASSWORD=/m, '# ADMIN_PASSWORD=');
    }
    
    fs.writeFileSync(envPath, envContent);
    
    // Update config in memory (requires restart for full effect)
    config.adminPasswordHash = newPasswordHash;
    
    return true;
  } catch (error) {
    // Error updating .env password - handled by return value
    return false;
  }
}

/**
 * Log password change for audit trail
 */
function logPasswordChange(username, ipAddress, userAgent) {
  const sql = `INSERT INTO password_change_logs (username, ip_address, user_agent, changed_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`;
  db.run(sql, [username, ipAddress, userAgent], (err) => {
    // Error logging removed for production
  });
}

/**
 * Update session activity (keep session alive)
 */
const updateActivity = async (req, res) => {
  try {
    const sessionId = req.cookies.adminSession;
    const session = validateSession(sessionId);
    
    if (session) {
      res.json({
        success: true,
        message: 'Activity updated',
        expiresIn: SESSION_TIMEOUT,
        timeoutMinutes: config.session.inactivityTimeoutMinutes
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Session expired',
        expired: true
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get session configuration
 */
const getSessionConfig = async (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        timeoutMinutes: config.session.inactivityTimeoutMinutes,
        warningMinutes: config.session.warningTimeMinutes,
        timeoutMs: SESSION_TIMEOUT,
        warningMs: config.session.warningTimeMinutes * 60 * 1000
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  login,
  verifyOTP,
  changePassword,
  requestPasswordChangeOTP,
  logout,
  checkAuth,
  updateActivity,
  getSessionConfig,
  validateSession,
  activeSessions
};