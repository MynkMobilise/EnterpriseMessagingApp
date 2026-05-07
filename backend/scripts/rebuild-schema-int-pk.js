/**
 * DESTRUCTIVE — drops every table in the DB and recreates from the updated
 * Sequelize models (now with INT auto_increment PKs and INT FKs).
 *
 *   node scripts/rebuild-schema-int-pk.js --yes
 *
 * Safe because all data was already truncated.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sequelize = require('../src/config/database');
require('../src/models'); // load all models so sync sees them
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Organization, OrganizationSettings, User } = require('../src/models');
const authService = require('../src/services/authService');
const { encrypt } = require('../src/utils/encryption');

if (!process.argv.includes('--yes')) {
  console.error('Refusing to run without --yes flag. This drops every table.');
  process.exit(1);
}

(async () => {
  await sequelize.authenticate();
  console.log('Connected to', process.env.DB_HOST, '/', process.env.DB_NAME);
  console.log('');

  console.log('-- DROP + RECREATE all tables (FK-safe order) --');
  // Disable FK checks so sync can DROP tables that have FK refs from
  // orphaned tables not in our model set (e.g. whatsapp_oauth_states).
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  // Also drop any orphan tables that would otherwise hold dangling FKs.
  const ORPHAN_TABLES = ['whatsapp_oauth_states'];
  for (const t of ORPHAN_TABLES) {
    try {
      await sequelize.query(`DROP TABLE IF EXISTS \`${t}\``);
      console.log(`  ✓ dropped orphan table ${t}`);
    } catch (_) {}
  }
  await sequelize.sync({ force: true });
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('  ✓ schema rebuilt with INT auto_increment PKs');
  console.log('');

  console.log('-- RESEED --');
  const org = await Organization.create({
    name: 'Default Organization',
    slug: 'default-org',
    industry: 'Technology',
    plan: 'enterprise',
    status: 'active',
    maxUsers: 100,
    maxMessagesPerMonth: 100000,
    email: 'admin@example.com',
  });
  console.log(`  ✓ org #${org.id}: ${org.slug}`);

  const ssoSecret = crypto.randomBytes(32).toString('hex');
  await OrganizationSettings.create({
    organizationId: org.id,
    ssoEnabled: false,
    ssoSecretEncrypted: encrypt(ssoSecret),
    ssoDefaultRole: 'operator',
  });
  console.log('  ✓ organization_settings (SSO secret generated)');

  const passwordHash = await bcrypt.hash('Admin123!@#', 10);
  const admin = await User.create({
    organizationId: org.id,
    email: 'admin@example.com',
    passwordHash,
    firstName: 'Admin',
    lastName: 'User',
    role: 'super_admin',
    status: 'active',
    emailVerified: true,
    permissions: authService.getDefaultPermissions('super_admin'),
    authProvider: 'local',
  });
  console.log(`  ✓ admin user #${admin.id}: ${admin.email} (super_admin)`);

  console.log('');
  console.log('================================================');
  console.log('  Login Credentials');
  console.log('================================================');
  console.log('  Org slug:  default-org');
  console.log('  Email:     admin@example.com');
  console.log('  Password:  Admin123!@#');
  console.log('================================================');
  console.log('');
  console.log('  SSO secret (default-org):');
  console.log(`    ${ssoSecret}`);
  console.log('================================================');
  process.exit(0);
})().catch((e) => {
  console.error('FAIL:', e.message);
  if (e.original) console.error('  SQL:', e.original.sqlMessage);
  console.error(e.stack);
  process.exit(1);
});
