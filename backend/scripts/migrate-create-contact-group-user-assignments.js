/**
 * Migration: create `contact_group_user_assignments` join table.
 *
 * Lets admins map specific operators to specific contact groups so an
 * operator only sees the groups they're allowed to send to. Roles above
 * operator (admin, manager, super_admin) ignore this table and see all
 * groups in their org.
 *
 * Schema:
 *   id           INT PK AUTO_INCREMENT
 *   group_id     INT NOT NULL → contact_groups.id
 *   user_id      INT NOT NULL → users.id
 *   assigned_by  INT NULL     → users.id (who made the assignment)
 *   assigned_at  DATETIME DEFAULT CURRENT_TIMESTAMP
 *   UNIQUE (group_id, user_id) — same operator can't be assigned twice
 *
 * Idempotent — safe to re-run.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sequelize = require('../src/config/database');

async function migrate() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  console.log('Creating contact_group_user_assignments table…');

  const [tables] = await sequelize.query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'contact_group_user_assignments'
  `);
  const exists = Array.isArray(tables) && tables.length > 0;

  if (!exists) {
    await qi.createTable('contact_group_user_assignments', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      group_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'contact_groups', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      assigned_by: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      assigned_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.NOW,
      },
    });
    console.log('  ✓ table created');
  } else {
    console.log('  ⏭️  table exists');
  }

  // Indexes — unique pair, plus per-column lookup indexes for the read paths.
  const [idx] = await sequelize.query(`
    SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'contact_group_user_assignments'
  `);
  const idxNames = idx.map((r) => r.INDEX_NAME);

  if (!idxNames.includes('unique_group_user')) {
    await sequelize.query(`
      CREATE UNIQUE INDEX unique_group_user
        ON contact_group_user_assignments (group_id, user_id)
    `);
    console.log('  ✓ unique_group_user');
  } else {
    console.log('  ⏭️  unique_group_user');
  }

  if (!idxNames.includes('idx_cgua_user')) {
    await sequelize.query(`
      CREATE INDEX idx_cgua_user ON contact_group_user_assignments (user_id)
    `);
    console.log('  ✓ idx_cgua_user');
  } else {
    console.log('  ⏭️  idx_cgua_user');
  }

  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
