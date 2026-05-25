/**
 * Migration: add `variable_samples` JSON column to `templates`.
 *
 * Meta requires (or strongly recommends) example values for every {{n}}
 * placeholder in the BODY component when a template is submitted for
 * approval. The reviewer uses these examples to understand what real
 * content will look like.
 *
 * Shape: { "1": "John", "2": "ORD-123", ... } — keys are the placeholder
 * indices/names (matching what's in `variables`), values are arbitrary
 * sample strings.
 *
 * For carousel templates we also store per-card samples under
 * `card1.1`, `card2.1` … keys so the UI and submission path can address
 * each card's body parameters separately.
 *
 * Idempotent.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sequelize = require('../src/config/database');

async function migrate() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  console.log('Adding variable_samples to templates table…');

  const [cols] = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'templates'
      AND COLUMN_NAME = 'variable_samples'
  `);
  if (cols.length > 0) {
    console.log('  ⏭️  templates.variable_samples (exists)');
    process.exit(0);
  }

  await qi.addColumn('templates', 'variable_samples', {
    type: sequelize.Sequelize.JSON,
    allowNull: true,
  });
  console.log('  ✓ templates.variable_samples');
  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
