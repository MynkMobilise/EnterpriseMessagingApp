const Organization = require('./Organization');
const User = require('./User');
const Session = require('./Session');
const OrganizationSettings = require('./OrganizationSettings');
const UserPreferences = require('./UserPreferences');
const ApiKey = require('./ApiKey');
const ApiKeyUsageLog = require('./ApiKeyUsageLog');
const Contact = require('./Contact');
const ContactGroup = require('./ContactGroup');
const ContactGroupMembership = require('./ContactGroupMembership');
const ContactImport = require('./ContactImport');
const Template = require('./Template');
const TemplateImport = require('./TemplateImport');
const TemplateVersion = require('./TemplateVersion');
const Message = require('./Message');
const BulkMessageBatch = require('./BulkMessageBatch');
const MessageEvent = require('./MessageEvent');
const Media = require('./Media');
const EmailConfiguration = require('./EmailConfiguration');
const SmsConfiguration = require('./SmsConfiguration');

// Organization - User relationship
Organization.hasMany(User, {
  foreignKey: 'organizationId',
  as: 'users',
});

User.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization',
});

// User - Session relationship
User.hasMany(Session, {
  foreignKey: 'userId',
  as: 'sessions',
});

Session.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// Organization - Settings relationship
Organization.hasOne(OrganizationSettings, {
  foreignKey: 'organizationId',
  as: 'organizationSettings',
});

OrganizationSettings.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization',
});

// User - Preferences relationship
User.hasOne(UserPreferences, {
  foreignKey: 'userId',
  as: 'preferences',
});

UserPreferences.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// Organization - API Keys relationship
Organization.hasMany(ApiKey, {
  foreignKey: 'organizationId',
  as: 'apiKeys',
});

ApiKey.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization',
});

// User - API Keys relationship
User.hasMany(ApiKey, {
  foreignKey: 'createdBy',
  as: 'createdApiKeys',
});

ApiKey.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});

// API Key - Usage Logs relationship
ApiKey.hasMany(ApiKeyUsageLog, {
  foreignKey: 'apiKeyId',
  as: 'usageLogs',
});

ApiKeyUsageLog.belongsTo(ApiKey, {
  foreignKey: 'apiKeyId',
  as: 'apiKey',
});

// Organization - Contacts relationship
Organization.hasMany(Contact, {
  foreignKey: 'organizationId',
  as: 'contacts',
});

Contact.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization',
});

// User - Contacts relationship
User.hasMany(Contact, {
  foreignKey: 'createdBy',
  as: 'createdContacts',
});

Contact.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});

// Contact Groups relationships
Organization.hasMany(ContactGroup, {
  foreignKey: 'organizationId',
  as: 'contactGroups',
});

ContactGroup.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization',
});

User.hasMany(ContactGroup, {
  foreignKey: 'createdBy',
  as: 'createdGroups',
});

ContactGroup.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});

Contact.belongsToMany(ContactGroup, {
  through: ContactGroupMembership,
  foreignKey: 'contactId',
  otherKey: 'groupId',
  as: 'groups',
});

ContactGroup.belongsToMany(Contact, {
  through: ContactGroupMembership,
  foreignKey: 'groupId',
  otherKey: 'contactId',
  as: 'contacts',
});

// Organization - Templates relationship
Organization.hasMany(Template, {
  foreignKey: 'organizationId',
  as: 'templates',
});

Template.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization',
});

// Template - Versions relationship
Template.hasMany(TemplateVersion, {
  foreignKey: 'templateId',
  as: 'versions',
});

TemplateVersion.belongsTo(Template, {
  foreignKey: 'templateId',
  as: 'template',
});

// Organization - Messages relationship
Organization.hasMany(Message, {
  foreignKey: 'organizationId',
  as: 'messages',
});

Message.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization',
});

// Contact - Messages relationship
Contact.hasMany(Message, {
  foreignKey: 'contactId',
  as: 'messages',
});

Message.belongsTo(Contact, {
  foreignKey: 'contactId',
  as: 'contact',
});

// Template - Messages relationship
Template.hasMany(Message, {
  foreignKey: 'templateId',
  as: 'messages',
});

Message.belongsTo(Template, {
  foreignKey: 'templateId',
  as: 'template',
});

// Message - Events relationship
Message.hasMany(MessageEvent, {
  foreignKey: 'messageId',
  as: 'events',
});

MessageEvent.belongsTo(Message, {
  foreignKey: 'messageId',
  as: 'message',
});

// Bulk Batch - Messages relationship
BulkMessageBatch.hasMany(Message, {
  foreignKey: 'bulkBatchId',
  as: 'messages',
});

Message.belongsTo(BulkMessageBatch, {
  foreignKey: 'bulkBatchId',
  as: 'bulkBatch',
});

// Organization - Media relationship
Organization.hasMany(Media, {
  foreignKey: 'organizationId',
  as: 'media',
});

Media.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization',
});

// User - Media relationship
User.hasMany(Media, {
  foreignKey: 'uploadedBy',
  as: 'uploadedMedia',
});

Media.belongsTo(User, {
  foreignKey: 'uploadedBy',
  as: 'uploader',
});

// Organization - Email Configurations relationship
Organization.hasMany(EmailConfiguration, {
  foreignKey: 'organizationId',
  as: 'emailConfigurations',
});

EmailConfiguration.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization',
});

// Organization - SMS Configurations relationship
Organization.hasMany(SmsConfiguration, {
  foreignKey: 'organizationId',
  as: 'smsConfigurations',
});

SmsConfiguration.belongsTo(Organization, {
  foreignKey: 'organizationId',
  as: 'organization',
});

module.exports = {
  Organization,
  User,
  Session,
  OrganizationSettings,
  UserPreferences,
  ApiKey,
  ApiKeyUsageLog,
  Contact,
  ContactGroup,
  ContactGroupMembership,
  ContactImport,
  Template,
  TemplateImport,
  TemplateVersion,
  Message,
  BulkMessageBatch,
  MessageEvent,
  Media,
  EmailConfiguration,
  SmsConfiguration,
  sequelize: require('../config/database'),
};
