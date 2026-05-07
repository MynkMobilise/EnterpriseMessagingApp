/**
 * Migration: add template_type ENUM + cards JSON to `templates` table.
 *
 * - template_type: 'standard' (default), 'carousel', or 'limited_time'.
 *   Drives how submitForApproval builds the Meta payload and how
 *   prepareTemplateComponents builds the per-message components array.
 *
 * - cards: JSON array of carousel card definitions. Each card:
 *     { id, media: { type, url } | null, content: string, buttons: [{ type, text, value }] }
 *
 * Idempotent — safe to re-run.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sequelize = require('../src/config/database');

async function migrate() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  console.log('Adding carousel fields to templates table...');

  const [cols] = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'templates'
      AND COLUMN_NAME IN ('template_type', 'cards')
  `);
  const has = (n) => cols.some((r) => r.COLUMN_NAME === n);

  if (!has('template_type')) {
    await qi.addColumn('templates', 'template_type', {
      type: sequelize.Sequelize.ENUM('standard', 'carousel', 'limited_time'),
      allowNull: false,
      defaultValue: 'standard',
    });
    console.log('  ✓ templates.template_type');
  } else {
    console.log('  ⏭️  templates.template_type (exists)');
  }

  if (!has('cards')) {
    await qi.addColumn('templates', 'cards', {
      type: sequelize.Sequelize.JSON,
      allowNull: true,
    });
    console.log('  ✓ templates.cards');
  } else {
    console.log('  ⏭️  templates.cards (exists)');
  }

  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
