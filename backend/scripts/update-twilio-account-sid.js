/**
 * Update Twilio Account SID
 * Usage: node backend/scripts/update-twilio-account-sid.js <ACCOUNT_SID>
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sequelize = require('../src/config/database');
const { OrganizationSettings, Organization } = require('../src/models');
const settingsService = require('../src/services/settingsService');

async function updateAccountSid(accountSid) {
  try {
    if (!accountSid) {
      console.error('❌ Please provide Twilio Account SID');
      console.log('Usage: node backend/scripts/update-twilio-account-sid.js <ACCOUNT_SID>');
      process.exit(1);
    }

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const org = await Organization.findOne({
      where: { slug: 'default-org' },
    });

    if (!org) {
      const firstOrg = await Organization.findOne();
      if (!firstOrg) {
        console.error('❌ No organization found');
        process.exit(1);
      }
      org = firstOrg;
    }

    console.log(`📋 Organization: ${org.name} (${org.id})\n`);

    // Update settings
    const response = await settingsService.updateOrganizationSettings(org.id, {
      customSettings: {
        twilioAccountSid: accountSid.trim(),
      },
    });

    console.log('✅ Twilio Account SID updated successfully!');
    console.log(`   Account SID: ${response.twilioAccountSid || 'Not found in response'}\n`);

    // Verify
    const settings = await settingsService.getOrganizationSettings(org.id);
    console.log('📊 Updated Settings:');
    console.log(`   Account SID: ${settings.twilioAccountSid ? '✅ ' + settings.twilioAccountSid : '❌ Not set'}`);
    console.log(`   Auth Token: ${settings.smsApiKeyEncrypted ? '✅ Set (encrypted)' : '❌ Not set'}`);
    console.log(`   Sender ID: ${settings.smsSenderId || 'Not set'}\n`);

    console.log('🎉 Update completed!\n');

  } catch (error) {
    console.error('\n❌ Update failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Get Account SID from command line argument
const accountSid = process.argv[2];
updateAccountSid(accountSid);

