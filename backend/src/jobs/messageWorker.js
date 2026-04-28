const { Message, MessageEvent, sequelize } = require('../models');
const whatsappService = require('../services/whatsappService');
const smsService = require('../services/smsService');
const emailService = require('../services/emailService');
const fcmService = require('../services/fcmService');
const logger = require('../utils/logger');
const traceLogService = require('../services/traceLogService');
const { Op } = require('sequelize');

// Priority order mapping
const PRIORITY_ORDER = {
  urgent: 1,
  high: 2,
  normal: 3,
  low: 4,
};

// Worker configuration
const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
const MAX_CONCURRENT_MESSAGES = 10;
let isProcessing = false;
let processingCount = 0;

/**
 * Process a single message
 */
async function processMessage(message) {
  try {
    // Check if message is still queued and approved
    const currentMessage = await Message.findByPk(message.id);
    if (!currentMessage || currentMessage.deliveryStatus !== 'queued' || currentMessage.approvalStatus !== 'approved') {
      logger.warn(`Message ${message.id} is no longer queued or approved, skipping`);
      return;
    }

    // Check if scheduled for future
    if (message.scheduledFor && new Date(message.scheduledFor) > new Date()) {
      logger.info(`Message ${message.id} is scheduled for ${message.scheduledFor}, skipping`);
      return;
    }

    // Log message picked up from queue
    await traceLogService.logTrace(message.id, 'processing', {
      stage: 'worker_pickup',
      priority: message.priority,
      channel: message.channel,
    }, { channel: message.channel });

    // Update status to processing
    const oldStatus = message.deliveryStatus;
    await message.update({ deliveryStatus: 'processing' });

    // Log status change
    await traceLogService.logStatusChange(
      message.id,
      message.channel,
      oldStatus,
      'processing',
      'Worker started processing'
    );

    logger.info(`Processing message ${message.id} (priority: ${message.priority}, channel: ${message.channel})`);

    // Send message based on channel
    let result;
    if (message.channel === 'whatsapp') {
      result = await whatsappService.sendMessage(message);
    } else if (message.channel === 'sms') {
      result = await smsService.sendMessage(message);
    } else if (message.channel === 'email') {
      // If emailConfigurationId is provided (for test messages), use it
      if (message.emailConfigurationId) {
        const emailConfigurationService = require('../services/emailConfigurationService');
        const config = await emailConfigurationService.getById(message.emailConfigurationId, message.organizationId);
        result = await emailService.sendWithConfiguration(message, config);
      } else {
        result = await emailService.sendMessage(message);
      }
    } else if (message.channel === 'fcm') {
      result = await fcmService.sendMessage(message);
    } else {
      throw new Error(`Unknown channel: ${message.channel}`);
    }

    // Check if message is delivered (for custom SMS provider with "sent,success" response)
    const isDelivered = result.isDelivered === true || result.status === 'delivered';
    
    if (isDelivered) {
      // Update message status to delivered
      await message.update({
        deliveryStatus: 'delivered',
        sentAt: new Date(),
        deliveredAt: new Date(),
        externalMessageId: result.messageId || result.id,
      });

      // Log status change
      await traceLogService.logStatusChange(
        message.id,
        message.channel,
        'processing',
        'delivered',
        'Message delivered successfully (confirmed by provider)'
      );

      // Log event
      await MessageEvent.create({
        messageId: message.id,
        eventType: 'delivered',
        eventData: {
          ...result,
          timestamp: new Date().toISOString(),
        },
      });

      logger.info(`Message ${message.id} delivered successfully via ${message.channel}`);
    } else {
      // Update message status to sent (normal success without delivery confirmation)
      await message.update({
        deliveryStatus: 'sent',
        sentAt: new Date(),
        externalMessageId: result.messageId || result.id,
      });

      // Log status change
      await traceLogService.logStatusChange(
        message.id,
        message.channel,
        'processing',
        'sent',
        'Message sent successfully'
      );

      // Log event
      await MessageEvent.create({
        messageId: message.id,
        eventType: 'sent',
        eventData: {
          ...result,
          timestamp: new Date().toISOString(),
        },
      });

      logger.info(`Message ${message.id} sent successfully via ${message.channel}`);
    }
    return { success: true, messageId: message.id, result };
  } catch (error) {
    logger.error(`Error processing message ${message.id}:`, error);

    // Update message status to failed
    const currentMessage = await Message.findByPk(message.id);
    if (currentMessage) {
      const oldStatus = currentMessage.deliveryStatus;
      await currentMessage.update({
        deliveryStatus: 'failed',
        failedAt: new Date(),
        failureReason: error.message,
      });

      // Log status change
      await traceLogService.logStatusChange(
        currentMessage.id,
        currentMessage.channel,
        oldStatus,
        'failed',
        error.message
      );

      await MessageEvent.create({
        messageId: currentMessage.id,
        eventType: 'failed',
        eventData: {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        },
      });
    }

    throw error;
  }
}

/**
 * Fetch pending messages from database
 */
async function fetchPendingMessages(limit = MAX_CONCURRENT_MESSAGES) {
  const now = new Date();

  // Fetch messages that are queued, approved, and not scheduled for future
  // Order by priority (urgent first), then by created_at
  const messages = await Message.findAll({
    where: {
      deliveryStatus: 'queued',
      approvalStatus: 'approved',
      [Op.or]: [
        { scheduledFor: null },
        { scheduledFor: { [Op.lte]: now } },
      ],
    },
    order: [
      // Use CASE statement for priority ordering
      [sequelize.literal(`CASE priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'normal' THEN 3 
        WHEN 'low' THEN 4 
        ELSE 5 END`), 'ASC'],
      ['createdAt', 'ASC'],
    ],
    limit,
    include: ['contact', 'template'],
  });

  return messages;
}

/**
 * Process messages in batch
 */
async function processMessages() {
  if (isProcessing) {
    return; // Already processing
  }

  // Check if we can process more messages
  const availableSlots = MAX_CONCURRENT_MESSAGES - processingCount;
  if (availableSlots <= 0) {
    return; // At capacity
  }

  isProcessing = true;

  try {
    const messages = await fetchPendingMessages(availableSlots);

    if (messages.length === 0) {
      isProcessing = false;
      return; // No messages to process
    }

    logger.info(`Found ${messages.length} messages to process`);

    // Process messages concurrently (up to limit)
    const processingPromises = messages.map(async (message) => {
      processingCount++;
      try {
        await processMessage(message);
      } catch (error) {
        logger.error(`Failed to process message ${message.id}:`, error);
      } finally {
        processingCount--;
      }
    });

    await Promise.all(processingPromises);
  } catch (error) {
    logger.error('Error in message processing batch:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Start the message worker
 */
function startWorker() {
  logger.info('Starting database-based message worker...');
  logger.info(`Poll interval: ${POLL_INTERVAL_MS}ms, Max concurrent: ${MAX_CONCURRENT_MESSAGES}`);

  // Process immediately on start
  processMessages();

  // Then poll at regular intervals
  const intervalId = setInterval(() => {
    processMessages();
  }, POLL_INTERVAL_MS);

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('Stopping message worker...');
    clearInterval(intervalId);
    // Wait for current processing to complete
    const checkInterval = setInterval(() => {
      if (processingCount === 0 && !isProcessing) {
        clearInterval(checkInterval);
        logger.info('Message worker stopped');
        process.exit(0);
      }
    }, 100);
  });

  return intervalId;
}

/**
 * Stop the message worker
 */
function stopWorker(intervalId) {
  if (intervalId) {
    clearInterval(intervalId);
  }
  logger.info('Message worker stopped');
}

module.exports = {
  startWorker,
  stopWorker,
  processMessage,
  processMessages,
};

