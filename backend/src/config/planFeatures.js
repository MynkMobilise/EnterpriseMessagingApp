/**
 * Plan-tier feature baselines.
 *
 * Each plan defines the "out of the box" feature set for a tenant. Super-admin
 * can layer per-tenant overrides on top via `organizations.feature_overrides`.
 * The effective flags a request sees come from utils/featureFlags.js:
 *
 *     effective = deepMerge(PLAN_FEATURES[org.plan], org.featureOverrides || {})
 *
 * Editing this file is a code-deploy: changing "Starter" baselines instantly
 * affects every Starter tenant whose overrides don't pin the same key. That's
 * intentional — feature-set evolution belongs in PRs / version control, not in
 * a database table where one misclick changes every tenant at once.
 */

const PLAN_FEATURES = {
  starter: {
    channels: { whatsapp: true, sms: false, email: true, fcm: false },
    hrmsSync: false,
    liveChat: false,
    carouselTemplates: false,
    apiKeyIntegration: false,
    maxCustomRoles: 0,
  },
  professional: {
    channels: { whatsapp: true, sms: true, email: true, fcm: true },
    hrmsSync: true,
    liveChat: true,
    carouselTemplates: true,
    apiKeyIntegration: true,
    maxCustomRoles: 3,
  },
  enterprise: {
    channels: { whatsapp: true, sms: true, email: true, fcm: true },
    hrmsSync: true,
    liveChat: true,
    carouselTemplates: true,
    apiKeyIntegration: true,
    maxCustomRoles: 20,
  },
};

// Authoritative key list for the super-admin UI — generated from a single
// plan so a new feature added here automatically shows up as a toggle.
const FEATURE_KEYS = [
  { key: 'channels.whatsapp',    label: 'WhatsApp channel',      group: 'Channels' },
  { key: 'channels.sms',         label: 'SMS channel',           group: 'Channels' },
  { key: 'channels.email',       label: 'Email channel',         group: 'Channels' },
  { key: 'channels.fcm',         label: 'FCM (push) channel',    group: 'Channels' },
  { key: 'hrmsSync',             label: 'HRMS auto-sync',        group: 'Data' },
  { key: 'liveChat',             label: 'Live Chat',             group: 'Operations' },
  { key: 'carouselTemplates',    label: 'Carousel templates',    group: 'Templates' },
  { key: 'apiKeyIntegration',    label: 'External API keys',     group: 'Integrations' },
];

module.exports = { PLAN_FEATURES, FEATURE_KEYS };
