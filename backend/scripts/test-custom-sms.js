/**
 * Test script for Custom SMS Provider Integration (SMS Bhejo)
 * 
 * This script tests:
 * - SMS sending with custom provider
 * - Message formatting
 * - Error handling
 * - Response parsing
 */

require('dotenv').config();
const axios = require('axios');
const { encrypt, decrypt } = require('../src/utils/encryption');

// Test configuration (replace with actual values)
const TEST_CONFIG = {
  apiUrl: 'http://smsbhejo.org/submitsms.jsp',
  apiUser: 'Mobilise',
  apiKey: '5a742652daXX', // Replace with actual key
  entityId: 'PE_ID_VALUE', // Replace with actual PE ID
  templateId: '1207163922745202205', // Optional
  accUsage: '1',
  senderId: 'SENDER_ID', // Replace with actual sender ID
};

/**
 * Format message for custom provider
 */
function formatMessageForCustomProvider(messageContent) {
  let formatted = messageContent || '';
  
  // Remove HTML tags
  formatted = formatted.replace(/<[^>]*>/g, '');
  
  // Replace & with "and"
  formatted = formatted.replace(/&/g, 'and');
  
  // Replace spaces with %20
  formatted = formatted.replace(/ /g, '%20');
  
  // Remove newlines and carriage returns
  formatted = formatted.replace(/\r|\n/g, '');
  
  return formatted;
}

/**
 * Test message formatting
 */
function testMessageFormatting() {
  console.log('\n=== Testing Message Formatting ===');
  
  const testCases = [
    {
      input: 'Hello World',
      expected: 'Hello%20World',
    },
    {
      input: 'Test & Message',
      expected: 'Test%20and%20Message',
    },
    {
      input: '<b>Bold</b> Text',
      expected: 'Bold%20Text',
    },
    {
      input: 'Line 1\nLine 2',
      expected: 'Line%201Line%202',
    },
    {
      input: 'Special chars: & < >',
      expected: 'Special%20chars:%20and%20%20%20',
    },
  ];

  testCases.forEach((testCase, index) => {
    const result = formatMessageForCustomProvider(testCase.input);
    const passed = result === testCase.expected;
    console.log(`Test ${index + 1}: ${passed ? '✓ PASSED' : '✗ FAILED'}`);
    console.log(`  Input:    "${testCase.input}"`);
    console.log(`  Expected: "${testCase.expected}"`);
    console.log(`  Got:      "${result}"`);
    if (!passed) {
      console.log('  ⚠ Mismatch!');
    }
  });
}

/**
 * Test URL building
 */
function testUrlBuilding() {
  console.log('\n=== Testing URL Building ===');
  
  const recipientPhone = '919599194330';
  const message = 'Test message from custom provider';
  const formattedMessage = formatMessageForCustomProvider(message);
  
  const urlParams = new URLSearchParams({
    user: TEST_CONFIG.apiUser,
    key: TEST_CONFIG.apiKey,
    mobile: recipientPhone,
    message: formattedMessage,
    senderid: TEST_CONFIG.senderId,
    accusage: TEST_CONFIG.accUsage,
    entityid: TEST_CONFIG.entityId,
  });

  if (TEST_CONFIG.templateId) {
    urlParams.append('tempid', TEST_CONFIG.templateId);
  }

  const requestUrl = `${TEST_CONFIG.apiUrl}?${urlParams.toString()}`;
  
  console.log('Built URL (API key masked):');
  console.log(requestUrl.replace(/key=[^&]+/, 'key=***'));
  console.log('\nFull URL parameters:');
  console.log(`  user: ${TEST_CONFIG.apiUser}`);
  console.log(`  key: *** (hidden)`);
  console.log(`  mobile: ${recipientPhone}`);
  console.log(`  message: ${formattedMessage}`);
  console.log(`  senderid: ${TEST_CONFIG.senderId}`);
  console.log(`  accusage: ${TEST_CONFIG.accUsage}`);
  console.log(`  entityid: ${TEST_CONFIG.entityId}`);
  if (TEST_CONFIG.templateId) {
    console.log(`  tempid: ${TEST_CONFIG.templateId}`);
  }
}

/**
 * Test encryption/decryption
 */
function testEncryption() {
  console.log('\n=== Testing Encryption ===');
  
  const originalKey = TEST_CONFIG.apiKey;
  
  try {
    const encrypted = encrypt(originalKey);
    console.log(`Original: ${originalKey}`);
    console.log(`Encrypted: ${encrypted.substring(0, 50)}...`);
    
    const decrypted = decrypt(encrypted);
    console.log(`Decrypted: ${decrypted}`);
    
    if (decrypted === originalKey) {
      console.log('✓ Encryption/Decryption test PASSED');
    } else {
      console.log('✗ Encryption/Decryption test FAILED');
    }
  } catch (error) {
    console.log(`✗ Encryption test FAILED: ${error.message}`);
  }
}

/**
 * Test actual SMS sending (if credentials are provided)
 */
async function testSmsSending() {
  console.log('\n=== Testing SMS Sending ===');
  
  // Check if test credentials are provided
  if (TEST_CONFIG.apiKey === '5a742652daXX' || TEST_CONFIG.apiKey.includes('REPLACE')) {
    console.log('⚠ Skipping actual SMS send - please update TEST_CONFIG with real credentials');
    return;
  }

  const recipientPhone = '919599194330'; // Replace with test number
  const message = 'Test SMS from custom provider integration';
  const formattedMessage = formatMessageForCustomProvider(message);
  
  const urlParams = new URLSearchParams({
    user: TEST_CONFIG.apiUser,
    key: TEST_CONFIG.apiKey,
    mobile: recipientPhone,
    message: formattedMessage,
    senderid: TEST_CONFIG.senderId,
    accusage: TEST_CONFIG.accUsage,
    entityid: TEST_CONFIG.entityId,
  });

  if (TEST_CONFIG.templateId) {
    urlParams.append('tempid', TEST_CONFIG.templateId);
  }

  const requestUrl = `${TEST_CONFIG.apiUrl}?${urlParams.toString()}`;

  try {
    console.log(`Sending SMS to ${recipientPhone}...`);
    const response = await axios.get(requestUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 30000,
    });

    console.log('✓ SMS sent successfully');
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
  } catch (error) {
    console.log('✗ SMS send failed');
    if (error.response) {
      console.log('  Status:', error.response.status);
      console.log('  Data:', error.response.data);
    } else if (error.request) {
      console.log('  No response received');
    } else {
      console.log('  Error:', error.message);
    }
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('========================================');
  console.log('Custom SMS Provider Integration Tests');
  console.log('========================================');

  // Test message formatting
  testMessageFormatting();

  // Test URL building
  testUrlBuilding();

  // Test encryption
  testEncryption();

  // Test actual SMS sending (if credentials provided)
  await testSmsSending();

  console.log('\n========================================');
  console.log('Tests completed');
  console.log('========================================');
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  formatMessageForCustomProvider,
  testMessageFormatting,
  testUrlBuilding,
  testEncryption,
  testSmsSending,
};

