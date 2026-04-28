const express = require('express');
const whatsappService = require('../services/whatsappService');
const { OrganizationSettings } = require('../models');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * WhatsApp webhook verification
 */
router.get('/whatsapp', async (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Get verify token from first organization (in production, use proper routing)
    const settings = await OrganizationSettings.findOne({
      where: {
        whatsappWebhookVerifyToken: token,
      },
    });

    if (mode === 'subscribe' && settings) {
      logger.info('WhatsApp webhook verified');
      res.status(200).send(challenge);
    } else {
      logger.warn('WhatsApp webhook verification failed');
      res.sendStatus(403);
    }
  } catch (error) {
    logger.error('Webhook verification error:', error);
    res.sendStatus(500);
  }
});

/**
 * WhatsApp webhook handler
 */
router.post('/whatsapp', async (req, res) => {
  try {
    await whatsappService.processWebhook(req.body);
    res.sendStatus(200);
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.sendStatus(500);
  }
});

module.exports = router;


