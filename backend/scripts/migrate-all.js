/**
 * Run every migration in sequence.
 *
 *   node scripts/migrate-all.js
 *
 * Each migration is a self-contained Node script that exits when done. We
 * spawn them as child processes so one script's process.exit() doesn't end
 * the whole runner.
 *
 * All migrations are idempotent (they check INFORMATION_SCHEMA.COLUMNS before
 * adding), so re-running is safe — additions are skipped, schema converges
 * on what every migration combined defines.
 *
 * What's intentionally skipped:
 *   - *-railway.js variants (duplicate destinations; railway-specific quirks)
 *   - *-sequelize.js variants (older alternates of the same migration)
 *   - rebuild-schema-int-pk.js (destructive nuclear option, never automatic)
 *   - truncate-and-reseed.js (destructive, never automatic)
 *   - All test-*.js scripts
 */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

// Load the backend .env so DB_HOST/DB_USER/DB_PASSWORD/etc. propagate to every
// child process via the inherited environment.
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const scriptsDir = __dirname;

// Order matters when migrations depend on each other (e.g. a column must
// exist before another migration alters it). For independent additions order
// is irrelevant. Listed in chronological-ish order.
const MIGRATIONS = [
  'add-must-change-password-column.js',
  'add-email-fcm-columns.js',
  'add-tls-options-column.js',
  'migrate-add-processing-status.js',
  'migrate-add-sms-template-id.js',
  'migrate-add-whatsapp-manual-fields.js',
  'migrate-add-whatsapp-oauth-fields.js',
  'migrate-create-template-imports-table.js',
  'migrate-message-event-types.js',
  'migrate-add-sso-fields.js',
  'migrate-add-carousel-fields.js',
  'migrate-add-message-direction.js',
  'migrate-create-webhook-events.js',
  'migrate-add-hrms-fields.js',
  'migrate-create-contact-group-user-assignments.js',
  'migrate-create-org-role-permissions.js',
  'migrate-add-variable-samples.js',
];

function runOne(name) {
  const fpath = path.join(scriptsDir, name);
  if (!fs.existsSync(fpath)) {
    return { name, status: 'missing', code: -1 };
  }
  console.log('━'.repeat(72));
  console.log(`▶  ${name}`);
  console.log('━'.repeat(72));
  const r = spawnSync('node', [fpath], {
    cwd: path.dirname(scriptsDir),
    stdio: 'inherit',
    env: process.env,
  });
  return { name, status: r.status === 0 ? 'ok' : 'fail', code: r.status ?? -1 };
}

/**
 * Step 0: ensure the base schema exists. sequelize.sync() (without force) is
 * non-destructive — it CREATEs any tables that don't exist but leaves existing
 * tables alone. Required because the ALTER TABLE migrations below assume the
 * base tables are already there. On a fresh empty DB this single call brings
 * everything up; on an existing DB it's a no-op.
 */
async function ensureBaseSchema() {
  console.log('━'.repeat(72));
  console.log('▶  Step 0: Ensure base schema (sequelize.sync, non-destructive)');
  console.log('━'.repeat(72));
  const sequelize = require('../src/config/database');
  require('../src/models'); // load every model file
  await sequelize.authenticate();
  await sequelize.sync(); // creates missing tables; never drops or alters existing
  console.log('✅ Base schema ensured.');
  await sequelize.close();
}

(async () => {
  try {
    await ensureBaseSchema();
  } catch (e) {
    console.error('❌ Could not ensure base schema:', e.message);
    process.exit(1);
  }

  const results = [];
  for (const m of MIGRATIONS) {
    results.push(runOne(m));
  }

  console.log('');
  console.log('━'.repeat(72));
  console.log('  SUMMARY');
  console.log('━'.repeat(72));
  for (const r of results) {
    const icon = r.status === 'ok' ? '✅' : r.status === 'missing' ? '⏭️ ' : '❌';
    console.log(`  ${icon}  ${r.name.padEnd(50)}  (${r.status}, exit ${r.code})`);
  }
  const failed = results.filter((r) => r.status === 'fail');
  console.log('');
  if (failed.length === 0) {
    console.log(`All ${results.length} migrations completed successfully.`);
    process.exit(0);
  } else {
    console.log(`${failed.length} migration(s) failed. Re-run after fixing — they're idempotent.`);
    process.exit(1);
  }
})();
