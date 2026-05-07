/**
 * Sync WhatsApp message templates from Meta into the local templates table.
 * Usage:  node scripts/sync-whatsapp-templates-from-meta.js [orgNameLike]
 *         (default: matches "Mobilise")
 *
 * For each APPROVED template returned by Meta /{WABA_ID}/message_templates,
 * inserts (or updates) one row in the local templates table so it appears
 * in the Send Message UI dropdown. Idempotent — safe to re-run.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const { Sequelize } = require('sequelize');
const { decrypt, isEncrypted } = require('../src/utils/encryption');

const ORG_NAME_LIKE = process.argv[2] || 'Mobilise';

const seq = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  dialect: 'mysql',
  logging: false,
});

// Map Meta values into the local ENUMs.
const META_CATEGORY_MAP = {
  MARKETING: 'marketing',
  UTILITY: 'utility',
  AUTHENTICATION: 'authentication',
  TRANSACTIONAL: 'transactional',
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

(async () => {
  console.log(`=== Syncing WhatsApp templates from Meta into local DB ===`);
  console.log(`(matching org name LIKE ~${ORG_NAME_LIKE}~)\n`);

  // 1) Find target org + creds
  const [orgs] = await seq.query(
    `SELECT os.id AS settings_id, os.organization_id, os.whatsapp_business_account_id AS waba,
            os.whatsapp_access_token AS token, o.name AS org_name
     FROM organization_settings os
     JOIN organizations o ON o.id = os.organization_id
     WHERE o.name LIKE :n AND os.whatsapp_business_account_id IS NOT NULL
     LIMIT 1`,
    { replacements: { n: `%${ORG_NAME_LIKE}%` } }
  );
  if (orgs.length === 0) {
    console.error('No matching org with WhatsApp configured. Aborting.');
    process.exit(1);
  }
  const org = orgs[0];
  console.log(`Org: ${org.org_name} (${org.organization_id})`);
  console.log(`WABA: ${org.waba}`);

  if (!org.token) {
    console.error('Token is NULL in DB. Re-save in UI first, or run test-whatsapp-db-flow.js to reseed.');
    process.exit(1);
  }
  let accessToken;
  try {
    accessToken = isEncrypted(org.token) ? decrypt(org.token) : org.token;
  } catch (e) {
    console.error('Token decryption failed:', e.message);
    process.exit(1);
  }
  console.log(`Token decrypted (len=${accessToken.length})\n`);

  // 2) Find an admin user to be created_by (templates require a user FK)
  const [adminUsers] = await seq.query(
    `SELECT id, email FROM users WHERE organization_id = :oid AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1`,
    { replacements: { oid: org.organization_id } }
  );
  if (adminUsers.length === 0) {
    console.error('No user found for this org to attribute templates to. Aborting.');
    process.exit(1);
  }
  const createdBy = adminUsers[0].id;
  console.log(`createdBy = ${adminUsers[0].email} (${createdBy})\n`);

  // 3) Fetch templates from Meta
  let templates = [];
  let next = `https://graph.facebook.com/v18.0/${org.waba}/message_templates?fields=name,language,status,category,components,id&limit=100`;
  while (next) {
    const r = await axios.get(next, { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 15000 });
    templates = templates.concat(r.data.data || []);
    next = r.data.paging?.next || null;
  }
  console.log(`Fetched ${templates.length} templates from Meta. Filtering APPROVED only.\n`);

  // 4) Upsert each APPROVED template
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  for (const t of templates) {
    if (t.status !== 'APPROVED') {
      skipped++;
      console.log(`  ⏭️  ${t.name} (${t.language}) - status=${t.status} skipped`);
      continue;
    }

    const components = t.components || [];
    const headerComp = components.find((c) => c.type === 'HEADER');
    const bodyComp = components.find((c) => c.type === 'BODY');
    const footerComp = components.find((c) => c.type === 'FOOTER');
    const buttonsComp = components.find((c) => c.type === 'BUTTONS');

    if (!bodyComp || !bodyComp.text) {
      console.log(`  ⚠️  ${t.name} has no BODY text, skipping`);
      skipped++;
      continue;
    }

    const body = bodyComp.text;
    const variables = extractVariables(body);
    const category = META_CATEGORY_MAP[t.category] || 'utility';
    const headerType = headerComp ? META_HEADER_FORMAT_MAP[headerComp.format] || null : null;
    const headerContent = headerComp ? (headerComp.text || null) : null;
    const footer = footerComp?.text || null;
    const buttons = buttonsComp?.buttons || null;

    // Check if template already exists
    const [existing] = await seq.query(
      `SELECT id FROM templates WHERE organization_id = :oid AND name = :name AND channel = 'whatsapp' AND deleted_at IS NULL LIMIT 1`,
      { replacements: { oid: org.organization_id, name: t.name } }
    );

    const data = {
      organizationId: org.organization_id,
      name: t.name,
      channel: 'whatsapp',
      category,
      language: t.language,
      body,
      footer,
      headerType,
      headerContent,
      variables: JSON.stringify(variables),
      variableCount: variables.length,
      buttons: buttons ? JSON.stringify(buttons) : null,
      whatsappTemplateId: null,
      whatsappStatus: 'approved',
      status: 'approved',
    };

    if (existing.length > 0) {
      await seq.query(
        `UPDATE templates SET
           category = :category, language = :language, body = :body, footer = :footer,
           header_type = :headerType, header_content = :headerContent,
           variables = :variables, variable_count = :variableCount, buttons = :buttons,
           whatsapp_template_id = :whatsappTemplateId, whatsapp_status = :whatsappStatus,
           status = :status, updated_at = NOW()
         WHERE id = :id`,
        { replacements: { ...data, id: existing[0].id } }
      );
      updated++;
      console.log(`  🔄 ${t.name} (${t.language}) updated [vars=${variables.length}]`);
    } else {
      await seq.query(
        `INSERT INTO templates
           (id, organization_id, created_by, name, channel, category, language,
            body, footer, header_type, header_content, variables, variable_count, buttons,
            whatsapp_template_id, whatsapp_status, status, approved_at,
            total_sent, total_delivered, total_read, total_clicked,
            created_at, updated_at)
         VALUES
           (UUID(), :organizationId, :createdBy, :name, :channel, :category, :language,
            :body, :footer, :headerType, :headerContent, :variables, :variableCount, :buttons,
            :whatsappTemplateId, :whatsappStatus, :status, NOW(),
            0, 0, 0, 0,
            NOW(), NOW())`,
        { replacements: { ...data, createdBy } }
      );
      inserted++;
      console.log(`  ✅ ${t.name} (${t.language}) inserted [vars=${variables.length}]`);
    }
  }

  console.log(`\nDone. inserted=${inserted}, updated=${updated}, skipped=${skipped}.`);
  await seq.close();
})().catch((e) => {
  console.error('FAIL:', e.message);
  if (e.original) console.error('  SQL:', e.original.sqlMessage);
  process.exit(1);
});
