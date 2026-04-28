const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('messages', {
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
  sentBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'sent_by',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'submitted_at',
  },
  contactId: {
    type: DataTypes.UUID,
    field: 'contact_id',
    references: {
      model: 'contacts',
      key: 'id',
    },
  },
  recipientPhone: {
    type: DataTypes.STRING(20),
    field: 'recipient_phone',
  },
  recipientEmail: {
    type: DataTypes.STRING(255),
    field: 'recipient_email',
  },
  recipientFcmToken: {
    type: DataTypes.STRING(500),
    field: 'recipient_fcm_token',
  },
  recipientName: {
    type: DataTypes.STRING(255),
    field: 'recipient_name',
  },
  channel: {
    type: DataTypes.ENUM('whatsapp', 'sms', 'email', 'fcm'),
    allowNull: false,
  },
  messageType: {
    type: DataTypes.ENUM('text', 'template', 'media', 'html'),
    allowNull: false,
    field: 'message_type',
  },
  subject: {
    type: DataTypes.STRING(255),
    field: 'subject',
  },
  templateId: {
    type: DataTypes.UUID,
    field: 'template_id',
    references: {
      model: 'templates',
      key: 'id',
    },
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  mediaUrl: {
    type: DataTypes.STRING(500),
    field: 'media_url',
  },
  mediaType: {
    type: DataTypes.ENUM('image', 'video', 'document', 'audio'),
    field: 'media_type',
  },
  requiresApproval: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'requires_approval',
  },
  approvalStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'expired'),
    defaultValue: 'pending',
    allowNull: false,
    field: 'approval_status',
  },
  approvedBy: {
    type: DataTypes.UUID,
    field: 'approved_by',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  approvedAt: {
    type: DataTypes.DATE,
    field: 'approved_at',
  },
  rejectedBy: {
    type: DataTypes.UUID,
    field: 'rejected_by',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  rejectedAt: {
    type: DataTypes.DATE,
    field: 'rejected_at',
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    field: 'rejection_reason',
  },
  expiresAt: {
    type: DataTypes.DATE,
    field: 'expires_at',
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal',
  },
  scheduledFor: {
    type: DataTypes.DATE,
    field: 'scheduled_for',
  },
  deliveryStatus: {
    type: DataTypes.ENUM('queued', 'processing', 'sent', 'delivered', 'read', 'failed', 'cancelled'),
    defaultValue: 'queued',
    field: 'delivery_status',
  },
  sentAt: {
    type: DataTypes.DATE,
    field: 'sent_at',
  },
  deliveredAt: {
    type: DataTypes.DATE,
    field: 'delivered_at',
  },
  readAt: {
    type: DataTypes.DATE,
    field: 'read_at',
  },
  failedAt: {
    type: DataTypes.DATE,
    field: 'failed_at',
  },
  failureReason: {
    type: DataTypes.TEXT,
    field: 'failure_reason',
  },
  externalMessageId: {
    type: DataTypes.STRING(255),
    field: 'external_message_id',
  },
  estimatedCost: {
    type: DataTypes.DECIMAL(10, 4),
    field: 'estimated_cost',
  },
  actualCost: {
    type: DataTypes.DECIMAL(10, 4),
    field: 'actual_cost',
  },
  category: {
    type: DataTypes.STRING(50),
  },
  isBulkMessage: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_bulk_message',
  },
  bulkBatchId: {
    type: DataTypes.UUID,
    field: 'bulk_batch_id',
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
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['organization_id'] },
    { fields: ['contact_id'] },
    { fields: ['sent_by'] },
    { fields: ['approval_status'] },
    { fields: ['delivery_status'] },
    { fields: ['scheduled_for'] },
    { fields: ['created_at'] },
    { fields: ['bulk_batch_id'] },
    { fields: ['channel'] },
    { fields: ['sent_at'] },
  ],
});

module.exports = Message;


