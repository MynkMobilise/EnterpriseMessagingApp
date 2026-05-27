/**
 * Migration: add `feature_overrides` JSON column to `organizations`.
 *
 * Stores per-tenant deltas on top of the plan baseline defined in
 * backend/src/config/planFeatures.js. Example:
 *   { "channels": { "sms": true }, "hrmsSync": true, "maxCustomRoles": 5 }
 *
 * Effective flags = deepMerge(PLAN_FEATURES[org.plan], org.featureOverrides).
 * See backend/src/utils/featureFlags.js for the resolver.
 *
 * Idempotent — safe to re-run.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sequelize = require('../src/config/database');

async function migrate() {
  await sequelize.authenticate();
  console.log('Adding feature_overrides JSON column to organizations…');

  const [cols] = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations'
  `);
  const has = (n) => cols.some((r) => r.COLUMN_NAME === n);

  if (has('feature_overrides')) {
    console.log('  ⏭️  organizations.feature_overrides (exists)');
  } else {
    await sequelize.query(
      "ALTER TABLE organizations ADD COLUMN feature_overrides JSON NULL DEFAULT NULL COMMENT 'Per-tenant deltas applied on top of plan-tier baseline.'"
    );
    console.log('  ✓ organizations.feature_overrides');
  }

  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
