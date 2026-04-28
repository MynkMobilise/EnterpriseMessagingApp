# 🏗️ Complete Development Guideline
## WhatsApp Business API Platform - Node.js + MySQL

---

## 📋 Table of Contents

1. [Technology Stack](#technology-stack)
2. [Project Setup](#project-setup)
3. [Architecture Overview](#architecture-overview)
4. [Development Phases](#development-phases)
5. [API Documentation](#api-documentation)
6. [Security Implementation](#security-implementation)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Guide](#deployment-guide)

---

## Technology Stack

### Backend
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js 4.18+
- **Language**: JavaScript (ES6+) or TypeScript 5.0+
- **Database**: MySQL 8.0+
- **ORM**: Sequelize 6.0+ or TypeORM 0.3+
- **Cache/Queue**: Redis 7+
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Validation**: Joi or express-validator
- **Email**: Nodemailer
- **File Upload**: Multer
- **Job Queue**: Bull or Agenda

### Frontend (Already Implemented)
- **Framework**: React 18+
- **Language**: TypeScript 5.0+
- **Styling**: Tailwind CSS 4.0
- **State Management**: React Context + hooks
- **HTTP Client**: Axios
- **Forms**: React Hook Form
- **Charts**: Recharts
- **Notifications**: Sonner
- **Icons**: Lucide React

### DevOps & Infrastructure
- **Container**: Docker + Docker Compose
- **Web Server**: Nginx (reverse proxy)
- **Process Manager**: PM2
- **Monitoring**: Winston (logging)
- **Environment**: dotenv

---

## Project Setup

### 1. Initialize Project

```bash
# Create project directory
mkdir whatsapp-business-api
cd whatsapp-business-api

# Initialize Node.js project
npm init -y

# Install core dependencies
npm install express mysql2 sequelize dotenv bcrypt jsonwebtoken
npm install cors helmet express-rate-limit morgan
npm install joi express-validator multer
npm install bull redis nodemailer
npm install uuid

# Install dev dependencies
npm install -D nodemon eslint prettier jest supertest
```

### 2. Project Structure

```
whatsapp-business-api/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── redis.js
│   │   ├── jwt.js
│   │   └── email.js
│   ├── models/
│   │   ├── Organization.js
│   │   ├── User.js
│   │   ├── Session.js
│   │   ├── Contact.js
│   │   ├── Template.js
│   │   ├── Message.js
│   │   └── index.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── organizationController.js
│   │   ├── userController.js
│   │   ├── contactController.js
│   │   ├── templateController.js
│   │   ├── messageController.js
│   │   └── settingsController.js
│   ├── services/
│   │   ├── authService.js
│   │   ├── organizationService.js
│   │   ├── userService.js
│   │   ├── contactService.js
│   │   ├── templateService.js
│   │   ├── messageService.js
│   │   ├── whatsappService.js
│   │   └── smsService.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── permissions.js
│   │   ├── validation.js
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── organizations.js
│   │   ├── users.js
│   │   ├── contacts.js
│   │   ├── templates.js
│   │   ├── messages.js
│   │   ├── settings.js
│   │   └── index.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── encryption.js
│   │   ├── validators.js
│   │   ├── errorTypes.js
│   │   └── helpers.js
│   ├── jobs/
│   │   ├── messageQueue.js
│   │   ├── emailQueue.js
│   │   └── scheduledJobs.js
│   ├── database/
│   │   └── migrations/
│   │       ├── 001-create-organizations.js
│   │       ├── 002-create-users.js
│   │       ├── 003-create-contacts.js
│   │       └── ...
│   └── app.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

### 3. Environment Configuration

Create `.env` file:

```bash
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
API_URL=http://localhost:3000/api/v1

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=whatsapp_business_platform
DB_USER=root
DB_PASSWORD=your_password
DB_POOL_MAX=10
DB_POOL_MIN=2

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourcompany.com

# WhatsApp Business API
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=

# SMS Provider (Twilio example)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

# Security
BCRYPT_ROUNDS=12
SESSION_TIMEOUT_MINUTES=60
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Architecture Overview

### Multi-Tier Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
│              React + TypeScript + Tailwind                   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway Layer                        │
│         Express.js + Authentication + Rate Limiting          │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  Controller Layer                            │
│          Request Handling + Response Formatting              │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│              Business Logic + Validation                     │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  Data Access Layer (ORM)                     │
│                   Sequelize Models                           │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│                      MySQL 8.0+                              │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow

```
Client Request
    ↓
Express Router
    ↓
Authentication Middleware → JWT Verification
    ↓
Authorization Middleware → Check Permissions
    ↓
Validation Middleware → Validate Request Body
    ↓
Controller → Handle Request
    ↓
Service → Business Logic
    ↓
Model (ORM) → Database Query
    ↓
Database → Execute Query
    ↓
Return Response Chain
    ↓
Client Response (JSON)
```

---

## Development Phases

### Phase 1: Foundation Setup (Week 1-2)

#### 1.1 Database Configuration

**File**: `src/config/database.js`

```javascript
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      acquire: 30000,
      idle: 10000
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: '+00:00',
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      underscored: false,
      freezeTableName: true
    }
  }
);

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connection established successfully');
  } catch (error) {
    console.error('❌ Unable to connect to MySQL:', error);
    process.exit(1);
  }
};

testConnection();

module.exports = sequelize;
```

#### 1.2 Organization Model

**File**: `src/models/Organization.js`

```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Organization = sequelize.define('organizations', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  industry: {
    type: DataTypes.STRING(100)
  },
  plan: {
    type: DataTypes.ENUM('starter', 'professional', 'enterprise'),
    defaultValue: 'starter',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'trial', 'suspended', 'cancelled'),
    defaultValue: 'trial',
    allowNull: false
  },
  trialEndsAt: {
    type: DataTypes.DATE,
    field: 'trial_ends_at'
  },
  subscriptionStartsAt: {
    type: DataTypes.DATE,
    field: 'subscription_starts_at'
  },
  maxUsers: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    field: 'max_users'
  },
  maxMessagesPerMonth: {
    type: DataTypes.INTEGER,
    defaultValue: 1000,
    field: 'max_messages_per_month'
  },
  usedMessages: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'used_messages'
  },
  email: {
    type: DataTypes.STRING(255)
  },
  phone: {
    type: DataTypes.STRING(50)
  },
  website: {
    type: DataTypes.STRING(500)
  },
  address: {
    type: DataTypes.TEXT
  },
  logoUrl: {
    type: DataTypes.STRING(500),
    field: 'logo_url'
  },
  settings: {
    type: DataTypes.JSON
  },
  metadata: {
    type: DataTypes.JSON
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  },
  deletedAt: {
    type: DataTypes.DATE,
    field: 'deleted_at'
  }
}, {
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['slug'] },
    { fields: ['status'] },
    { fields: ['deleted_at'] }
  ]
});

module.exports = Organization;
```

#### 1.3 User Model

**File**: `src/models/User.js`

```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('users', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'organization_id',
    references: {
      model: 'organizations',
      key: 'id'
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'last_name'
  },
  role: {
    type: DataTypes.ENUM('super_admin', 'admin', 'manager', 'operator', 'viewer'),
    defaultValue: 'operator',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended', 'pending'),
    defaultValue: 'pending',
    allowNull: false
  },
  phoneNumber: {
    type: DataTypes.STRING(50),
    field: 'phone_number'
  },
  avatarUrl: {
    type: DataTypes.STRING(500),
    field: 'avatar_url'
  },
  department: {
    type: DataTypes.STRING(100)
  },
  jobTitle: {
    type: DataTypes.STRING(100),
    field: 'job_title'
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'email_verified'
  },
  emailVerificationToken: {
    type: DataTypes.STRING(255),
    field: 'email_verification_token'
  },
  emailVerificationExpiresAt: {
    type: DataTypes.DATE,
    field: 'email_verification_expires_at'
  },
  passwordResetToken: {
    type: DataTypes.STRING(255),
    field: 'password_reset_token'
  },
  passwordResetExpiresAt: {
    type: DataTypes.DATE,
    field: 'password_reset_expires_at'
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    field: 'last_login_at'
  },
  lastLoginIp: {
    type: DataTypes.STRING(45),
    field: 'last_login_ip'
  },
  failedLoginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'failed_login_attempts'
  },
  lockedUntil: {
    type: DataTypes.DATE,
    field: 'locked_until'
  },
  permissions: {
    type: DataTypes.JSON
  },
  metadata: {
    type: DataTypes.JSON
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  },
  deletedAt: {
    type: DataTypes.DATE,
    field: 'deleted_at'
  }
}, {
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['organization_id'] },
    { fields: ['email'] },
    { fields: ['role'] },
    { fields: ['status'] },
    { 
      unique: true,
      fields: ['email', 'organization_id', 'deleted_at'],
      name: 'unique_email_per_org'
    }
  ]
});

// Instance method to check password
User.prototype.validPassword = async function(password) {
  return await bcrypt.compare(password, this.passwordHash);
};

// Hook to hash password before create
User.beforeCreate(async (user) => {
  if (user.passwordHash) {
    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
  }
});

module.exports = User;
```

#### 1.4 Model Associations

**File**: `src/models/index.js`

```javascript
const Organization = require('./Organization');
const User = require('./User');
const Session = require('./Session');
const Contact = require('./Contact');
const Template = require('./Template');
const Message = require('./Message');

// Organization - User relationship
Organization.hasMany(User, {
  foreignKey: 'organizationId',
  as: 'users'
});
User.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization'
});

// User - Session relationship
User.hasMany(Session, {
  foreignKey: 'userId',
  as: 'sessions'
});
Session.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Organization - Contact relationship
Organization.hasMany(Contact, {
  foreignKey: 'organizationId',
  as: 'contacts'
});
Contact.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization'
});

// Organization - Template relationship
Organization.hasMany(Template, {
  foreignKey: 'organizationId',
  as: 'templates'
});
Template.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization'
});

// Organization - Message relationship
Organization.hasMany(Message, {
  foreignKey: 'organizationId',
  as: 'messages'
});
Message.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization'
});

// Message - Contact relationship
Contact.hasMany(Message, {
  foreignKey: 'contactId',
  as: 'messages'
});
Message.belongsTo(Contact, {
  foreignKey: 'contactId',
  as: 'contact'
});

// Message - Template relationship
Template.hasMany(Message, {
  foreignKey: 'templateId',
  as: 'messages'
});
Message.belongsTo(Template, {
  foreignKey: 'templateId',
  as: 'template'
});

module.exports = {
  Organization,
  User,
  Session,
  Contact,
  Template,
  Message
};
```

#### 1.5 Authentication Service

**File**: `src/services/authService.js`

```javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User, Organization, Session } = require('../models');
const { AppError } = require('../utils/errorTypes');

class AuthService {
  async register(data) {
    const { organizationSlug, email, password, firstName, lastName, phoneNumber } = data;

    // Find organization
    const organization = await Organization.findOne({
      where: { slug: organizationSlug }
    });

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    // Check if email already exists
    const existingUser = await User.findOne({
      where: {
        email: email.toLowerCase(),
        organizationId: organization.id
      }
    });

    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    // Check user limit
    const userCount = await User.count({
      where: { organizationId: organization.id }
    });

    if (userCount >= organization.maxUsers) {
      throw new AppError('Organization user limit reached', 429);
    }

    // Create user
    const user = await User.create({
      organizationId: organization.id,
      email: email.toLowerCase(),
      passwordHash: password, // Will be hashed by beforeCreate hook
      firstName,
      lastName,
      phoneNumber,
      role: 'operator',
      status: 'pending',
      permissions: this.getDefaultPermissions('operator')
    });

    // Generate email verification token
    const verificationToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await user.update({
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    // TODO: Send verification email

    return {
      user: this.sanitizeUser(user),
      message: 'Registration successful. Please check your email to verify your account.'
    };
  }

  async login(data, ipAddress, userAgent) {
    const { email, password, organizationSlug } = data;

    // Find organization
    const organization = await Organization.findOne({
      where: { slug: organizationSlug }
    });

    if (!organization) {
      throw new AppError('Invalid credentials', 401);
    }

    // Find user
    const user = await User.findOne({
      where: {
        email: email.toLowerCase(),
        organizationId: organization.id
      }
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
      throw new AppError(`Account locked. Try again in ${minutesLeft} minutes`, 429);
    }

    // Verify password
    const isValidPassword = await user.validPassword(password);

    if (!isValidPassword) {
      // Increment failed attempts
      const newFailedAttempts = user.failedLoginAttempts + 1;
      let lockedUntil = null;

      if (newFailedAttempts >= 10) {
        lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      } else if (newFailedAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      }

      await user.update({
        failedLoginAttempts: newFailedAttempts,
        lockedUntil,
        lastLoginIp: ipAddress
      });

      throw new AppError('Invalid credentials', 401);
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new AppError('Account is not active', 403);
    }

    // Reset failed attempts
    await user.update({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress
    });

    // Generate tokens
    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    return {
      user: {
        ...this.sanitizeUser(user),
        organizationName: organization.name
      },
      tokens
    };
  }

  async generateTokens(user, ipAddress, userAgent) {
    const payload = {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });

    // Store refresh token in sessions table
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await Session.create({
      userId: user.id,
      refreshToken,
      ipAddress,
      userAgent,
      expiresAt
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600
    };
  }

  sanitizeUser(user) {
    const { passwordHash, emailVerificationToken, passwordResetToken, ...sanitized } = user.toJSON();
    return sanitized;
  }

  getDefaultPermissions(role) {
    const permissions = {
      super_admin: {
        canSendMessages: true,
        canApproveMessages: true,
        canManageUsers: true,
        canManageTemplates: true,
        canManageContacts: true,
        canViewReports: true,
        canManageSettings: true,
        canManageAPIKeys: true,
        canAssignRoles: true
      },
      admin: {
        canSendMessages: true,
        canApproveMessages: true,
        canManageUsers: true,
        canManageTemplates: true,
        canManageContacts: true,
        canViewReports: true,
        canManageSettings: true,
        canManageAPIKeys: true,
        canAssignRoles: false
      },
      manager: {
        canSendMessages: true,
        canApproveMessages: true,
        canManageUsers: false,
        canManageTemplates: true,
        canManageContacts: true,
        canViewReports: true,
        canManageSettings: false,
        canManageAPIKeys: false,
        canAssignRoles: false
      },
      operator: {
        canSendMessages: true,
        canApproveMessages: false,
        canManageUsers: false,
        canManageTemplates: false,
        canManageContacts: true,
        canViewReports: false,
        canManageSettings: false,
        canManageAPIKeys: false,
        canAssignRoles: false
      },
      viewer: {
        canSendMessages: false,
        canApproveMessages: false,
        canManageUsers: false,
        canManageTemplates: false,
        canManageContacts: false,
        canViewReports: true,
        canManageSettings: false,
        canManageAPIKeys: false,
        canAssignRoles: false
      }
    };

    return permissions[role] || permissions.viewer;
  }
}

module.exports = new AuthService();
```

(Continued in next file due to length...)
