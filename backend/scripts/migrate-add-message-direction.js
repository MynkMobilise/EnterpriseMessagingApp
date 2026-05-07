/**
 * Migration: prepare `messages` table for two-way Live Chat.
 *
 *   - direction ENUM('inbound','outbound') NOT NULL DEFAULT 'outbound'
 *       Tells us who sent each message. Existing rows are all outbound.
 *
 *   - is_read TINYINT(1) NOT NULL DEFAULT 1
 *       Used for inbound rows only (defaults to 1 so existing outbound rows
 *       don't show up as "unread"). New inbound rows insert with is_read=0
 *       and the chat UI flips it to 1 when an operator opens the thread.
 *
 *   - sent_by becomes nullable
 *       Inbound messages have no operator who "sent" them. The column was
 *       NOT NULL because every previously created row was outbound. Relax it.
 *
 *   - Index (organization_id, recipient_phone, created_at) for the
 *     conversation-list grouping query.
 *   - Index on external_message_id for inbound dedup (Meta retries on 5xx).
 *
 * Idempotent — safe to re-run.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sequelize = require('../src/config/database');

async function migrate() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  console.log('Adding live-chat fields to messages table...');

  const [cols] = await sequelize.query(`
    SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'messages'
      AND COLUMN_NAME IN ('direction', 'is_read', 'sent_by')
  `);
  const has = (n) => cols.some((r) => r.COLUMN_NAME === n);
  const isNullable = (n) => {
    const c = cols.find((r) => r.COLUMN_NAME === n);
    return c && c.IS_NULLABLE === 'YES';
  };

  if (!has('direction')) {
    await qi.addColumn('messages', 'direction', {
      type: sequelize.Sequelize.ENUM('inbound', 'outbound'),
      allowNull: false,
      defaultValue: 'outbound',
    });
    console.log('  ✓ messages.direction');
  } else {
    console.log('  ⏭️  messages.direction (exists)');
  }

  if (!has('is_read')) {
    await qi.addColumn('messages', 'is_read', {
      type: sequelize.Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    console.log('  ✓ messages.is_read');
  } else {
    console.log('  ⏭️  messages.is_read (exists)');
  }

  // Relax sent_by to allow NULL (inbound messages have no operator).
  if (has('sent_by') && !isNullable('sent_by')) {
    await sequelize.query(`ALTER TABLE messages MODIFY COLUMN sent_by INT NULL`);
    console.log('  ✓ messages.sent_by → NULLABLE');
  } else {
    console.log('  ⏭️  messages.sent_by (already nullable or missing)');
  }

  // Indexes — wrap in try/catch since MySQL has no IF NOT EXISTS for CREATE INDEX.
  const [existingIdx] = await sequelize.query(`
    SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages'
  `);
  const idxNames = existingIdx.map((r) => r.INDEX_NAME);

  if (!idxNames.includes('idx_msg_org_phone_created')) {
    await sequelize.query(
      `CREATE INDEX idx_msg_org_phone_created ON messages (organization_id, recipient_phone, created_at)`
    );
    console.log('  ✓ idx_msg_org_phone_created');
  } else {
    console.log('  ⏭️  idx_msg_org_phone_created (exists)');
  }

  if (!idxNames.includes('idx_msg_external_id')) {
    await sequelize.query(
      `CREATE INDEX idx_msg_external_id ON messages (external_message_id)`
    );
    console.log('  ✓ idx_msg_external_id');
  } else {
    console.log('  ⏭️  idx_msg_external_id (exists)');
  }

  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
