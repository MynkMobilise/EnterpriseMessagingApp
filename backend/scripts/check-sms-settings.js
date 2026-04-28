/**
 * Check SMS Settings
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sequelize = require('../src/config/database');
const { OrganizationSettings, Organization } = require('../src/models');
const settingsService = require('../src/services/settingsService');

async function checkSettings() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const org = await Organization.findOne({
      where: { slug: 'default-org' },
    });

    if (!org) {
      console.error('❌ Organization not found');
      process.exit(1);
    }

    const settings = await settingsService.getOrganizationSettings(org.id);
    
    console.log('📊 Current SMS Settings:');
    console.log(`   Provider: ${settings.smsProvider || 'Not set'}`);
    console.log(`   Sender ID: ${settings.smsSenderId || 'Not set'}`);
    console.log(`   Account SID: ${settings.twilioAccountSid || '❌ Not set'}`);
    console.log(`   Auth Token: ${settings.smsApiKeyEncrypted ? '✅ Set (encrypted)' : '❌ Not set'}`);
    console.log('\n   Custom Settings:', JSON.stringify(settings.customSettings || {}, null, 2));

    const rawSettings = await OrganizationSettings.findOne({
      where: { organizationId: org.id },
    });
    
    if (rawSettings) {
      console.log('\n📋 Raw Database Values:');
      console.log(`   customSettings: ${JSON.stringify(rawSettings.customSettings || {}, null, 2)}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

checkSettings();

