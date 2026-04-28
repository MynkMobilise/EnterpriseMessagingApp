/**
 * Seed script to create test organizations and users for testing
 * Creates:
 * - Organization A with User A
 * - Organization B with User B
 */

const { sequelize } = require('../src/models');
const { Organization, User, Role } = require('../src/models');
const bcrypt = require('bcrypt');

async function seedTestOrganizations() {
  try {
    console.log('🌱 Seeding test organizations and users...\n');

    // Create Organization A
    console.log('Creating Organization A...');
    const [orgA, orgACreated] = await Organization.findOrCreate({
      where: { slug: 'org-a' },
      defaults: {
        name: 'Organization A',
        slug: 'org-a',
        status: 'active',
        plan: 'enterprise',
        settings: {},
      },
    });

    if (orgACreated) {
      console.log('✅ Organization A created');
    } else {
      console.log('ℹ️  Organization A already exists');
    }

    // Create Organization B
    console.log('Creating Organization B...');
    const [orgB, orgBCreated] = await Organization.findOrCreate({
      where: { slug: 'org-b' },
      defaults: {
        name: 'Organization B',
        slug: 'org-b',
        status: 'active',
        plan: 'enterprise',
        settings: {},
      },
    });

    if (orgBCreated) {
      console.log('✅ Organization B created');
    } else {
      console.log('ℹ️  Organization B already exists');
    }

    // Get admin role for permissions
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    if (!adminRole) {
      throw new Error('Admin role not found. Please run role seed script first.');
    }

    // Create User A for Organization A
    console.log('\nCreating User A for Organization A...');
    const hashedPasswordA = await bcrypt.hash('UserA123!@#', 10);
    const [userA, userACreated] = await User.findOrCreate({
      where: { email: 'usera@example.com' },
      defaults: {
        email: 'usera@example.com',
        password: hashedPasswordA,
        firstName: 'User',
        lastName: 'A',
        role: 'admin',
        status: 'active',
        organizationId: orgA.id,
        permissions: adminRole.permissions || {},
        mustChangePassword: false,
      },
    });

    if (userACreated) {
      console.log('✅ User A created (usera@example.com / UserA123!@#)');
    } else {
      // Update organization if user exists but in wrong org
      if (userA.organizationId !== orgA.id) {
        await userA.update({ organizationId: orgA.id });
        console.log('✅ User A updated to Organization A');
      } else {
        console.log('ℹ️  User A already exists');
      }
    }

    // Create User B for Organization B
    console.log('Creating User B for Organization B...');
    const hashedPasswordB = await bcrypt.hash('UserB123!@#', 10);
    const [userB, userBCreated] = await User.findOrCreate({
      where: { email: 'userb@example.com' },
      defaults: {
        email: 'userb@example.com',
        password: hashedPasswordB,
        firstName: 'User',
        lastName: 'B',
        role: 'admin',
        status: 'active',
        organizationId: orgB.id,
        permissions: adminRole.permissions || {},
        mustChangePassword: false,
      },
    });

    if (userBCreated) {
      console.log('✅ User B created (userb@example.com / UserB123!@#)');
    } else {
      // Update organization if user exists but in wrong org
      if (userB.organizationId !== orgB.id) {
        await userB.update({ organizationId: orgB.id });
        console.log('✅ User B updated to Organization B');
      } else {
        console.log('ℹ️  User B already exists');
      }
    }

    console.log('\n✅ Test organizations and users seeded successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Organization A:');
    console.log('  Email: usera@example.com');
    console.log('  Password: UserA123!@#');
    console.log('  Organization: Organization A');
    console.log('\nOrganization B:');
    console.log('  Email: userb@example.com');
    console.log('  Password: UserB123!@#');
    console.log('  Organization: Organization B');
    console.log('\nSuperAdmin:');
    console.log('  Email: admin@example.com');
    console.log('  Password: Admin123!@#');
    console.log('  Can see all organizations');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding test organizations:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  seedTestOrganizations();
}

module.exports = { seedTestOrganizations };

