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
  // Treats Meta's /message_templates response as the source of truth for
  // template IDENTITY fields (name + language) and approval STATUS, but
  // preserves locally-edited CONTENT fields (body, header, cards, buttons,
  // footer). Drift between local and Meta — the recurring cause of error
  // 132001 — is reconciled in three ways every run:
  //
  //   1. Language code mismatches (e.g. local 'en' vs Meta 'en_US') →
  //      overwrite local with Meta's value. Meta sets the language at
  //      approval time; we don't get to choose it after that.
  //   2. Templates that exist at Meta but not locally → insert.
  //   3. Templates that exist locally as approved but Meta no longer has
  //      them → mark `status='archived'` so they disappear from dropdowns
  //      and any subsequent send fails fast with a clear message instead
  //      of bubbling Meta's 132001.
  const stats = { inserted: 0, updated: 0, skipped: 0, archived: 0, languageCorrected: 0 };

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
      // Status + identity (language) come from Meta as source of truth;
      // content (body, cards, buttons, …) is preserved as local-owned.
      const reconcileUpdate = {
        whatsappStatus: 'approved',
        status: 'approved',
        whatsappRejectionReason: null,
        deletedAt: null,
      };
      if (existing.language !== t.language) {
        reconcileUpdate.language = t.language;
        stats.languageCorrected++;
        logger.info?.('Template sync: corrected language drift', {
          organizationId,
          name: t.name,
          from: existing.language,
          to: t.language,
        });
      }
      await existing.update(reconcileUpdate);
      stats.updated++;
    } else {
      await Template.create({ ...data, createdBy, approvedAt: new Date() });
      stats.inserted++;
    }
  }

  // ---- Orphan reconciliation -------------------------------------------
  // Any local row marked approved whose `name` is NOT in Meta's response
  // is either deleted-at-Meta or renamed. Sending to it would always 404.
  // Mark as 'archived' so it disappears from the dropdown and any pending
  // queue items fail fast with a clear "template no longer exists" error
  // rather than Meta's cryptic 132001.
  const liveNames = new Set(fetched.filter((t) => t.status === 'APPROVED').map((t) => t.name));
  const localApproved = await Template.findAll({
    where: {
      organizationId,
      channel: 'whatsapp',
      status: 'approved',
      deletedAt: null,
    },
    attributes: ['id', 'name'],
  });
  const orphans = localApproved.filter((row) => !liveNames.has(row.name));
  if (orphans.length > 0) {
    const ids = orphans.map((r) => r.id);
    await Template.update(
      {
        status: 'archived',
        whatsappStatus: 'rejected',
        whatsappRejectionReason: 'Template no longer exists at Meta (renamed, deleted, or removed). Re-create or recover it from Meta Business Manager.',
      },
      { where: { id: ids } }
    );
    stats.archived = orphans.length;
    logger.warn('Template sync: archived orphans (not present at Meta)', {
      organizationId,
      names: orphans.map((r) => r.name),
    });
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
  let totalArchived = 0;
  let totalLanguageCorrected = 0;
  let totalErrors = 0;
  for (const s of eligible) {
    try {
      const r = await syncForOrg(s.organizationId);
      totalInserted += r.inserted;
      totalUpdated += r.updated;
      totalArchived += r.archived || 0;
      totalLanguageCorrected += r.languageCorrected || 0;
      if (r.error) totalErrors++;
    } catch (e) {
      totalErrors++;
      logger.error?.('Template sync failed for org', { organizationId: s.organizationId, error: e.message });
    }
  }
  return {
    orgsProcessed: eligible.length,
    inserted: totalInserted,
    updated: totalUpdated,
    archived: totalArchived,
    languageCorrected: totalLanguageCorrected,
    errors: totalErrors,
  };
}

module.exports = { syncForOrg, syncForAllConfiguredOrgs };
