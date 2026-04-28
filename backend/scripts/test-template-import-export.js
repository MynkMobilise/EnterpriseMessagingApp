const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3003/api/v1';

async function testTemplateImportExport() {
  console.log('🧪 Testing Template Import/Export Functionality\n');

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

    // Step 2: Test Template Download for each channel
    const channels = ['sms', 'whatsapp', 'email', 'fcm'];
    for (const channel of channels) {
      console.log(`2.${channels.indexOf(channel) + 1}. Testing ${channel.toUpperCase()} Template Download...`);
      const templateResponse = await axios.get(`${BASE_URL}/templates/import/template`, {
        headers,
        params: { channel },
        responseType: 'text',
      });

      if (templateResponse.status === 200 && templateResponse.data) {
        console.log(`✅ ${channel.toUpperCase()} template downloaded successfully!`);
        console.log(`   Preview: ${templateResponse.data.substring(0, 100)}...\n`);
      } else {
        throw new Error(`${channel} template download failed`);
      }
    }

    // Step 3: Test Export
    console.log('3. Testing Template Export...');
    const exportResponse = await axios.get(`${BASE_URL}/templates/export`, {
      headers,
      responseType: 'arraybuffer',
    });

    if (exportResponse.status === 200 && exportResponse.data) {
      const filename = `test_template_export_${Date.now()}.xlsx`;
      const filepath = path.join(__dirname, filename);
      fs.writeFileSync(filepath, exportResponse.data);
      console.log(`✅ Export successful! File saved: ${filename}`);
      console.log(`   File size: ${exportResponse.data.length} bytes`);
      fs.unlinkSync(filepath);
      console.log('   Test file cleaned up\n');
    } else {
      throw new Error('Export failed');
    }

    // Step 4: Test Export with Channel Filter
    console.log('4. Testing Template Export with channel filter (SMS)...');
    const exportFilterResponse = await axios.get(`${BASE_URL}/templates/export`, {
      headers,
      params: {
        channel: 'sms',
      },
      responseType: 'arraybuffer',
    });

    if (exportFilterResponse.status === 200 && exportFilterResponse.data) {
      console.log(`✅ Filtered export successful! File size: ${exportFilterResponse.data.length} bytes\n`);
    } else {
      throw new Error('Filtered export failed');
    }

    // Step 5: Test Import (create a test CSV file for SMS)
    console.log('5. Testing Template Import (SMS)...');
    const testCsv = `name,body,smsTemplateId,category,language,description
Test SMS Template 1,Hello #var# your OTP is #var#,1207163922745202205,transactional,en,Test template 1
Test SMS Template 2,Your order #var# has been confirmed,1207163922745202206,transactional,en,Test template 2`;

    const testCsvPath = path.join(__dirname, `test_template_import_${Date.now()}.csv`);
    fs.writeFileSync(testCsvPath, testCsv);

    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testCsvPath));
    formData.append('channel', 'sms');
    formData.append('skipDuplicates', 'true');
    formData.append('updateExisting', 'false');

    const importResponse = await axios.post(`${BASE_URL}/templates/import`, formData, {
      headers: {
        ...headers,
        ...formData.getHeaders(),
      },
    });

    if (importResponse.data.success) {
      console.log('✅ Import successful!');
      console.log(`   Import ID: ${importResponse.data.data?.id || 'N/A'}`);
      console.log(`   Status: ${importResponse.data.data?.status || 'N/A'}`);
      console.log(`   Successful: ${importResponse.data.data?.successfulImports || 0}`);
      console.log(`   Failed: ${importResponse.data.data?.failedImports || 0}`);
      console.log(`   Duplicates: ${importResponse.data.data?.duplicateTemplates || 0}\n`);
    } else {
      throw new Error('Import failed');
    }

    // Cleanup test file
    fs.unlinkSync(testCsvPath);

    console.log('✅ All tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      const errorData = error.response.data;
      if (typeof errorData === 'string') {
        console.error('   Data:', errorData.substring(0, 500));
      } else {
        console.error('   Data:', JSON.stringify(errorData, null, 2).substring(0, 500));
      }
    }
    return false;
  }
}

// Run tests
if (require.main === module) {
  testTemplateImportExport()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testTemplateImportExport };

