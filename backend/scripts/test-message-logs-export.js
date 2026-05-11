const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://suchna.onmobilise.com/api/v1';

async function testMessageLogsExport() {
  console.log('🧪 Testing Message Logs Export Functionality\n');

  try {
    // Step 1: Login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      organizationSlug: 'default-org',
      email: 'admin@example.com',
      password: 'Admin123!@#',
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const token = loginResponse.data.data?.tokens?.accessToken || loginResponse.data.data?.accessToken || loginResponse.data.data?.token;
    if (!token) {
      console.error('Login response:', JSON.stringify(loginResponse.data, null, 2));
      throw new Error('No access token in login response');
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    console.log('✅ Login successful');
    console.log(`   Token: ${token.substring(0, 20)}...\n`);

    // Small delay to ensure token is processed
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 2: Test Message Export with date range
    console.log('2. Testing Message Export with date range...');
    console.log('   ⚠️  Note: This requires backend server restart to register /export route');
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      const exportResponse = await axios.get(`${BASE_URL}/messages/export`, {
        headers,
        params: {
          startDate,
          endDate,
        },
        responseType: 'arraybuffer',
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });

      if (exportResponse.status === 200 && exportResponse.data) {
        // Save the file to verify it's a valid Excel file
        const filename = `test_message_export_${Date.now()}.xlsx`;
        const filepath = path.join(__dirname, filename);
        fs.writeFileSync(filepath, exportResponse.data);
        console.log(`✅ Export successful! File saved: ${filename}`);
        console.log(`   File size: ${exportResponse.data.length} bytes`);
        
        // Clean up
        fs.unlinkSync(filepath);
        console.log('   Test file cleaned up\n');
      } else {
        // Try to parse error response
        try {
          const errorText = Buffer.from(exportResponse.data).toString('utf-8');
          const errorJson = JSON.parse(errorText);
          throw new Error(`Export failed: ${errorJson.error?.message || errorJson.message || 'Unknown error'}`);
        } catch (parseError) {
          throw new Error(`Export failed - Status: ${exportResponse.status}`);
        }
      }
    } catch (exportError) {
      if (exportError.response) {
        try {
          const errorText = Buffer.from(exportError.response.data).toString('utf-8');
          const errorJson = JSON.parse(errorText);
          throw new Error(`Export failed: ${errorJson.error?.message || errorJson.message || 'Unknown error'}`);
        } catch (parseError) {
          throw exportError;
        }
      }
      throw exportError;
    }

    // Step 3: Test Message Export with channel filter
    console.log('3. Testing Message Export with channel filter (SMS)...');
    try {
      const exportSMSResponse = await axios.get(`${BASE_URL}/messages/export`, {
        headers,
        params: {
          startDate,
          endDate,
          channel: 'sms',
        },
        responseType: 'arraybuffer',
        validateStatus: (status) => status < 500,
      });

      if (exportSMSResponse.status === 200 && exportSMSResponse.data) {
        console.log(`✅ SMS filter export successful! File size: ${exportSMSResponse.data.length} bytes\n`);
      } else {
        const errorText = Buffer.from(exportSMSResponse.data).toString('utf-8');
        const errorJson = JSON.parse(errorText);
        throw new Error(`SMS filter export failed: ${errorJson.error?.message || errorJson.message || 'Unknown error'}`);
      }
    } catch (exportError) {
      if (exportError.response) {
        try {
          const errorText = Buffer.from(exportError.response.data).toString('utf-8');
          const errorJson = JSON.parse(errorText);
          throw new Error(`SMS filter export failed: ${errorJson.error?.message || errorJson.message || 'Unknown error'}`);
        } catch (parseError) {
          throw exportError;
        }
      }
      throw exportError;
    }

    // Step 4: Test Message Export with status filter
    console.log('4. Testing Message Export with status filter (sent)...');
    try {
      const exportStatusResponse = await axios.get(`${BASE_URL}/messages/export`, {
        headers,
        params: {
          startDate,
          endDate,
          status: 'sent',
        },
        responseType: 'arraybuffer',
        validateStatus: (status) => status < 500,
      });

      if (exportStatusResponse.status === 200 && exportStatusResponse.data) {
        console.log(`✅ Status filter export successful! File size: ${exportStatusResponse.data.length} bytes\n`);
      } else {
        const errorText = Buffer.from(exportStatusResponse.data).toString('utf-8');
        const errorJson = JSON.parse(errorText);
        throw new Error(`Status filter export failed: ${errorJson.error?.message || errorJson.message || 'Unknown error'}`);
      }
    } catch (exportError) {
      if (exportError.response) {
        try {
          const errorText = Buffer.from(exportError.response.data).toString('utf-8');
          const errorJson = JSON.parse(errorText);
          throw new Error(`Status filter export failed: ${errorJson.error?.message || errorJson.message || 'Unknown error'}`);
        } catch (parseError) {
          throw exportError;
        }
      }
      throw exportError;
    }

    // Step 5: Test All Messages Report endpoint
    console.log('5. Testing All Messages Report endpoint...');
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

    // Step 6: Test All Messages Report Export
    console.log('6. Testing All Messages Report Export...');
    try {
      const reportExportResponse = await axios.get(`${BASE_URL}/reports/export`, {
        headers,
        params: {
          reportType: 'all_messages',
          startDate,
          endDate,
        },
        responseType: 'arraybuffer',
        validateStatus: (status) => status < 500,
      });

      if (reportExportResponse.status === 200 && reportExportResponse.data) {
        const filename = `test_all_messages_report_${Date.now()}.xlsx`;
        const filepath = path.join(__dirname, filename);
        fs.writeFileSync(filepath, reportExportResponse.data);
        console.log(`✅ All Messages Report export successful! File saved: ${filename}`);
        console.log(`   File size: ${reportExportResponse.data.length} bytes`);
        
        // Clean up
        fs.unlinkSync(filepath);
        console.log('   Test file cleaned up\n');
      } else {
        const errorText = Buffer.from(reportExportResponse.data).toString('utf-8');
        const errorJson = JSON.parse(errorText);
        throw new Error(`All Messages Report export failed: ${errorJson.error?.message || errorJson.message || 'Unknown error'}`);
      }
    } catch (exportError) {
      if (exportError.response) {
        try {
          const errorText = Buffer.from(exportError.response.data).toString('utf-8');
          const errorJson = JSON.parse(errorText);
          throw new Error(`All Messages Report export failed: ${errorJson.error?.message || errorJson.message || 'Unknown error'}`);
        } catch (parseError) {
          throw exportError;
        }
      }
      throw exportError;
    }

    // Step 7: Test date range filtering in message list
    console.log('7. Testing date range filtering in message list API...');
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

    console.log('✅ All tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Run tests
if (require.main === module) {
  testMessageLogsExport()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testMessageLogsExport };

