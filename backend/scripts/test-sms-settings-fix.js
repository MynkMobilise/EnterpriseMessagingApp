/**
 * Test script to verify SMS Settings encryption and save functionality
 */

const axios = require('axios');
const BASE_URL = 'http://localhost:3003/api/v1';

async function testSmsSettings() {
  console.log('=== Testing SMS Settings Fix ===\n');

  try {
    // Step 1: Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'Admin123!@#',
      organizationSlug: 'default-org',
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const token = loginResponse.data.data.tokens.accessToken;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    console.log('✓ Login successful\n');

    // Step 2: Load current settings
    console.log('2. Loading current settings...');
    const getResponse = await axios.get(`${BASE_URL}/settings/organization`, { headers });
    console.log('Current settings:', JSON.stringify(getResponse.data.data, null, 2));
    console.log('✓ Settings loaded\n');

    // Step 3: Save SMS settings with custom provider
    console.log('3. Saving SMS settings with custom provider...');
    const smsSettings = {
      smsProvider: 'other',
      smsSenderId: 'TEST123',
      customApiKey: 'test-api-key-12345',
      customSettings: {
        customApiUrl: 'http://test.example.com/api',
        customApiUser: 'testuser',
        customEntityId: 'TEST123',
        customAccUsage: '1',
      },
    };

    const saveResponse = await axios.put(
      `${BASE_URL}/settings/organization`,
      smsSettings,
      { headers }
    );

    if (!saveResponse.data.success) {
      throw new Error(`Save failed: ${saveResponse.data.error?.message || 'Unknown error'}`);
    }

    console.log('✓ SMS settings saved successfully\n');

    // Step 4: Verify settings were saved
    console.log('4. Verifying saved settings...');
    const verifyResponse = await axios.get(`${BASE_URL}/settings/organization`, { headers });
    const savedSettings = verifyResponse.data.data;
    const customSettings = savedSettings.customSettings || {};

    console.log('Saved customSettings:', JSON.stringify(customSettings, null, 2));

    // Check if customApiKey is encrypted (should contain ':')
    if (customSettings.customApiKey) {
      const isEncrypted = customSettings.customApiKey.includes(':');
      console.log(`\nCustom API Key encrypted: ${isEncrypted ? 'YES ✓' : 'NO ✗'}`);
      
      if (!isEncrypted) {
        throw new Error('Custom API Key was not encrypted!');
      }
    } else {
      console.log('\n⚠ Custom API Key not found in saved settings');
    }

    // Check other fields
    const checks = [
      { field: 'customApiUrl', expected: 'http://test.example.com/api' },
      { field: 'customApiUser', expected: 'testuser' },
      { field: 'customEntityId', expected: 'TEST123' },
      { field: 'customAccUsage', expected: '1' },
    ];

    console.log('\nField verification:');
    let allPassed = true;
    for (const check of checks) {
      const actual = customSettings[check.field];
      const passed = actual === check.expected;
      console.log(`  ${check.field}: ${passed ? '✓' : '✗'} (expected: ${check.expected}, got: ${actual})`);
      if (!passed) allPassed = false;
    }

    // Step 5: Test updating without API key (should preserve existing)
    console.log('\n5. Testing update without API key (should preserve existing)...');
    const updateWithoutKey = {
      smsProvider: 'other',
      smsSenderId: 'UPDATED123',
      customSettings: {
        customApiUrl: 'http://updated.example.com/api',
        customApiUser: 'updateduser',
        customEntityId: 'UPDATED123',
        customAccUsage: '2',
      },
      // Note: customApiKey is NOT included
    };

    const updateResponse = await axios.put(
      `${BASE_URL}/settings/organization`,
      updateWithoutKey,
      { headers }
    );

    if (!updateResponse.data.success) {
      throw new Error(`Update failed: ${updateResponse.data.error?.message || 'Unknown error'}`);
    }

    console.log('✓ Update successful\n');

    // Step 6: Verify API key was preserved
    console.log('6. Verifying API key was preserved...');
    const finalResponse = await axios.get(`${BASE_URL}/settings/organization`, { headers });
    const finalSettings = finalResponse.data.data;
    const finalCustomSettings = finalSettings.customSettings || {};

    if (finalCustomSettings.customApiKey) {
      const isStillEncrypted = finalCustomSettings.customApiKey.includes(':');
      console.log(`Custom API Key still encrypted: ${isStillEncrypted ? 'YES ✓' : 'NO ✗'}`);
      
      if (!isStillEncrypted) {
        throw new Error('Custom API Key was lost or not preserved!');
      }
    } else {
      throw new Error('Custom API Key was lost during update!');
    }

    // Verify other fields were updated
    console.log('\nUpdated fields verification:');
    const updateChecks = [
      { field: 'customApiUrl', expected: 'http://updated.example.com/api' },
      { field: 'customApiUser', expected: 'updateduser' },
      { field: 'customEntityId', expected: 'UPDATED123' },
      { field: 'customAccUsage', expected: '2' },
    ];

    let updateAllPassed = true;
    for (const check of updateChecks) {
      const actual = finalCustomSettings[check.field];
      const passed = actual === check.expected;
      console.log(`  ${check.field}: ${passed ? '✓' : '✗'} (expected: ${check.expected}, got: ${actual})`);
      if (!passed) updateAllPassed = false;
    }

    console.log('\n=== Test Results ===');
    if (allPassed && updateAllPassed) {
      console.log('✓ ALL TESTS PASSED');
      console.log('\nSMS Settings encryption and save functionality is working correctly!');
    } else {
      console.log('✗ SOME TESTS FAILED');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ TEST FAILED:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the test
testSmsSettings();

