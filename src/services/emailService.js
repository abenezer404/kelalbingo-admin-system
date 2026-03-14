const nodemailer = require('nodemailer');
const crypto = require('crypto');
const config = require('../config/config');

/**
 * Email Service for sending OTP and notifications
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialize email transporter (called when needed)
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    if (!config.email.enabled) {
      // Email service disabled
      return;
    }

    try {
      // Gmail configuration (most common)
      if (config.email.service === 'gmail') {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: config.email.user,
            pass: config.email.password // App-specific password
          }
        });
      }
      // SMTP configuration (for custom email servers)
      else if (config.email.service === 'smtp') {
        this.transporter = nodemailer.createTransport({
          host: config.email.host,
          port: config.email.port,
          secure: config.email.secure, // true for 465, false for other ports
          auth: {
            user: config.email.user,
            pass: config.email.password
          }
        });
      }
      // Development mode - use Ethereal (fake SMTP)
      else if (config.email.service === 'ethereal') {
        const testAccount = await nodemailer.createTestAccount();
        
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });

        // Ethereal service ready for testing
      }

      this.initialized = true;
      // Email service initialized successfully
    } catch (error) {
      // Email service initialization error - handled by throwing
      throw error;
    }
  }

  /**
   * Generate 6-digit OTP
   */
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Send OTP email to admin
   */
  async sendOTP(email, otp, username) {
    // Initialize if not already done
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    const mailOptions = {
      from: `"KELALBINGO Admin" <${config.email.user || 'noreply@kelalbingo.com'}>`,
      to: email,
      subject: '🔐 KELALBINGO Admin Login - OTP Verification',
      html: this.getOTPEmailTemplate(otp, username)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      // For Ethereal, preview URL available but not logged in production
      // Preview URL logging removed for production

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: config.email.service === 'ethereal' ? nodemailer.getTestMessageUrl(info) : null
      };
    } catch (error) {
      // Email sending error - handled by throwing
      throw new Error('Failed to send OTP email');
    }
  }

  /**
   * HTML template for OTP email
   */
  getOTPEmailTemplate(otp, username) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>KELALBINGO Admin OTP</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; margin: 10px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎲 KELALBINGO</h1>
                <h2>Admin Login Verification</h2>
            </div>
            
            <div class="content">
                <p>Hello <strong>${username}</strong>,</p>
                
                <p>A login attempt was made to your KELALBINGO admin account. To complete the login process, please use the following One-Time Password (OTP):</p>
                
                <div class="otp-box">
                    <p>Your OTP Code:</p>
                    <div class="otp-code">${otp}</div>
                    <p><small>Valid for 5 minutes</small></p>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Security Notice:</strong>
                    <ul>
                        <li>This OTP is valid for <strong>5 minutes only</strong></li>
                        <li>Never share this code with anyone</li>
                        <li>If you didn't request this login, please secure your account immediately</li>
                        <li>This code can only be used once</li>
                    </ul>
                </div>
                
                <p>If you didn't attempt to log in, please ignore this email and consider changing your password.</p>
                
                <p>Best regards,<br>
                <strong>KELALBINGO Security Team</strong></p>
            </div>
            
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>© ${new Date().getFullYear()} KELALBINGO. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Send security alert email
   */
  async sendSecurityAlert(email, username, details) {
    try {
      // Initialize if not already done
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.transporter) {
        return;
      }

      const mailOptions = {
        from: `"KELALBINGO Security" <${config.email.user || 'noreply@kelalbingo.com'}>`,
        to: email,
        subject: '🚨 KELALBINGO Admin - Security Alert',
        html: `
          <h2>🚨 Security Alert</h2>
          <p>Hello ${username},</p>
          <p>We detected the following security event on your admin account:</p>
          <ul>
            <li><strong>Event:</strong> ${details.event}</li>
            <li><strong>Time:</strong> ${details.timestamp}</li>
            <li><strong>IP Address:</strong> ${details.ip}</li>
            <li><strong>User Agent:</strong> ${details.userAgent}</li>
          </ul>
          <p>If this was not you, please secure your account immediately.</p>
          <p>Best regards,<br>KELALBINGO Security Team</p>
        `
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      // Security alert email error - silently handled
    }
  }
}

module.exports = new EmailService();