require('dotenv').config();
const sequelize = require('../src/config/database');
const { OrganizationSettings, Organization } = require('../src/models');
const { decrypt } = require('../src/utils/encryption');

async function checkEmailSettings() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Get default organization
    const org = await Organization.findOne({
      where: { slug: 'default-org' },
    });

    if (!org) {
      console.error('❌ Default organization not found');
      process.exit(1);
    }

    console.log(`📋 Organization: ${org.name} (${org.slug})`);
    console.log(`   ID: ${org.id}\n`);

    // Get settings
    const settings = await OrganizationSettings.findOne({
      where: { organizationId: org.id },
    });

    if (!settings) {
      console.log('⚠️  No settings found for this organization');
      console.log('   Settings will be created when you save them for the first time.\n');
      process.exit(0);
    }

    console.log('📧 Email Settings Status:\n');

    // Check email provider
    const emailProvider = settings.emailProvider;
    console.log(`   Provider: ${emailProvider || '❌ Not set'}`);
    
    if (emailProvider) {
      if (emailProvider === 'sendgrid') {
        console.log('   ✅ SendGrid is selected');
      } else {
        console.log(`   ⚠️  Provider is set to: ${emailProvider} (not SendGrid)`);
      }
    }

    // Check from address
    const emailFromAddress = settings.emailFromAddress;
    console.log(`   From Address: ${emailFromAddress || '❌ Not set'}`);

    // Check from name
    const emailFromName = settings.emailFromName;
    console.log(`   From Name: ${emailFromName || '❌ Not set'}`);

    // Check API key
    const emailApiKeyEncrypted = settings.emailApiKeyEncrypted;
    if (emailApiKeyEncrypted) {
      try {
        const decryptedKey = decrypt(emailApiKeyEncrypted);
        // Show first 8 and last 4 characters for security
        const maskedKey = decryptedKey.length > 12 
          ? `${decryptedKey.substring(0, 8)}...${decryptedKey.substring(decryptedKey.length - 4)}`
          : '***';
        console.log(`   API Key: ✅ Saved (${maskedKey})`);
        console.log(`   Key Length: ${decryptedKey.length} characters`);
      } catch (error) {
        console.log(`   API Key: ⚠️  Encrypted but decryption failed: ${error.message}`);
        console.log(`   Raw Value: ${emailApiKeyEncrypted.substring(0, 50)}...`);
      }
    } else {
      console.log('   API Key: ❌ Not set');
    }

    console.log('\n📊 Summary:');
    const allSet = emailProvider && emailFromAddress && emailApiKeyEncrypted;
    if (allSet) {
      console.log('   ✅ All email settings are configured!');
      if (emailProvider === 'sendgrid') {
        console.log('   ✅ SendGrid is properly configured');
      }
    } else {
      console.log('   ⚠️  Some email settings are missing:');
      if (!emailProvider) console.log('      - Email Provider');
      if (!emailFromAddress) console.log('      - From Email Address');
      if (!emailApiKeyEncrypted) console.log('      - API Key');
    }

    console.log('\n📅 Last Updated:', settings.updatedAt || 'Never');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

checkEmailSettings();

