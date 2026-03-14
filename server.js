const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./src/config/config');
const { initDatabase } = require('./src/config/database');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));
app.use(cors());

// Rate limiting - more lenient for admin routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // max 50 requests per window for API
  message: 'Too many API requests, please try again later'
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // max 200 requests per window for admin dashboard
  message: 'Too many requests, please try again later'
});

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes (before static files to avoid conflicts)
app.use('/api', apiLimiter, require('./src/routes/api'));
app.use('/admin', adminLimiter, require('./src/routes/admin'));

// Serve static files (admin portal) with proper MIME types
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: config.nodeEnv,
    version: require('./package.json').version || '1.0.0'
  });
});

// Error handler
app.use((err, req, res, next) => {
  // Error handled by response - logging removed for production
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Initialize database and start server
initDatabase()
  .then(() => {
    app.listen(config.port, () => {
      // Server started successfully - no console output in production
    });
  })
  .catch((err) => {
    // Database initialization error - exit process
    process.exit(1);
  });
