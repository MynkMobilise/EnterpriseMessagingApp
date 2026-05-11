const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'https://suchna.onmobilise.com';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Admin123!@#';
const TEST_ORG_SLUG = process.env.TEST_ORG_SLUG || 'organisation';

let authToken = '';
let organizationId = '';

async function login() {
  try {
    console.log('🔐 Logging in...');
    console.log(`   URL: ${API_BASE_URL}/api/v1/auth/login`);
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Org Slug: ${TEST_ORG_SLUG}`);
    
    const response = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      organizationSlug: TEST_ORG_SLUG,
    });

    if (response.data.success) {
      authToken = response.data.data.token;
      organizationId = response.data.data.organization?.id || '';
      console.log('✅ Login successful');
      console.log(`   Organization ID: ${organizationId}`);
      return true;
    }
    console.error('❌ Login response not successful:', response.data);
    return false;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   No response received. Is the backend running?');
      console.error('   Request URL:', error.config?.url);
    }
    return false;
  }
}

async function createTestImage() {
  // Create a simple test image (1x1 PNG)
  const testImagePath = path.join(__dirname, '../uploads/temp/test-image.png');
  const testImageDir = path.dirname(testImagePath);
  
  if (!fs.existsSync(testImageDir)) {
    fs.mkdirSync(testImageDir, { recursive: true });
  }

  // Create a minimal PNG file (1x1 red pixel)
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // Bit depth, color type, etc.
    0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // Image data
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
  ]);

  fs.writeFileSync(testImagePath, pngBuffer);
  return testImagePath;
}

async function testUpload() {
  try {
    console.log('\n📤 Testing Upload...');
    const testImagePath = await createTestImage();
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testImagePath), {
      filename: 'test-image.png',
      contentType: 'image/png',
    });

    const response = await axios.post(
      `${API_BASE_URL}/api/v1/media`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${authToken}`,
          'X-Organization-Id': organizationId,
        },
      }
    );

    if (response.data.success) {
      console.log('✅ Upload successful');
      console.log(`   Media ID: ${response.data.data.id}`);
      console.log(`   Name: ${response.data.data.name}`);
      console.log(`   Type: ${response.data.data.type}`);
      console.log(`   Size: ${response.data.data.size} bytes`);
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('❌ Upload failed:', error.response?.data?.error?.message || error.message);
    if (error.response?.data) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

async function testList() {
  try {
    console.log('\n📋 Testing List...');
    const response = await axios.get(`${API_BASE_URL}/api/v1/media`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'X-Organization-Id': organizationId,
      },
      params: {
        page: 1,
        limit: 10,
      },
    });

    if (response.data.success) {
      console.log('✅ List successful');
      console.log(`   Total media: ${response.data.data.media?.length || 0}`);
      if (response.data.data.pagination) {
        console.log(`   Total count: ${response.data.data.pagination.total}`);
        console.log(`   Page: ${response.data.data.pagination.page}`);
        console.log(`   Limit: ${response.data.data.pagination.limit}`);
      }
      return response.data.data.media || [];
    }
    return [];
  } catch (error) {
    console.error('❌ List failed:', error.response?.data?.error?.message || error.message);
    return [];
  }
}

async function testGetById(mediaId) {
  try {
    console.log('\n🔍 Testing Get By ID...');
    const response = await axios.get(`${API_BASE_URL}/api/v1/media/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'X-Organization-Id': organizationId,
      },
    });

    if (response.data.success) {
      console.log('✅ Get By ID successful');
      console.log(`   Media ID: ${response.data.data.id}`);
      console.log(`   Name: ${response.data.data.name}`);
      console.log(`   URL: ${response.data.data.url}`);
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('❌ Get By ID failed:', error.response?.data?.error?.message || error.message);
    return null;
  }
}

async function testUpdate(mediaId) {
  try {
    console.log('\n✏️  Testing Update...');
    const newName = `Updated-${Date.now()}.png`;
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/media/${mediaId}`,
      { name: newName },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'X-Organization-Id': organizationId,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.success) {
      console.log('✅ Update successful');
      console.log(`   Updated name: ${response.data.data.name}`);
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('❌ Update failed:', error.response?.data?.error?.message || error.message);
    if (error.response?.data) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

async function testStats() {
  try {
    console.log('\n📊 Testing Stats...');
    const response = await axios.get(`${API_BASE_URL}/api/v1/media/stats`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'X-Organization-Id': organizationId,
      },
    });

    if (response.data.success) {
      console.log('✅ Stats successful');
      const stats = response.data.data;
      console.log(`   Total: ${stats.total}`);
      console.log(`   Storage Used: ${stats.storageUsed} MB`);
      console.log(`   Images: ${stats.images}`);
      console.log(`   Videos: ${stats.videos}`);
      console.log(`   Documents: ${stats.documents}`);
      console.log(`   Audio: ${stats.audio}`);
      return stats;
    }
    return null;
  } catch (error) {
    console.error('❌ Stats failed:', error.response?.data?.error?.message || error.message);
    return null;
  }
}

async function testDelete(mediaId) {
  try {
    console.log('\n🗑️  Testing Delete...');
    const response = await axios.delete(`${API_BASE_URL}/api/v1/media/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'X-Organization-Id': organizationId,
      },
    });

    if (response.data.success) {
      console.log('✅ Delete successful');
      console.log(`   Message: ${response.data.message}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Delete failed:', error.response?.data?.error?.message || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Media Library CRUD Test Suite\n');
  console.log('='.repeat(50));

  // Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('\n❌ Cannot proceed without authentication');
    process.exit(1);
  }

  // Test Upload
  const uploadedMedia = await testUpload();
  if (!uploadedMedia) {
    console.error('\n❌ Upload test failed, cannot continue');
    process.exit(1);
  }

  const mediaId = uploadedMedia.id;

  // Test List
  await testList();

  // Test Get By ID
  await testGetById(mediaId);

  // Test Stats
  await testStats();

  // Test Update
  await testUpdate(mediaId);

  // Verify update
  const updatedMedia = await testGetById(mediaId);
  if (updatedMedia && updatedMedia.name.startsWith('Updated-')) {
    console.log('   ✅ Update verified');
  }

  // Test Delete
  await testDelete(mediaId);

  // Verify delete
  const deletedCheck = await testGetById(mediaId);
  if (deletedCheck === null) {
    console.log('   ✅ Delete verified (media not found)');
  }

  // Final stats
  console.log('\n📊 Final Stats:');
  await testStats();

  console.log('\n' + '='.repeat(50));
  console.log('✅ All tests completed!');
}

runTests().catch((error) => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});

