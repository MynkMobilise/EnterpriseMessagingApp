/**
 * Test SMS decryption using the same ENCRYPTION_KEY for both encryption and decryption
 * This simulates the real-world scenario where the server uses the same key
 */

const { encrypt, decrypt, isEncrypted } = require('../src/utils/encryption');

console.log('========================================');
console.log('SMS Decryption Test (Same Key)');
console.log('========================================\n');

const TEST_API_KEY = 'test-api-key-12345-abcdef';

try {
  // Test 1: Encrypt
  console.log('Test 1: Encrypting API key...');
  const encrypted = encrypt(TEST_API_KEY);
  console.log(`✓ Encryption successful`);
  console.log(`  Encrypted format: ${encrypted.substring(0, 50)}...`);
  
  // Test 2: Verify encrypted format
  console.log('\nTest 2: Verifying encrypted format...');
  const isEnc = isEncrypted(encrypted);
  console.log(`  isEncrypted() result: ${isEnc ? '✓ YES' : '✗ NO'}`);
  if (!isEnc) {
    throw new Error('isEncrypted() failed to detect encrypted format');
  }
  
  // Test 3: Decrypt
  console.log('\nTest 3: Decrypting API key...');
  const decrypted = decrypt(encrypted);
  console.log(`✓ Decryption successful`);
  
  // Test 4: Verify match
  console.log('\nTest 4: Verifying decrypted key matches original...');
  const matches = decrypted === TEST_API_KEY;
  console.log(`  Original: ${TEST_API_KEY}`);
  console.log(`  Decrypted: ${decrypted}`);
  console.log(`  Match: ${matches ? '✓ YES' : '✗ NO'}`);
  
  if (!matches) {
    throw new Error('Decrypted key does not match original');
  }
  
  // Test 5: Test plain text detection
  console.log('\nTest 5: Testing plain text detection...');
  const plainText1 = 'plain-text-key';
  const plainText2 = 'key:with:colons';
  
  console.log(`  Plain text without colon: ${isEncrypted(plainText1) ? '✗ INCORRECTLY DETECTED' : '✓ CORRECTLY NOT DETECTED'}`);
  console.log(`  Plain text with colons: ${isEncrypted(plainText2) ? '✗ INCORRECTLY DETECTED' : '✓ CORRECTLY NOT DETECTED'}`);
  
  // Test 6: Simulate SMS service decryption logic
  console.log('\nTest 6: Simulating SMS service decryption logic...');
  let apiKeyForSMS = encrypted; // This is what would come from database
  let finalKey = apiKeyForSMS;
  
  if (isEncrypted(apiKeyForSMS)) {
    try {
      finalKey = decrypt(apiKeyForSMS);
      console.log(`✓ Decryption in SMS service logic successful`);
      console.log(`  Final key matches original: ${finalKey === TEST_API_KEY ? '✓ YES' : '✗ NO'}`);
    } catch (error) {
      throw new Error(`SMS service decryption failed: ${error.message}`);
    }
  } else {
    throw new Error('SMS service did not detect encrypted format');
  }
  
  console.log('\n========================================');
  console.log('✓ ALL TESTS PASSED');
  console.log('SMS decryption is working correctly!');
  console.log('========================================\n');
  
} catch (error) {
  console.error('\n========================================');
  console.error('✗ TEST FAILED:', error.message);
  console.error('========================================\n');
  process.exit(1);
}

