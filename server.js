const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./src/config/config');
const databaseService = require('./src/services/databaseService');

const app = express();

// Trust proxy for Render deployment
app.set('trust proxy', 1); // Trust first proxy (Render's load balancer)

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
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://kelalbingo-admin.fly.dev',
    /^https:\/\/.*\.fly\.dev$/,
    /^https:\/\/.*\.onrender\.com$/
  ],
  credentials: true
}));

// Disable rate limiting temporarily to fix proxy issues
// TODO: Re-enable with proper configuration
// const apiLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 50,
//   message: 'Too many API requests, please try again later'
// });

// const adminLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 200,
//   message: 'Too many requests, please try again later'
// });

// Placeholder middleware (no rate limiting)
const apiLimiter = (req, res, next) => next();
const adminLimiter = (req, res, next) => next();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes (before static files to avoid conflicts)
app.use('/api', apiLimiter, require('./src/routes/api'));
app.use('/api', apiLimiter, require('./src/routes/device-licensing'));
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
async function startServer() {
  try {
    // Step 1: Initialize database schema
    if (process.env.DATABASE_URL) {
      console.log('🐘 Using PostgreSQL database...');
      await databaseService.init();
    } else {
      console.log('📊 Using SQLite database...');
      const { initDatabase } = require('./src/config/database');
      await initDatabase();
      await databaseService.init();
    }
    
    console.log('📊 Database initialized successfully');
    
    // Step 2: Initialize default data
    await databaseService.initializeDefaultData();
    
    // Step 3: Start server
    app.listen(config.port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`🌐 Admin panel: http://localhost:${config.port}`);
      console.log(`💾 Database: ${process.env.DATABASE_URL ? 'PostgreSQL (Persistent)' : 'SQLite (Development)'}`);
    });
    
  } catch (err) {
    console.error('❌ Startup error:', err);
    process.exit(1);
  }
}

startServer();
