const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('users', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'organization_id',
    references: {
      model: 'organizations',
      key: 'id',
    },
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash',
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name',
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'last_name',
  },
  role: {
    type: DataTypes.ENUM('super_admin', 'admin', 'manager', 'operator', 'viewer'),
    defaultValue: 'operator',
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended', 'pending'),
    defaultValue: 'pending',
    allowNull: false,
  },
  phoneNumber: {
    type: DataTypes.STRING(50),
    field: 'phone_number',
  },
  avatarUrl: {
    type: DataTypes.STRING(500),
    field: 'avatar_url',
  },
  department: {
    type: DataTypes.STRING(100),
  },
  jobTitle: {
    type: DataTypes.STRING(100),
    field: 'job_title',
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'email_verified',
  },
  emailVerificationToken: {
    type: DataTypes.STRING(255),
    field: 'email_verification_token',
  },
  emailVerificationExpiresAt: {
    type: DataTypes.DATE,
    field: 'email_verification_expires_at',
  },
  passwordResetToken: {
    type: DataTypes.STRING(255),
    field: 'password_reset_token',
  },
  passwordResetExpiresAt: {
    type: DataTypes.DATE,
    field: 'password_reset_expires_at',
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    field: 'last_login_at',
  },
  lastLoginIp: {
    type: DataTypes.STRING(45),
    field: 'last_login_ip',
  },
  failedLoginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'failed_login_attempts',
  },
  lockedUntil: {
    type: DataTypes.DATE,
    field: 'locked_until',
  },
  mustChangePassword: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'must_change_password',
  },
  permissions: {
    type: DataTypes.JSON,
  },
  metadata: {
    type: DataTypes.JSON,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at',
  },
  deletedAt: {
    type: DataTypes.DATE,
    field: 'deleted_at',
  },
}, {
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['organization_id'] },
    { fields: ['email'] },
    { fields: ['role'] },
    { fields: ['status'] },
    { fields: ['deleted_at'] },
    {
      unique: true,
      fields: ['email', 'organization_id', 'deleted_at'],
      name: 'unique_email_per_org',
    },
  ],
});

// Instance method to check password
User.prototype.validPassword = async function(password) {
  return await bcrypt.compare(password, this.passwordHash);
};

// Hook to hash password before create
User.beforeCreate(async (user) => {
  if (user.passwordHash && !user.passwordHash.startsWith('$2b$')) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const salt = await bcrypt.genSalt(saltRounds);
    user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
  }
});

// Hook to hash password before update (if password changed)
User.beforeUpdate(async (user) => {
  if (user.changed('passwordHash') && user.passwordHash && !user.passwordHash.startsWith('$2b$')) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const salt = await bcrypt.genSalt(saltRounds);
    user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
  }
});

module.exports = User;


