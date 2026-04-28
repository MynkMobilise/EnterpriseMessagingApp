/**
 * Test script to identify and fix Custom SMS Provider Configuration issues
 * Run: node backend/scripts/test-custom-sms-fix.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003/api/v1';
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'Admin123!@#';

let token = '';
let organizationId = '';

async function login() {
  console.log('🔐 Logging in...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      organizationSlug: 'default-org',
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (!response.data.success) {
      throw new Error('Login failed: ' + JSON.stringify(response.data));
    }

    token = response.data.data.token;
    organizationId = response.data.data.user.organizationId;
    console.log('✅ Login successful\n');
    return { token, organizationId };
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

function getHeaders() {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function testSaveAndLoad() {
  console.log('🧪 Testing SAVE and LOAD operations\n');
  
  // Step 1: Get initial settings
  console.log('1️⃣ Getting initial settings...');
  let initialResponse;
  try {
    initialResponse = await axios.get(`${BASE_URL}/settings/organization`, { headers: getHeaders() });
    console.log('✅ Initial settings retrieved');
    console.log('   smsProvider:', initialResponse.data.data.smsProvider);
    console.log('   customSettings keys:', Object.keys(initialResponse.data.data.customSettings || {}));
  } catch (error) {
    console.error('❌ Failed to get initial settings:', error.message);
    throw error;
  }

  // Step 2: Save custom SMS provider configuration
  console.log('\n2️⃣ Saving custom SMS provider configuration...');
  const saveData = {
    smsProvider: 'other',
    smsSenderId: 'TEST123',
    customSettings: {
      customApiUrl: 'http://smsbhejo.org/submitsms.jsp',
      customApiUser: 'testuser123',
      customEntityId: 'TESTENTITY123',
      customAccUsage: '1',
    },
    customApiKey: 'test-api-key-12345',
  };

  console.log('📤 Sending:', JSON.stringify(saveData, null, 2));
  
  let saveResponse;
  try {
    saveResponse = await axios.put(
      `${BASE_URL}/settings/organization`,
      saveData,
      { headers: getHeaders() }
    );
    
    if (!saveResponse.data.success) {
      throw new Error('Save failed: ' + JSON.stringify(saveResponse.data));
    }
    
    console.log('✅ Save successful');
    console.log('📥 Response data:', JSON.stringify(saveResponse.data.data, null, 2));
  } catch (error) {
    console.error('❌ Save failed:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }

  // Step 3: Wait a moment for database to update
  console.log('\n⏳ Waiting 1 second for database update...');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 4: Load settings and verify
  console.log('\n3️⃣ Loading settings to verify save...');
  let loadResponse;
  try {
    loadResponse = await axios.get(`${BASE_URL}/settings/organization`, { headers: getHeaders() });
    
    if (!loadResponse.data.success) {
      throw new Error('Load failed: ' + JSON.stringify(loadResponse.data));
    }
    
    console.log('✅ Load successful');
    const settings = loadResponse.data.data;
    
    console.log('\n📋 Loaded Settings:');
    console.log('   smsProvider:', settings.smsProvider);
    console.log('   smsSenderId:', settings.smsSenderId);
    console.log('   customApiUrl (top-level):', settings.customApiUrl);
    console.log('   customApiUser (top-level):', settings.customApiUser);
    console.log('   customEntityId (top-level):', settings.customEntityId);
    console.log('   customAccUsage (top-level):', settings.customAccUsage);
    
    console.log('\n📋 customSettings object:');
    console.log(JSON.stringify(settings.customSettings, null, 2));
    
    // Verify all fields
    console.log('\n✅ Verification:');
    const checks = [
      { name: 'smsProvider', value: settings.smsProvider, expected: 'other' },
      { name: 'smsSenderId', value: settings.smsSenderId, expected: 'TEST123' },
      { name: 'customApiUrl (top-level)', value: settings.customApiUrl, expected: 'http://smsbhejo.org/submitsms.jsp' },
      { name: 'customApiUser (top-level)', value: settings.customApiUser, expected: 'testuser123' },
      { name: 'customEntityId (top-level)', value: settings.customEntityId, expected: 'TESTENTITY123' },
      { name: 'customAccUsage (top-level)', value: settings.customAccUsage, expected: '1' },
      { name: 'customApiUrl (in customSettings)', value: settings.customSettings?.customApiUrl, expected: 'http://smsbhejo.org/submitsms.jsp' },
      { name: 'customApiUser (in customSettings)', value: settings.customSettings?.customApiUser, expected: 'testuser123' },
      { name: 'customEntityId (in customSettings)', value: settings.customSettings?.customEntityId, expected: 'TESTENTITY123' },
      { name: 'customAccUsage (in customSettings)', value: settings.customSettings?.customAccUsage, expected: '1' },
      { name: 'customApiKey (encrypted)', value: settings.customSettings?.customApiKey ? '***encrypted***' : null, expected: '***encrypted***' },
    ];

    let allPassed = true;
    checks.forEach(({ name, value, expected }) => {
      const passed = value === expected || (name.includes('encrypted') && value !== null);
      const status = passed ? '✅' : '❌';
      console.log(`   ${status} ${name}: ${value || 'NOT FOUND'} ${passed ? '' : `(expected: ${expected})`}`);
      if (!passed) allPassed = false;
    });

    if (!allPassed) {
      console.log('\n❌ VERIFICATION FAILED - Some fields are missing or incorrect');
      console.log('\n🔍 Debugging Info:');
      console.log('   Full settings object:', JSON.stringify(settings, null, 2));
      return false;
    } else {
      console.log('\n✅ ALL VERIFICATIONS PASSED!');
      return true;
    }
  } catch (error) {
    console.error('❌ Load failed:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

async function runTest() {
  try {
    console.log('🚀 Starting Custom SMS Provider Configuration Test\n');
    console.log('='.repeat(60));
    
    await login();
    const result = await testSaveAndLoad();
    
    console.log('\n' + '='.repeat(60));
    if (result) {
      console.log('✅ TEST PASSED - Custom SMS Provider Configuration is working correctly!');
      process.exit(0);
    } else {
      console.log('❌ TEST FAILED - Issues found. Check the output above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    process.exit(1);
  }
}

runTest();

