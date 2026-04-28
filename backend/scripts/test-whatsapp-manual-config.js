/**
 * Test script for WhatsApp Manual Configuration
 * Tests the enhanced manual configuration functionality
 */

require('dotenv').config({ path: '.env' });
const { sequelize } = require('../src/config/database');
const SettingsService = require('../src/services/settingsService');
const WhatsAppService = require('../src/services/whatsappService');

async function testManualConfiguration() {
  try {
    console.log('🧪 Testing WhatsApp Manual Configuration...\n');

    // Test 1: Check if new fields exist in model
    console.log('Test 1: Checking database schema...');
    const queryInterface = sequelize.getQueryInterface();
    const tableDescription = await queryInterface.describeTable('organization_settings');
    
    const requiredFields = [
      'whatsapp_app_id',
      'whatsapp_app_secret',
      'whatsapp_webhook_url',
    ];

    const missingFields = [];
    for (const field of requiredFields) {
      if (!tableDescription[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      console.log('❌ Missing fields:', missingFields);
      console.log('⚠️  Run migration: node scripts/migrate-add-whatsapp-manual-fields.js');
      return;
    } else {
      console.log('✅ All required fields exist in database');
    }

    // Test 2: Test settings service encryption
    console.log('\nTest 2: Testing encryption of sensitive fields...');
    const testOrgId = '00000000-0000-0000-0000-000000000001';
    
    const testData = {
      whatsappBusinessAccountId: '123456789012345',
      whatsappPhoneNumberId: '987654321098765',
      whatsappAccessToken: 'test_access_token_12345',
      whatsappAppId: '123456789012345',
      whatsappAppSecret: 'test_app_secret_12345678901234567890',
      whatsappWebhookVerifyToken: 'test_verify_token',
      wabaLinkedVia: 'manual',
    };

    try {
      await SettingsService.updateOrganizationSettings(testOrgId, testData);
      console.log('✅ Settings saved successfully');

      const retrieved = await SettingsService.getOrganizationSettings(testOrgId);
      
      // Check if sensitive fields are encrypted (not plain text)
      if (retrieved.whatsappAccessToken && !retrieved.whatsappAccessToken.includes('test_access_token')) {
        console.log('✅ Access Token is encrypted');
      } else {
        console.log('⚠️  Access Token might not be encrypted');
      }

      if (retrieved.whatsappAppSecret && !retrieved.whatsappAppSecret.includes('test_app_secret')) {
        console.log('✅ App Secret is encrypted');
      } else {
        console.log('⚠️  App Secret might not be encrypted');
      }

      console.log('✅ Settings retrieval works');
    } catch (error) {
      console.log('❌ Settings service error:', error.message);
    }

    // Test 3: Test validation
    console.log('\nTest 3: Testing field validation...');
    const invalidData = {
      whatsappBusinessAccountId: '123', // Too short
      whatsappPhoneNumberId: 'abc', // Not numeric
      whatsappAppId: '123', // Too short
    };

    try {
      await SettingsService.updateOrganizationSettings(testOrgId, invalidData);
      console.log('⚠️  Validation might not be working (invalid data accepted)');
    } catch (error) {
      console.log('✅ Validation is working (invalid data rejected)');
    }

    // Test 4: Test WhatsApp service testConnection method
    console.log('\nTest 4: Testing WhatsApp service testConnection method...');
    const testCredentials = {
      whatsappBusinessAccountId: '123456789012345',
      whatsappPhoneNumberId: '987654321098765',
      whatsappAccessToken: 'invalid_token_for_testing',
      whatsappAppId: '123456789012345',
      whatsappAppSecret: 'test_secret',
    };

    try {
      await WhatsAppService.testConnection(testCredentials);
      console.log('⚠️  Test connection should have failed with invalid token');
    } catch (error) {
      if (error.message.includes('Connection test failed') || error.message.includes('verification failed')) {
        console.log('✅ Test connection method works (correctly rejects invalid credentials)');
      } else {
        console.log('⚠️  Test connection error:', error.message);
      }
    }

    console.log('\n✅ All tests completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Run migration if fields are missing');
    console.log('2. Test the frontend form');
    console.log('3. Test message sending with manual credentials');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run tests
testManualConfiguration();

