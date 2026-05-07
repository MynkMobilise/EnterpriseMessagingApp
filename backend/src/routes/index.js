const express = require('express');
const authRoutes = require('./auth');
const settingsRoutes = require('./settings');
const apiKeyRoutes = require('./apiKeys');
const contactRoutes = require('./contacts');
const templateRoutes = require('./templates');
const messageRoutes = require('./messages');
const webhookRoutes = require('./webhooks');
const reportRoutes = require('./reports');
const userRoutes = require('./users');
const organizationRoutes = require('./organizations');
const roleRoutes = require('./roles');
const mediaRoutes = require('./media');
const contactGroupRoutes = require('./contactGroups');
const emailConfigurationRoutes = require('./emailConfigurations');
const smsConfigurationRoutes = require('./smsConfigurations');
const migrationRoutes = require('./migration');
const chatRoutes = require('./chat');
const integrationRoutes = require('./integrations');

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/settings', settingsRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/contacts', contactRoutes);
router.use('/contact-groups', contactGroupRoutes);
router.use('/templates', templateRoutes);
router.use('/messages', messageRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/reports', reportRoutes);
router.use('/users', userRoutes);
router.use('/organizations', organizationRoutes);
router.use('/roles', roleRoutes);
router.use('/media', mediaRoutes);
router.use('/email-configurations', emailConfigurationRoutes);
router.use('/sms-configurations', smsConfigurationRoutes);
router.use('/migration', migrationRoutes);
router.use('/chat', chatRoutes);
router.use('/integrations', integrationRoutes);

module.exports = router;

