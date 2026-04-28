# 🚀 Complete Implementation Guide
## Node.js + MySQL + Express - Step by Step

---

## 📋 Quick Reference

- **Database Schema**: See `DATABASE_SCHEMA.md` for all 20 tables
- **API Endpoints**: See `API_DOCUMENTATION.md` for 60+ endpoints
- **Development Guide**: See `DEVELOPMENT_GUIDELINE.md` for architecture

---

## Project Timeline

### Total Duration: 8-12 Weeks

| Week | Phase | Tasks |
|------|-------|-------|
| 1-2 | Foundation | Database + Organizations + Users + Auth |
| 3-4 | Configuration | Settings + API Keys + Contacts |
| 5-6 | Templates | Template Management + Approval |
| 7-8 | Messaging | Messages + Approval + Queue |
| 9-10 | Testing & Deploy | Testing + Documentation + Deploy |

---

## Step 1: Complete Project Setup

### Install All Dependencies

```bash
# Core dependencies
npm install express@4.18.2
npm install mysql2@3.6.0
npm install sequelize@6.35.0
npm install dotenv@16.3.1
npm install cors@2.8.5
npm install helmet@7.1.0
npm install morgan@1.10.0

# Authentication & Security
npm install bcrypt@5.1.1
npm install jsonwebtoken@9.0.2
npm install express-rate-limit@7.1.5

# Validation
npm install joi@17.11.0
npm install express-validator@7.0.1

# File Upload & Processing
npm install multer@1.4.5-lts.1
npm install csv-parse@5.5.2

# Queue & Jobs
npm install bull@4.12.0
npm install redis@4.6.10

# Email
npm install nodemailer@6.9.7

# Utilities
npm install uuid@9.0.1
npm install moment@2.29.4
npm install axios@1.6.2

# Development Dependencies
npm install --save-dev nodemon@3.0.2
npm install --save-dev eslint@8.54.0
npm install --save-dev prettier@3.1.0
npm install --save-dev jest@29.7.0
npm install --save-dev supertest@6.3.3
npm install --save-dev @types/node@20.10.4
```

### Package.json Scripts

```json
{
  "name": "whatsapp-business-api",
  "version": "1.0.0",
  "description": "WhatsApp Business API Platform",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint .",
    "format": "prettier --write \"**/*.js\"",
    "db:migrate": "node src/database/migrate.js",
    "db:seed": "node src/database/seed.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## Step 2: Main Application Files

### server.js

```javascript
require('dotenv').config();
const app = require('./src/app');
const sequelize = require('./src/config/database');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

// Sync database and start server
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('✅ MySQL connection established successfully');

    // Sync models (use migrations in production)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('✅ Database synchronized');
    }

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 API URL: http://localhost:${PORT}/api/v1`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        sequelize.close();
      });
    });

  } catch (error) {
    logger.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

startServer();
```

### src/app.js

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const { notFoundHandler } = require('./middleware/notFoundHandler');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API routes
app.use('/api/v1', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
```

---

## Step 3: Authentication Middleware

### src/middleware/auth.js

```javascript
const jwt = require('jsonwebtoken');
const { User, Organization } = require('../models');
const { AppError } = require('../utils/errorTypes');

const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findByPk(decoded.userId, {
      include: [{
        model: Organization,
        as: 'organization'
      }]
    });

    if (!user) {
      throw new AppError('User not found', 401);
    }

    if (user.status !== 'active') {
      throw new AppError('User account is not active', 403);
    }

    // Attach user to request
    req.user = user;
    req.organizationId = user.organizationId;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    next(error);
  }
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const hasPermission = req.user.permissions && req.user.permissions[permission];

    if (!hasPermission) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

module.exports = {
  authenticate,
  requirePermission,
  requireRole
};
```

---

## Step 4: Controllers Implementation

### src/controllers/authController.js

```javascript
const authService = require('../services/authService');
const { AppError } = require('../utils/errorTypes');

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];
      
      const result = await authService.login(req.body, ipAddress, userAgent);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400);
      }
      
      const result = await authService.refreshToken(refreshToken);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req, res, next) {
    try {
      const { token } = req.body;
      
      if (!token) {
        throw new AppError('Verification token is required', 400);
      }
      
      const result = await authService.verifyEmail(token);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email, organizationSlug } = req.body;
      
      await authService.forgotPassword(email, organizationSlug);
      
      res.json({
        success: true,
        message: 'Password reset link sent to your email'
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      
      await authService.resetPassword(token, newPassword);
      
      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req, res, next) {
    try {
      const user = authService.sanitizeUser(req.user);
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
```

### src/controllers/messageController.js

```javascript
const messageService = require('../services/messageService');
const { AppError } = require('../utils/errorTypes');

class MessageController {
  async sendMessage(req, res, next) {
    try {
      const message = await messageService.send(
        req.organizationId,
        req.user.id,
        req.body
      );
      
      res.status(201).json({
        success: true,
        data: message
      });
    } catch (error) {
      next(error);
    }
  }

  async sendBulkMessages(req, res, next) {
    try {
      const result = await messageService.sendBulk(
        req.organizationId,
        req.user.id,
        req.body
      );
      
      res.status(202).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async listMessages(req, res, next) {
    try {
      const { page = 1, limit = 20, status, channel } = req.query;
      
      const result = await messageService.list(
        req.organizationId,
        { page: parseInt(page), limit: parseInt(limit), status, channel }
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessage(req, res, next) {
    try {
      const message = await messageService.getById(
        req.params.id,
        req.organizationId
      );
      
      res.json({
        success: true,
        data: message
      });
    } catch (error) {
      next(error);
    }
  }

  async listPendingApprovals(req, res, next) {
    try {
      const { page = 1, limit = 20, priority } = req.query;
      
      const result = await messageService.listPendingApprovals(
        req.organizationId,
        { page: parseInt(page), limit: parseInt(limit), priority }
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async approveMessage(req, res, next) {
    try {
      const result = await messageService.approve(
        req.params.id,
        req.user.id,
        req.organizationId
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async rejectMessage(req, res, next) {
    try {
      const { reason } = req.body;
      
      if (!reason) {
        throw new AppError('Rejection reason is required', 400);
      }
      
      const result = await messageService.reject(
        req.params.id,
        req.user.id,
        reason,
        req.organizationId
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkApprove(req, res, next) {
    try {
      const { messageIds, approveAllPending } = req.body;
      
      const result = await messageService.bulkApprove(
        req.organizationId,
        req.user.id,
        { messageIds, approveAllPending }
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MessageController();
```

---

## Step 5: Routes Configuration

### src/routes/index.js

```javascript
const express = require('express');
const authRoutes = require('./auth');
const organizationRoutes = require('./organizations');
const userRoutes = require('./users');
const contactRoutes = require('./contacts');
const templateRoutes = require('./templates');
const messageRoutes = require('./messages');
const settingsRoutes = require('./settings');
const apiKeyRoutes = require('./apiKeys');
const reportRoutes = require('./reports');

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/users', userRoutes);
router.use('/contacts', contactRoutes);
router.use('/templates', templateRoutes);
router.use('/messages', messageRoutes);
router.use('/settings', settingsRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
```

### src/routes/auth.js

```javascript
const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { authValidation } = require('../validations/authValidation');

const router = express.Router();

router.post('/register', validate(authValidation.register), authController.register);
router.post('/login', validate(authValidation.login), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/verify-email', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
```

### src/routes/messages.js

```javascript
const express = require('express');
const messageController = require('../controllers/messageController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { messageValidation } = require('../validations/messageValidation');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Send messages
router.post('/send', 
  requirePermission('canSendMessages'),
  validate(messageValidation.send),
  messageController.sendMessage
);

router.post('/bulk',
  requirePermission('canSendMessages'),
  validate(messageValidation.bulk),
  messageController.sendBulkMessages
);

// List messages
router.get('/', messageController.listMessages);
router.get('/:id', messageController.getMessage);

// Approval endpoints
router.get('/approvals',
  requirePermission('canApproveMessages'),
  messageController.listPendingApprovals
);

router.post('/:id/approve',
  requirePermission('canApproveMessages'),
  messageController.approveMessage
);

router.post('/:id/reject',
  requirePermission('canApproveMessages'),
  messageController.rejectMessage
);

router.post('/bulk-approve',
  requirePermission('canApproveMessages'),
  messageController.bulkApprove
);

module.exports = router;
```

---

## Step 6: Validation Schemas

### src/validations/authValidation.js

```javascript
const Joi = require('joi');

const authValidation = {
  register: Joi.object({
    organizationSlug: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character'
      }),
    firstName: Joi.string().min(2).max(100).required(),
    lastName: Joi.string().min(2).max(100).required(),
    phoneNumber: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).optional()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    organizationSlug: Joi.string().required()
  })
};

module.exports = { authValidation };
```

### src/validations/messageValidation.js

```javascript
const Joi = require('joi');

const messageValidation = {
  send: Joi.object({
    channel: Joi.string().valid('whatsapp', 'sms').required(),
    recipientPhone: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required(),
    recipientName: Joi.string().optional(),
    messageType: Joi.string().valid('text', 'template', 'media').required(),
    content: Joi.when('messageType', {
      is: 'text',
      then: Joi.string().required(),
      otherwise: Joi.optional()
    }),
    templateId: Joi.when('messageType', {
      is: 'template',
      then: Joi.string().uuid().required(),
      otherwise: Joi.optional()
    }),
    variables: Joi.when('messageType', {
      is: 'template',
      then: Joi.object().required(),
      otherwise: Joi.optional()
    }),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
    scheduledFor: Joi.date().min('now').optional()
  }),

  bulk: Joi.object({
    name: Joi.string().required(),
    channel: Joi.string().valid('whatsapp', 'sms').required(),
    templateId: Joi.string().uuid().required(),
    recipients: Joi.array().items(
      Joi.object({
        phone: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required(),
        variables: Joi.object().required()
      })
    ).min(1).max(1000).required(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
    scheduledFor: Joi.date().min('now').optional()
  })
};

module.exports = { messageValidation };
```

---

## Step 7: Message Queue Setup

### src/jobs/messageQueue.js

```javascript
const Queue = require('bull');
const { Message } = require('../models');
const whatsappService = require('../services/whatsappService');
const smsService = require('../services/smsService');
const logger = require('../utils/logger');

const messageQueue = new Queue('messages', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  }
});

// Process message sending
messageQueue.process('send-message', async (job) => {
  const { messageId } = job.data;
  
  try {
    const message = await Message.findByPk(messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }

    let result;

    if (message.channel === 'whatsapp') {
      result = await whatsappService.sendMessage({
        to: message.recipientPhone,
        body: message.content,
        mediaUrl: message.mediaUrl
      });
    } else {
      result = await smsService.sendMessage({
        to: message.recipientPhone,
        body: message.content
      });
    }

    // Update message status
    await message.update({
      deliveryStatus: 'sent',
      sentAt: new Date(),
      externalMessageId: result.messageId
    });

    // Update organization message count
    const Organization = require('../models').Organization;
    await Organization.increment('usedMessages', {
      where: { id: message.organizationId }
    });

    logger.info(`Message ${messageId} sent successfully`);

  } catch (error) {
    logger.error(`Failed to send message ${messageId}:`, error);

    await Message.update({
      deliveryStatus: 'failed',
      failedAt: new Date(),
      failureReason: error.message
    }, {
      where: { id: messageId }
    });

    throw error;
  }
});

// Queue event handlers
messageQueue.on('completed', (job) => {
  logger.info(`Job ${job.id} completed`);
});

messageQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err);
});

module.exports = messageQueue;
```

---

## Step 8: Utility Functions

### src/utils/logger.js

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'whatsapp-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
```

### src/utils/errorTypes.js

```javascript
class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || this.constructor.name;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 422, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError
};
```

---

## Step 9: Docker Setup

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - REDIS_HOST=redis
    depends_on:
      - mysql
      - redis
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: whatsapp_business_platform
      MYSQL_USER: appuser
      MYSQL_PASSWORD: apppassword
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    command: --default-authentication-plugin=mysql_native_password
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:
```

---

## Step 10: Deployment Commands

```bash
# Development
npm run dev

# Production
npm start

# Docker
docker-compose up -d

# Database migrations
npm run db:migrate

# Run tests
npm test

# Check logs
docker-compose logs -f app
```

---

**Implementation Guide Complete** ✅
**Ready for Development** 🚀
**All Systems Configured** ⚙️
