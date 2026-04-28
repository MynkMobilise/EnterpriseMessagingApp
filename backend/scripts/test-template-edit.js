require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:3003/api/v1';
const TEST_ORG_SLUG = 'default-org';
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'Admin123!@#';

let authToken = '';
let organizationId = '';
let emailTemplateId = '';
let smsTemplateId = '';
let fcmTemplateId = '';

async function login() {
  try {
    console.log('\n🔐 Logging in...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      organizationSlug: TEST_ORG_SLUG,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (response.data.success) {
      const tokens = response.data.data?.tokens || response.data.tokens;
      const user = response.data.data?.user || response.data.user;
      authToken = tokens?.accessToken;
      organizationId = user?.organizationId;

      if (authToken && organizationId) {
        console.log('✅ Login successful');
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('❌ Login error:', error.response?.data || error.message);
    return false;
  }
}

async function createTestTemplates() {
  try {
    console.log('\n📝 Creating test templates...');
    const headers = {
      Authorization: `Bearer ${authToken}`,
      'X-Organization-Id': organizationId,
    };

    // Create Email template
    const emailResponse = await axios.post(
      `${API_BASE}/templates`,
      {
        name: 'Test Email Template for Edit',
        channel: 'email',
        category: 'transactional',
        subject: 'Test Subject',
        body: 'Test email body',
        htmlBody: '<p>Test email body</p>',
        plainTextBody: 'Test email body',
        variables: [],
      },
      { headers }
    );
    if (emailResponse.data.success) {
      emailTemplateId = emailResponse.data.data?.id || emailResponse.data.id;
      console.log(`✅ Email template created: ${emailTemplateId}`);
    }

    // Create SMS template
    const smsResponse = await axios.post(
      `${API_BASE}/templates`,
      {
        name: 'Test SMS Template for Edit',
        channel: 'sms',
        category: 'transactional',
        body: 'Test SMS body',
        variables: [],
      },
      { headers }
    );
    if (smsResponse.data.success) {
      smsTemplateId = smsResponse.data.data?.id || smsResponse.data.id;
      console.log(`✅ SMS template created: ${smsTemplateId}`);
    }

    // Create FCM template
    const fcmResponse = await axios.post(
      `${API_BASE}/templates`,
      {
        name: 'Test FCM Template for Edit',
        channel: 'fcm',
        category: 'transactional',
        subject: 'Test FCM Title',
        body: 'Test FCM body',
        variables: [],
      },
      { headers }
    );
    if (fcmResponse.data.success) {
      fcmTemplateId = fcmResponse.data.data?.id || fcmResponse.data.id;
      console.log(`✅ FCM template created: ${fcmTemplateId}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Template creation error:', error.response?.data || error.message);
    return false;
  }
}

async function testGetTemplate(templateId, channel) {
  try {
    console.log(`\n📖 Testing GET template (${channel}): ${templateId}`);
    const response = await axios.get(`${API_BASE}/templates/${templateId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'X-Organization-Id': organizationId,
      },
    });

    if (response.data.success) {
      console.log(`✅ Template retrieved successfully`);
      console.log(`   Name: ${response.data.data?.name || response.data.name}`);
      console.log(`   Channel: ${response.data.data?.channel || response.data.channel}`);
      return response.data.data || response.data;
    } else {
      console.error('❌ Failed to get template:', response.data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Get template error:', error.response?.data || error.message);
    return null;
  }
}

async function testUpdateTemplate(templateId, channel) {
  try {
    console.log(`\n✏️  Testing UPDATE template (${channel}): ${templateId}`);
    const headers = {
      Authorization: `Bearer ${authToken}`,
      'X-Organization-Id': organizationId,
    };

    let updateData;
    if (channel === 'email') {
      updateData = {
        name: 'Updated Email Template',
        subject: 'Updated Subject',
        htmlBody: '<p>Updated HTML body</p>',
        plainTextBody: 'Updated plain text body',
      };
    } else if (channel === 'sms') {
      updateData = {
        name: 'Updated SMS Template',
        body: 'Updated SMS body content',
      };
    } else if (channel === 'fcm') {
      updateData = {
        name: 'Updated FCM Template',
        subject: 'Updated FCM Title',
        body: 'Updated FCM body content',
      };
    }

    const response = await axios.put(
      `${API_BASE}/templates/${templateId}`,
      updateData,
      { headers }
    );

    if (response.data.success) {
      console.log(`✅ Template updated successfully`);
      return response.data.data || response.data;
    } else {
      console.error('❌ Failed to update template:', response.data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Update template error:', error.response?.data || error.message);
    return null;
  }
}

async function verifyUpdate(templateId, channel) {
  try {
    console.log(`\n🔍 Verifying update (${channel}): ${templateId}`);
    const template = await testGetTemplate(templateId, channel);
    
    if (template) {
      if (channel === 'email') {
        if (template.name === 'Updated Email Template' && template.subject === 'Updated Subject') {
          console.log('✅ Email template update verified');
          return true;
        }
      } else if (channel === 'sms') {
        if (template.name === 'Updated SMS Template') {
          console.log('✅ SMS template update verified');
          return true;
        }
      } else if (channel === 'fcm') {
        if (template.name === 'Updated FCM Template' && template.subject === 'Updated FCM Title') {
          console.log('✅ FCM template update verified');
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Template Edit Feature Test\n');
  console.log('='.repeat(50));

  // Login
  if (!(await login())) {
    console.error('❌ Login failed. Exiting.');
    process.exit(1);
  }

  // Create test templates
  if (!(await createTestTemplates())) {
    console.error('❌ Template creation failed. Exiting.');
    process.exit(1);
  }

  // Test GET for each template
  if (emailTemplateId) {
    await testGetTemplate(emailTemplateId, 'email');
  }
  if (smsTemplateId) {
    await testGetTemplate(smsTemplateId, 'sms');
  }
  if (fcmTemplateId) {
    await testGetTemplate(fcmTemplateId, 'fcm');
  }

  // Test UPDATE for each template
  let emailUpdated = false;
  let smsUpdated = false;
  let fcmUpdated = false;

  if (emailTemplateId) {
    const result = await testUpdateTemplate(emailTemplateId, 'email');
    if (result) {
      emailUpdated = await verifyUpdate(emailTemplateId, 'email');
    }
  }

  if (smsTemplateId) {
    const result = await testUpdateTemplate(smsTemplateId, 'sms');
    if (result) {
      smsUpdated = await verifyUpdate(smsTemplateId, 'sms');
    }
  }

  if (fcmTemplateId) {
    const result = await testUpdateTemplate(fcmTemplateId, 'fcm');
    if (result) {
      fcmUpdated = await verifyUpdate(fcmTemplateId, 'fcm');
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary:');
  console.log(`   Email Template Edit: ${emailUpdated ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   SMS Template Edit: ${smsUpdated ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   FCM Template Edit: ${fcmUpdated ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(50));

  if (emailUpdated && smsUpdated && fcmUpdated) {
    console.log('\n✅ All template edit tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above.');
    process.exit(1);
  }
}

main();

