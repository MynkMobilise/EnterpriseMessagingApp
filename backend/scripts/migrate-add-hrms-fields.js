/**
 * Migration: extend `contacts` + `organization_settings` for HRMS integration.
 *
 * Contacts table gains the HRMS payload fields (employee_id, cost_center_*,
 * reporting_manager_*, region, segment_*, etc.). These are nullable —
 * contacts created manually or via plain CSV still work without them.
 *
 * organization_settings gains config for the nightly sync:
 *   - hrms_api_url
 *   - hrms_api_auth_header_name / hrms_api_auth_header_value (encrypted)
 *   - hrms_last_sync_datetime  (cursor for incremental sync)
 *   - hrms_last_synced_count   (audit)
 *   - hrms_last_synced_at      (audit)
 *
 * Idempotent — re-runnable.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sequelize = require('../src/config/database');

async function migrate() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  console.log('Adding HRMS fields to contacts + organization_settings…');

  const contactCols = [
    ['external_id',                       'VARCHAR(64)'],
    ['employee_id',                       'VARCHAR(64)'],
    ['employee_status',                   'VARCHAR(32)'],
    ['employment_category',               'VARCHAR(64)'],
    ['skill_type',                        'VARCHAR(64)'],
    ['hiring_type',                       'VARCHAR(64)'],
    ['cost_center_code',                  'VARCHAR(64)'],
    ['cost_center_name',                  'VARCHAR(255)'],
    ['reporting_manager_code',            'VARCHAR(64)'],
    ['reporting_manager_name',            'VARCHAR(255)'],
    ['reporting_manager_mobile',          'VARCHAR(32)'],
    ['designation',                       'VARCHAR(255)'],
    ['sub_department',                    'VARCHAR(255)'],
    ['region',                            'VARCHAR(128)'],
    ['segment_name',                      'VARCHAR(128)'],
    ['sub_segment_name',                  'VARCHAR(128)'],
    ['last_synced_at',                    'DATETIME NULL'],
    ['last_sync_source',                  "ENUM('excel','api','manual') NULL"],
  ];

  const [contactColRows] = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contacts'
  `);
  const contactHas = (n) => contactColRows.some((r) => r.COLUMN_NAME === n);

  for (const [col, ddl] of contactCols) {
    if (contactHas(col)) {
      console.log(`  ⏭️  contacts.${col} (exists)`);
    } else {
      await sequelize.query(`ALTER TABLE contacts ADD COLUMN ${col} ${ddl}`);
      console.log(`  ✓ contacts.${col}`);
    }
  }

  // Unique index on (organization_id, employee_id) so syncs upsert correctly
  // when employee_id is set. NULL employee_id rows aren't part of the unique
  // constraint (MySQL allows multiple NULLs in unique indexes).
  const [idxRows] = await sequelize.query(`
    SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contacts'
      AND INDEX_NAME = 'unique_employee_per_org'
  `);
  if (idxRows.length === 0) {
    await sequelize.query(
      `CREATE UNIQUE INDEX unique_employee_per_org ON contacts (organization_id, employee_id)`
    );
    console.log('  ✓ unique_employee_per_org index');
  } else {
    console.log('  ⏭️  unique_employee_per_org index (exists)');
  }

  // organization_settings HRMS columns
  const settingsCols = [
    ['hrms_api_url',                      'VARCHAR(512)'],
    ['hrms_api_auth_header_name',         'VARCHAR(128)'],
    ['hrms_api_auth_header_value',        'TEXT'],  // encrypted
    ['hrms_last_sync_datetime',           'DATETIME NULL'],
    ['hrms_last_synced_count',            'INT NULL'],
    ['hrms_last_synced_at',               'DATETIME NULL'],
    ['hrms_last_sync_error',              'TEXT'],
  ];

  const [settingsColRows] = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organization_settings'
  `);
  const settingsHas = (n) => settingsColRows.some((r) => r.COLUMN_NAME === n);

  for (const [col, ddl] of settingsCols) {
    if (settingsHas(col)) {
      console.log(`  ⏭️  organization_settings.${col} (exists)`);
    } else {
      await sequelize.query(`ALTER TABLE organization_settings ADD COLUMN ${col} ${ddl}`);
      console.log(`  ✓ organization_settings.${col}`);
    }
  }

  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
