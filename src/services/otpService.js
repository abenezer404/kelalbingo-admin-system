const { db } = require('../config/database');
const emailService = require('./emailService');
const config = require('../config/config');

/**
 * OTP Service for admin login security
 */
class OTPService {
  
  /**
   * Generate and send OTP to admin email
   */
  async generateAndSendOTP(username, email, ipAddress, userAgent) {
    try {
      // Clean up expired OTPs first
      await this.cleanupExpiredOTPs();
      
      // Check if there's a recent valid OTP (prevent spam)
      const recentOTP = await this.getRecentOTP(username);
      if (recentOTP) {
        const timeDiff = (Date.now() - new Date(recentOTP.created_at).getTime()) / 1000;
        if (timeDiff < 60) { // 1 minute cooldown
          throw new Error('Please wait before requesting a new OTP');
        }
      }

      // Generate new OTP
      const otpCode = emailService.generateOTP();
      const expiresAt = new Date(Date.now() + (config.otp.expiryMinutes * 60 * 1000));

      // Store OTP in database
      const otpId = await this.storeOTP(username, email, otpCode, expiresAt, ipAddress, userAgent);

      // Send OTP via email
      const emailResult = await emailService.sendOTP(email, otpCode, username);

      return {
        success: true,
        otpId: otpId,
        expiresAt: expiresAt,
        emailResult: emailResult
      };

    } catch (error) {
      // OTP generation error - handled by throwing
      throw error;
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(username, otpCode, ipAddress) {
    try {
      // Get the latest valid OTP for this username
      const otp = await this.getValidOTP(username);
      
      if (!otp) {
        throw new Error('No valid OTP found. Please request a new one.');
      }

      // Check if OTP is expired
      if (new Date() > new Date(otp.expires_at)) {
        await this.markOTPAsUsed(otp.id);
        throw new Error('OTP has expired. Please request a new one.');
      }

      // Check if OTP is already used
      if (otp.used) {
        throw new Error('OTP has already been used. Please request a new one.');
      }

      // Check attempt limit
      if (otp.attempts >= config.otp.maxAttempts) {
        await this.markOTPAsUsed(otp.id);
        throw new Error('Too many failed attempts. Please request a new OTP.');
      }

      // Verify OTP code
      if (otp.otp_code !== otpCode) {
        await this.incrementOTPAttempts(otp.id);
        throw new Error('Invalid OTP code. Please try again.');
      }

      // OTP is valid - mark as used
      await this.markOTPAsUsed(otp.id);

      return {
        success: true,
        message: 'OTP verified successfully'
      };

    } catch (error) {
      // OTP verification error - handled by throwing
      throw error;
    }
  }

  /**
   * Store OTP in database
   */
  storeOTP(username, email, otpCode, expiresAt, ipAddress, userAgent) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO admin_otp (username, email, otp_code, expires_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      db.run(sql, [username, email, otpCode, expiresAt.toISOString(), ipAddress, userAgent], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Get recent OTP for spam prevention
   */
  getRecentOTP(username) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM admin_otp 
        WHERE username = ? AND used = 0 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      db.get(sql, [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Get valid OTP for verification
   */
  getValidOTP(username) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM admin_otp 
        WHERE username = ? AND used = 0 AND expires_at > datetime('now')
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      db.get(sql, [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Mark OTP as used
   */
  markOTPAsUsed(otpId) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE admin_otp SET used = 1 WHERE id = ?`;
      
      db.run(sql, [otpId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Increment OTP attempts
   */
  incrementOTPAttempts(otpId) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE admin_otp SET attempts = attempts + 1 WHERE id = ?`;
      
      db.run(sql, [otpId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Clean up expired OTPs
   */
  cleanupExpiredOTPs() {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM admin_otp WHERE expires_at < datetime('now') OR used = 1`;
      
      db.run(sql, [], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get OTP statistics for monitoring
   */
  async getOTPStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as total_otps,
          COUNT(CASE WHEN used = 1 THEN 1 END) as used_otps,
          COUNT(CASE WHEN expires_at < datetime('now') THEN 1 END) as expired_otps,
          COUNT(CASE WHEN attempts >= ? THEN 1 END) as failed_otps
        FROM admin_otp 
        WHERE created_at > datetime('now', '-24 hours')
      `;
      
      db.get(sql, [config.otp.maxAttempts], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
}

module.exports = new OTPService();