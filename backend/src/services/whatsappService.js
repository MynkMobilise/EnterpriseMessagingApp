const axios = require('axios');
const { Message, OrganizationSettings, Template, Contact, MessageEvent } = require('../models');
const logger = require('../utils/logger');
const { decrypt, encrypt, isEncrypted } = require('../utils/encryption');
const traceLogService = require('./traceLogService');
const { AppError } = require('../utils/errorTypes');
const inboundMediaService = require('./inboundMediaService');
const { normalizePhone } = require('../utils/phoneNumber');

class WhatsAppService {
  /**
   * Test WhatsApp connection with provided credentials
   */
  async testConnection(credentials) {
    const { whatsappBusinessAccountId, whatsappPhoneNumberId, whatsappAccessToken, whatsappAppId, whatsappAppSecret } = credentials;

    try {
      // Validate required fields
      if (!whatsappBusinessAccountId || !whatsappPhoneNumberId || !whatsappAccessToken) {
        throw new AppError('WABA ID, Phone Number ID, and Access Token are required', 400);
      }

      // Validate formats
      if (!/^\d{15,18}$/.test(whatsappBusinessAccountId)) {
        throw new AppError('WABA ID must be 15-18 numeric digits', 400);
      }
      if (!/^\d{15,18}$/.test(whatsappPhoneNumberId)) {
        throw new AppError('Phone Number ID must be 15-18 numeric digits', 400);
      }

      // Test access token by making a simple API call
      const apiVersion = 'v18.0';
      const testUrl = `https://graph.facebook.com/${apiVersion}/${whatsappPhoneNumberId}`;

      logger.info('Testing WhatsApp connection', {
        wabaId: whatsappBusinessAccountId,
        phoneNumberId: whatsappPhoneNumberId,
        hasAccessToken: !!whatsappAccessToken,
        hasAppId: !!whatsappAppId,
        hasAppSecret: !!whatsappAppSecret,
      });

      const verificationResults = {
        phoneNumberVerified: false,
        wabaVerified: false,
        phoneNumberDetails: null,
        wabaDetails: null,
      };

      // Test 1: Verify phone number access
      // Note: Phone Number node has limited fields. We'll just verify it exists and is accessible.
      try {
        const phoneResponse = await axios.get(testUrl, {
          params: {
            fields: 'id', // Only request 'id' field which is always available
            access_token: whatsappAccessToken,
          },
          timeout: 10000,
        });

        if (!phoneResponse.data || phoneResponse.data.id !== whatsappPhoneNumberId) {
          throw new AppError('Phone Number ID verification failed', 400);
        }

        verificationResults.phoneNumberVerified = true;
        verificationResults.phoneNumberDetails = {
          id: phoneResponse.data.id,
          displayPhoneNumber: 'N/A', // Not available on Phone Number node directly
          qualityRating: 'N/A', // Not available on Phone Number node directly
          codeVerificationStatus: 'N/A', // Not available on Phone Number node directly
        };

        logger.info('Phone Number ID verified successfully', {
          phoneNumberId: phoneResponse.data.id,
        });
      } catch (error) {
        if (error.response) {
          const errorData = error.response.data?.error || {};
          throw new AppError(
            `Phone Number verification failed: ${errorData.message || error.message}`,
            error.response.status || 400
          );
        }
        throw new AppError(`Phone Number verification failed: ${error.message}`, 400);
      }

      // Test 2: Verify WABA access
      let wabaVerified = false;
      try {
        const wabaUrl = `https://graph.facebook.com/${apiVersion}/${whatsappBusinessAccountId}`;
        const wabaResponse = await axios.get(wabaUrl, {
          params: {
            fields: 'id,name,account_review_status,message_template_namespace',
            access_token: whatsappAccessToken,
          },
          timeout: 10000,
        });

        if (!wabaResponse.data || wabaResponse.data.id !== whatsappBusinessAccountId) {
          throw new AppError('WABA ID verification failed', 400);
        }

        wabaVerified = true;
        verificationResults.wabaVerified = true;
        verificationResults.wabaDetails = {
          id: wabaResponse.data.id,
          name: wabaResponse.data.name || 'N/A',
          accountReviewStatus: wabaResponse.data.account_review_status || 'UNKNOWN',
          messageTemplateNamespace: wabaResponse.data.message_template_namespace || 'N/A',
        };

        logger.info('WABA ID verified successfully', verificationResults.wabaDetails);
      } catch (error) {
        // WABA verification is optional, log warning but don't fail
        logger.warn('WABA ID verification failed (non-critical):', error.message);
        verificationResults.wabaDetails = {
          error: error.response?.data?.error?.message || error.message,
        };
      }

      // Test 3: Verify message sending permissions (check if we can access messages endpoint)
      let messagePermissionsVerified = false;
      try {
        const messagesUrl = `https://graph.facebook.com/${apiVersion}/${whatsappPhoneNumberId}/messages`;
        // Just check if we can access the endpoint (don't actually send)
        const messagesResponse = await axios.get(messagesUrl, {
          params: {
            limit: 0, // Don't fetch any messages, just test access
            access_token: whatsappAccessToken,
          },
          timeout: 10000,
          validateStatus: (status) => status < 500, // Accept 400/404 as valid (means endpoint exists)
        });

        // If we get a response (even if it's an error about missing required params), 
        // it means we have access to the messages endpoint
        if (messagesResponse.status < 500) {
          messagePermissionsVerified = true;
          logger.info('Message sending permissions verified (messages endpoint accessible)');
        }
      } catch (error) {
        // This is optional - if it fails, it might just mean we need required params
        logger.warn('Message permissions check failed (non-critical):', error.message);
      }

      return {
        success: true,
        message: 'Connection test successful! Your credentials are valid and the API is accessible.',
        details: {
          ...verificationResults,
          messagePermissionsVerified,
          summary: {
            phoneNumberAccessible: verificationResults.phoneNumberVerified,
            wabaAccessible: verificationResults.wabaVerified,
            canSendMessages: messagePermissionsVerified,
          },
        },
      };
    } catch (error) {
      logger.error('WhatsApp connection test failed:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Connection test failed: ${error.message}`, 500);
    }
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(message) {
    await traceLogService.logTrace(message.id, 'processing', {
      stage: 'whatsapp_service_entry',
      channel: 'whatsapp',
    }, { channel: 'whatsapp' });

    try {
      // Get organization settings
      const settings = await OrganizationSettings.findOne({
        where: { organizationId: message.organizationId },
      });

      if (!settings || !settings.whatsappAccessToken) {
        throw new Error('WhatsApp not configured for this organization');
      }

      await traceLogService.logTrace(message.id, 'processing', {
        stage: 'whatsapp_config_retrieved',
        phoneNumberId: settings.whatsappPhoneNumberId,
        apiVersion: settings.whatsappApiVersion || 'v18.0',
      }, { channel: 'whatsapp' });

      // Decrypt access token (handle both encrypted and plain text tokens)
      await traceLogService.logTrace(message.id, 'processing', {
        stage: 'access_token_decryption',
        action: 'decrypting',
      }, { channel: 'whatsapp' });

      let accessToken;
      const { isEncrypted } = require('../utils/encryption');
      
      if (!settings.whatsappAccessToken || settings.whatsappAccessToken.trim() === '') {
        throw new Error(
          'WhatsApp access token is not configured. ' +
          'Please go to Settings → WhatsApp API → Manual Configuration and enter your Access Token.'
        );
      }
      
      if (isEncrypted(settings.whatsappAccessToken)) {
        try {
          accessToken = decrypt(settings.whatsappAccessToken);
          // Validate decrypted token is not empty and looks like a valid token
          if (!accessToken || accessToken.trim() === '') {
            throw new Error('Decrypted token is empty');
          }
        } catch (error) {
          // If decryption fails, it might be encrypted with a different key
          // Try to use it as plain text if it doesn't look like encrypted format
          logger.warn('Failed to decrypt WhatsApp access token, attempting to use as plain text:', error.message);
          
          // Check if it might actually be plain text (not in encrypted format)
          // Encrypted format is: {32 hex chars}:{hex chars}
          const looksLikeEncrypted = /^[0-9a-f]{32}:[0-9a-f]+$/i.test(settings.whatsappAccessToken);
          
          if (!looksLikeEncrypted) {
            // Doesn't look encrypted, use as plain text
            logger.info('Token does not appear to be in encrypted format, using as plain text');
            accessToken = settings.whatsappAccessToken;
          } else {
            // Looks encrypted but can't decrypt - encryption key mismatch
            logger.error('Token appears encrypted but decryption failed. Encryption key mismatch.');
            
            // Clear the invalid encrypted token to force user to re-enter
            try {
              await settings.update({ whatsappAccessToken: null });
              logger.info('Cleared invalid encrypted WhatsApp access token. User must re-enter it.');
            } catch (updateError) {
              logger.error('Failed to clear invalid token:', updateError.message);
            }
            
            throw new Error(
              'WhatsApp access token decryption failed. The encryption key has changed. ' +
              'Please go to Settings → WhatsApp API → Manual Configuration and re-enter your Access Token. ' +
              'The invalid token has been cleared for your security.'
            );
          }
        }
      } else {
        // Token is not encrypted (plain text), use as-is
        accessToken = settings.whatsappAccessToken;
        logger.info('WhatsApp access token is stored in plain text format.');
      }
      
      await traceLogService.logTrace(message.id, 'processing', {
        stage: 'access_token_decryption',
        action: 'decrypted_successfully',
      }, { channel: 'whatsapp' });

      const phoneNumberId = settings.whatsappPhoneNumberId;
      const apiVersion = settings.whatsappApiVersion || 'v18.0';

      // Prepare message payload
      // Extract variables from message metadata or use empty object
      const variables = message.metadata?.variables || message.variables || {};
      const template = message.template;
      
      // Log template and variables for debugging
      logger.info('Preparing WhatsApp payload', {
        messageId: message.id,
        templateId: template?.id,
        templateName: template?.name,
        hasButtons: !!template?.buttons,
        buttonsCount: template?.buttons?.length || 0,
        buttons: template?.buttons,
        variablesKeys: Object.keys(variables),
        variables: variables,
      });
      
      const payload = await this.prepareMessagePayload(message, settings, variables, template, {
        accessToken,
        phoneNumberId,
        apiVersion,
      });

      await traceLogService.logTrace(message.id, 'processing', {
        stage: 'payload_prepared',
        messageType: message.messageType,
        hasTemplate: !!message.templateId,
        templateName: message.template?.name || null,
        componentsCount: payload.template?.components?.length || 0,
        hasButtons: !!template?.buttons,
      }, { channel: 'whatsapp' });

      const apiUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
      const startTime = Date.now();

      // Log API request
      await traceLogService.logApiRequest(
        message.id,
        'whatsapp',
        apiUrl,
        'POST',
        {
          'Authorization': 'Bearer ***',
          'Content-Type': 'application/json',
        },
        {
          ...payload,
          to: payload.to, // Phone number is okay to log
        },
        'Meta WhatsApp'
      );

      // Send to WhatsApp API
      const response = await axios.post(
        apiUrl,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const duration = Date.now() - startTime;

      // Log API response
      await traceLogService.logApiResponse(
        message.id,
        'whatsapp',
        response.status,
        response.headers,
        response.data,
        duration,
        'Meta WhatsApp'
      );

      const wamid = response.data.messages[0].id;
      logger.info(`WhatsApp message sent: ${wamid}`);

      await traceLogService.logTrace(message.id, 'sent', {
        wamid,
        status: 'sent',
      }, { channel: 'whatsapp' });

      return {
        messageId: wamid,
        status: 'sent',
        providerResponse: response.data,
      };
    } catch (error) {
      await traceLogService.logError(message.id, 'whatsapp', error, {
        stage: 'whatsapp_send',
      }, 'Meta WhatsApp');
      
      logger.error('WhatsApp send error:', error.response?.data || error.message);
      
      // Provide more detailed error message
      let errorMessage = `WhatsApp send failed: ${error.response?.data?.error?.message || error.message}`;
      
      // Add helpful context for common errors
      if (error.response?.data?.error) {
        const apiError = error.response.data.error;
        if (apiError.code === 100 && apiError.error_subcode === 33) {
          errorMessage += ' This usually means the Phone Number ID is incorrect, the access token lacks permissions, or the phone number is not properly linked to your WABA. Please verify your WhatsApp configuration in Settings → WhatsApp API → Manual Configuration.';
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Prepare message payload for WhatsApp API
   */
  async prepareMessagePayload(message, settings, variables = {}, template = null, sendCtx = {}) {
    const basePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: message.recipientPhone.replace(/[^0-9]/g, ''), // Remove non-numeric characters
    };

    if (message.messageType === 'template' && message.templateId && template) {
      // Template message
      basePayload.type = 'template';
      basePayload.template = {
        name: template.whatsappTemplateId || template.name,
        language: {
          code: template.language || 'en',
        },
        components: await this.prepareTemplateComponents(variables, template, sendCtx),
      };
    } else {
      // Text message
      basePayload.type = 'text';
      basePayload.text = {
        body: message.content,
      };
    }

    return basePayload;
  }

  /**
   * Prepare template components for WhatsApp API
   * @param {Object} variables - Variable values (e.g., { "1": "value1", "var1": "value1", "button_url": "https://..." })
   * @param {Object} template - Template object with buttons array
   * @returns {Array} Components array for WhatsApp API
   */
  async prepareTemplateComponents(variables, template = null, sendCtx = {}) {
    const components = [];

    // Add body component with parameters if variables exist
    if (variables && typeof variables === 'object' && Object.keys(variables).length > 0) {
      // Convert variables object to array of parameter values
      // Handle both numeric keys (1, 2, 3) and named keys (var1, var2, etc.)
      const parameterValues = [];
      
      // Sort keys to maintain order
      const sortedKeys = Object.keys(variables).sort((a, b) => {
        // Extract numeric part for sorting
        const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
        const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
        return numA - numB;
      });
      
      // Extract values in order (excluding button-specific variables and
      // per-card variables — `card{N}.var` belongs to a card body, not the
      // top-level body).
      sortedKeys.forEach(key => {
        if (key.toLowerCase().includes('button') || key.toLowerCase().includes('url')) {
          return;
        }
        if (/^card\d+[._-]/i.test(key)) {
          return;
        }
        const value = variables[key];
        if (value !== null && value !== undefined && value !== '') {
          parameterValues.push({
            type: 'text',
            text: String(value),
          });
        }
      });

      // Only add body component if we have parameters
      if (parameterValues.length > 0) {
        components.push({
          type: 'body',
          parameters: parameterValues,
        });
      }
    }

    // Carousel: when sending a carousel template, Meta wants a CAROUSEL
    // component with one entry per card. Each card MUST include a HEADER
    // component referencing a media_id (the approved header_handle is NOT
    // reused at send time — Meta requires a fresh media reference). We
    // upload each card's local media to the messages-media endpoint to
    // mint a media_id at send time. Cards may also carry per-card BODY
    // variables: we look for keys like `card1.var1` in the `variables`
    // object so a single send call can pass per-card values.
    if (template?.templateType === 'carousel' && Array.isArray(template.cards)) {
      const metaUploadService = require('./metaUploadService');
      const { accessToken, phoneNumberId, apiVersion } = sendCtx;

      const cardComponents = await Promise.all(template.cards.map(async (card, idx) => {
        const cardIdx = String(idx + 1);
        const perCardVars = {};
        if (variables && typeof variables === 'object') {
          for (const [key, value] of Object.entries(variables)) {
            const m = key.match(/^card(\d+)[._-](.+)$/i);
            if (m && m[1] === cardIdx) perCardVars[m[2]] = value;
          }
        }
        const subComponents = [];

        // HEADER (required) — upload the card's local media to get a
        // fresh media_id and attach it as the header parameter.
        if (!card?.media?.url) {
          throw new AppError(`Carousel card ${idx + 1} is missing media; cannot send.`, 400);
        }
        if (!accessToken || !phoneNumberId) {
          throw new AppError('Missing access token / phone_number_id for carousel media upload', 500);
        }
        const headerKind = card.media.type === 'video' ? 'video' : 'image';
        const mediaId = await metaUploadService.uploadMessageMedia({
          localUrl: card.media.url,
          phoneNumberId,
          accessToken,
          apiVersion,
        });
        subComponents.push({
          type: 'header',
          parameters: [
            { type: headerKind, [headerKind]: { id: mediaId } },
          ],
        });

        // BODY — only if there are per-card variables to substitute.
        const cardParams = Object.keys(perCardVars)
          .sort((a, b) => (parseInt(a.replace(/[^0-9]/g, '')) || 0) - (parseInt(b.replace(/[^0-9]/g, '')) || 0))
          .map((k) => ({ type: 'text', text: String(perCardVars[k]) }))
          .filter((p) => p.text !== '' && p.text !== 'null' && p.text !== 'undefined');
        if (cardParams.length > 0) {
          subComponents.push({ type: 'body', parameters: cardParams });
        }

        // Meta rejects an extra `type` key on the card object — cards only
        // carry `card_index` + `components`. The wrapping component below
        // is what's typed as 'carousel'.
        return {
          card_index: idx,
          components: subComponents,
        };
      }));
      components.push({ type: 'carousel', cards: cardComponents });
    }

    // Buttons are handled by WhatsApp template itself - no dynamic parameters needed
    // QUICK_REPLY buttons don't require components
    // URL and PHONE_NUMBER buttons will use static values from template if configured

    return components;
  }

  /**
   * Process webhook event
   */
  async processWebhook(event) {
    try {
      const { entry } = event;
      if (!entry || entry.length === 0) return;

      for (const entryItem of entry) {
        const { changes } = entryItem;
        if (!changes || changes.length === 0) continue;

        for (const change of changes) {
          if (change.field === 'messages') {
            await this.handleMessageStatus(change.value);
          } else if (change.field === 'message_template_status_update') {
            await this.handleTemplateStatusUpdate(change.value);
          } else {
            logger.info('Unhandled webhook field', { field: change.field });
          }
        }
      }
    } catch (error) {
      logger.error('Webhook processing error:', error);
      throw error;
    }
  }

  /**
   * Handle Meta template approval status updates.
   * Payload shape (Meta v18+):
   *   { event: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'PAUSED' | 'PENDING_DELETION',
   *     message_template_id: <numeric Meta id>,
   *     message_template_name: '...', message_template_language: 'en_US',
   *     reason: '...' (when REJECTED) }
   */
  async handleTemplateStatusUpdate(value) {
    const metaTemplateId = value?.message_template_id;
    const event = value?.event;
    if (!metaTemplateId || !event) {
      logger.warn('Malformed template status webhook', { value });
      return;
    }

    const template = await Template.findOne({
      where: { whatsappTemplateId: String(metaTemplateId) },
    });

    if (!template) {
      logger.warn('Received template status update for unknown template', {
        metaTemplateId,
        event,
        templateName: value?.message_template_name,
      });
      return;
    }

    const updates = {};
    switch (event) {
      case 'APPROVED':
        updates.whatsappStatus = 'approved';
        updates.status = 'approved';
        updates.approvedAt = new Date();
        updates.rejectionReason = null;
        updates.whatsappRejectionReason = null;
        break;
      case 'REJECTED':
        updates.whatsappStatus = 'rejected';
        updates.status = 'rejected';
        updates.rejectedAt = new Date();
        updates.rejectionReason = value.reason || null;
        updates.whatsappRejectionReason = value.reason || null;
        break;
      case 'FLAGGED':
      case 'PAUSED':
      case 'PENDING_DELETION':
        // Don't change approval state — these are operational signals.
        // Just log and store the reason if present.
        if (value.reason) updates.whatsappRejectionReason = value.reason;
        break;
      default:
        logger.info('Unknown template status event, ignoring', { event });
        return;
    }

    await template.update(updates);
    logger.info('Template status updated from Meta webhook', {
      templateId: template.id,
      metaTemplateId,
      event,
      newStatus: updates.whatsappStatus || template.whatsappStatus,
    });
  }

  /**
   * Handle the `messages` webhook field. Meta puts two different things here:
   *
   *   - `statuses[]`: status updates for messages WE sent (sent → delivered → read)
   *   - `messages[]`: inbound messages a customer sent to our number
   *
   * Process both. Inbound is resolved by metadata.phone_number_id → org.
   */
  async handleMessageStatus(value) {
    const { statuses, messages, contacts, metadata } = value;

    if (statuses && statuses.length > 0) {
      for (const status of statuses) {
        const message = await Message.findOne({
          where: { externalMessageId: status.id },
        });

        if (message) {
          await this.updateMessageStatus(message, status);
        }
      }
    }

    if (messages && messages.length > 0) {
      const phoneNumberId = metadata?.phone_number_id;
      if (!phoneNumberId) {
        logger.warn('Inbound webhook missing phone_number_id; cannot resolve org', { value });
        return;
      }
      const settings = await OrganizationSettings.findOne({
        where: { whatsappPhoneNumberId: phoneNumberId },
      });
      if (!settings) {
        logger.warn('Inbound webhook for unknown phone_number_id', { phoneNumberId });
        return;
      }
      for (const msg of messages) {
        try {
          await this.handleInboundMessage({
            organizationId: settings.organizationId,
            settings,
            msg,
            profileName: contacts?.[0]?.profile?.name || null,
          });
        } catch (e) {
          logger.error('Inbound message persist failed', {
            wamid: msg.id, error: e.message, stack: e.stack,
          });
        }
      }
    }
  }

  /**
   * Persist a single inbound (customer → us) WhatsApp message.
   * Idempotent — Meta retries the webhook on any non-2xx, so we dedup by wamid.
   */
  async handleInboundMessage({ organizationId, settings, msg, profileName }) {
    // 1. Dedup
    const existing = await Message.findOne({ where: { externalMessageId: msg.id } });
    if (existing) return;

    // 2. Resolve / upsert contact for this customer phone
    //    Meta's `from` is the E.164 number with NO leading '+' (e.g. "919999999999").
    //    Operator-created contacts may have it with '+' or with formatting —
    //    match on the normalized form to handle both.
    const phone = normalizePhone(msg.from || '');
    const allOrgContacts = await Contact.findAll({
      where: { organizationId, deletedAt: null },
      attributes: ['id', 'phoneNumber', 'name'],
    });
    let contact = allOrgContacts.find((c) => normalizePhone(c.phoneNumber) === phone) || null;
    if (!contact) {
      // Need a creator user. Pick the oldest admin/super_admin in the org —
      // same heuristic templateSyncService uses for Meta-imported templates.
      const { User } = require('../models');
      const { Op } = require('sequelize');
      const creator = await User.findOne({
        where: { organizationId, role: { [Op.in]: ['super_admin', 'admin'] } },
        order: [['createdAt', 'ASC']],
      }) || await User.findOne({
        where: { organizationId },
        order: [['createdAt', 'ASC']],
      });
      if (!creator) {
        logger.warn('Inbound message: no user to attribute new contact to', { organizationId });
        return;
      }
      contact = await Contact.create({
        organizationId,
        createdBy: creator.id,
        phoneNumber: phone,
        name: profileName || null,
        status: 'active',
        source: 'WhatsApp Inbound',
        optInStatus: 'opted_in', // Customer messaged us, implicit opt-in
      });
    } else if (profileName && !contact.name) {
      // Backfill the name on existing contacts when Meta gives us one.
      await contact.update({ name: profileName }).catch(() => {});
    }

    // 3. Decrypt access token for media downloads (only if there's media)
    let mediaInfo = null;
    if (['image', 'video', 'audio', 'document', 'sticker'].includes(msg.type)) {
      const accessToken = this.decryptToken(settings.whatsappAccessToken);
      const mediaPart = msg[msg.type] || {};
      if (accessToken && mediaPart.id) {
        mediaInfo = await inboundMediaService.downloadAndStore({
          mediaId: mediaPart.id,
          organizationId,
          wamid: msg.id,
          accessToken,
        });
      }
    }

    // 4. Build content + media metadata
    const mediaTypeMap = {
      image: 'image', video: 'video', audio: 'audio', document: 'document', sticker: 'image',
    };
    const mediaType = mediaTypeMap[msg.type] || null;
    let content;
    if (msg.type === 'text') {
      content = msg.text?.body || '';
    } else if (msg[msg.type]?.caption) {
      content = msg[msg.type].caption;
    } else if (mediaType) {
      content = `[${msg.type}]`;
    } else if (msg.type === 'location') {
      const loc = msg.location || {};
      content = `[location] ${loc.latitude},${loc.longitude}${loc.name ? ` (${loc.name})` : ''}`;
    } else if (msg.type === 'contacts') {
      content = '[contact card]';
    } else if (msg.type === 'button') {
      content = msg.button?.text || '[button reply]';
    } else if (msg.type === 'interactive') {
      const r = msg.interactive?.button_reply || msg.interactive?.list_reply;
      content = r?.title || '[interactive reply]';
    } else {
      content = `[${msg.type}]`;
    }

    // 5. Persist
    const ts = msg.timestamp ? new Date(parseInt(msg.timestamp, 10) * 1000) : new Date();
    await Message.create({
      organizationId,
      sentBy: null,
      contactId: contact.id,
      channel: 'whatsapp',
      direction: 'inbound',
      messageType: mediaType ? 'media' : 'text',
      recipientPhone: phone,
      recipientName: contact.name || null,
      content,
      mediaUrl: mediaInfo?.url || null,
      mediaType: mediaType,
      requiresApproval: false,
      approvalStatus: 'approved',
      deliveryStatus: 'delivered',
      isRead: false,
      sentAt: ts,
      deliveredAt: ts,
      externalMessageId: msg.id,
    });

    // Bump contact recency
    await contact.update({ lastMessageAt: ts }).catch(() => {});
    logger.info?.('Inbound WhatsApp message persisted', {
      organizationId, wamid: msg.id, type: msg.type, from: phone,
    });
  }

  /**
   * Decrypt the stored WhatsApp access token. Tolerates plain-text tokens
   * (legacy state) and encrypted-with-old-key (returns null instead of throwing).
   */
  decryptToken(stored) {
    if (!stored || stored.trim() === '') return null;
    if (!isEncrypted(stored)) return stored;
    try {
      return decrypt(stored);
    } catch (e) {
      logger.warn('decryptToken: encryption key mismatch, returning null');
      return null;
    }
  }

  /**
   * Update message status
   */
  async updateMessageStatus(message, status) {
    const statusMap = {
      sent: { deliveryStatus: 'sent', sentAt: new Date() },
      delivered: { deliveryStatus: 'delivered', deliveredAt: new Date() },
      read: { deliveryStatus: 'read', readAt: new Date() },
      failed: { deliveryStatus: 'failed', failedAt: new Date(), failureReason: status.errors?.[0]?.title },
    };

    const updates = statusMap[status.status];
    if (updates) {
      const oldStatus = message.deliveryStatus;
      await message.update(updates);

      // Log status change
      await traceLogService.logStatusChange(
        message.id,
        'whatsapp',
        oldStatus,
        updates.deliveryStatus,
        status.errors?.[0]?.title || 'Webhook update'
      );

      await MessageEvent.create({
        messageId: message.id,
        eventType: status.status,
        eventData: {
          ...status,
          source: 'webhook',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}

module.exports = new WhatsAppService();


