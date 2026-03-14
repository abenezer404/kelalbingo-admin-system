const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Middleware to verify JWT token for admin routes
 */
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token is required'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded; // Changed from req.admin to req.user for consistency
    next();
  } catch (error) {
    // Only log unexpected JWT errors, not malformed tokens (which are common)
    if (error.name !== 'JsonWebTokenError') {
      // JWT verification error - handled silently in production
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

module.exports = verifyToken;
