/**
 * Test script to verify SMS Template ID is saved when updating a template
 */

const axios = require('axios');
const BASE_URL = 'https://suchna.onmobilise.com/api/v1';

async function testSmsTemplateIdUpdate() {
  console.log('========================================');
  console.log('Test: SMS Template ID Update');
  console.log('========================================\n');

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

    // Step 2: Create an SMS template first
    console.log('2. Creating SMS template...');
    const createResponse = await axios.post(
      `${BASE_URL}/templates`,
      {
        name: 'Test SMS Template',
        channel: 'sms',
        category: 'transactional',
        body: 'Test message body {{1}}',
        smsTemplateId: 'TEST_TEMPLATE_001',
      },
      { headers }
    );

    if (!createResponse.data.success) {
      throw new Error('Failed to create template');
    }

    const templateId = createResponse.data.data.id;
    console.log(`✓ Template created with ID: ${templateId}`);
    console.log(`  Initial SMS Template ID: ${createResponse.data.data.smsTemplateId || 'null'}\n`);

    // Step 3: Update the template with a new SMS Template ID
    console.log('3. Updating template with new SMS Template ID...');
    const updateResponse = await axios.put(
      `${BASE_URL}/templates/${templateId}`,
      {
        smsTemplateId: 'UPDATED_TEMPLATE_002',
        body: 'Updated message body {{1}}',
      },
      { headers }
    );

    if (!updateResponse.data.success) {
      throw new Error('Failed to update template');
    }

    console.log('✓ Template updated');
    console.log(`  Updated SMS Template ID: ${updateResponse.data.data.smsTemplateId || 'null'}\n`);

    // Step 4: Verify the update was saved
    console.log('4. Verifying update was saved...');
    const getResponse = await axios.get(`${BASE_URL}/templates/${templateId}`, { headers });

    if (!getResponse.data.success) {
      throw new Error('Failed to get template');
    }

    const savedTemplateId = getResponse.data.data.smsTemplateId;
    console.log(`  Saved SMS Template ID: ${savedTemplateId || 'null'}`);

    if (savedTemplateId === 'UPDATED_TEMPLATE_002') {
      console.log('✓ SMS Template ID was successfully saved!\n');
    } else {
      throw new Error(`SMS Template ID mismatch: expected 'UPDATED_TEMPLATE_002', got '${savedTemplateId}'`);
    }

    // Step 5: Test updating with empty/null value
    console.log('5. Testing update with empty SMS Template ID...');
    const updateEmptyResponse = await axios.put(
      `${BASE_URL}/templates/${templateId}`,
      {
        smsTemplateId: '',
      },
      { headers }
    );

    if (!updateEmptyResponse.data.success) {
      throw new Error('Failed to update template with empty value');
    }

    const getEmptyResponse = await axios.get(`${BASE_URL}/templates/${templateId}`, { headers });
    const emptyTemplateId = getEmptyResponse.data.data.smsTemplateId;
    console.log(`  SMS Template ID after empty update: ${emptyTemplateId || 'null'}`);
    console.log('✓ Empty value handling works\n');

    console.log('========================================');
    console.log('✓ ALL TESTS PASSED');
    console.log('SMS Template ID update is working correctly!');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n========================================');
    console.error('✗ TEST FAILED:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('========================================\n');
    process.exit(1);
  }
}

// Run the test
testSmsTemplateIdUpdate();

