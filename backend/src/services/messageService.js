const { Message, BulkMessageBatch, MessageEvent, Template, Contact, Organization, sequelize } = require('../models');
const { NotFoundError, AppError } = require('../utils/errorTypes');
const { getPaginationMeta } = require('../utils/helpers');
const { normalizePhone } = require('../utils/phoneNumber');
const { Op } = require('sequelize');

class MessageService {
  /**
   * Send single message
   */
  async send(organizationId, sentBy, data) {
    let {
      channel,
      recipientPhone,
      recipientEmail,
      recipientFcmToken,
      recipientName,
      messageType,
      content,
      subject,
      templateId,
      variables,
      priority,
      scheduledFor,
      category,
      skipApproval, // Flag to bypass approval (for test messages)
      emailConfigurationId, // Specific email configuration to use for testing
    } = data;

    // Normalize the customer phone to digits-only so the same physical
    // customer always lands in one row-bucket — needed for live-chat
    // conversation grouping (inbound webhook arrives as `9199...` while
    // operator-typed values often have `+91` and spaces).
    if ((channel === 'whatsapp' || channel === 'sms') && recipientPhone) {
      recipientPhone = normalizePhone(recipientPhone);
    }

    // Get organization settings to check approval requirements
    const settingsService = require('./settingsService');
    const settings = await settingsService.getOrganizationSettings(organizationId);
    // Test messages skip approval regardless of organization settings
    const requiresApproval = skipApproval ? false : settings.requireMessageApproval;

    // If using template, validate it
    let template = null;
    if (templateId) {
      template = await Template.findOne({
        where: { id: templateId, organizationId, status: 'approved' },
      });

      if (!template) {
        throw new NotFoundError('Template');
      }

      // Validate variables for template messages
      if (channel === 'sms' && template.body && template.body.includes('#var#')) {
        // For SMS templates with #var#, variables are required
        if (!variables || typeof variables !== 'object' || Object.keys(variables).length === 0) {
          throw new Error('SMS template contains #var# placeholders but no variables were provided. Please provide variables when sending the message.');
        }
      }
      
      // Replace variables in content based on channel
      if (channel === 'email' && template.htmlBody) {
        content = this.replaceTemplateVariables(template.htmlBody, variables || {}, channel);
        if (template.plainTextBody) {
          data.plainTextContent = this.replaceTemplateVariables(template.plainTextBody, variables || {}, channel);
        }
      } else if (channel === 'fcm') {
        // FCM can use body or subject as content
        content = this.replaceTemplateVariables(template.body || template.subject || 'Notification', variables || {}, channel);
      } else {
        // WhatsApp, SMS - pass channel to handle different variable formats
        content = this.replaceTemplateVariables(template.body, variables || {}, channel);
      }
      if (template.subject) {
        subject = this.replaceTemplateVariables(template.subject, variables || {}, channel);
      }
    }

    // Find or create contact (runtime creation)
    let contact = null;
    if (channel === 'whatsapp' || channel === 'sms') {
      contact = await Contact.findOne({
        where: { organizationId, phoneNumber: recipientPhone, deletedAt: null },
      });

      if (!contact) {
        // Create contact on runtime basis when sending message
        contact = await Contact.create({
          organizationId,
          createdBy: sentBy,
          phoneNumber: recipientPhone,
          name: recipientName || null,
          status: 'active',
          source: 'Message',
          optInStatus: 'pending',
        });
      } else {
        // Update last message timestamp
        await contact.update({
          lastMessageAt: new Date(),
          totalMessagesSent: (contact.totalMessagesSent || 0) + 1,
        });
      }
    } else if (channel === 'email') {
      contact = await Contact.findOne({
        where: { 
          organizationId, 
          email: recipientEmail, 
          deletedAt: null 
        },
      });

      if (!contact) {
        // For email contacts, phoneNumber can be null
        // Use a placeholder value that won't conflict with real phone numbers
        contact = await Contact.create({
          organizationId,
          createdBy: sentBy,
          phoneNumber: 'email-only', // Placeholder for email-only contacts
          email: recipientEmail,
          name: recipientName || null,
          status: 'active',
          source: 'Message',
          optInStatus: 'pending',
        });
      } else {
        await contact.update({
          lastMessageAt: new Date(),
          totalMessagesSent: (contact.totalMessagesSent || 0) + 1,
        });
      }
    } else if (channel === 'fcm') {
      // For FCM, we might not have a contact, or we might store FCM token in contact metadata
      contact = await Contact.findOne({
        where: { organizationId, phoneNumber: recipientFcmToken, deletedAt: null },
      });

      if (!contact && recipientName) {
        // Try to find by name if provided
        contact = await Contact.findOne({
          where: { 
            organizationId, 
            name: recipientName, 
            deletedAt: null 
          },
        });
      }

      if (!contact) {
        // Create contact with FCM token in metadata
        contact = await Contact.create({
          organizationId,
          createdBy: sentBy,
          name: recipientName || null,
          status: 'active',
          source: 'Message',
          optInStatus: 'pending',
          metadata: { fcmToken: recipientFcmToken },
        });
      } else {
        // Update FCM token in metadata if not present
        const metadata = contact.metadata || {};
        if (!metadata.fcmToken) {
          metadata.fcmToken = recipientFcmToken;
          await contact.update({ metadata });
        }
        await contact.update({
          lastMessageAt: new Date(),
          totalMessagesSent: (contact.totalMessagesSent || 0) + 1,
        });
      }
    }

    // Calculate expiry
    const expiresAt = scheduledFor
      ? new Date(scheduledFor.getTime() + settings.defaultMessageExpiryHours * 60 * 60 * 1000)
      : new Date(Date.now() + settings.defaultMessageExpiryHours * 60 * 60 * 1000);

    // Create message
    const messageData = {
      organizationId,
      sentBy,
      contactId: contact ? contact.id : null,
      recipientName: recipientName || (contact ? contact.name : null),
      channel,
      messageType,
      templateId,
      content,
      priority: priority || 'normal',
      scheduledFor,
      category: category || 'transactional',
      requiresApproval,
      approvalStatus: requiresApproval ? 'pending' : 'approved',
      expiresAt,
      deliveryStatus: 'queued',
    };

    // Add channel-specific recipient fields
    if (channel === 'whatsapp' || channel === 'sms') {
      messageData.recipientPhone = recipientPhone;
    } else if (channel === 'email') {
      messageData.recipientEmail = recipientEmail;
      messageData.subject = subject || 'Notification';
      // Add emailConfigurationId if provided (for test messages)
      if (emailConfigurationId) {
        messageData.emailConfigurationId = emailConfigurationId;
      }
    } else if (channel === 'fcm') {
      messageData.recipientFcmToken = recipientFcmToken;
      messageData.subject = subject || 'Notification';
    }

    // Store variables in metadata for template messages (needed for WhatsApp API)
    if (templateId && variables && Object.keys(variables).length > 0) {
      messageData.metadata = { variables };
    }

    const message = await Message.create(messageData);

    // If no approval required, message is already queued (deliveryStatus='queued')
    // The message worker will pick it up automatically
    return message;
  }

  /**
   * Send bulk messages
   */
  async sendBulk(organizationId, sentBy, data) {
    const { name, channel, templateId, recipients, priority, scheduledFor, subject, skipApproval } = data;

    // Validate template
    const template = await Template.findOne({
      where: { id: templateId, organizationId, status: 'approved' },
    });

    if (!template) {
      throw new NotFoundError('Template');
    }

    // Create batch
    const batch = await BulkMessageBatch.create({
      organizationId,
      createdBy: sentBy,
      name,
      templateId,
      totalRecipients: recipients.length,
      status: 'pending',
    });

    // Create messages for each recipient
    const messages = [];
    for (const recipient of recipients) {
      const sendData = {
        channel,
        recipientName: recipient.name,
        messageType: 'template',
        templateId,
        subject: subject || template.subject || 'Notification',
        variables: recipient.variables || {},
        priority,
        scheduledFor,
        skipApproval,
      };

      // Add channel-specific recipient field
      if (channel === 'whatsapp' || channel === 'sms') {
        sendData.recipientPhone = recipient.phone;
      } else if (channel === 'email') {
        sendData.recipientEmail = recipient.email;
      } else if (channel === 'fcm') {
        sendData.recipientFcmToken = recipient.fcmToken;
      }

      const message = await this.send(organizationId, sentBy, sendData);
      messages.push(message);
    }

    await batch.update({ status: 'processing', startedAt: new Date() });

    return {
      batchId: batch.id,
      totalRecipients: recipients.length,
      status: 'pending',
    };
  }

  /**
   * List messages
   */
  async list(organizationId, filters = {}) {
    const { page = 1, limit = 20, status, channel, startDate, endDate } = filters;

    const where = { organizationId };

    if (status) where.approvalStatus = status;
    if (channel) where.channel = channel;

    // Add date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include entire end date
        where.createdAt[Op.lte] = end;
      }
    }

    const { count, rows } = await Message.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['created_at', 'DESC']],
      include: [
        { model: Contact, as: 'contact' },
        { model: Template, as: 'template' },
      ],
    });

    return {
      messages: rows,
      pagination: getPaginationMeta(page, limit, count),
    };
  }

  /**
   * Get message by ID with formatted trace logs
   */
  async getById(id, organizationId) {
    const message = await Message.findOne({
      where: { id, organizationId },
      include: [
        { model: Contact, as: 'contact' },
        { model: Template, as: 'template' },
        { 
          model: MessageEvent, 
          as: 'events',
          order: [['occurred_at', 'ASC']],
        },
      ],
    });

    if (!message) {
      throw new NotFoundError('Message');
    }

    // Format trace logs for channel-specific display
    const traceLogService = require('./traceLogService');
    const formattedTraceLogs = traceLogService.formatTraceLogsForChannel(
      message,
      message.events || [],
      message.channel
    );

    // Convert to plain object and add trace logs
    const messageData = message.toJSON();
    messageData.traceLogs = formattedTraceLogs;

    return messageData;
  }

  /**
   * List pending approvals
   */
  async listPendingApprovals(organizationId, filters = {}) {
    const { page = 1, limit = 20, priority } = filters;

    const where = {
      organizationId,
      approvalStatus: 'pending',
      expiresAt: { [Op.gt]: new Date() },
    };

    if (priority) where.priority = priority;

    const { count, rows } = await Message.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [
        ['priority', 'DESC'],
        ['created_at', 'ASC'],
      ],
      include: [
        { model: Contact, as: 'contact' },
        { model: Template, as: 'template' },
      ],
    });

    // Get stats
    const stats = await Message.findAll({
      where: { organizationId, approvalStatus: 'pending' },
      attributes: [
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['priority'],
      raw: true,
    });

    return {
      messages: rows,
      pagination: getPaginationMeta(page, limit, count),
      stats: this.formatApprovalStats(stats),
    };
  }

  /**
   * Approve message
   */
  async approve(id, approvedBy, organizationId) {
    const message = await Message.findOne({
      where: { id, organizationId, approvalStatus: 'pending' },
    });

    if (!message) {
      throw new NotFoundError('Message');
    }

    if (message.expiresAt < new Date()) {
      await message.update({ approvalStatus: 'expired' });
      throw new AppError('Message approval has expired', 400);
    }

    await message.update({
      approvalStatus: 'approved',
      approvedBy,
      approvedAt: new Date(),
      deliveryStatus: 'queued',
    });

    // Message is queued (deliveryStatus='queued'), worker will pick it up automatically
    return message;
  }

  /**
   * Reject message
   */
  async reject(id, rejectedBy, reason, organizationId) {
    const message = await Message.findOne({
      where: { id, organizationId, approvalStatus: 'pending' },
    });

    if (!message) {
      throw new NotFoundError('Message');
    }

    await message.update({
      approvalStatus: 'rejected',
      rejectedBy,
      rejectedAt: new Date(),
      rejectionReason: reason,
      deliveryStatus: 'cancelled',
    });

    return message;
  }

  /**
   * Bulk approve
   */
  async bulkApprove(organizationId, approvedBy, options) {
    const { messageIds, approveAllPending } = options;

    let messages;
    if (approveAllPending) {
      messages = await Message.findAll({
        where: {
          organizationId,
          approvalStatus: 'pending',
          expiresAt: { [Op.gt]: new Date() },
        },
      });
    } else {
      messages = await Message.findAll({
        where: {
          id: { [Op.in]: messageIds },
          organizationId,
          approvalStatus: 'pending',
        },
      });
    }

    let approvedCount = 0;
    for (const message of messages) {
      try {
        await this.approve(message.id, approvedBy, organizationId);
        approvedCount++;
      } catch (error) {
        // Continue with other messages
      }
    }

    return {
      approvedCount,
      failedCount: messages.length - approvedCount,
    };
  }

  /**
   * Replace template variables
   * SMS uses #var# format, WhatsApp/Email/FCM use {{var}} format
   */
  replaceTemplateVariables(template, variables, channel = 'whatsapp') {
    let content = template;
    const logger = require('../utils/logger');
    
    if (channel === 'sms') {
      // For SMS, replace #var# with values in order
      // Variables should be provided as var1, var2, var3, etc. or as an array
      const varMatches = content.match(/#var#/g) || [];
      
      if (varMatches.length > 0) {
        logger.debug(`SMS template contains ${varMatches.length} #var# placeholders`);
        logger.debug(`Template before replacement: ${content.substring(0, 200)}`);
        logger.debug(`Variables provided: ${JSON.stringify(variables)}`);
        
        let varIndex = 0;
        
        // If variables is an object, convert to array based on var1, var2, etc.
        let varArray = [];
        if (Array.isArray(variables)) {
          varArray = variables;
        } else if (typeof variables === 'object' && variables !== null) {
          // Extract values in order: var1, var2, var3, etc.
          const keys = Object.keys(variables).sort((a, b) => {
            const numA = parseInt(a.replace('var', '')) || 0;
            const numB = parseInt(b.replace('var', '')) || 0;
            return numA - numB;
          });
          varArray = keys.map(key => variables[key]);
        }
        
        // Validate: if template has #var# but no variables provided, throw error
        if (varArray.length === 0) {
          throw new Error(`Template contains ${varMatches.length} #var# placeholder(s) but no variables were provided. Please provide variables as { var1: "value1", var2: "value2", ... }`);
        }
        
        // Validate: if more #var# than variables, warn but continue (will use empty string)
        if (varMatches.length > varArray.length) {
          logger.warn(`Template has ${varMatches.length} #var# placeholders but only ${varArray.length} variable(s) provided. Missing values will be replaced with empty strings.`);
        }
        
        // Replace each #var# with corresponding value
        content = content.replace(/#var#/g, (match) => {
          const value = varArray[varIndex] || '';
          varIndex++;
          return value;
        });
        
        logger.debug(`Template after replacement: ${content.substring(0, 200)}`);
        
        // Final validation: ensure no #var# remains
        if (content.includes('#var#')) {
          logger.warn(`Warning: Template still contains #var# after replacement. This may indicate a mismatch between placeholders and variables.`);
        }
      }
    } else {
      // For WhatsApp, Email, FCM - use {{var}} format
      for (const [key, value] of Object.entries(variables || {})) {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
    }
    
    return content;
  }

  /**
   * Get priority value for queue
   */
  getPriorityValue(priority) {
    const priorities = {
      urgent: 1,
      high: 2,
      normal: 3,
      low: 4,
    };
    return priorities[priority] || 3;
  }

  /**
   * Format approval stats
   */
  formatApprovalStats(stats) {
    const formatted = {
      totalPending: 0,
      urgent: 0,
      high: 0,
      normal: 0,
      low: 0,
    };

    stats.forEach(stat => {
      const count = parseInt(stat.count);
      formatted.totalPending += count;
      if (stat.priority) {
        formatted[stat.priority] = count;
      }
    });

    return formatted;
  }
}

module.exports = new MessageService();

