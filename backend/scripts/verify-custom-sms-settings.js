/**
 * Script to verify custom SMS provider settings are saved correctly
 * Run: node backend/scripts/verify-custom-sms-settings.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003/api/v1';
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'Admin123!@#';

async function verifyCustomSmsSettings() {
  try {
    console.log('🔍 Verifying Custom SMS Provider Settings\n');

    // Step 1: Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      organizationSlug: 'default-org',
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful\n');

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Step 2: Get current settings
    console.log('2. Getting current organization settings...');
    const getSettingsResponse = await axios.get(`${BASE_URL}/settings/organization`, { headers });
    const settings = getSettingsResponse.data.data;
    
    console.log('\n📋 Current Settings:');
    console.log('  smsProvider:', settings.smsProvider);
    console.log('  smsSenderId:', settings.smsSenderId);
    console.log('  customSettings:', JSON.stringify(settings.customSettings, null, 2));
    console.log('\n📋 Extracted Custom Provider Fields:');
    console.log('  customApiUrl:', settings.customApiUrl);
    console.log('  customApiUser:', settings.customApiUser);
    console.log('  customEntityId:', settings.customEntityId);
    console.log('  customAccUsage:', settings.customAccUsage);
    
    const customSettings = settings.customSettings || {};
    
    // Step 3: Verify custom provider settings
    console.log('\n3. Verifying custom SMS provider settings...\n');
    
    if (settings.smsProvider === 'other') {
      console.log('✅ SMS Provider is set to "other"');
      
      const checks = [
        { 
          name: 'API URL', 
          inCustomSettings: customSettings.customApiUrl, 
          extracted: settings.customApiUrl,
          required: true 
        },
        { 
          name: 'API User', 
          inCustomSettings: customSettings.customApiUser, 
          extracted: settings.customApiUser,
          required: true 
        },
        { 
          name: 'API Key (encrypted)', 
          inCustomSettings: customSettings.customApiKey ? '***encrypted***' : null, 
          extracted: 'N/A (encrypted)',
          required: true 
        },
        { 
          name: 'Entity ID', 
          inCustomSettings: customSettings.customEntityId, 
          extracted: settings.customEntityId,
          required: true 
        },
        { 
          name: 'Account Usage', 
          inCustomSettings: customSettings.customAccUsage, 
          extracted: settings.customAccUsage,
          required: false 
        },
      ];

      console.log('📊 Verification Results:');
      let allPassed = true;
      checks.forEach(({ name, inCustomSettings, extracted, required }) => {
        const hasValue = inCustomSettings !== null && inCustomSettings !== undefined && inCustomSettings !== '';
        const status = hasValue ? '✅' : (required ? '❌' : '⚠️');
        console.log(`${status} ${name}:`);
        console.log(`     In customSettings: ${inCustomSettings || 'NOT FOUND'}`);
        console.log(`     Extracted to top-level: ${extracted || 'NOT FOUND'}`);
        if (required && !hasValue) {
          allPassed = false;
        }
        console.log('');
      });

      if (allPassed) {
        console.log('✅ All required custom SMS provider settings are saved correctly!');
      } else {
        console.log('❌ Some required settings are missing. Please check the save functionality.');
      }
    } else {
      console.log(`⚠️  SMS Provider is set to "${settings.smsProvider}", not "other"`);
      console.log('   Custom provider settings will only be used when provider is "other"');
    }

    // Step 4: Check if settings can be used for sending SMS
    console.log('\n4. Checking SMS service compatibility...');
    console.log('   The SMS service uses SMS Configurations (sms_configurations table)');
    console.log('   Legacy settings (organization_settings.customSettings) are used as fallback');
    console.log('   If you want to use custom provider, you should:');
    console.log('   - Either create an SMS Configuration with provider="other"');
    console.log('   - Or ensure legacy settings are properly configured');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the verification
verifyCustomSmsSettings();

