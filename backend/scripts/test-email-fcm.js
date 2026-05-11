require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.BACKEND_URL || 'https://suchna.onmobilise.com';
const API_BASE = `${BASE_URL}/api/v1`;

// Test credentials - Update these if your credentials are different
const TEST_ORG_SLUG = 'default-org';
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'Admin123!@#';

let authToken = '';
let organizationId = '';

async function login() {
  try {
    console.log('\n🔐 Logging in...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      organizationSlug: TEST_ORG_SLUG,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (response.data.success) {
      // Handle both response structures: response.data.tokens or response.data.data.tokens
      const tokens = response.data.data?.tokens || response.data.tokens;
      const user = response.data.data?.user || response.data.user;
      authToken = tokens?.accessToken;
      organizationId = user?.organizationId;
      
      if (authToken && organizationId) {
        console.log('✅ Login successful');
        console.log(`   Organization ID: ${organizationId}`);
        return true;
      } else {
        console.error('❌ Login response missing tokens or user data');
        console.error('   Response:', JSON.stringify(response.data, null, 2));
        return false;
      }
    } else {
      console.error('❌ Login failed:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.response?.data || error.message);
    return false;
  }
}

async function testEmailSettings() {
  try {
    console.log('\n📧 Testing Email Settings...');
    
    // Get current settings
    const getResponse = await axios.get(`${API_BASE}/settings/organization`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log('✅ Retrieved current settings');

    // Update email settings
    const updateData = {
      emailProvider: 'smtp',
      emailFromAddress: 'noreply@testcompany.com',
      emailFromName: 'Test Company',
      emailApiKeyEncrypted: 'test-smtp-password-123',
    };

    const updateResponse = await axios.put(
      `${API_BASE}/settings/organization`,
      updateData,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (updateResponse.data.success) {
      console.log('✅ Email settings updated successfully');
      console.log(`   Provider: ${updateData.emailProvider}`);
      console.log(`   From: ${updateData.emailFromName} <${updateData.emailFromAddress}>`);
      return true;
    } else {
      console.error('❌ Failed to update email settings:', updateResponse.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Email settings test error:', error.response?.data || error.message);
    return false;
  }
}

async function testFCMSettings() {
  try {
    console.log('\n🔔 Testing FCM Settings...');

    const updateData = {
      fcmProjectId: 'test-project-123',
      fcmServerKeyEncrypted: 'test-fcm-server-key-abc123',
    };

    const updateResponse = await axios.put(
      `${API_BASE}/settings/organization`,
      updateData,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (updateResponse.data.success) {
      console.log('✅ FCM settings updated successfully');
      console.log(`   Project ID: ${updateData.fcmProjectId}`);
      return true;
    } else {
      console.error('❌ Failed to update FCM settings:', updateResponse.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ FCM settings test error:', error.response?.data || error.message);
    return false;
  }
}

async function testCreateEmailTemplate() {
  try {
    console.log('\n📝 Testing Email Template Creation...');

    const templateData = {
      name: 'Test Email Template',
      channel: 'email',
      category: 'transactional',
      language: 'en',
      subject: 'Welcome {{name}}!',
      body: 'Hello {{name}}, welcome to our platform!',
      htmlBody: '<h1>Welcome {{name}}!</h1><p>Hello {{name}}, welcome to our platform!</p>',
      plainTextBody: 'Hello {{name}}, welcome to our platform!',
      variables: ['name'],
      variableCount: 1,
    };

    const response = await axios.post(
      `${API_BASE}/templates`,
      templateData,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (response.data.success) {
      console.log('✅ Email template created successfully');
      console.log(`   Template ID: ${response.data.data.id}`);
      console.log(`   Name: ${response.data.data.name}`);
      return response.data.data.id;
    } else {
      console.error('❌ Failed to create email template:', response.data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Email template creation error:', error.response?.data || error.message);
    return null;
  }
}

async function testCreateFCMTemplate() {
  try {
    console.log('\n📝 Testing FCM Template Creation...');

    const templateData = {
      name: 'Test FCM Template',
      channel: 'fcm',
      category: 'marketing',
      language: 'en',
      subject: 'New Update: {{title}}',
      body: 'You have a new update: {{title}}. {{message}}',
      variables: ['title', 'message'],
      variableCount: 2,
    };

    const response = await axios.post(
      `${API_BASE}/templates`,
      templateData,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (response.data.success) {
      console.log('✅ FCM template created successfully');
      console.log(`   Template ID: ${response.data.data.id}`);
      console.log(`   Name: ${response.data.data.name}`);
      return response.data.data.id;
    } else {
      console.error('❌ Failed to create FCM template:', response.data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ FCM template creation error:', error.response?.data || error.message);
    return null;
  }
}

async function testSendEmail(templateId) {
  try {
    console.log('\n📧 Testing Email Send...');

    // For now, send without template (text message) since templates need approval
    const messageData = {
      channel: 'email',
      recipientEmail: 'test@example.com',
      recipientName: 'Test User',
      messageType: 'html',
      subject: 'Test Email',
      content: '<h1>Test Email</h1><p>This is a test email message sent from the Email & FCM test script.</p>',
      priority: 'normal',
    };

    const response = await axios.post(
      `${API_BASE}/messages`,
      messageData,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (response.data.success || response.data.id) {
      console.log('✅ Email message created successfully');
      console.log(`   Message ID: ${response.data.id || response.data.data?.id}`);
      console.log(`   Status: ${response.data.approvalStatus || response.data.data?.approvalStatus}`);
      return response.data.id || response.data.data?.id;
    } else {
      console.error('❌ Failed to send email:', response.data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Email send error:', error.response?.data || error.message);
    return null;
  }
}

async function testSendFCM(templateId) {
  try {
    console.log('\n🔔 Testing FCM Send...');

    // For now, send without template (text message) since templates need approval
    const messageData = {
      channel: 'fcm',
      recipientFcmToken: 'test-fcm-token-123456789',
      recipientName: 'Test Device',
      messageType: 'text',
      subject: 'Test Notification',
      content: 'This is a test FCM notification sent from the Email & FCM test script.',
      priority: 'normal',
    };

    const response = await axios.post(
      `${API_BASE}/messages`,
      messageData,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (response.data.success || response.data.id) {
      console.log('✅ FCM message created successfully');
      console.log(`   Message ID: ${response.data.id || response.data.data?.id}`);
      console.log(`   Status: ${response.data.approvalStatus || response.data.data?.approvalStatus}`);
      return response.data.id || response.data.data?.id;
    } else {
      console.error('❌ Failed to send FCM:', response.data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ FCM send error:', error.response?.data || error.message);
    return null;
  }
}

async function testListMessages() {
  try {
    console.log('\n📋 Testing Message List (Email & FCM)...');

    // List all messages
    const allResponse = await axios.get(
      `${API_BASE}/messages?page=1&limit=10`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (allResponse.data.success) {
      const messages = allResponse.data.data?.messages || allResponse.data.data || [];
      const emailMessages = messages.filter(m => m.channel === 'email');
      const fcmMessages = messages.filter(m => m.channel === 'fcm');
      
      console.log('✅ Retrieved messages successfully');
      console.log(`   Total messages: ${messages.length}`);
      console.log(`   Email messages: ${emailMessages.length}`);
      console.log(`   FCM messages: ${fcmMessages.length}`);
      
      if (emailMessages.length > 0) {
        console.log('\n   Sample Email Message:');
        console.log(`     ID: ${emailMessages[0].id}`);
        console.log(`     To: ${emailMessages[0].recipientEmail}`);
        console.log(`     Subject: ${emailMessages[0].subject || 'N/A'}`);
        console.log(`     Status: ${emailMessages[0].approvalStatus}`);
      }
      
      if (fcmMessages.length > 0) {
        console.log('\n   Sample FCM Message:');
        console.log(`     ID: ${fcmMessages[0].id}`);
        console.log(`     Token: ${fcmMessages[0].recipientFcmToken?.substring(0, 20)}...`);
        console.log(`     Subject: ${fcmMessages[0].subject || 'N/A'}`);
        console.log(`     Status: ${fcmMessages[0].approvalStatus}`);
      }
      
      return true;
    } else {
      console.error('❌ Failed to list messages:', allResponse.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Message list error:', error.response?.data || error.message);
    return false;
  }
}

async function testListTemplates() {
  try {
    console.log('\n📚 Testing Template List (Email & FCM)...');

    const response = await axios.get(
      `${API_BASE}/templates?page=1&limit=100`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (response.data.success) {
      const templates = response.data.data?.templates || response.data.data || [];
      const emailTemplates = templates.filter(t => t.channel === 'email');
      const fcmTemplates = templates.filter(t => t.channel === 'fcm');
      
      console.log('✅ Retrieved templates successfully');
      console.log(`   Total templates: ${templates.length}`);
      console.log(`   Email templates: ${emailTemplates.length}`);
      console.log(`   FCM templates: ${fcmTemplates.length}`);
      
      return true;
    } else {
      console.error('❌ Failed to list templates:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Template list error:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Starting Email & FCM Functionality Tests\n');
  console.log('=' .repeat(60));

  // Login
  const loggedIn = await login();
  if (!loggedIn) {
    console.error('\n❌ Cannot proceed without authentication');
    process.exit(1);
  }

  const results = {
    emailSettings: false,
    fcmSettings: false,
    emailTemplate: false,
    fcmTemplate: false,
    emailSend: false,
    fcmSend: false,
    listMessages: false,
    listTemplates: false,
  };

  // Test settings
  results.emailSettings = await testEmailSettings();
  results.fcmSettings = await testFCMSettings();

  // Test templates
  const emailTemplateId = await testCreateEmailTemplate();
  results.emailTemplate = emailTemplateId !== null;
  
  const fcmTemplateId = await testCreateFCMTemplate();
  results.fcmTemplate = fcmTemplateId !== null;

  // Test sending
  results.emailSend = (await testSendEmail(emailTemplateId)) !== null;
  results.fcmSend = (await testSendFCM(fcmTemplateId)) !== null;

  // Test listing
  results.listMessages = await testListMessages();
  results.listTemplates = await testListTemplates();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));
  console.log(`Email Settings:        ${results.emailSettings ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`FCM Settings:          ${results.fcmSettings ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Email Template Create:  ${results.emailTemplate ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`FCM Template Create:   ${results.fcmTemplate ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Email Send:            ${results.emailSend ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`FCM Send:              ${results.fcmSend ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`List Messages:         ${results.listMessages ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`List Templates:        ${results.listTemplates ? '✅ PASS' : '❌ FAIL'}`);
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  console.log(`\nTotal: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('\n❌ Test execution error:', error);
  process.exit(1);
});

