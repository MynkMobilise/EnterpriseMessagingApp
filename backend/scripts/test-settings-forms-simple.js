/**
 * Simplified Settings Forms Test
 * Run this after manually resetting rate limits
 * Usage: curl -X POST http://localhost:3003/api/v1/auth/reset-rate-limits && sleep 2 && node backend/scripts/test-settings-forms-simple.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003/api/v1';
let authToken = '';

async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'Admin123!@#',
      organizationSlug: 'default-org',
    });

    if (response.data.success && response.data.data) {
      authToken = response.data.data.tokens?.accessToken || response.data.data.token || response.data.data.accessToken;
      if (!authToken) {
        console.log('✗ No token in response:', JSON.stringify(response.data, null, 2));
        return false;
      }
      console.log('✓ Login successful');
      return true;
    }
    console.log('✗ Login failed:', response.data);
    return false;
    return false;
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('✗ Rate limited. Please reset rate limits first:');
      console.log('  curl -X POST http://localhost:3003/api/v1/auth/reset-rate-limits');
    } else {
      console.log(`✗ Login error: ${error.response?.data?.error?.message || error.message}`);
    }
    return false;
  }
}

async function testSettings() {
  console.log('\n=== Testing Settings Forms ===\n');

  if (!await login()) {
    process.exit(1);
  }

  const headers = { Authorization: `Bearer ${authToken}` };

  // Test 1: WhatsApp Settings
  console.log('1. Testing WhatsApp Settings...');
  try {
    await axios.put(`${BASE_URL}/settings/organization`, {
      whatsappBusinessAccountId: 'TEST_BA_123',
      whatsappPhoneNumberId: 'TEST_PN_456',
      whatsappApiVersion: 'v18.0',
    }, { headers });
    console.log('   ✓ WhatsApp settings saved');
  } catch (e) {
    console.log(`   ✗ Error: ${e.response?.data?.error?.message || e.message}`);
  }

  // Test 2: SMS Settings
  console.log('2. Testing SMS Settings...');
  try {
    await axios.put(`${BASE_URL}/settings/organization`, {
      smsProvider: 'other',
      smsSenderId: 'TEST_SENDER',
      customSettings: {
        customApiUrl: 'http://test.example.com',
        customApiUser: 'testuser',
        customEntityId: 'TEST_123',
      },
      customApiKey: 'TEST_KEY',
    }, { headers });
    console.log('   ✓ SMS settings saved');
  } catch (e) {
    console.log(`   ✗ Error: ${e.response?.data?.error?.message || e.message}`);
  }

  // Test 3: Email Configuration
  console.log('3. Testing Email Configuration...');
  try {
    const createRes = await axios.post(`${BASE_URL}/email-configurations`, {
      name: 'Test Config',
      provider: 'smtp',
      emailFromAddress: 'test@example.com',
      smtpHost: 'smtp.test.com',
      smtpPort: 587,
    }, { headers });
    console.log(`   ✓ Email config created: ${createRes.data.data.id}`);
    
    // Delete it
    await axios.delete(`${BASE_URL}/email-configurations/${createRes.data.data.id}`, { headers });
    console.log('   ✓ Email config deleted');
  } catch (e) {
    console.log(`   ✗ Error: ${e.response?.data?.error?.message || e.message}`);
  }

  // Test 4: FCM Settings
  console.log('4. Testing FCM Settings...');
  try {
    await axios.put(`${BASE_URL}/settings/organization`, {
      fcmProjectId: 'TEST_PROJECT',
      fcmServerKeyEncrypted: 'TEST_KEY',
    }, { headers });
    console.log('   ✓ FCM settings saved');
  } catch (e) {
    console.log(`   ✗ Error: ${e.response?.data?.error?.message || e.message}`);
  }

  // Test 5: Security Settings
  console.log('5. Testing Security Settings...');
  try {
    await axios.put(`${BASE_URL}/settings/organization`, {
      twoFactorRequired: true,
      ipWhitelist: ['192.168.1.1'],
      passwordExpiryDays: 60,
      sessionTimeoutMinutes: 120,
    }, { headers });
    console.log('   ✓ Security settings saved');
  } catch (e) {
    console.log(`   ✗ Error: ${e.response?.data?.error?.message || e.message}`);
  }

  // Test 6: Notification Settings
  console.log('6. Testing Notification Settings...');
  try {
    await axios.put(`${BASE_URL}/settings/organization`, {
      emailNotifications: true,
      quotaWarnings: true,
      failedMessageThreshold: '15% failure rate',
      apiErrorThreshold: 'After 50 errors',
    }, { headers });
    console.log('   ✓ Notification settings saved');
  } catch (e) {
    console.log(`   ✗ Error: ${e.response?.data?.error?.message || e.message}`);
  }

  console.log('\n=== Test Complete ===\n');
}

testSettings().catch(console.error);

