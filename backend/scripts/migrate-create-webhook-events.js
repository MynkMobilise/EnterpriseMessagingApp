/**
 * Migration: create the `webhook_events` table.
 *
 * Captures every webhook POST that lands at /api/v1/webhooks/whatsapp so an
 * operator can see Meta's actual delivery activity in the UI without SSH
 * access. Useful for diagnosing:
 *   - "Did Meta deliver this message?" → row exists vs. doesn't
 *   - "Why didn't this org get the message?" → reason='unknown_phone_number_id'
 *   - "Is the handler crashing?" → status='error', errorMessage populated
 *
 * Idempotent — safe to re-run.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sequelize = require('../src/config/database');

async function migrate() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  console.log('Creating webhook_events table…');

  const [existing] = await sequelize.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'webhook_events'"
  );
  if (existing.length > 0) {
    console.log('  ⏭️  webhook_events (exists)');
    process.exit(0);
  }

  await qi.createTable('webhook_events', {
    id: {
      type: sequelize.Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    organization_id: {
      // Nullable: when Meta delivers a webhook for an unknown phone_number_id
      // we still want to log it (so the operator can see "wrong phone id" in
      // the UI), even though no org owns it.
      type: sequelize.Sequelize.INTEGER,
      allowNull: true,
    },
    field: {
      // Meta's `change.field`: 'messages', 'message_template_status_update', …
      type: sequelize.Sequelize.STRING(64),
      allowNull: true,
    },
    direction: {
      type: sequelize.Sequelize.ENUM('inbound', 'status', 'template_status', 'unknown'),
      allowNull: false,
      defaultValue: 'unknown',
    },
    status: {
      // Outcome of our handler. 'ok' = persisted, 'skipped' = duplicate or
      // benign drop, 'unknown_org' = no settings row matched phone_number_id,
      // 'error' = handler threw.
      type: sequelize.Sequelize.ENUM('ok', 'skipped', 'unknown_org', 'error'),
      allowNull: false,
      defaultValue: 'ok',
    },
    summary: {
      // Short human-readable line: "+91… → text 'Hi'", "wamid.xyz delivered"
      type: sequelize.Sequelize.STRING(255),
      allowNull: true,
    },
    payload: {
      // Full Meta payload — truncated to avoid MySQL row-size limits if huge.
      type: sequelize.Sequelize.TEXT,
      allowNull: true,
    },
    error_message: {
      type: sequelize.Sequelize.TEXT,
      allowNull: true,
    },
    created_at: {
      type: sequelize.Sequelize.DATE,
      defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      allowNull: false,
    },
  });
  console.log('  ✓ webhook_events');

  await sequelize.query('CREATE INDEX idx_webhook_events_org_created ON webhook_events (organization_id, created_at)');
  console.log('  ✓ idx_webhook_events_org_created');

  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
