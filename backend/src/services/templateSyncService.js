/**
 * Background sync of WhatsApp message templates from Meta into the local
 * `templates` table. Runs:
 *   - on a cron schedule (see scheduledJobs.js)
 *   - immediately after an org saves WhatsApp credentials (so the user
 *     doesn't have to wait for the cron tick)
 *   - on demand via a "Refresh from Meta" button on the Templates page
 *
 * Idempotent — uses the (organization_id, name, channel) unique key to upsert.
 * Approved templates are inserted/updated; non-APPROVED are skipped because
 * the local Templates UI gates the dropdown on `whatsapp_status='approved'`.
 */
const axios = require('axios');
const { Organization, OrganizationSettings, User, Template } = require('../models');
const { decrypt, isEncrypted } = require('../utils/encryption');
const logger = require('../utils/logger');

const META_CATEGORY_MAP = {
  MARKETING: 'marketing',
  UTILITY: 'utility',
  AUTHENTICATION: 'authentication',
  TRANSACTIONAL: 'utility',
};
const META_HEADER_FORMAT_MAP = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document',
  LOCATION: 'location',
};

function extractVariables(text) {
  if (!text) return [];
  const matches = [...text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

async function findOrgAdmin(organizationId) {
  // Templates have a NOT NULL created_by FK. For Meta-imported templates we
  // attribute them to the oldest admin/super_admin user in the org.
  const { Op } = require('sequelize');
  const u = await User.findOne({
    where: {
      organizationId,
      role: { [Op.in]: ['super_admin', 'admin'] },
    },
    order: [['createdAt', 'ASC']],
  });
  return u || (await User.findOne({ where: { organizationId }, order: [['createdAt', 'ASC']] }));
}

/**
 * Sync templates for a single organization. Safe to call concurrently — Meta's
 * /message_templates endpoint is read-only.
 *
 * @param {number} organizationId
 * @returns {Promise<{ inserted: number, updated: number, skipped: number, error?: string }>}
 */
async function syncForOrg(organizationId) {
  const stats = { inserted: 0, updated: 0, skipped: 0 };

  const settings = await OrganizationSettings.findOne({ where: { organizationId } });
  if (!settings || !settings.whatsappBusinessAccountId || !settings.whatsappAccessToken) {
    return { ...stats, error: 'WhatsApp not configured for this organization' };
  }

  let accessToken;
  try {
    accessToken = isEncrypted(settings.whatsappAccessToken)
      ? decrypt(settings.whatsappAccessToken)
      : settings.whatsappAccessToken;
  } catch (e) {
    return { ...stats, error: 'Access token cannot be decrypted (rotate ENCRYPTION_KEY?)' };
  }

  const wabaId = settings.whatsappBusinessAccountId;
  const apiVersion = settings.whatsappApiVersion || 'v18.0';

  // Meta paginates; follow paging.next until exhausted.
  const fetched = [];
  let next = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?fields=name,language,status,category,components,id&limit=100`;
  try {
    while (next) {
      const r = await axios.get(next, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 15000,
      });
      fetched.push(...(r.data?.data || []));
      next = r.data?.paging?.next || null;
    }
  } catch (e) {
    const metaErr = e.response?.data?.error?.message || e.message;
    logger.warn('Template sync: Meta fetch failed', { organizationId, error: metaErr });
    return { ...stats, error: `Meta API error: ${metaErr}` };
  }

  const createdBy = (await findOrgAdmin(organizationId))?.id;
  if (!createdBy) {
    return { ...stats, error: 'No user available to attribute templates to' };
  }

  for (const t of fetched) {
    if (t.status !== 'APPROVED') {
      stats.skipped++;
      continue;
    }
    const components = t.components || [];
    const headerComp = components.find((c) => c.type === 'HEADER');
    const bodyComp = components.find((c) => c.type === 'BODY');
    const footerComp = components.find((c) => c.type === 'FOOTER');
    const buttonsComp = components.find((c) => c.type === 'BUTTONS');
    // Carousel templates contain a top-level CAROUSEL component whose `cards`
    // each have their own components array. We map them back to our local
    // CarouselCard shape so they can be re-displayed (without the original
    // image URLs — Meta only echoes back the handle, not a public URL).
    const carouselComp = components.find((c) => c.type === 'CAROUSEL');

    if (!bodyComp?.text) {
      stats.skipped++;
      continue;
    }

    const variables = extractVariables(bodyComp.text);
    const isCarousel = !!carouselComp && Array.isArray(carouselComp.cards);

    const existing = await Template.findOne({
      where: { organizationId, name: t.name, channel: 'whatsapp' },
      paranoid: false,
    });

    // Build cards from Meta's response. Meta doesn't echo back the original
    // public URL, just a HEADER format hint — so for templates that ALREADY
    // exist locally we keep each card's existing local `media.url` and only
    // refresh content/buttons. Without this, a sync wipes the operator's
    // uploaded images on every cron tick.
    const localCards = isCarousel
      ? carouselComp.cards.map((card, idx) => {
          const cBody = (card.components || []).find((cc) => cc.type === 'BODY');
          const cHeader = (card.components || []).find((cc) => cc.type === 'HEADER');
          const cButtons = (card.components || []).find((cc) => cc.type === 'BUTTONS');
          const existingCards = Array.isArray(existing?.cards) ? existing.cards : [];
          const existingCard = existingCards[idx] || null;
          const headerType = cHeader ? (cHeader.format || 'IMAGE').toLowerCase() : null;
          // Preserve the local media URL when present; only fall back to an
          // empty placeholder for newly-imported (Meta-origin) templates.
          let media = null;
          if (cHeader) {
            const preservedUrl = existingCard?.media?.url || '';
            media = { type: headerType, url: preservedUrl };
          }
          return {
            id: String(idx + 1),
            media,
            content: cBody?.text || '',
            buttons: (cButtons?.buttons || []).map((b, bIdx) => ({
              id: String(bIdx + 1),
              type: (b.type || '').toLowerCase().replace('phone_number', 'phone'),
              text: b.text || '',
              value: b.url || b.phone_number || '',
            })),
          };
        })
      : null;

    const data = {
      organizationId,
      name: t.name,
      channel: 'whatsapp',
      category: META_CATEGORY_MAP[t.category] || 'utility',
      language: t.language,
      body: bodyComp.text,
      footer: footerComp?.text || null,
      headerType: headerComp ? META_HEADER_FORMAT_MAP[headerComp.format] || null : null,
      headerContent: headerComp?.text || null,
      variables,
      variableCount: variables.length,
      buttons: buttonsComp?.buttons || null,
      templateType: isCarousel ? 'carousel' : 'standard',
      cards: localCards,
      whatsappTemplateId: null, // worker uses template.name, not numeric Meta id
      whatsappStatus: 'approved',
      status: 'approved',
    };

    if (existing) {
      // For templates that already exist locally, the user is the source of
      // truth for the content (body, cards, buttons, etc.) — Meta only owns
      // the approval status. Without this guard, the 15-min cron would race
      // with user edits: a freshly added carousel card gets reset because
      // Meta still has the old shape. Limit the sync to status fields only.
      const statusOnlyUpdate = {
        whatsappStatus: 'approved',
        status: 'approved',
        whatsappRejectionReason: null,
        deletedAt: null,
      };
      await existing.update(statusOnlyUpdate);
      stats.updated++;
    } else {
      await Template.create({ ...data, createdBy, approvedAt: new Date() });
      stats.inserted++;
    }
  }

  logger.info?.('Template sync complete', { organizationId, ...stats });
  return stats;
}

/**
 * Iterate every org with WhatsApp configured and sync templates for each.
 * Used by the cron job. Failures for one org don't stop the others.
 */
async function syncForAllConfiguredOrgs() {
  const settings = await OrganizationSettings.findAll({
    where: {},
    attributes: ['organizationId', 'whatsappBusinessAccountId', 'whatsappAccessToken'],
  });
  const eligible = settings.filter((s) => s.whatsappBusinessAccountId && s.whatsappAccessToken);

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  for (const s of eligible) {
    try {
      const r = await syncForOrg(s.organizationId);
      totalInserted += r.inserted;
      totalUpdated += r.updated;
      if (r.error) totalErrors++;
    } catch (e) {
      totalErrors++;
      logger.error?.('Template sync failed for org', { organizationId: s.organizationId, error: e.message });
    }
  }
  return { orgsProcessed: eligible.length, inserted: totalInserted, updated: totalUpdated, errors: totalErrors };
}

module.exports = { syncForOrg, syncForAllConfiguredOrgs };
