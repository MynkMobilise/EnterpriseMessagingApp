/**
 * Test script to verify custom SMS provider settings API integration
 * Run: node backend/scripts/test-custom-sms-settings.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003/api/v1';
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'Admin123!@#';

async function testCustomSmsSettings() {
  try {
    console.log('🧪 Testing Custom SMS Provider Settings API Integration\n');

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
    const organizationId = loginResponse.data.data.user.organizationId;
    console.log('✅ Login successful\n');

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Step 2: Get current settings
    console.log('2. Getting current organization settings...');
    const getSettingsResponse = await axios.get(`${BASE_URL}/settings/organization`, { headers });
    console.log('Current settings:', JSON.stringify(getSettingsResponse.data.data, null, 2));
    console.log('✅ Settings retrieved\n');

    // Step 3: Save custom SMS provider settings
    console.log('3. Saving custom SMS provider settings...');
    const customSmsSettings = {
      smsProvider: 'other',
      smsSenderId: 'TEST',
      customSettings: {
        customApiUrl: 'http://smsbhejo.org/submitsms.jsp',
        customApiUser: 'testuser',
        customEntityId: 'TEST123',
        customAccUsage: '1',
      },
      customApiKey: 'test-api-key-12345', // This should be encrypted and stored in customSettings
    };

    const saveResponse = await axios.put(
      `${BASE_URL}/settings/organization`,
      customSmsSettings,
      { headers }
    );

    if (!saveResponse.data.success) {
      throw new Error(`Save failed: ${saveResponse.data.error?.message || 'Unknown error'}`);
    }

    console.log('✅ Custom SMS provider settings saved\n');

    // Step 4: Verify settings were saved correctly
    console.log('4. Verifying saved settings...');
    const verifyResponse = await axios.get(`${BASE_URL}/settings/organization`, { headers });
    const savedSettings = verifyResponse.data.data;

    console.log('Saved settings:', JSON.stringify(savedSettings, null, 2));

    // Verify custom provider fields
    const customSettings = savedSettings.customSettings || {};
    const checks = [
      { field: 'smsProvider', expected: 'other', actual: savedSettings.smsProvider },
      { field: 'smsSenderId', expected: 'TEST', actual: savedSettings.smsSenderId },
      { field: 'customApiUrl', expected: 'http://smsbhejo.org/submitsms.jsp', actual: savedSettings.customApiUrl || customSettings.customApiUrl },
      { field: 'customApiUser', expected: 'testuser', actual: savedSettings.customApiUser || customSettings.customApiUser },
      { field: 'customEntityId', expected: 'TEST123', actual: savedSettings.customEntityId || customSettings.customEntityId },
      { field: 'customAccUsage', expected: '1', actual: savedSettings.customAccUsage || customSettings.customAccUsage },
      { field: 'customApiKey (encrypted)', expected: 'encrypted', actual: customSettings.customApiKey ? 'encrypted' : 'missing' },
    ];

    console.log('\n📋 Verification Results:');
    let allPassed = true;
    checks.forEach(({ field, expected, actual }) => {
      const passed = actual === expected || (field.includes('encrypted') && actual === 'encrypted');
      const status = passed ? '✅' : '❌';
      console.log(`${status} ${field}: ${actual} ${passed ? '' : `(expected: ${expected})`}`);
      if (!passed) allPassed = false;
    });

    if (allPassed) {
      console.log('\n✅ All tests passed! Custom SMS provider settings API is working correctly.');
    } else {
      console.log('\n❌ Some tests failed. Please check the implementation.');
    }

    // Step 5: Test loading settings (simulating frontend behavior)
    console.log('\n5. Testing settings loading (frontend simulation)...');
    const loadResponse = await axios.get(`${BASE_URL}/settings/organization`, { headers });
    const loadedSettings = loadResponse.data.data;
    const loadedCustomSettings = loadedSettings.customSettings || {};

    console.log('Loaded smsProvider:', loadedSettings.smsProvider);
    console.log('Loaded customApiUrl:', loadedSettings.customApiUrl || loadedCustomSettings.customApiUrl);
    console.log('Loaded customApiUser:', loadedSettings.customApiUser || loadedCustomSettings.customApiUser);
    console.log('Loaded customEntityId:', loadedSettings.customEntityId || loadedCustomSettings.customEntityId);
    console.log('✅ Settings loading test completed\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the test
testCustomSmsSettings();

