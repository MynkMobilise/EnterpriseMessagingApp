require('dotenv').config();
const sequelize = require('../src/config/database');
const { Organization, User } = require('../src/models');
const bcrypt = require('bcrypt');

async function setupInitialData() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Create default organization
    let organization = await Organization.findOne({
      where: { slug: 'default-org' },
    });

    if (!organization) {
      organization = await Organization.create({
        name: 'Default Organization',
        slug: 'default-org',
        plan: 'enterprise',
        status: 'active',
        maxUsers: 100,
        maxMessagesPerMonth: 100000,
      });
      console.log('✅ Created default organization:', organization.name);
    } else {
      console.log('✅ Organization already exists:', organization.name);
    }

    // Create default admin user
    const adminEmail = 'admin@example.com';
    const adminPassword = 'Admin123!@#';

    let adminUser = await User.findOne({
      where: {
        email: adminEmail,
        organizationId: organization.id,
      },
    });

    if (!adminUser) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const authService = require('../src/services/authService');
      const adminPermissions = authService.getDefaultPermissions('admin');
      adminUser = await User.create({
        organizationId: organization.id,
        email: adminEmail,
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        status: 'active',
        emailVerified: true,
        permissions: adminPermissions,
      });
      console.log('✅ Created admin user with admin permissions');
    } else {
      // Update existing admin user to ensure they have permissions
      if (!adminUser.permissions) {
        const authService = require('../src/services/authService');
        const adminPermissions = authService.getDefaultPermissions('admin');
        await adminUser.update({ permissions: adminPermissions });
        console.log('✅ Updated admin user permissions');
      } else {
        console.log('✅ Admin user already exists with permissions');
      }
    }

    console.log('\n📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Organization Slug: default-org');
    console.log('Email:           ', adminEmail);
    console.log('Password:        ', adminPassword);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ Setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up initial data:', error);
    process.exit(1);
  }
}

setupInitialData();


