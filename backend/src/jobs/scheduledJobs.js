const cron = require('node-cron');
const { Message, Session, MessageEvent, ApiKeyUsageLog } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Cleanup expired sessions
 */
const cleanupExpiredSessions = async () => {
  try {
    const deleted = await Session.destroy({
      where: {
        expiresAt: { [Op.lt]: new Date() },
      },
    });
    logger.info(`Cleaned up ${deleted} expired sessions`);
  } catch (error) {
    logger.error('Error cleaning up expired sessions:', error);
  }
};

/**
 * Cleanup old message events (keep last 90 days)
 */
const cleanupOldMessageEvents = async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const deleted = await MessageEvent.destroy({
      where: {
        occurredAt: { [Op.lt]: cutoffDate },
      },
    });
    logger.info(`Cleaned up ${deleted} old message events`);
  } catch (error) {
    logger.error('Error cleaning up old message events:', error);
  }
};

/**
 * Cleanup old API key usage logs (keep last 30 days)
 */
const cleanupOldApiKeyLogs = async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const deleted = await ApiKeyUsageLog.destroy({
      where: {
        createdAt: { [Op.lt]: cutoffDate },
      },
    });
    logger.info(`Cleaned up ${deleted} old API key usage logs`);
  } catch (error) {
    logger.error('Error cleaning up old API key logs:', error);
  }
};

/**
 * Update expired message approvals
 */
const updateExpiredApprovals = async () => {
  try {
    const updated = await Message.update(
      { approvalStatus: 'expired' },
      {
        where: {
          approvalStatus: 'pending',
          expiresAt: { [Op.lt]: new Date() },
        },
      }
    );
    logger.info(`Updated ${updated[0]} expired message approvals`);
  } catch (error) {
    logger.error('Error updating expired approvals:', error);
  }
};

/**
 * Initialize scheduled jobs
 */
const initializeScheduledJobs = () => {
  // Cleanup expired sessions - daily at 2 AM
  cron.schedule('0 2 * * *', cleanupExpiredSessions);

  // Cleanup old message events - daily at 3 AM
  cron.schedule('0 3 * * *', cleanupOldMessageEvents);

  // Cleanup old API key logs - daily at 4 AM
  cron.schedule('0 4 * * *', cleanupOldApiKeyLogs);

  // Update expired approvals - every hour
  cron.schedule('0 * * * *', updateExpiredApprovals);

  logger.info('Scheduled jobs initialized');
};

module.exports = {
  initializeScheduledJobs,
  cleanupExpiredSessions,
  cleanupOldMessageEvents,
  cleanupOldApiKeyLogs,
  updateExpiredApprovals,
};


