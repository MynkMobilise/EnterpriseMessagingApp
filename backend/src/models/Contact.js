const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');

const Contact = sequelize.define('contacts', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  organizationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'organization_id',
    references: {
      model: 'organizations',
      key: 'id',
    },
  },
  createdBy: {
    type: DataTypes.INTEGER,
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
  // ---- HRMS-imported fields (from external HR API or HRMS Excel upload) ----
  externalId: { type: DataTypes.STRING(64), field: 'external_id' },
  employeeId: { type: DataTypes.STRING(64), field: 'employee_id' },
  employeeStatus: { type: DataTypes.STRING(32), field: 'employee_status' },
  employmentCategory: { type: DataTypes.STRING(64), field: 'employment_category' },
  skillType: { type: DataTypes.STRING(64), field: 'skill_type' },
  hiringType: { type: DataTypes.STRING(64), field: 'hiring_type' },
  costCenterCode: { type: DataTypes.STRING(64), field: 'cost_center_code' },
  costCenterName: { type: DataTypes.STRING(255), field: 'cost_center_name' },
  reportingManagerCode: { type: DataTypes.STRING(64), field: 'reporting_manager_code' },
  reportingManagerName: { type: DataTypes.STRING(255), field: 'reporting_manager_name' },
  reportingManagerMobile: { type: DataTypes.STRING(32), field: 'reporting_manager_mobile' },
  designation: { type: DataTypes.STRING(255) },
  subDepartment: { type: DataTypes.STRING(255), field: 'sub_department' },
  region: { type: DataTypes.STRING(128) },
  segmentName: { type: DataTypes.STRING(128), field: 'segment_name' },
  subSegmentName: { type: DataTypes.STRING(128), field: 'sub_segment_name' },
  lastSyncedAt: { type: DataTypes.DATE, field: 'last_synced_at' },
  lastSyncSource: {
    type: DataTypes.ENUM('excel', 'api', 'manual'),
    field: 'last_sync_source',
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


