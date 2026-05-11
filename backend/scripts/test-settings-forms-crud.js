/**
 * Test CRUD operations for all refactored settings forms
 * Tests: WhatsApp, SMS, Email, FCM, Security, and Notification settings
 */

const axios = require('axios');

const BASE_URL = 'https://suchna.onmobilise.com/api/v1';
let authToken = '';
let organizationId = '';

// Test credentials
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'Admin123!@#';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function resetRateLimits() {
  try {
    log('→ Resetting rate limits...', 'yellow');
    await axios.post(`${BASE_URL}/auth/reset-rate-limits`);
    log('✓ Rate limits reset', 'green');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
  } catch (error) {
    // Ignore errors - endpoint might not be available
    log('→ Rate limit reset not available, continuing...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds if reset failed
  }
}

async function login() {
  try {
    logSection('STEP 1: Login');
    
    // Reset rate limits right before login
    await resetRateLimits();
    
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      organizationSlug: 'default-org',
    });

    if (response.data.success && response.data.data) {
      authToken = response.data.data.tokens?.accessToken || response.data.data.token || response.data.data.accessToken;
      organizationId = response.data.data.user?.organizationId || response.data.data.organizationId;
      if (!authToken) {
        log(`✗ No token in response`, 'red');
        return false;
      }
      log(`✓ Login successful. Organization ID: ${organizationId}`, 'green');
      return true;
    } else {
      log(`✗ Login failed: ${response.data.error?.message}`, 'red');
      return false;
    }
  } catch (error) {
    if (error.response?.status === 429) {
      log(`✗ Rate limited. Please wait a moment and try again, or manually reset rate limits.`, 'red');
      log(`  You can reset rate limits by calling: POST ${BASE_URL}/auth/reset-rate-limits`, 'yellow');
    } else {
      log(`✗ Login error: ${error.response?.data?.error?.message || error.message}`, 'red');
    }
    return false;
  }
}

async function getSettings() {
  try {
    const response = await axios.get(`${BASE_URL}/settings/organization`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data.success ? response.data.data : null;
  } catch (error) {
    log(`✗ Failed to get settings: ${error.response?.data?.error?.message || error.message}`, 'red');
    return null;
  }
}

async function updateSettings(settingsData) {
  try {
    const response = await axios.put(`${BASE_URL}/settings/organization`, settingsData, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data.success;
  } catch (error) {
    log(`✗ Failed to update settings: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// Test WhatsApp Settings
async function testWhatsAppSettings() {
  logSection('TEST 1: WhatsApp Settings (MetaBusinessAccountForm, WebhookConfigurationForm)');
  
  const testData = {
    whatsappBusinessAccountId: 'TEST_BUSINESS_ACCOUNT_123',
    whatsappPhoneNumberId: 'TEST_PHONE_NUMBER_456',
    whatsappApiVersion: 'v18.0',
    whatsappAccessToken: 'TEST_ACCESS_TOKEN_789',
    whatsappWebhookVerifyToken: 'TEST_VERIFY_TOKEN_ABC',
  };

  log('→ Saving WhatsApp settings...', 'yellow');
  const saveSuccess = await updateSettings(testData);
  
  if (!saveSuccess) {
    log('✗ Failed to save WhatsApp settings', 'red');
    return false;
  }
  log('✓ WhatsApp settings saved', 'green');

  // Wait a bit for DB to update
  await new Promise(resolve => setTimeout(resolve, 500));

  log('→ Loading WhatsApp settings...', 'yellow');
  const loadedSettings = await getSettings();
  
  if (!loadedSettings) {
    log('✗ Failed to load WhatsApp settings', 'red');
    return false;
  }

  // Verify loaded data
  const checks = [
    { field: 'whatsappBusinessAccountId', expected: testData.whatsappBusinessAccountId },
    { field: 'whatsappPhoneNumberId', expected: testData.whatsappPhoneNumberId },
    { field: 'whatsappApiVersion', expected: testData.whatsappApiVersion },
    { field: 'whatsappWebhookVerifyToken', expected: testData.whatsappWebhookVerifyToken },
  ];

  let allPassed = true;
  checks.forEach(({ field, expected }) => {
    if (loadedSettings[field] === expected) {
      log(`  ✓ ${field}: ${expected}`, 'green');
    } else {
      log(`  ✗ ${field}: Expected "${expected}", got "${loadedSettings[field]}"`, 'red');
      allPassed = false;
    }
  });

  // Access token is encrypted, so we just check it exists
  if (loadedSettings.whatsappAccessToken) {
    log('  ✓ whatsappAccessToken: Encrypted and saved', 'green');
  } else {
    log('  ✗ whatsappAccessToken: Not found', 'red');
    allPassed = false;
  }

  return allPassed;
}

// Test SMS Settings
async function testSMSSettings() {
  logSection('TEST 2: SMS Settings (CustomSMSProviderForm, SMSSenderIDForm, SMSSettingsForm)');
  
  const testData = {
    smsProvider: 'other',
    smsSenderId: 'TEST_SENDER_ID',
    customSettings: {
      customApiUrl: 'http://test-sms-api.example.com/submitsms.jsp',
      customApiUser: 'test_api_user',
      customEntityId: 'TEST_ENTITY_123',
      customAccUsage: '1',
    },
    customApiKey: 'TEST_CUSTOM_API_KEY_XYZ',
  };

  log('→ Saving SMS settings...', 'yellow');
  const saveSuccess = await updateSettings(testData);
  
  if (!saveSuccess) {
    log('✗ Failed to save SMS settings', 'red');
    return false;
  }
  log('✓ SMS settings saved', 'green');

  await new Promise(resolve => setTimeout(resolve, 500));

  log('→ Loading SMS settings...', 'yellow');
  const loadedSettings = await getSettings();
  
  if (!loadedSettings) {
    log('✗ Failed to load SMS settings', 'red');
    return false;
  }

  const customSettings = loadedSettings.customSettings || {};
  
  const checks = [
    { field: 'smsProvider', value: loadedSettings.smsProvider, expected: 'other' },
    { field: 'smsSenderId', value: loadedSettings.smsSenderId, expected: testData.smsSenderId },
    { field: 'customApiUrl', value: loadedSettings.customApiUrl || customSettings.customApiUrl, expected: testData.customSettings.customApiUrl },
    { field: 'customApiUser', value: loadedSettings.customApiUser || customSettings.customApiUser, expected: testData.customSettings.customApiUser },
    { field: 'customEntityId', value: loadedSettings.customEntityId || customSettings.customEntityId, expected: testData.customSettings.customEntityId },
    { field: 'customAccUsage', value: loadedSettings.customAccUsage || customSettings.customAccUsage, expected: testData.customSettings.customAccUsage },
  ];

  let allPassed = true;
  checks.forEach(({ field, value, expected }) => {
    if (value === expected) {
      log(`  ✓ ${field}: ${value}`, 'green');
    } else {
      log(`  ✗ ${field}: Expected "${expected}", got "${value}"`, 'red');
      allPassed = false;
    }
  });

  // API key is encrypted, so we just check customApiKey exists in customSettings
  if (customSettings.customApiKey) {
    log('  ✓ customApiKey: Encrypted and saved', 'green');
  } else {
    log('  ✗ customApiKey: Not found in customSettings', 'red');
    allPassed = false;
  }

  return allPassed;
}

// Test Email Settings (Email Configurations)
async function testEmailSettings() {
  logSection('TEST 3: Email Settings (EmailConfigurationForm)');
  
  try {
    // Create email configuration
    log('→ Creating email configuration...', 'yellow');
    const createData = {
      name: 'Test SMTP Configuration',
      provider: 'smtp',
      emailFromAddress: 'test@example.com',
      emailFromName: 'Test Sender',
      smtpHost: 'smtp.test.com',
      smtpPort: 587,
      smtpSecure: true,
      smtpUsername: 'testuser',
      smtpPasswordEncrypted: 'testpassword123',
      isDefault: true,
      status: 'active',
      priority: 1,
      tlsOptions: {
        rejectUnauthorized: true,
      },
    };

    const createResponse = await axios.post(
      `${BASE_URL}/email-configurations`,
      createData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (!createResponse.data.success) {
      log(`✗ Failed to create email configuration: ${createResponse.data.error?.message}`, 'red');
      return false;
    }

    const configId = createResponse.data.data.id;
    log(`✓ Email configuration created with ID: ${configId}`, 'green');

    // Read email configuration
    log('→ Reading email configuration...', 'yellow');
    const readResponse = await axios.get(
      `${BASE_URL}/email-configurations/${configId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (!readResponse.data.success) {
      log(`✗ Failed to read email configuration: ${readResponse.data.error?.message}`, 'red');
      return false;
    }

    const readConfig = readResponse.data.data;
    log(`✓ Email configuration read: ${readConfig.name}`, 'green');

    // Update email configuration
    log('→ Updating email configuration...', 'yellow');
    const updateData = {
      ...createData,
      name: 'Updated Test SMTP Configuration',
      smtpPort: 465,
    };

    const updateResponse = await axios.put(
      `${BASE_URL}/email-configurations/${configId}`,
      updateData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (!updateResponse.data.success) {
      log(`✗ Failed to update email configuration: ${updateResponse.data.error?.message}`, 'red');
      return false;
    }
    log('✓ Email configuration updated', 'green');

    // Verify update
    const verifyResponse = await axios.get(
      `${BASE_URL}/email-configurations/${configId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (verifyResponse.data.data.name === updateData.name && 
        verifyResponse.data.data.smtpPort === updateData.smtpPort) {
      log('✓ Update verified successfully', 'green');
    } else {
      log('✗ Update verification failed', 'red');
      return false;
    }

    // Delete email configuration
    log('→ Deleting email configuration...', 'yellow');
    const deleteResponse = await axios.delete(
      `${BASE_URL}/email-configurations/${configId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (!deleteResponse.data.success) {
      log(`✗ Failed to delete email configuration: ${deleteResponse.data.error?.message}`, 'red');
      return false;
    }
    log('✓ Email configuration deleted', 'green');

    return true;
  } catch (error) {
    log(`✗ Email settings test error: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

// Test FCM Settings
async function testFCMSettings() {
  logSection('TEST 4: FCM Settings (FCMConfigurationForm)');
  
  const testData = {
    fcmProjectId: 'TEST_FCM_PROJECT_123',
    fcmServerKeyEncrypted: 'TEST_FCM_SERVER_KEY_XYZ',
  };

  log('→ Saving FCM settings...', 'yellow');
  const saveSuccess = await updateSettings(testData);
  
  if (!saveSuccess) {
    log('✗ Failed to save FCM settings', 'red');
    return false;
  }
  log('✓ FCM settings saved', 'green');

  await new Promise(resolve => setTimeout(resolve, 500));

  log('→ Loading FCM settings...', 'yellow');
  const loadedSettings = await getSettings();
  
  if (!loadedSettings) {
    log('✗ Failed to load FCM settings', 'red');
    return false;
  }

  const checks = [
    { field: 'fcmProjectId', expected: testData.fcmProjectId },
  ];

  let allPassed = true;
  checks.forEach(({ field, expected }) => {
    if (loadedSettings[field] === expected) {
      log(`  ✓ ${field}: ${expected}`, 'green');
    } else {
      log(`  ✗ ${field}: Expected "${expected}", got "${loadedSettings[field]}"`, 'red');
      allPassed = false;
    }
  });

  // Server key is encrypted, so we just check it exists
  if (loadedSettings.fcmServerKeyEncrypted) {
    log('  ✓ fcmServerKeyEncrypted: Encrypted and saved', 'green');
  } else {
    log('  ✗ fcmServerKeyEncrypted: Not found', 'red');
    allPassed = false;
  }

  return allPassed;
}

// Test Security Settings
async function testSecuritySettings() {
  logSection('TEST 5: Security Settings (TwoFactorAuthForm, IPWhitelistingForm, PasswordSessionForm)');
  
  const testData = {
    twoFactorRequired: true,
    ipWhitelist: ['192.168.1.1', '10.0.0.1'],
    passwordExpiryDays: 60,
    sessionTimeoutMinutes: 120,
  };

  log('→ Saving Security settings...', 'yellow');
  const saveSuccess = await updateSettings(testData);
  
  if (!saveSuccess) {
    log('✗ Failed to save Security settings', 'red');
    return false;
  }
  log('✓ Security settings saved', 'green');

  await new Promise(resolve => setTimeout(resolve, 500));

  log('→ Loading Security settings...', 'yellow');
  const loadedSettings = await getSettings();
  
  if (!loadedSettings) {
    log('✗ Failed to load Security settings', 'red');
    return false;
  }

  const checks = [
    { field: 'twoFactorRequired', value: loadedSettings.twoFactorRequired, expected: testData.twoFactorRequired },
    { field: 'passwordExpiryDays', value: loadedSettings.passwordExpiryDays, expected: testData.passwordExpiryDays },
    { field: 'sessionTimeoutMinutes', value: loadedSettings.sessionTimeoutMinutes, expected: testData.sessionTimeoutMinutes },
  ];

  let allPassed = true;
  checks.forEach(({ field, value, expected }) => {
    if (value === expected) {
      log(`  ✓ ${field}: ${value}`, 'green');
    } else {
      log(`  ✗ ${field}: Expected "${expected}", got "${value}"`, 'red');
      allPassed = false;
    }
  });

  // Check IP whitelist
  const ipWhitelist = loadedSettings.ipWhitelist || [];
  if (Array.isArray(ipWhitelist) && ipWhitelist.length === testData.ipWhitelist.length) {
    const matches = ipWhitelist.every((ip, idx) => ip === testData.ipWhitelist[idx]);
    if (matches) {
      log(`  ✓ ipWhitelist: ${JSON.stringify(ipWhitelist)}`, 'green');
    } else {
      log(`  ✗ ipWhitelist: Expected ${JSON.stringify(testData.ipWhitelist)}, got ${JSON.stringify(ipWhitelist)}`, 'red');
      allPassed = false;
    }
  } else {
    log(`  ✗ ipWhitelist: Expected ${JSON.stringify(testData.ipWhitelist)}, got ${JSON.stringify(ipWhitelist)}`, 'red');
    allPassed = false;
  }

  return allPassed;
}

// Test Notification Settings
async function testNotificationSettings() {
  logSection('TEST 6: Notification Settings (EmailNotificationsForm, AlertThresholdsForm)');
  
  const testData = {
    emailNotifications: true,
    quotaWarnings: true,
    failedMessageThreshold: '15% failure rate',
    apiErrorThreshold: 'After 50 errors',
  };

  log('→ Saving Notification settings...', 'yellow');
  const saveSuccess = await updateSettings(testData);
  
  if (!saveSuccess) {
    log('✗ Failed to save Notification settings', 'red');
    return false;
  }
  log('✓ Notification settings saved', 'green');

  await new Promise(resolve => setTimeout(resolve, 500));

  log('→ Loading Notification settings...', 'yellow');
  const loadedSettings = await getSettings();
  
  if (!loadedSettings) {
    log('✗ Failed to load Notification settings', 'red');
    return false;
  }

  const customSettings = loadedSettings.customSettings || {};

  const checks = [
    { field: 'emailNotifications', value: loadedSettings.emailNotifications, expected: testData.emailNotifications },
    { field: 'quotaWarnings', value: loadedSettings.quotaWarnings || customSettings.quotaWarnings, expected: testData.quotaWarnings },
    { field: 'failedMessageThreshold', value: loadedSettings.failedMessageThreshold || customSettings.failedMessageThreshold, expected: testData.failedMessageThreshold },
    { field: 'apiErrorThreshold', value: loadedSettings.apiErrorThreshold || customSettings.apiErrorThreshold, expected: testData.apiErrorThreshold },
  ];

  let allPassed = true;
  checks.forEach(({ field, value, expected }) => {
    if (value === expected) {
      log(`  ✓ ${field}: ${value}`, 'green');
    } else {
      log(`  ✗ ${field}: Expected "${expected}", got "${value}"`, 'red');
      allPassed = false;
    }
  });

  return allPassed;
}

// Main test runner
async function runTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('SETTINGS FORMS CRUD TEST SUITE', 'blue');
  log('='.repeat(60) + '\n', 'blue');

  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    log('\n✗ Cannot proceed without authentication', 'red');
    process.exit(1);
  }

  const results = {
    whatsapp: false,
    sms: false,
    email: false,
    fcm: false,
    security: false,
    notifications: false,
  };

  // Run all tests
  results.whatsapp = await testWhatsAppSettings();
  results.sms = await testSMSSettings();
  results.email = await testEmailSettings();
  results.fcm = await testFCMSettings();
  results.security = await testSecuritySettings();
  results.notifications = await testNotificationSettings();

  // Summary
  logSection('TEST SUMMARY');
  
  const testNames = {
    whatsapp: 'WhatsApp Settings',
    sms: 'SMS Settings',
    email: 'Email Settings',
    fcm: 'FCM Settings',
    security: 'Security Settings',
    notifications: 'Notification Settings',
  };

  let passedCount = 0;
  let totalCount = Object.keys(results).length;

  Object.entries(results).forEach(([key, passed]) => {
    if (passed) {
      log(`✓ ${testNames[key]}: PASSED`, 'green');
      passedCount++;
    } else {
      log(`✗ ${testNames[key]}: FAILED`, 'red');
    }
  });

  console.log('\n' + '-'.repeat(60));
  log(`Total: ${passedCount}/${totalCount} tests passed`, passedCount === totalCount ? 'green' : 'yellow');
  console.log('-'.repeat(60) + '\n');

  process.exit(passedCount === totalCount ? 0 : 1);
}

// Run tests
runTests().catch((error) => {
  log(`\n✗ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

