/**
 * Migration: introduce a real `roles` table + add user.role_id FK.
 *
 * Why: today User.role is a hardcoded ENUM (super_admin / admin / manager /
 * operator / viewer). Tenants can't create named roles like "Marketing Lead".
 * Phase 2 of the RBAC overhaul (see C:\Users\mayank.sabharwal\.claude\plans\
 * i-need-to-do-unified-reddy.md) makes Role a first-class entity per org —
 * five system rows are seeded per org so every user maps to a real Role row,
 * plus tenants can add custom rows up to the `maxCustomRoles` feature-flag
 * cap.
 *
 * What this script does (all idempotent — re-runnable):
 *   1. Create `roles` table if missing.
 *   2. Seed five `is_system=true` rows per org (one per legacy role enum) with
 *      the same default permissions that authService.getDefaultPermissions
 *      currently hands out. Existing per-org OrganizationRolePermissions are
 *      NOT pulled in here — they continue to layer in the auth middleware.
 *   3. Add `users.role_id` BIGINT NULL FK.
 *   4. Backfill each user's `role_id` from the user's existing `role` enum,
 *      matching the system row in their own organization.
 *
 * NOT done here (intentional — separate decision):
 *   - Drop the `users.role` ENUM column. It stays for one release as a
 *     safety net. The auth middleware reads role_id first and falls back to
 *     the enum if role_id is null (e.g. a brand-new user inserted by older
 *     code that doesn't know about role_id yet).
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sequelize = require('../src/config/database');

const ROLE_DEFAULTS = {
  super_admin: {
    canSendMessages: true, canApproveMessages: true, canManageUsers: true,
    canManageTemplates: true, canManageContacts: true, canViewReports: true,
    canManageSettings: true, canManageAPIKeys: true, canAssignRoles: true,
    canManageOrganization: true, canViewLiveChat: true, canViewLeadership: true,
  },
  admin: {
    canSendMessages: true, canApproveMessages: true, canManageUsers: true,
    canManageTemplates: true, canManageContacts: true, canViewReports: true,
    canManageSettings: true, canManageAPIKeys: true, canAssignRoles: true,
    canManageOrganization: true, canViewLiveChat: true, canViewLeadership: true,
  },
  manager: {
    canSendMessages: true, canApproveMessages: true, canManageUsers: false,
    canManageTemplates: true, canManageContacts: true, canViewReports: true,
    canManageSettings: false, canManageAPIKeys: false, canAssignRoles: false,
    canViewLiveChat: true, canViewLeadership: true,
  },
  operator: {
    canSendMessages: true, canApproveMessages: false, canManageUsers: false,
    canManageTemplates: false, canManageContacts: true, canViewReports: false,
    canManageSettings: false, canManageAPIKeys: false, canAssignRoles: false,
    canViewLiveChat: true, canViewLeadership: false,
  },
  viewer: {
    canSendMessages: false, canApproveMessages: false, canManageUsers: false,
    canManageTemplates: false, canManageContacts: false, canViewReports: true,
    canManageSettings: false, canManageAPIKeys: false, canAssignRoles: false,
    canViewLiveChat: true, canViewLeadership: false,
  },
};

// Pretty labels for the seeded system rows. Custom roles use whatever name
// the tenant types in.
const SYSTEM_ROLE_NAMES = {
  super_admin: 'Super Admin',
  admin: 'Administrator',
  manager: 'Manager',
  operator: 'Operator',
  viewer: 'Viewer',
};

async function tableExists(name) {
  const [rows] = await sequelize.query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${name}'
  `);
  return rows.length > 0;
}

async function columnExists(table, col) {
  const [rows] = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND COLUMN_NAME = '${col}'
  `);
  return rows.length > 0;
}

async function migrate() {
  await sequelize.authenticate();

  // -------- 1. Create roles table --------
  if (await tableExists('roles')) {
    console.log('  ⏭️  roles (table exists)');
  } else {
    await sequelize.query(`
      CREATE TABLE roles (
        id              BIGINT NOT NULL AUTO_INCREMENT,
        organization_id INT NOT NULL,
        name            VARCHAR(64) NOT NULL,
        role_key        VARCHAR(64) NULL COMMENT 'For system rows: the legacy enum value (super_admin/admin/...). NULL for custom rows.',
        permissions     JSON NOT NULL,
        is_system       TINYINT(1) NOT NULL DEFAULT 0,
        description     TEXT NULL,
        created_by      INT NULL,
        created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at      DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_role_name (organization_id, name, deleted_at),
        UNIQUE KEY uniq_role_system (organization_id, role_key),
        INDEX idx_role_org (organization_id),
        INDEX idx_role_is_system (is_system),
        CONSTRAINT fk_role_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('  ✓ roles');
  }

  // -------- 2. Seed system rows per org --------
  const [orgRows] = await sequelize.query('SELECT id FROM organizations WHERE deleted_at IS NULL');
  console.log(`  Seeding system roles for ${orgRows.length} organization(s)…`);

  for (const org of orgRows) {
    for (const [roleKey, perms] of Object.entries(ROLE_DEFAULTS)) {
      const [existing] = await sequelize.query(
        'SELECT id FROM roles WHERE organization_id = :orgId AND role_key = :key AND deleted_at IS NULL LIMIT 1',
        { replacements: { orgId: org.id, key: roleKey } }
      );
      if (existing.length > 0) continue;

      await sequelize.query(
        `INSERT INTO roles (organization_id, name, role_key, permissions, is_system, description)
         VALUES (:orgId, :name, :key, :perms, 1, :desc)`,
        {
          replacements: {
            orgId: org.id,
            name: SYSTEM_ROLE_NAMES[roleKey],
            key: roleKey,
            perms: JSON.stringify(perms),
            desc: `Built-in ${SYSTEM_ROLE_NAMES[roleKey]} role. Cannot be renamed or deleted; per-org permission tweaks layered via organization_role_permissions.`,
          },
        }
      );
    }
  }
  console.log('  ✓ System roles seeded.');

  // -------- 3. Add user.role_id --------
  if (await columnExists('users', 'role_id')) {
    console.log('  ⏭️  users.role_id (column exists)');
  } else {
    await sequelize.query('ALTER TABLE users ADD COLUMN role_id BIGINT NULL AFTER role');
    await sequelize.query('ALTER TABLE users ADD INDEX idx_user_role_id (role_id)');
    await sequelize.query(`
      ALTER TABLE users ADD CONSTRAINT fk_user_role
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
    `).catch((e) => {
      // FK creation can fail on some MySQL/MariaDB configs (engine mismatch,
      // referencing column type drift). Log and continue — the column is the
      // important part; the FK is a referential-integrity nicety.
      console.log(`  ⚠️  Could not add FK on users.role_id: ${e.message}`);
    });
    console.log('  ✓ users.role_id');
  }

  // -------- 4. Backfill user.role_id --------
  // The JOIN compares `users.role` (legacy ENUM, MySQL-8 default collation
  // utf8mb4_0900_ai_ci) with `roles.role_key` (VARCHAR, often created with
  // utf8mb4_unicode_ci). Different collations → "Illegal mix of collations"
  // at runtime. Force a common collation on both sides of the comparison so
  // the migration works regardless of the server's default.
  const [usersMissingRoleId] = await sequelize.query(
    'SELECT COUNT(*) AS n FROM users WHERE role_id IS NULL'
  );
  if (usersMissingRoleId[0].n > 0) {
    console.log(`  Backfilling role_id for ${usersMissingRoleId[0].n} user(s)…`);
    await sequelize.query(`
      UPDATE users u
      INNER JOIN roles r
        ON r.organization_id = u.organization_id
       AND r.role_key COLLATE utf8mb4_unicode_ci = CAST(u.role AS CHAR) COLLATE utf8mb4_unicode_ci
       AND r.is_system = 1
       AND r.deleted_at IS NULL
      SET u.role_id = r.id
      WHERE u.role_id IS NULL
    `);
    const [afterCount] = await sequelize.query('SELECT COUNT(*) AS n FROM users WHERE role_id IS NULL');
    console.log(`  ✓ Backfill done. Users still without role_id: ${afterCount[0].n}`);
  } else {
    console.log('  ⏭️  All users already have role_id.');
  }

  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
