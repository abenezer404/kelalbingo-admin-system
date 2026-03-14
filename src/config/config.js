require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiKey: process.env.API_KEY || 'default-api-key-change-this',
  jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret-change-this',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123', // Fallback for development
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH, // Production hashed password
  adminEmail: process.env.ADMIN_EMAIL, // Admin email for OTP
  databasePath: process.env.DATABASE_PATH || './database/admin.db',
  jwtExpiresIn: '24h',
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100, // max requests per window
  
  // Email configuration for OTP
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    service: process.env.EMAIL_SERVICE || 'ethereal', // gmail, smtp, ethereal
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD
  },
  
  // OTP configuration
  otp: {
    enabled: process.env.OTP_ENABLED === 'true',
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 5,
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS) || 3
  },
  
  // Session configuration
  session: {
    inactivityTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 15,
    warningTimeMinutes: parseInt(process.env.SESSION_WARNING_MINUTES) || 2
  }
};
