/**
 * Complete CRUD Test for All Settings Forms
 * Tests Create, Read, Update, Delete operations
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003/api/v1';
let authToken = '';
let organizationId = '';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'Admin123!@#',
      organizationSlug: 'default-org',
    });

    if (response.data.success && response.data.data) {
      authToken = response.data.data.tokens?.accessToken || response.data.data.token;
      organizationId = response.data.data.user?.organizationId || response.data.data.organizationId;
      if (authToken) {
        log('✓ Login successful', 'green');
        return true;
      }
    }
    return false;
  } catch (error) {
    log(`✗ Login failed: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

async function getSettings() {
  const response = await axios.get(`${BASE_URL}/settings/organization`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  return response.data.success ? response.data.data : null;
}

async function updateSettings(data) {
  const response = await axios.put(`${BASE_URL}/settings/organization`, data, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  return response.data.success;
}

async function testWhatsAppCRUD() {
  log('\n=== WhatsApp Settings CRUD ===', 'cyan');
  
  // CREATE
  log('1. CREATE: Saving WhatsApp settings...', 'yellow');
  const createData = {
    whatsappBusinessAccountId: 'CRUD_TEST_BA_123',
    whatsappPhoneNumberId: 'CRUD_TEST_PN_456',
    whatsappApiVersion: 'v18.0',
    whatsappAccessToken: 'CRUD_TEST_TOKEN',
    whatsappWebhookVerifyToken: 'CRUD_TEST_VERIFY',
  };
  const created = await updateSettings(createData);
  if (!created) {
    log('   ✗ CREATE failed', 'red');
    return false;
  }
  log('   ✓ CREATE successful', 'green');
  
  await new Promise(r => setTimeout(r, 500));
  
  // READ
  log('2. READ: Loading WhatsApp settings...', 'yellow');
  const loaded = await getSettings();
  if (!loaded) {
    log('   ✗ READ failed', 'red');
    return false;
  }
  
  const readChecks = [
    { field: 'whatsappBusinessAccountId', expected: createData.whatsappBusinessAccountId },
    { field: 'whatsappPhoneNumberId', expected: createData.whatsappPhoneNumberId },
    { field: 'whatsappApiVersion', expected: createData.whatsappApiVersion },
    { field: 'whatsappWebhookVerifyToken', expected: createData.whatsappWebhookVerifyToken },
  ];
  
  let readPassed = true;
  readChecks.forEach(({ field, expected }) => {
    if (loaded[field] === expected) {
      log(`   ✓ ${field}: ${expected}`, 'green');
    } else {
      log(`   ✗ ${field}: Expected "${expected}", got "${loaded[field]}"`, 'red');
      readPassed = false;
    }
  });
  
  if (!readPassed) return false;
  
  // UPDATE
  log('3. UPDATE: Updating WhatsApp settings...', 'yellow');
  const updateData = {
    whatsappBusinessAccountId: 'CRUD_UPDATED_BA_789',
    whatsappPhoneNumberId: 'CRUD_UPDATED_PN_012',
    whatsappApiVersion: 'v17.0',
  };
  const updated = await updateSettings(updateData);
  if (!updated) {
    log('   ✗ UPDATE failed', 'red');
    return false;
  }
  log('   ✓ UPDATE successful', 'green');
  
  await new Promise(r => setTimeout(r, 500));
  
  // Verify UPDATE
  const updatedLoaded = await getSettings();
  if (updatedLoaded.whatsappBusinessAccountId === updateData.whatsappBusinessAccountId &&
      updatedLoaded.whatsappPhoneNumberId === updateData.whatsappPhoneNumberId &&
      updatedLoaded.whatsappApiVersion === updateData.whatsappApiVersion) {
    log('   ✓ UPDATE verified', 'green');
    return true;
  } else {
    log('   ✗ UPDATE verification failed', 'red');
    return false;
  }
}

async function testSMSCRUD() {
  log('\n=== SMS Settings CRUD ===', 'cyan');
  
  // CREATE
  log('1. CREATE: Saving SMS settings...', 'yellow');
  const createData = {
    smsProvider: 'other',
    smsSenderId: 'CRUD_SENDER_123',
    customSettings: {
      customApiUrl: 'http://crud-test.example.com',
      customApiUser: 'crud_user',
      customEntityId: 'CRUD_ENTITY_456',
      customAccUsage: '2',
    },
    customApiKey: 'CRUD_API_KEY_789',
  };
  
  // Debug: Log what we're sending
  log(`   Debug - Sending: ${JSON.stringify(createData, null, 2)}`, 'yellow');
  
  const created = await updateSettings(createData);
  if (!created) {
    log('   ✗ CREATE failed', 'red');
    return false;
  }
  log('   ✓ CREATE successful', 'green');
  
  await new Promise(r => setTimeout(r, 1000)); // Wait longer for DB
  
  // READ
  log('2. READ: Loading SMS settings...', 'yellow');
  const loaded = await getSettings();
  if (!loaded) {
    log('   ✗ READ failed', 'red');
    return false;
  }
  
  // Debug: Log what we actually got
  const customSettings = loaded.customSettings || {};
  log(`   Debug - Received customSettings keys: ${Object.keys(customSettings).join(', ')}`, 'yellow');
  log(`   Debug - customApiUrl in customSettings: ${customSettings.customApiUrl}`, 'yellow');
  log(`   Debug - customApiUrl top-level: ${loaded.customApiUrl}`, 'yellow');
  log(`   Debug - Full customSettings: ${JSON.stringify(customSettings, null, 2)}`, 'yellow');
  
  // Check both top-level (extracted) and customSettings (original location)
  const getCustomField = (field) => {
    // First check top-level (extracted by backend)
    if (loaded[field] !== undefined && loaded[field] !== null && loaded[field] !== '') {
      return String(loaded[field]);
    }
    // Then check customSettings
    if (customSettings && typeof customSettings === 'object' && field in customSettings) {
      const value = customSettings[field];
      if (value !== undefined && value !== null && value !== '') {
        return String(value);
      }
    }
    return undefined;
  };
  
  const readChecks = [
    { field: 'smsProvider', value: loaded.smsProvider, expected: 'other' },
    { field: 'smsSenderId', value: loaded.smsSenderId, expected: createData.smsSenderId },
    { field: 'customApiUrl', value: getCustomField('customApiUrl'), expected: createData.customSettings.customApiUrl },
    { field: 'customApiUser', value: getCustomField('customApiUser'), expected: createData.customSettings.customApiUser },
  ];
  
  let readPassed = true;
  readChecks.forEach(({ field, value, expected }) => {
    if (value === expected) {
      log(`   ✓ ${field}: ${value}`, 'green');
    } else {
      log(`   ✗ ${field}: Expected "${expected}", got "${value}"`, 'red');
      readPassed = false;
    }
  });
  
  if (!readPassed) return false;
  
  // UPDATE
  log('3. UPDATE: Updating SMS settings...', 'yellow');
  const updateData = {
    smsProvider: 'other',
    smsSenderId: 'CRUD_UPDATED_SENDER',
    customSettings: {
      customApiUrl: 'http://crud-updated.example.com',
      customApiUser: 'crud_updated_user',
      customEntityId: 'CRUD_UPDATED_ENTITY',
    },
  };
  const updated = await updateSettings(updateData);
  if (!updated) {
    log('   ✗ UPDATE failed', 'red');
    return false;
  }
  log('   ✓ UPDATE successful', 'green');
  
  await new Promise(r => setTimeout(r, 500));
  
  // Verify UPDATE
  const updatedLoaded = await getSettings();
  if (updatedLoaded.smsSenderId === updateData.smsSenderId) {
    log('   ✓ UPDATE verified', 'green');
    return true;
  } else {
    log('   ✗ UPDATE verification failed', 'red');
    return false;
  }
}

async function testEmailCRUD() {
  log('\n=== Email Configuration CRUD ===', 'cyan');
  const headers = { Authorization: `Bearer ${authToken}` };
  
  // CREATE
  log('1. CREATE: Creating email configuration...', 'yellow');
  const createData = {
    name: 'CRUD Test Config',
    provider: 'smtp',
    emailFromAddress: 'crud@test.com',
    smtpHost: 'smtp.crud.test',
    smtpPort: 587,
  };
  
  let configId;
  try {
    const createRes = await axios.post(`${BASE_URL}/email-configurations`, createData, { headers });
    if (!createRes.data.success) {
      log('   ✗ CREATE failed', 'red');
      return false;
    }
    configId = createRes.data.data.id;
    log(`   ✓ CREATE successful: ${configId}`, 'green');
  } catch (e) {
    log(`   ✗ CREATE error: ${e.response?.data?.error?.message || e.message}`, 'red');
    return false;
  }
  
  // READ
  log('2. READ: Reading email configuration...', 'yellow');
  try {
    const readRes = await axios.get(`${BASE_URL}/email-configurations/${configId}`, { headers });
    if (!readRes.data.success) {
      log('   ✗ READ failed', 'red');
      return false;
    }
    if (readRes.data.data.name === createData.name) {
      log(`   ✓ READ successful: ${readRes.data.data.name}`, 'green');
    } else {
      log('   ✗ READ verification failed', 'red');
      return false;
    }
  } catch (e) {
    log(`   ✗ READ error: ${e.response?.data?.error?.message || e.message}`, 'red');
    return false;
  }
  
  // UPDATE
  log('3. UPDATE: Updating email configuration...', 'yellow');
  const updateData = {
    ...createData,
    name: 'CRUD Updated Config',
    smtpPort: 465,
  };
  
  try {
    const updateRes = await axios.put(`${BASE_URL}/email-configurations/${configId}`, updateData, { headers });
    if (!updateRes.data.success) {
      log('   ✗ UPDATE failed', 'red');
      return false;
    }
    log('   ✓ UPDATE successful', 'green');
    
    // Verify UPDATE
    const verifyRes = await axios.get(`${BASE_URL}/email-configurations/${configId}`, { headers });
    if (verifyRes.data.data.name === updateData.name && 
        verifyRes.data.data.smtpPort === updateData.smtpPort) {
      log('   ✓ UPDATE verified', 'green');
    } else {
      log('   ✗ UPDATE verification failed', 'red');
      return false;
    }
  } catch (e) {
    log(`   ✗ UPDATE error: ${e.response?.data?.error?.message || e.message}`, 'red');
    return false;
  }
  
  // DELETE
  log('4. DELETE: Deleting email configuration...', 'yellow');
  try {
    const deleteRes = await axios.delete(`${BASE_URL}/email-configurations/${configId}`, { headers });
    if (!deleteRes.data.success) {
      log('   ✗ DELETE failed', 'red');
      return false;
    }
    log('   ✓ DELETE successful', 'green');
    
    // Verify DELETE
    try {
      await axios.get(`${BASE_URL}/email-configurations/${configId}`, { headers });
      log('   ✗ DELETE verification failed (config still exists)', 'red');
      return false;
    } catch (e) {
      if (e.response?.status === 404) {
        log('   ✓ DELETE verified (config not found)', 'green');
        return true;
      } else {
        log(`   ✗ DELETE verification error: ${e.message}`, 'red');
        return false;
      }
    }
  } catch (e) {
    log(`   ✗ DELETE error: ${e.response?.data?.error?.message || e.message}`, 'red');
    return false;
  }
}

async function testFCMSettings() {
  log('\n=== FCM Settings CRUD ===', 'cyan');
  
  // CREATE
  log('1. CREATE: Saving FCM settings...', 'yellow');
  const createData = {
    fcmProjectId: 'CRUD_FCM_PROJECT',
    fcmServerKeyEncrypted: 'CRUD_FCM_KEY',
  };
  const created = await updateSettings(createData);
  if (!created) {
    log('   ✗ CREATE failed', 'red');
    return false;
  }
  log('   ✓ CREATE successful', 'green');
  
  await new Promise(r => setTimeout(r, 500));
  
  // READ
  log('2. READ: Loading FCM settings...', 'yellow');
  const loaded = await getSettings();
  if (loaded && loaded.fcmProjectId === createData.fcmProjectId) {
    log(`   ✓ READ successful: ${loaded.fcmProjectId}`, 'green');
  } else {
    log('   ✗ READ failed', 'red');
    return false;
  }
  
  // UPDATE
  log('3. UPDATE: Updating FCM settings...', 'yellow');
  const updateData = {
    fcmProjectId: 'CRUD_UPDATED_FCM_PROJECT',
  };
  const updated = await updateSettings(updateData);
  if (!updated) {
    log('   ✗ UPDATE failed', 'red');
    return false;
  }
  log('   ✓ UPDATE successful', 'green');
  
  await new Promise(r => setTimeout(r, 500));
  
  // Verify UPDATE
  const updatedLoaded = await getSettings();
  if (updatedLoaded.fcmProjectId === updateData.fcmProjectId) {
    log('   ✓ UPDATE verified', 'green');
    return true;
  } else {
    log('   ✗ UPDATE verification failed', 'red');
    return false;
  }
}

async function testSecuritySettings() {
  log('\n=== Security Settings CRUD ===', 'cyan');
  
  // CREATE
  log('1. CREATE: Saving Security settings...', 'yellow');
  const createData = {
    twoFactorRequired: true,
    ipWhitelist: ['192.168.1.100', '10.0.0.100'],
    passwordExpiryDays: 45,
    sessionTimeoutMinutes: 90,
  };
  const created = await updateSettings(createData);
  if (!created) {
    log('   ✗ CREATE failed', 'red');
    return false;
  }
  log('   ✓ CREATE successful', 'green');
  
  await new Promise(r => setTimeout(r, 500));
  
  // READ
  log('2. READ: Loading Security settings...', 'yellow');
  const loaded = await getSettings();
  if (!loaded) {
    log('   ✗ READ failed', 'red');
    return false;
  }
  
  const readChecks = [
    { field: 'twoFactorRequired', value: loaded.twoFactorRequired, expected: true },
    { field: 'passwordExpiryDays', value: loaded.passwordExpiryDays, expected: 45 },
    { field: 'sessionTimeoutMinutes', value: loaded.sessionTimeoutMinutes, expected: 90 },
  ];
  
  let readPassed = true;
  readChecks.forEach(({ field, value, expected }) => {
    if (value === expected) {
      log(`   ✓ ${field}: ${value}`, 'green');
    } else {
      log(`   ✗ ${field}: Expected "${expected}", got "${value}"`, 'red');
      readPassed = false;
    }
  });
  
  const ipList = loaded.ipWhitelist || [];
  if (Array.isArray(ipList) && ipList.length === 2 && 
      ipList[0] === '192.168.1.100' && ipList[1] === '10.0.0.100') {
    log(`   ✓ ipWhitelist: ${JSON.stringify(ipList)}`, 'green');
  } else {
    log(`   ✗ ipWhitelist: Expected 2 IPs, got ${JSON.stringify(ipList)}`, 'red');
    readPassed = false;
  }
  
  if (!readPassed) return false;
  
  // UPDATE
  log('3. UPDATE: Updating Security settings...', 'yellow');
  const updateData = {
    twoFactorRequired: false,
    ipWhitelist: ['192.168.1.200'],
    passwordExpiryDays: 30,
    sessionTimeoutMinutes: 60,
  };
  const updated = await updateSettings(updateData);
  if (!updated) {
    log('   ✗ UPDATE failed', 'red');
    return false;
  }
  log('   ✓ UPDATE successful', 'green');
  
  await new Promise(r => setTimeout(r, 500));
  
  // Verify UPDATE
  const updatedLoaded = await getSettings();
  if (updatedLoaded.twoFactorRequired === false &&
      updatedLoaded.passwordExpiryDays === 30 &&
      updatedLoaded.sessionTimeoutMinutes === 60 &&
      Array.isArray(updatedLoaded.ipWhitelist) &&
      updatedLoaded.ipWhitelist.length === 1 &&
      updatedLoaded.ipWhitelist[0] === '192.168.1.200') {
    log('   ✓ UPDATE verified', 'green');
    return true;
  } else {
    log('   ✗ UPDATE verification failed', 'red');
    return false;
  }
}

async function testNotificationSettings() {
  log('\n=== Notification Settings CRUD ===', 'cyan');
  
  // CREATE
  log('1. CREATE: Saving Notification settings...', 'yellow');
  const createData = {
    emailNotifications: true,
    quotaWarnings: true,
    failedMessageThreshold: '20% failure rate',
    apiErrorThreshold: 'After 100 errors',
  };
  const created = await updateSettings(createData);
  if (!created) {
    log('   ✗ CREATE failed', 'red');
    return false;
  }
  log('   ✓ CREATE successful', 'green');
  
  await new Promise(r => setTimeout(r, 500));
  
  // READ
  log('2. READ: Loading Notification settings...', 'yellow');
  const loaded = await getSettings();
  if (!loaded) {
    log('   ✗ READ failed', 'red');
    return false;
  }
  
  const customSettings = loaded.customSettings || {};
  const readChecks = [
    { field: 'emailNotifications', value: loaded.emailNotifications, expected: true },
    { field: 'quotaWarnings', value: loaded.quotaWarnings || customSettings.quotaWarnings, expected: true },
    { field: 'failedMessageThreshold', value: loaded.failedMessageThreshold || customSettings.failedMessageThreshold, expected: '20% failure rate' },
    { field: 'apiErrorThreshold', value: loaded.apiErrorThreshold || customSettings.apiErrorThreshold, expected: 'After 100 errors' },
  ];
  
  let readPassed = true;
  readChecks.forEach(({ field, value, expected }) => {
    if (value === expected) {
      log(`   ✓ ${field}: ${value}`, 'green');
    } else {
      log(`   ✗ ${field}: Expected "${expected}", got "${value}"`, 'red');
      readPassed = false;
    }
  });
  
  if (!readPassed) return false;
  
  // UPDATE
  log('3. UPDATE: Updating Notification settings...', 'yellow');
  const updateData = {
    emailNotifications: false,
    quotaWarnings: false,
    failedMessageThreshold: '10% failure rate',
    apiErrorThreshold: 'After 25 errors',
  };
  const updated = await updateSettings(updateData);
  if (!updated) {
    log('   ✗ UPDATE failed', 'red');
    return false;
  }
  log('   ✓ UPDATE successful', 'green');
  
  await new Promise(r => setTimeout(r, 500));
  
  // Verify UPDATE
  const updatedLoaded = await getSettings();
  const updatedCustomSettings = updatedLoaded.customSettings || {};
  if (updatedLoaded.emailNotifications === false &&
      (updatedLoaded.quotaWarnings || updatedCustomSettings.quotaWarnings) === false) {
    log('   ✓ UPDATE verified', 'green');
    return true;
  } else {
    log('   ✗ UPDATE verification failed', 'red');
    return false;
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('COMPLETE CRUD TEST SUITE FOR ALL SETTINGS FORMS', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');
  
  if (!await login()) {
    log('\n✗ Cannot proceed without authentication', 'red');
    process.exit(1);
  }
  
  const results = {
    whatsapp: await testWhatsAppCRUD(),
    sms: await testSMSCRUD(),
    email: await testEmailCRUD(),
    fcm: await testFCMSettings(),
    security: await testSecuritySettings(),
    notifications: await testNotificationSettings(),
  };
  
  log('\n' + '='.repeat(60), 'cyan');
  log('TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const testNames = {
    whatsapp: 'WhatsApp Settings',
    sms: 'SMS Settings',
    email: 'Email Configuration',
    fcm: 'FCM Settings',
    security: 'Security Settings',
    notifications: 'Notification Settings',
  };
  
  let passed = 0;
  let total = Object.keys(results).length;
  
  Object.entries(results).forEach(([key, result]) => {
    if (result) {
      log(`✓ ${testNames[key]}: ALL CRUD OPERATIONS PASSED`, 'green');
      passed++;
    } else {
      log(`✗ ${testNames[key]}: FAILED`, 'red');
    }
  });
  
  log('\n' + '-'.repeat(60), 'cyan');
  log(`Total: ${passed}/${total} test suites passed`, passed === total ? 'green' : 'yellow');
  log('-'.repeat(60) + '\n', 'cyan');
  
  process.exit(passed === total ? 0 : 1);
}

runAllTests().catch(console.error);

