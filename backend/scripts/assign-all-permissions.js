const { User } = require('../src/models');
const sequelize = require('../src/config/database');

(async () => {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Find admin user
    const user = await User.findOne({ where: { email: 'admin@example.com' } });
    
    if (!user) {
      console.log('❌ User admin@example.com not found');
      process.exit(1);
    }

    // All permissions
    const allPermissions = {
      canSendMessages: true,
      canApproveMessages: true,
      canManageUsers: true,
      canManageTemplates: true,
      canManageContacts: true,
      canViewReports: true,
      canManageSettings: true,
      canManageAPIKeys: true,
      canAssignRoles: true,
      canManageOrganization: true,
    };

    // Update user with all permissions and super_admin role
    await user.update({
      permissions: allPermissions,
      role: 'super_admin',
      status: 'active',
    });

    console.log('✅ Successfully updated admin@example.com');
    console.log('   Role: super_admin');
    console.log('   Status: active');
    console.log('   Permissions:', JSON.stringify(allPermissions, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

