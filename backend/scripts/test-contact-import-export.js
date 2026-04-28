const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3003/api/v1';

async function testContactImportExport() {
  console.log('🧪 Testing Contact Import/Export Functionality\n');

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

    // Step 2: Test Template Download
    console.log('2. Testing Template Download...');
    const templateResponse = await axios.get(`${BASE_URL}/contacts/import/template`, {
      headers,
      responseType: 'text',
    });

    if (templateResponse.status === 200 && templateResponse.data) {
      console.log('✅ Template downloaded successfully!');
      console.log(`   Template preview: ${templateResponse.data.substring(0, 100)}...\n`);
    } else {
      throw new Error('Template download failed');
    }

    // Step 3: Test Export
    console.log('3. Testing Contact Export...');
    const exportResponse = await axios.get(`${BASE_URL}/contacts/export`, {
      headers,
      responseType: 'arraybuffer',
    });

    if (exportResponse.status === 200 && exportResponse.data) {
      const filename = `test_contact_export_${Date.now()}.xlsx`;
      const filepath = path.join(__dirname, filename);
      fs.writeFileSync(filepath, exportResponse.data);
      console.log(`✅ Export successful! File saved: ${filename}`);
      console.log(`   File size: ${exportResponse.data.length} bytes`);
      fs.unlinkSync(filepath);
      console.log('   Test file cleaned up\n');
    } else {
      throw new Error('Export failed');
    }

    // Step 4: Test Export with Filters
    console.log('4. Testing Contact Export with filters...');
    const exportFilterResponse = await axios.get(`${BASE_URL}/contacts/export`, {
      headers,
      params: {
        status: 'active',
      },
      responseType: 'arraybuffer',
    });

    if (exportFilterResponse.status === 200 && exportFilterResponse.data) {
      console.log(`✅ Filtered export successful! File size: ${exportFilterResponse.data.length} bytes\n`);
    } else {
      throw new Error('Filtered export failed');
    }

    // Step 5: Test Import (create a test CSV file)
    console.log('5. Testing Contact Import...');
    const testCsv = `name,phoneNumber,email,company,tags,country,city,jobTitle,notes
Test User 1,+1234567890,test1@example.com,Test Corp,"Sales,Marketing",USA,New York,Manager,Test contact 1
Test User 2,+1987654321,test2@example.com,Test Inc,"Support",USA,Los Angeles,Developer,Test contact 2`;

    const testCsvPath = path.join(__dirname, `test_import_${Date.now()}.csv`);
    fs.writeFileSync(testCsvPath, testCsv);

    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testCsvPath));
    formData.append('skipDuplicates', 'true');
    formData.append('updateExisting', 'false');

    const importResponse = await axios.post(`${BASE_URL}/contacts/import`, formData, {
      headers: {
        ...headers,
        ...formData.getHeaders(),
      },
    });

    if (importResponse.data.success) {
      console.log('✅ Import successful!');
      console.log(`   Import ID: ${importResponse.data.data?.id || 'N/A'}`);
      console.log(`   Status: ${importResponse.data.data?.status || 'N/A'}\n`);
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
      console.error('   Data:', JSON.stringify(error.response.data, null, 2).substring(0, 500));
    }
    return false;
  }
}

// Run tests
if (require.main === module) {
  testContactImportExport()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testContactImportExport };

