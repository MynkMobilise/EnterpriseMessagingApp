const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
// Rate limiting disabled for development
// const { standardRateLimiter } = require('./middleware/rateLimiter');
const routes = require('./routes');

const app = express();

// Security middleware - configure to allow cross-origin requests for static files
// CSP configured to allow inline scripts for OAuth callback (required for postMessage)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for OAuth callback inline scripts (postMessage)
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS configuration
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else if (process.env.NODE_ENV === 'development') {
      // In development, allow all origins for easier testing
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
}));

// HTTP request logging — off by default. Set HTTP_DEBUG=true to see one log
// line per request (morgan 'dev' format), or LOG_LEVEL=info for the structured
// 'combined' format. Errors are always reported via the error handler.
if (process.env.HTTP_DEBUG === 'true') {
  app.use(morgan('dev'));
} else if (process.env.NODE_ENV === 'production' && process.env.LOG_LEVEL === 'info') {
  app.use(morgan('combined'));
}

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy (for rate limiting and IP detection)
app.set('trust proxy', 1);

// Global rate limiting - DISABLED
// app.use(standardRateLimiter);

// Health check
app.get('/health', async (req, res) => {
  const sequelize = require('./config/database');

  try {
    // Check database
    await sequelize.authenticate();
    const dbStatus = 'healthy';

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      services: {
        database: dbStatus,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// CORS middleware for static media files (shared by both mounts below).
const uploadsCors = (req, res, next) => {
  const origin = req.headers.origin;
  const isAllowedOrigin = !origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development';

  if (isAllowedOrigin) {
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (process.env.NODE_ENV === 'development') {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
};

const uploadsStatic = express.static(path.join(__dirname, '../uploads'));

// Primary mount: backend-direct or dev (/uploads/...).
app.use('/uploads', uploadsCors, uploadsStatic);

// Alias under /api/v1/uploads so production nginx setups that only reverse-proxy
// /api/* still reach the static handler — no nginx config change required.
app.use('/api/v1/uploads', uploadsCors, uploadsStatic);

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;

