/**
 * Test script to send SMS via Twilio
 * Usage: node backend/scripts/test-twilio-sms.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sequelize = require('../src/config/database');
const { Message, OrganizationSettings, Organization, Template, User } = require('../src/models');
const smsService = require('../src/services/smsService');
const settingsService = require('../src/services/settingsService');
const { decrypt } = require('../src/utils/encryption');

async function testTwilioSMS() {
  try {
    console.log('🔍 Testing Twilio SMS Integration...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get default organization
    let org = await Organization.findOne({
      where: { slug: 'default-org' },
    });

    if (!org) {
      // Try to get first organization
      org = await Organization.findOne();
      if (!org) {
        console.error('❌ No organization found');
        process.exit(1);
      }
    }

    console.log(`📋 Organization: ${org.name} (${org.id})\n`);

    // Get organization settings
    const settings = await settingsService.getOrganizationSettings(org.id);
    
    console.log('📊 SMS Settings:');
    console.log(`   Provider: ${settings.smsProvider || 'Not set'}`);
    console.log(`   Sender ID: ${settings.smsSenderId || 'Not set'}`);
    console.log(`   Account SID: ${settings.twilioAccountSid ? '✅ Set' : '❌ Not set'}`);
    console.log(`   Auth Token: ${settings.smsApiKeyEncrypted ? '✅ Set (encrypted)' : '❌ Not set'}\n`);

    if (settings.smsProvider !== 'twilio') {
      console.error('❌ SMS provider is not set to Twilio');
      console.log('   Please configure Twilio in Settings > SMS API\n');
      process.exit(1);
    }

    if (!settings.twilioAccountSid || !settings.smsApiKeyEncrypted) {
      console.error('❌ Twilio credentials not configured');
      console.log('   Please configure Account SID and Auth Token in Settings > SMS API\n');
      process.exit(1);
    }

    // Get auth token (handle both encrypted and plain text)
    let authToken;
    if (settings.smsApiKeyEncrypted) {
      try {
        // Check if it's encrypted (contains ':')
        if (settings.smsApiKeyEncrypted.includes(':')) {
          authToken = decrypt(settings.smsApiKeyEncrypted);
          console.log('✅ Auth token decrypted successfully\n');
        } else {
          // Plain text (encryption not available)
          authToken = settings.smsApiKeyEncrypted;
          console.log('⚠️  Using plain text auth token (encryption not configured)\n');
        }
      } catch (error) {
        // If decryption fails, use as plain text
        console.log('⚠️  Decryption failed, using as plain text:', error.message);
        authToken = settings.smsApiKeyEncrypted;
      }
    }

    // Get a user for sentBy
    const user = await User.findOne({
      where: { organizationId: org.id },
    });
    
    if (!user) {
      console.error('❌ No user found in organization');
      process.exit(1);
    }

    // Create a test message
    const testPhone = process.env.TEST_PHONE || '+919599194330';
    const testContent = 'Test SMS from Enterprise Messaging App - Twilio Integration Test';

    console.log('📤 Creating test message...');
    const testMessage = await Message.create({
      organizationId: org.id,
      sentBy: user.id,
      channel: 'sms',
      messageType: 'text',
      content: testContent,
      recipientPhone: testPhone,
      recipientName: 'Test User',
      priority: 'normal',
      category: 'transactional',
      requiresApproval: false,
      approvalStatus: 'approved',
      deliveryStatus: 'queued',
    });

    console.log(`✅ Test message created: ${testMessage.id}\n`);

    // Update message to include template relation if needed
    await testMessage.reload({
      include: ['contact', 'template'],
    });

    console.log('📨 Sending SMS via Twilio...');
    console.log(`   To: ${testPhone}`);
    console.log(`   Content: ${testContent}\n`);

    // Send SMS
    const result = await smsService.sendMessage(testMessage);

    console.log('✅ SMS sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Provider Response:`, JSON.stringify(result.providerResponse, null, 2));

    // Update message status
    await testMessage.update({
      deliveryStatus: 'sent',
      sentAt: new Date(),
      externalMessageId: result.messageId,
    });

    console.log('\n✅ Message status updated to "sent"');
    console.log('\n🎉 Test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   API Response:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run test
testTwilioSMS();

