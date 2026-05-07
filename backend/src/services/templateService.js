const axios = require('axios');
const { Template, TemplateVersion, OrganizationSettings } = require('../models');
const { NotFoundError, AppError } = require('../utils/errorTypes');
const { getPaginationMeta } = require('../utils/helpers');
const { decrypt, isEncrypted } = require('../utils/encryption');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const META_CATEGORY_MAP = {
  marketing: 'MARKETING',
  utility: 'UTILITY',
  authentication: 'AUTHENTICATION',
  transactional: 'UTILITY',
};

const META_HEADER_FORMAT_MAP = {
  text: 'TEXT',
  image: 'IMAGE',
  video: 'VIDEO',
  document: 'DOCUMENT',
  location: 'LOCATION',
};

/**
 * Build the components array for a non-carousel WhatsApp template.
 *
 * Now async because IMAGE / VIDEO / DOCUMENT headers require uploading the
 * local media file to Meta's resumable-upload endpoint to obtain a
 * `header_handle`, which Meta needs in `example.header_handle` at template
 * approval time. Without the handle Meta rejects the submission.
 *
 * @param {Object} template
 * @param {Object} [opts]  { accessToken, appId } — only required when the
 *   template has an image/video/document header.
 */
async function buildMetaComponentsFromTemplate(template, opts = {}) {
  const components = [];

  if (template.headerType && template.headerContent) {
    const format = META_HEADER_FORMAT_MAP[template.headerType] || 'TEXT';
    const headerComp = { type: 'HEADER', format };
    if (format === 'TEXT') {
      headerComp.text = template.headerContent;
      const headerVars = (template.headerContent.match(/\{\{(\w+)\}\}/g) || []).length;
      if (headerVars > 0) {
        headerComp.example = { header_text: Array(headerVars).fill('Sample') };
      }
    } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(format)) {
      // For media headers, headerContent holds a local URL like
      // /uploads/media/<orgId>/<file>. Upload to Meta to get a header_handle.
      const { accessToken, appId } = opts;
      if (!accessToken || !appId) {
        throw new AppError(
          'Meta App ID and Access Token are required to submit a template with a media header. Set them in Settings → WhatsApp Configuration.',
          400
        );
      }
      const metaUploadService = require('./metaUploadService');
      const handle = await metaUploadService.uploadByLocalUrl({
        localUrl: template.headerContent,
        appId,
        accessToken,
      });
      headerComp.example = { header_handle: [handle] };
    }
    components.push(headerComp);
  }

  const bodyComp = { type: 'BODY', text: template.body };
  const bodyVarMatches = template.body.match(/\{\{(\w+)\}\}/g) || [];
  if (bodyVarMatches.length > 0) {
    const uniqueVars = [...new Set(bodyVarMatches.map((m) => m.replace(/[{}]/g, '')))];
    bodyComp.example = {
      body_text: [uniqueVars.map((_, i) => `Sample${i + 1}`)],
    };
  }
  components.push(bodyComp);

  if (template.footer) {
    components.push({ type: 'FOOTER', text: template.footer });
  }

  if (template.buttons && Array.isArray(template.buttons) && template.buttons.length > 0) {
    const sanitized = template.buttons
      .map(sanitizeButtonForMeta)
      .filter((b) => b !== null);
    if (sanitized.length > 0) {
      components.push({ type: 'BUTTONS', buttons: sanitized });
    }
  }

  return components;
}

/**
 * Strip a locally-stored button down to the keys Meta accepts, per button type.
 * Locally we may store extra UI-only fields (id, key, etc) which Meta rejects
 * with "(#100) Unexpected key". Reference:
 *   https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates#buttons
 */
/**
 * Map a frontend carousel button (`{ type: 'url'|'phone'|'quick_reply', text, value }`)
 * to a Meta-shaped button. Carousel cards use the same button shapes as
 * standard templates, but our carousel form stores `value` as a generic
 * field — interpret it based on the type.
 */
function mapCarouselButtonToMeta(btn) {
  if (!btn || !btn.text) return null;
  const t = String(btn.type || '').toLowerCase();
  if (t === 'quick_reply') return { type: 'QUICK_REPLY', text: btn.text };
  if (t === 'url' && btn.value) return { type: 'URL', text: btn.text, url: btn.value };
  if (t === 'phone' && btn.value) return { type: 'PHONE_NUMBER', text: btn.text, phone_number: btn.value };
  return null;
}

/**
 * Build the components array for a CAROUSEL WhatsApp template.
 *
 * Requires every card to have a media file (Meta enforces HEADER on each
 * card). We upload each card's local media to Meta via Resumable Upload to
 * obtain a handle, then embed the handle in `example.header_handle`.
 */
async function buildMetaCarouselComponents(template, { accessToken, appId }) {
  const cards = template.cards;
  if (!Array.isArray(cards) || cards.length === 0) {
    throw new AppError('Carousel template has no cards', 400);
  }
  if (cards.length > 10) {
    throw new AppError('Carousel templates support up to 10 cards', 400);
  }
  if (!appId) {
    throw new AppError(
      'Meta App ID is required to submit carousel templates. Set it in Settings → WhatsApp Configuration.',
      400
    );
  }

  const metaUploadService = require('./metaUploadService');

  // Upload each card's media in parallel to amortize round-trips, but cap
  // concurrency by just running Promise.all on the (small) cards array.
  const cardsWithHandles = await Promise.all(cards.map(async (card, idx) => {
    if (!card.media || !card.media.url) {
      throw new AppError(`Card ${idx + 1} is missing media (required for carousel)`, 400);
    }
    if (!card.content) {
      throw new AppError(`Card ${idx + 1} is missing body content`, 400);
    }
    const handle = await metaUploadService.uploadByLocalUrl({
      localUrl: card.media.url,
      appId,
      accessToken,
    });
    const headerFormat = card.media.type === 'video' ? 'VIDEO' : 'IMAGE';
    const cardComponents = [
      {
        type: 'HEADER',
        format: headerFormat,
        example: { header_handle: [handle] },
      },
      { type: 'BODY', text: card.content },
    ];
    const cardButtons = (card.buttons || [])
      .map(mapCarouselButtonToMeta)
      .filter((b) => b !== null);
    if (cardButtons.length > 0) {
      cardComponents.push({ type: 'BUTTONS', buttons: cardButtons });
    }
    return { components: cardComponents };
  }));

  const components = [];
  // Top-level BODY is required (it's the message shown above the carousel).
  if (!template.body) {
    throw new AppError('Carousel template requires a top-level body (the lede shown above the cards)', 400);
  }
  const topBody = { type: 'BODY', text: template.body };
  // Body variables example, same as standard
  const bodyVarMatches = template.body.match(/\{\{(\w+)\}\}/g) || [];
  if (bodyVarMatches.length > 0) {
    const uniq = [...new Set(bodyVarMatches.map((m) => m.replace(/[{}]/g, '')))];
    topBody.example = { body_text: [uniq.map((_, i) => `Sample${i + 1}`)] };
  }
  components.push(topBody);
  components.push({ type: 'CAROUSEL', cards: cardsWithHandles });
  return components;
}

function sanitizeButtonForMeta(btn) {
  if (!btn || typeof btn !== 'object') return null;
  const rawType = btn.type || btn.sub_type;
  if (!rawType) return null;
  const type = String(rawType).toUpperCase();

  const out = { type };
  switch (type) {
    case 'QUICK_REPLY':
      if (btn.text) out.text = btn.text;
      return out.text ? out : null;
    case 'URL':
      if (btn.text) out.text = btn.text;
      if (btn.url) out.url = btn.url;
      if (btn.example) out.example = Array.isArray(btn.example) ? btn.example : [btn.example];
      return out.text && out.url ? out : null;
    case 'PHONE_NUMBER':
      if (btn.text) out.text = btn.text;
      if (btn.phone_number || btn.phoneNumber) out.phone_number = btn.phone_number || btn.phoneNumber;
      return out.text && out.phone_number ? out : null;
    case 'COPY_CODE':
      if (btn.example) out.example = btn.example;
      return out;
    case 'OTP':
      if (btn.otp_type || btn.otpType) out.otp_type = btn.otp_type || btn.otpType;
      if (btn.text) out.text = btn.text;
      if (btn.autofill_text || btn.autofillText) out.autofill_text = btn.autofill_text || btn.autofillText;
      if (btn.package_name || btn.packageName) out.package_name = btn.package_name || btn.packageName;
      if (btn.signature_hash || btn.signatureHash) out.signature_hash = btn.signature_hash || btn.signatureHash;
      return out;
    default:
      // Unknown button type — drop it rather than risk a Meta rejection
      return null;
  }
}

class TemplateService {
  /**
   * Create template
   */
  async create(organizationId, createdBy, data) {
    const { name, channel, category, body, variables, ...otherData } = data;

    // Extract variables from body based on channel
    // SMS uses #var# format, WhatsApp uses {{var}} format
    let variableMatches = [];
    if (channel === 'sms') {
      // Extract #var# variables for SMS
      variableMatches = body.match(/#var#/g) || [];
    } else {
      // Extract {{var}} variables for WhatsApp, Email, FCM
      variableMatches = body.match(/\{\{(\w+)\}\}/g) || [];
    }
    
    // For SMS, count occurrences of #var#
    // For other channels, extract unique variable names
    let variableCount = 0;
    let extractedVariables = [];
    
    if (channel === 'sms') {
      variableCount = variableMatches.length;
      // Create variable names like var1, var2, var3 for SMS
      extractedVariables = Array.from({ length: variableCount }, (_, i) => `var${i + 1}`);
    } else {
      variableCount = new Set(variableMatches.map(m => m.replace(/[{}]/g, ''))).size;
      extractedVariables = Array.from(new Set(variableMatches.map(m => m.replace(/[{}]/g, ''))));
    }

    const template = await Template.create({
      organizationId,
      createdBy,
      name,
      channel,
      category,
      body,
      variables: variables || extractedVariables,
      variableCount,
      ...otherData,
      status: 'draft',
    });

    return template;
  }

  /**
   * List templates
   */
  async list(organizationId, filters = {}) {
    const { page = 1, limit = 20, channel, status, category } = filters;

    const where = {
      organizationId,
      deletedAt: null,
    };

    if (channel) where.channel = channel;
    if (status) where.status = status;
    if (category) where.category = category;

    const { count, rows } = await Template.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['created_at', 'DESC']],
    });

    return {
      templates: rows,
      pagination: getPaginationMeta(page, limit, count),
    };
  }

  /**
   * Get template by ID
   */
  async getById(id, organizationId) {
    const template = await Template.findOne({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });

    if (!template) {
      throw new NotFoundError('Template');
    }

    return template;
  }

  /**
   * Update template.
   *
   * Editing the *content* of a template (body, header, cards, buttons, etc.)
   * invalidates any prior approval — Meta cannot serve a template that's
   * different from what it approved, and the in-app approval flow likewise
   * shouldn't credit a previously-approved version. So a content edit on a
   * non-draft template resets the approval state to `draft` and clears the
   * approval/rejection timestamps. The user must then click "Submit for
   * approval" again.
   *
   * Pure metadata edits (description, tags) do NOT trigger this — the
   * delivered message is unchanged so re-approval would just be friction.
   *
   * Note: `whatsappTemplateId` (Meta's numeric id of the prior submission) is
   * retained. Meta keys templates by NAME, so re-submitting an edited version
   * with the same name will collide. The submitForApproval path surfaces
   * Meta's error for the operator to handle (typically by renaming).
   */
  async update(id, organizationId, data) {
    const template = await this.getById(id, organizationId);

    // Recalculate variable count if body changed
    if (data.body) {
      let variableMatches = [];
      if (template.channel === 'sms') {
        // Extract #var# variables for SMS
        variableMatches = data.body.match(/#var#/g) || [];
        data.variableCount = variableMatches.length;
        // Update variables array for SMS
        const extractedVariables = Array.from({ length: data.variableCount }, (_, i) => `var${i + 1}`);
        data.variables = extractedVariables;
      } else {
        // Extract {{var}} variables for WhatsApp, Email, FCM
        variableMatches = data.body.match(/\{\{(\w+)\}\}/g) || [];
        data.variableCount = new Set(variableMatches.map(m => m.replace(/[{}]/g, ''))).size;
        // Update variables array for other channels
        const extractedVariables = Array.from(new Set(variableMatches.map(m => m.replace(/[{}]/g, ''))));
        data.variables = extractedVariables;
      }
    }

    // Handle smsTemplateId and whatsappTemplateId - allow empty strings to set to null
    if (data.smsTemplateId !== undefined) {
      data.smsTemplateId = data.smsTemplateId !== null && data.smsTemplateId.trim() !== '' ? data.smsTemplateId.trim() : null;
    }
    if (data.whatsappTemplateId !== undefined) {
      data.whatsappTemplateId = data.whatsappTemplateId !== null && data.whatsappTemplateId.trim() !== '' ? data.whatsappTemplateId.trim() : null;
    }

    // Reset approval state when content changes on an already-approved (or
    // pending/rejected) template. See the JSDoc for rationale.
    const CONTENT_FIELDS = [
      'name', 'body', 'htmlBody', 'plainTextBody', 'subject', 'footer',
      'headerType', 'headerContent', 'buttons', 'cards', 'templateType',
      'language', 'category', 'variables',
    ];
    const isContentChange = CONTENT_FIELDS.some((f) => data[f] !== undefined);
    if (isContentChange && template.status !== 'draft') {
      data.status = 'draft';
      // For WhatsApp templates, sync the Meta-side mirror status too so the
      // Templates UI shows a coherent state ("Draft" not "Approved" once a
      // change has been made).
      if (template.channel === 'whatsapp') {
        data.whatsappStatus = 'draft';
        data.whatsappRejectionReason = null;
      }
      data.approvedBy = null;
      data.approvedAt = null;
      data.rejectedBy = null;
      data.rejectedAt = null;
      data.rejectionReason = null;
    }

    await template.update(data);
    
    // Reload to get updated data
    await template.reload();

    return template;
  }

  /**
   * Submit template for approval.
   * For WhatsApp templates, this also submits the template to Meta's
   * /{WABA_ID}/message_templates endpoint and stores the returned Meta
   * template ID. Meta's status updates are then delivered asynchronously
   * via the message_template_status_update webhook.
   * For other channels (sms, email, fcm), this remains a local-only state
   * change handled by the in-app approval workflow.
   */
  async submitForApproval(id, organizationId) {
    const template = await this.getById(id, organizationId);

    if (template.status !== 'draft') {
      throw new AppError('Only draft templates can be submitted for approval', 400);
    }

    if (template.channel !== 'whatsapp') {
      await template.update({ status: 'pending_approval' });
      return template;
    }

    const settings = await OrganizationSettings.findOne({ where: { organizationId } });
    if (!settings || !settings.whatsappBusinessAccountId || !settings.whatsappAccessToken) {
      throw new AppError(
        'WhatsApp is not configured for this organization. Save credentials in Settings → WhatsApp Configuration first.',
        400
      );
    }

    let accessToken;
    try {
      accessToken = isEncrypted(settings.whatsappAccessToken)
        ? decrypt(settings.whatsappAccessToken)
        : settings.whatsappAccessToken;
    } catch (e) {
      throw new AppError('WhatsApp access token cannot be decrypted. Re-save credentials in Settings.', 500);
    }

    const apiVersion = settings.whatsappApiVersion || 'v18.0';
    const wabaId = settings.whatsappBusinessAccountId;
    const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates`;

    // Build the components array. Carousel templates need a separate code
    // path because each card's media must first be uploaded to Meta to
    // obtain a header_handle (Meta can't reach our /uploads/...).
    const isCarousel = template.templateType === 'carousel';
    let components;
    if (isCarousel) {
      // Resolve App ID + decrypted App Secret aren't needed here — only the
      // App ID for the resumable-upload session, and the access token we
      // already decrypted above.
      components = await buildMetaCarouselComponents(template, {
        accessToken,
        appId: settings.whatsappAppId,
      });
    } else {
      components = await buildMetaComponentsFromTemplate(template, {
        accessToken,
        appId: settings.whatsappAppId,
      });
    }

    const payload = {
      name: template.name,
      language: template.language || 'en_US',
      category: META_CATEGORY_MAP[template.category] || 'UTILITY',
      components,
    };

    logger.info('Submitting template to Meta', {
      templateId: template.id,
      name: template.name,
      language: payload.language,
      category: payload.category,
      componentTypes: payload.components.map((c) => c.type),
    });

    let metaResponse;
    try {
      const response = await axios.post(url, payload, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      });
      metaResponse = response.data;
    } catch (error) {
      const metaError = error.response?.data?.error || {};
      const message = metaError.error_user_msg || metaError.message || error.message;
      logger.error('Meta template submission failed', {
        templateId: template.id,
        status: error.response?.status,
        metaError,
      });
      throw new AppError(`Meta rejected the template: ${message}`, error.response?.status || 500);
    }

    const metaStatusLower = (metaResponse.status || 'PENDING').toLowerCase();
    const localWhatsappStatus = ['approved', 'rejected', 'pending'].includes(metaStatusLower)
      ? metaStatusLower
      : 'pending';

    await template.update({
      status: 'pending_approval',
      whatsappTemplateId: metaResponse.id || template.whatsappTemplateId,
      whatsappStatus: localWhatsappStatus,
    });

    logger.info('Template submitted to Meta successfully', {
      templateId: template.id,
      metaTemplateId: metaResponse.id,
      metaStatus: metaResponse.status,
    });

    await template.reload();
    return template;
  }

  /**
   * Approve template
   */
  async approve(id, organizationId, approvedBy) {
    const template = await this.getById(id, organizationId);

    if (template.status !== 'pending_approval') {
      throw new AppError('Template is not pending approval', 400);
    }

    await template.update({
      status: 'approved',
      approvedBy,
      approvedAt: new Date(),
    });

    return template;
  }

  /**
   * Reject template
   */
  async reject(id, organizationId, rejectedBy, reason) {
    const template = await this.getById(id, organizationId);

    if (template.status !== 'pending_approval') {
      throw new AppError('Template is not pending approval', 400);
    }

    await template.update({
      status: 'rejected',
      rejectedBy,
      rejectedAt: new Date(),
      rejectionReason: reason,
    });

    return template;
  }

  /**
   * Delete template (soft delete)
   */
  async delete(id, organizationId) {
    const template = await this.getById(id, organizationId);

    // Use destroy() which will automatically set deletedAt because paranoid: true
    await template.destroy();

    return { message: 'Template deleted successfully' };
  }
}

module.exports = new TemplateService();

