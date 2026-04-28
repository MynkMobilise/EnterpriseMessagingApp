/**
 * Test script to verify WhatsApp button parameter length validation
 * This script tests sending a WhatsApp message with button parameters
 * that exceed the 15-character limit to ensure proper error handling.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3003/api/v1';
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'Admin123!@#';
const TEST_ORG_SLUG = 'default-org';
const TEST_PHONE = '+919599194330'; // User's phone number

async function testWhatsAppButtonParameter() {
  try {
    console.log('🧪 Testing WhatsApp Button Parameter Length Validation\n');

    // Step 1: Login
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      organizationSlug: TEST_ORG_SLUG,
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + JSON.stringify(loginResponse.data));
    }

    const { token } = loginResponse.data.data;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    console.log('✅ Login successful\n');

    // Step 2: Get templates
    console.log('2️⃣ Fetching WhatsApp templates...');
    const templatesResponse = await axios.get(`${API_BASE_URL}/templates`, {
      headers,
      params: { channel: 'whatsapp', status: 'approved' },
    });

    const templates = templatesResponse.data.data || [];
    const templateWithButton = templates.find(t => 
      t.buttons && Array.isArray(t.buttons) && t.buttons.length > 0 &&
      (t.buttons[0].type === 'URL' || t.buttons[0].sub_type === 'url')
    );

    if (!templateWithButton) {
      console.log('⚠️  No WhatsApp template with URL button found. Creating test scenario...');
      console.log('   Testing with a template that has a URL button...\n');
    } else {
      console.log(`✅ Found template: ${templateWithButton.name}\n`);
    }

    // Step 3: Test with URL exceeding 15 characters (should fail)
    console.log('3️⃣ Testing with URL parameter exceeding 15 characters (should fail)...');
    const longUrl = 'https://very-long-url-example.com/this-is-way-too-long';
    
    try {
      const sendResponse = await axios.post(
        `${API_BASE_URL}/messages`,
        {
          channel: 'whatsapp',
          messageType: 'template',
          templateId: templateWithButton?.id || 'test-template-id',
          recipients: [TEST_PHONE],
          variables: {
            url: longUrl, // This exceeds 15 characters
          },
        },
        { headers }
      );

      console.log('❌ ERROR: Message was sent successfully, but it should have failed!');
      console.log('Response:', JSON.stringify(sendResponse.data, null, 2));
    } catch (error) {
      if (error.response && error.response.status === 400) {
        const errorMessage = error.response.data?.error?.message || error.response.data?.message || 'Unknown error';
        if (errorMessage.includes('15-character limit') || errorMessage.includes('exceeds')) {
          console.log('✅ PASS: Correctly rejected URL parameter exceeding 15 characters');
          console.log(`   Error message: ${errorMessage}\n`);
        } else {
          console.log('⚠️  Got 400 error, but message might not be about length limit:');
          console.log(`   ${errorMessage}\n`);
        }
      } else {
        console.log('❌ Unexpected error:', error.message);
        if (error.response) {
          console.log('Response:', JSON.stringify(error.response.data, null, 2));
        }
      }
    }

    // Step 4: Test with URL within 15 characters (should succeed if template exists)
    console.log('4️⃣ Testing with URL parameter within 15 characters (should succeed)...');
    const shortUrl = 'short.ly/abc';
    
    if (templateWithButton) {
      try {
        const sendResponse = await axios.post(
          `${API_BASE_URL}/messages`,
          {
            channel: 'whatsapp',
            messageType: 'template',
            templateId: templateWithButton.id,
            recipients: [TEST_PHONE],
            variables: {
              url: shortUrl, // This is within 15 characters
            },
          },
          { headers }
        );

        if (sendResponse.data.success) {
          console.log('✅ PASS: Message sent successfully with valid URL parameter');
          console.log(`   Message ID: ${sendResponse.data.data?.id || 'N/A'}\n`);
        } else {
          console.log('⚠️  Message submission returned success:false');
          console.log('Response:', JSON.stringify(sendResponse.data, null, 2));
        }
      } catch (error) {
        if (error.response) {
          const errorMessage = error.response.data?.error?.message || error.response.data?.message || 'Unknown error';
          if (errorMessage.includes('15-character limit')) {
            console.log('❌ FAIL: Valid URL parameter was rejected');
            console.log(`   Error: ${errorMessage}\n`);
          } else {
            console.log('⚠️  Message failed for other reason (might be template/credentials issue):');
            console.log(`   ${errorMessage}\n`);
          }
        } else {
          console.log('❌ Unexpected error:', error.message);
        }
      }
    } else {
      console.log('⚠️  Skipping valid URL test - no template with button found\n');
    }

    console.log('✅ Test completed!\n');
    console.log('Summary:');
    console.log('- Backend validation should reject URLs > 15 characters');
    console.log('- Frontend should show warning for URLs > 15 characters');
    console.log('- Valid URLs (≤15 chars) should be accepted');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the test
testWhatsAppButtonParameter();

