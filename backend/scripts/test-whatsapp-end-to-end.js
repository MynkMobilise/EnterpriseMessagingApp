/**
 * End-to-end test for WhatsApp message sending with button parameters
 * Tests the complete flow: validation, message sending, and delivery
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'https://suchna.onmobilise.com/api/v1';
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'Admin123!@#';
const TEST_ORG_SLUG = 'default-org';
const TEST_PHONE = '+919599194330'; // User's phone number

async function testEndToEnd() {
  try {
    console.log('🧪 End-to-End WhatsApp Message Test\n');
    console.log('='.repeat(60));

    // Step 1: Login
    console.log('\n1️⃣ Logging in...');
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

    console.log('✅ Login successful');

    // Step 2: Get WhatsApp templates
    console.log('\n2️⃣ Fetching WhatsApp templates...');
    const templatesResponse = await axios.get(`${API_BASE_URL}/templates`, {
      headers,
      params: { channel: 'whatsapp', status: 'approved' },
    });

    const templates = templatesResponse.data.data || [];
    console.log(`   Found ${templates.length} WhatsApp templates`);

    // Find a template with URL button
    const templateWithButton = templates.find(t => 
      t.buttons && Array.isArray(t.buttons) && t.buttons.length > 0 &&
      (t.buttons[0].type === 'URL' || t.buttons[0].sub_type === 'url' || t.buttons[0].type === 'url')
    );

    if (!templateWithButton) {
      console.log('\n⚠️  No WhatsApp template with URL button found.');
      console.log('   Please create a WhatsApp template with a URL button first.');
      console.log('   Available templates:', templates.map(t => t.name).join(', '));
      return;
    }

    console.log(`✅ Found template: "${templateWithButton.name}"`);
    console.log(`   Template ID: ${templateWithButton.id}`);
    console.log(`   Buttons: ${JSON.stringify(templateWithButton.buttons, null, 2)}`);

    // Step 3: Test validation - Try with long URL (should fail)
    console.log('\n3️⃣ Testing validation with long URL (>15 chars)...');
    const longUrl = 'https://very-long-url-example.com/this-is-way-too-long-for-whatsapp-button-parameter';
    console.log(`   URL length: ${longUrl.length} characters`);
    console.log(`   URL: ${longUrl}`);

    try {
      await axios.post(
        `${API_BASE_URL}/messages`,
        {
          channel: 'whatsapp',
          messageType: 'template',
          templateId: templateWithButton.id,
          recipients: [TEST_PHONE],
          variables: {
            url: longUrl,
          },
        },
        { headers }
      );
      console.log('❌ FAIL: Long URL was accepted (should have been rejected)');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        const errorMessage = error.response.data?.error?.message || error.response.data?.message || '';
        if (errorMessage.includes('15-character limit') || errorMessage.includes('exceeds')) {
          console.log('✅ PASS: Long URL correctly rejected');
          console.log(`   Error: ${errorMessage.substring(0, 100)}...`);
        } else {
          console.log('⚠️  Got 400, but message might not be about length:');
          console.log(`   ${errorMessage.substring(0, 100)}...`);
        }
      } else {
        console.log('⚠️  Unexpected error:', error.message);
      }
    }

    // Step 4: Send message with valid short URL
    console.log('\n4️⃣ Sending message with valid short URL (≤15 chars)...');
    const shortUrl = 'short.ly/abc'; // 13 characters
    console.log(`   URL: ${shortUrl} (${shortUrl.length} characters)`);
    console.log(`   Recipient: ${TEST_PHONE}`);

    const sendResponse = await axios.post(
      `${API_BASE_URL}/messages`,
      {
        channel: 'whatsapp',
        messageType: 'template',
        templateId: templateWithButton.id,
        recipients: [TEST_PHONE],
        variables: {
          url: shortUrl,
        },
      },
      { headers }
    );

    if (sendResponse.data.success) {
      const messageId = sendResponse.data.data?.id;
      console.log('✅ Message submitted successfully');
      console.log(`   Message ID: ${messageId}`);

      // Step 5: Check message status
      console.log('\n5️⃣ Checking message status...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

      const statusResponse = await axios.get(
        `${API_BASE_URL}/messages/${messageId}`,
        { headers }
      );

      const message = statusResponse.data.data;
      console.log(`   Status: ${message.deliveryStatus}`);
      console.log(`   Channel: ${message.channel}`);
      console.log(`   Recipient: ${message.recipient}`);

      if (message.deliveryStatus === 'sent' || message.deliveryStatus === 'delivered') {
        console.log('✅ Message sent successfully!');
        console.log('\n📱 Please check your WhatsApp (+919599194330) to confirm receipt.');
      } else if (message.deliveryStatus === 'failed') {
        console.log('❌ Message failed to send');
        if (message.meta && message.meta.errors) {
          console.log('   Errors:', JSON.stringify(message.meta.errors, null, 2));
        }
      } else {
        console.log(`⚠️  Message status: ${message.deliveryStatus} (may still be processing)`);
      }

      // Step 6: Get trace logs
      if (message.traceLogs && message.traceLogs.length > 0) {
        console.log('\n6️⃣ Trace Logs:');
        message.traceLogs.slice(0, 5).forEach((log, idx) => {
          console.log(`   ${idx + 1}. [${log.eventType}] ${log.eventData?.stage || 'N/A'}`);
          if (log.eventData?.error) {
            console.log(`      Error: ${log.eventData.error}`);
          }
        });
      }

    } else {
      console.log('❌ Message submission failed');
      console.log('Response:', JSON.stringify(sendResponse.data, null, 2));
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ End-to-end test completed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the test
testEndToEnd();

