/**
 * Diagnostic script to test email configuration password encryption/decryption
 * Usage: node backend/scripts/test-email-config-password.js <configurationId> <organizationId>
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { EmailConfiguration } = require('../src/models');
const { encrypt, decrypt } = require('../src/utils/encryption');

async function testPasswordEncryption(configId, orgId) {
  try {
    console.log('\n🔍 Testing Email Configuration Password Encryption/Decryption\n');
    console.log(`Configuration ID: ${configId}`);
    console.log(`Organization ID: ${orgId}\n`);

    // Get configuration
    const config = await EmailConfiguration.findOne({
      where: { id: configId, organizationId: orgId },
    });

    if (!config) {
      console.error('❌ Configuration not found!');
      process.exit(1);
    }

    console.log('📋 Configuration Details:');
    console.log(`  Name: ${config.name}`);
    console.log(`  Provider: ${config.provider}`);
    console.log(`  Host: ${config.smtpHost}`);
    console.log(`  Port: ${config.smtpPort}`);
    console.log(`  Username: ${config.smtpUsername || 'not set'}`);
    console.log(`  Password Encrypted: ${config.smtpPasswordEncrypted ? 'Yes' : 'No'}`);

    if (!config.smtpPasswordEncrypted) {
      console.log('\n⚠️  No password found in configuration!');
      process.exit(1);
    }

    // Check if encrypted
    const isEncrypted = config.smtpPasswordEncrypted.includes(':');
    console.log(`  Is Encrypted: ${isEncrypted ? 'Yes' : 'No'}`);

    if (isEncrypted) {
      console.log('\n🔓 Attempting to decrypt password...');
      try {
        const decryptedPassword = decrypt(config.smtpPasswordEncrypted);
        console.log('✅ Password decrypted successfully!');
        console.log(`  Decrypted Password Length: ${decryptedPassword.length} characters`);
        console.log(`  First 3 chars: ${decryptedPassword.substring(0, 3)}***`);
        console.log(`  Last 3 chars: ***${decryptedPassword.substring(decryptedPassword.length - 3)}`);
        
        // Test re-encryption
        console.log('\n🔐 Testing re-encryption...');
        const reEncrypted = encrypt(decryptedPassword);
        console.log('✅ Re-encryption successful!');
        console.log(`  Original encrypted length: ${config.smtpPasswordEncrypted.length}`);
        console.log(`  Re-encrypted length: ${reEncrypted.length}`);
        
        // Try decrypting the re-encrypted version
        const reDecrypted = decrypt(reEncrypted);
        if (reDecrypted === decryptedPassword) {
          console.log('✅ Re-encryption/decryption cycle successful!');
        } else {
          console.log('❌ Re-encryption/decryption cycle failed!');
        }
      } catch (error) {
        console.error('❌ Decryption failed:', error.message);
        console.error('   This might indicate:');
        console.error('   - Encryption key mismatch');
        console.error('   - Corrupted encrypted data');
        console.error('   - Invalid encryption format');
        process.exit(1);
      }
    } else {
      console.log('\n⚠️  Password is stored as plain text (not encrypted)');
      console.log(`  Password Length: ${config.smtpPasswordEncrypted.length} characters`);
      console.log(`  First 3 chars: ${config.smtpPasswordEncrypted.substring(0, 3)}***`);
      
      // Test encryption
      console.log('\n🔐 Testing encryption...');
      try {
        const encrypted = encrypt(config.smtpPasswordEncrypted);
        console.log('✅ Encryption successful!');
        console.log(`  Encrypted length: ${encrypted.length}`);
        
        // Test decryption
        const decrypted = decrypt(encrypted);
        if (decrypted === config.smtpPasswordEncrypted) {
          console.log('✅ Encryption/decryption cycle successful!');
        } else {
          console.log('❌ Encryption/decryption cycle failed!');
        }
      } catch (error) {
        console.error('❌ Encryption failed:', error.message);
        process.exit(1);
      }
    }

    console.log('\n✅ Diagnostic complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Get command line arguments
const configId = process.argv[2];
const orgId = process.argv[3];

if (!configId || !orgId) {
  console.error('Usage: node backend/scripts/test-email-config-password.js <configurationId> <organizationId>');
  process.exit(1);
}

testPasswordEncryption(configId, orgId);

