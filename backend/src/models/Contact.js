const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');

const Contact = sequelize.define('contacts', {
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
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: true, // Allow null for email-only contacts
    field: 'phone_number',
  },
  countryCode: {
    type: DataTypes.STRING(5),
    field: 'country_code',
  },
  name: {
    type: DataTypes.STRING(255),
  },
  email: {
    type: DataTypes.STRING(255),
  },
  company: {
    type: DataTypes.STRING(255),
  },
  jobTitle: {
    type: DataTypes.STRING(100),
    field: 'job_title',
  },
  department: {
    type: DataTypes.STRING(100),
  },
  addressLine1: {
    type: DataTypes.STRING(255),
    field: 'address_line1',
  },
  addressLine2: {
    type: DataTypes.STRING(255),
    field: 'address_line2',
  },
  city: {
    type: DataTypes.STRING(100),
  },
  state: {
    type: DataTypes.STRING(100),
  },
  postalCode: {
    type: DataTypes.STRING(20),
    field: 'postal_code',
  },
  country: {
    type: DataTypes.STRING(100),
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'blocked', 'unsubscribed'),
    defaultValue: 'active',
    allowNull: false,
  },
  optInStatus: {
    type: DataTypes.ENUM('pending', 'opted_in', 'opted_out'),
    defaultValue: 'pending',
    field: 'opt_in_status',
  },
  optInDate: {
    type: DataTypes.DATE,
    field: 'opt_in_date',
  },
  optOutDate: {
    type: DataTypes.DATE,
    field: 'opt_out_date',
  },
  whatsappVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'whatsapp_verified',
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    field: 'last_message_at',
  },
  totalMessagesSent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_messages_sent',
  },
  totalMessagesReceived: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_messages_received',
  },
  customFields: {
    type: DataTypes.JSON,
    field: 'custom_fields',
  },
  tags: {
    type: DataTypes.JSON,
  },
  source: {
    type: DataTypes.STRING(50),
  },
  notes: {
    type: DataTypes.TEXT,
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
    { fields: ['phone_number'] },
    { fields: ['email'] },
    { fields: ['status'] },
    { fields: ['created_at'] },
    { fields: ['deleted_at'] },
    {
      unique: true,
      fields: ['organization_id', 'phone_number', 'deleted_at'],
      name: 'unique_phone_per_org',
    },
  ],
});

module.exports = Contact;


