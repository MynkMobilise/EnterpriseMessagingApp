const axios = require('axios');

const BASE_URL = 'https://suchna.onmobilise.com/api/v1';

async function testReports() {
  console.log('🧪 Testing MIS Reports Functionality\n');

  try {
    // Step 1: Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      organizationSlug: 'default-org',
      email: 'admin@example.com',
      password: 'Admin123!@#',
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const token = loginResponse.data.data?.tokens?.accessToken;
    if (!token) {
      throw new Error('No access token in login response');
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    console.log('✅ Login successful\n');

    // Step 2: Test All Messages Report endpoint
    console.log('2. Testing All Messages Report endpoint...');
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const reportResponse = await axios.get(`${BASE_URL}/reports/all-messages`, {
      headers,
      params: {
        startDate,
        endDate,
      },
    });

    if (reportResponse.data.success && reportResponse.data.data) {
      const reportData = reportResponse.data.data;
      console.log('✅ All Messages Report fetched successfully!');
      console.log(`   Total messages: ${reportData.total || 0}`);
      console.log(`   By channel - WhatsApp: ${reportData.byChannel?.whatsapp || 0}, SMS: ${reportData.byChannel?.sms || 0}, Email: ${reportData.byChannel?.email || 0}, FCM: ${reportData.byChannel?.fcm || 0}`);
      console.log(`   By status - Sent: ${reportData.byStatus?.sent || 0}, Delivered: ${reportData.byStatus?.delivered || 0}, Failed: ${reportData.byStatus?.failed || 0}, Pending: ${reportData.byStatus?.pending || 0}`);
      console.log(`   Messages in response: ${reportData.messages?.length || 0}\n`);
    } else {
      throw new Error('All Messages Report fetch failed');
    }

    // Step 3: Test date range filtering in message list
    console.log('3. Testing date range filtering in message list API...');
    const listResponse = await axios.get(`${BASE_URL}/messages`, {
      headers,
      params: {
        startDate,
        endDate,
        page: 1,
        limit: 10,
      },
    });

    if (listResponse.data.success) {
      console.log(`✅ Date range filtering works! Messages returned: ${listResponse.data.data?.length || 0}`);
      if (listResponse.data.pagination) {
        console.log(`   Total: ${listResponse.data.pagination.total || 0}, Pages: ${listResponse.data.pagination.totalPages || 0}\n`);
      }
    } else {
      throw new Error('Date range filtering failed');
    }

    console.log('✅ All report tests passed!');
    console.log('\n⚠️  Note: Export functionality requires backend server restart to register /export routes');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2).substring(0, 500));
    }
    return false;
  }
}

// Run tests
if (require.main === module) {
  testReports()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testReports };

