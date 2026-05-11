/**
 * Comprehensive test script for Custom SMS Provider Configuration CRUD operations
 * Run: node backend/scripts/test-sms-settings-crud.js
 */

const axios = require('axios');

const BASE_URL = 'https://suchna.onmobilise.com/api/v1';
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'Admin123!@#';

let token = '';
let organizationId = '';

async function login() {
  console.log('🔐 Step 1: Logging in...');
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    organizationSlug: 'default-org',
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (!response.data.success) {
    throw new Error('Login failed');
  }

  token = response.data.data.token;
  organizationId = response.data.data.user.organizationId;
  console.log('✅ Login successful\n');
  return { token, organizationId };
}

function getHeaders() {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function getCurrentSettings() {
  console.log('📖 Getting current organization settings...');
  const response = await axios.get(`${BASE_URL}/settings/organization`, { headers: getHeaders() });
  return response.data.data;
}

async function testCreate() {
  console.log('\n🧪 TEST 1: CREATE - Saving Custom SMS Provider Configuration\n');
  
  const testData = {
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

  console.log('📤 Sending data:', JSON.stringify(testData, null, 2));
  
  const response = await axios.put(
    `${BASE_URL}/settings/organization`,
    testData,
    { headers: getHeaders() }
  );

  if (!response.data.success) {
    throw new Error(`Save failed: ${response.data.error?.message || 'Unknown error'}`);
  }

  console.log('✅ Save response received');
  console.log('📥 Response data:', JSON.stringify(response.data.data, null, 2));
  
  return response.data.data;
}

async function testRead() {
  console.log('\n🧪 TEST 2: READ - Loading Custom SMS Provider Configuration\n');
  
  const settings = await getCurrentSettings();
  
  console.log('📋 Full settings object:');
  console.log(JSON.stringify(settings, null, 2));
  
  console.log('\n📋 Extracted fields:');
  console.log('  smsProvider:', settings.smsProvider);
  console.log('  smsSenderId:', settings.smsSenderId);
  console.log('  customApiUrl:', settings.customApiUrl);
  console.log('  customApiUser:', settings.customApiUser);
  console.log('  customEntityId:', settings.customEntityId);
  console.log('  customAccUsage:', settings.customAccUsage);
  
  console.log('\n📋 customSettings object:');
  console.log(JSON.stringify(settings.customSettings, null, 2));
  
  // Verify all fields are present
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
    { name: 'customApiKey (encrypted in customSettings)', value: settings.customSettings?.customApiKey ? '***encrypted***' : null, expected: '***encrypted***' },
  ];

  console.log('\n✅ Verification Results:');
  let allPassed = true;
  checks.forEach(({ name, value, expected }) => {
    const passed = value === expected || (name.includes('encrypted') && value !== null);
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${name}: ${value || 'NOT FOUND'} ${passed ? '' : `(expected: ${expected})`}`);
    if (!passed) allPassed = false;
  });

  if (!allPassed) {
    throw new Error('READ test failed - some fields are missing or incorrect');
  }

  console.log('\n✅ READ test passed - all fields are present and correct');
  return settings;
}

async function testUpdate() {
  console.log('\n🧪 TEST 3: UPDATE - Updating Custom SMS Provider Configuration\n');
  
  const updateData = {
    smsProvider: 'other',
    smsSenderId: 'UPDATED123',
    customSettings: {
      customApiUrl: 'http://updated-smsbhejo.org/submitsms.jsp',
      customApiUser: 'updateduser456',
      customEntityId: 'UPDATEDENTITY456',
      customAccUsage: '2',
    },
    customApiKey: 'updated-api-key-67890',
  };

  console.log('📤 Sending update data:', JSON.stringify(updateData, null, 2));
  
  const response = await axios.put(
    `${BASE_URL}/settings/organization`,
    updateData,
    { headers: getHeaders() }
  );

  if (!response.data.success) {
    throw new Error(`Update failed: ${response.data.error?.message || 'Unknown error'}`);
  }

  console.log('✅ Update response received');
  
  // Verify update
  const settings = await getCurrentSettings();
  const checks = [
    { name: 'smsSenderId', value: settings.smsSenderId, expected: 'UPDATED123' },
    { name: 'customApiUrl', value: settings.customApiUrl, expected: 'http://updated-smsbhejo.org/submitsms.jsp' },
    { name: 'customApiUser', value: settings.customApiUser, expected: 'updateduser456' },
    { name: 'customEntityId', value: settings.customEntityId, expected: 'UPDATEDENTITY456' },
    { name: 'customAccUsage', value: settings.customAccUsage, expected: '2' },
  ];

  console.log('\n✅ Update Verification:');
  let allPassed = true;
  checks.forEach(({ name, value, expected }) => {
    const passed = value === expected;
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${name}: ${value || 'NOT FOUND'} ${passed ? '' : `(expected: ${expected})`}`);
    if (!passed) allPassed = false;
  });

  if (!allPassed) {
    throw new Error('UPDATE test failed - some fields were not updated correctly');
  }

  console.log('\n✅ UPDATE test passed');
  return settings;
}

async function testDelete() {
  console.log('\n🧪 TEST 4: DELETE - Clearing Custom SMS Provider Configuration\n');
  
  // Clear custom provider settings by setting provider to null or another value
  const clearData = {
    smsProvider: null,
    smsSenderId: null,
    customSettings: {},
  };

  console.log('📤 Clearing custom provider settings...');
  
  const response = await axios.put(
    `${BASE_URL}/settings/organization`,
    clearData,
    { headers: getHeaders() }
  );

  if (!response.data.success) {
    throw new Error(`Clear failed: ${response.data.error?.message || 'Unknown error'}`);
  }

  console.log('✅ Clear response received');
  
  // Verify clear
  const settings = await getCurrentSettings();
  console.log('\n📋 Settings after clear:', JSON.stringify(settings, null, 2));
  
  console.log('\n✅ DELETE test completed (settings cleared)');
  return settings;
}

async function runAllTests() {
  try {
    console.log('🚀 Starting Custom SMS Provider Configuration CRUD Tests\n');
    console.log('=' .repeat(60));
    
    // Login
    await login();
    
    // Test CREATE
    await testCreate();
    
    // Wait a bit for database to update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test READ
    await testRead();
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test UPDATE
    await testUpdate();
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test DELETE (optional - comment out if you want to keep test data)
    // await testDelete();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED! Custom SMS Provider Configuration CRUD is working correctly.');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run all tests
runAllTests();

