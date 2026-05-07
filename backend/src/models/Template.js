const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Template = sequelize.define('templates', {
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
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  channel: {
    type: DataTypes.ENUM('whatsapp', 'sms', 'email', 'fcm', 'both'),
    allowNull: false,
  },
  htmlBody: {
    type: DataTypes.TEXT,
    field: 'html_body',
  },
  plainTextBody: {
    type: DataTypes.TEXT,
    field: 'plain_text_body',
  },
  category: {
    type: DataTypes.ENUM('marketing', 'transactional', 'utility', 'authentication'),
    allowNull: false,
  },
  // Drives how submit-to-Meta and per-message component construction work.
  // 'standard'   = traditional WhatsApp template (HEADER/BODY/FOOTER/BUTTONS)
  // 'carousel'   = WhatsApp carousel template (BODY + CAROUSEL.cards[])
  // 'limited_time' = future use; treated like 'standard' until wired
  templateType: {
    type: DataTypes.ENUM('standard', 'carousel', 'limited_time'),
    allowNull: false,
    defaultValue: 'standard',
    field: 'template_type',
  },
  // Carousel cards. Shape per card:
  //   { id: string, media: { type: 'image'|'video', url: string } | null,
  //     content: string, buttons: [{ id, type, text, value }] }
  cards: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  language: {
    type: DataTypes.STRING(10),
    defaultValue: 'en',
  },
  subject: {
    type: DataTypes.STRING(255),
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  footer: {
    type: DataTypes.TEXT,
  },
  headerType: {
    type: DataTypes.ENUM('text', 'image', 'video', 'document', 'location'),
    field: 'header_type',
  },
  headerContent: {
    type: DataTypes.TEXT,
    field: 'header_content',
  },
  variables: {
    type: DataTypes.JSON,
  },
  variableCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'variable_count',
  },
  buttons: {
    type: DataTypes.JSON,
  },
  whatsappTemplateId: {
    type: DataTypes.STRING(255),
    field: 'whatsapp_template_id',
  },
  smsTemplateId: {
    type: DataTypes.STRING(255),
    field: 'sms_template_id',
    comment: 'DOT (Department of Telecom) approved template ID for SMS',
  },
  whatsappStatus: {
    type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected'),
    field: 'whatsapp_status',
  },
  whatsappRejectionReason: {
    type: DataTypes.TEXT,
    field: 'whatsapp_rejection_reason',
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending_approval', 'approved', 'rejected', 'archived'),
    defaultValue: 'draft',
    allowNull: false,
  },
  approvedBy: {
    type: DataTypes.INTEGER,
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
    type: DataTypes.INTEGER,
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
  totalSent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_sent',
  },
  totalDelivered: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_delivered',
  },
  totalRead: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_read',
  },
  totalClicked: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_clicked',
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    field: 'last_used_at',
  },
  description: {
    type: DataTypes.TEXT,
  },
  tags: {
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
    { fields: ['status'] },
    { fields: ['channel'] },
    { fields: ['category'] },
    { fields: ['whatsapp_template_id'] },
    { fields: ['deleted_at'] },
    { fields: ['created_at'] },
    {
      unique: true,
      fields: ['organization_id', 'name', 'channel', 'deleted_at'],
      name: 'unique_template_name',
    },
  ],
});

module.exports = Template;


