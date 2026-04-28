const crypto = require('crypto');
require('dotenv').config();

// Generate or use ENCRYPTION_KEY - must be 64 hex characters (32 bytes) for AES-256
let ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
} else {
  // Ensure key is exactly 64 hex characters (32 bytes)
  // If shorter, pad with zeros; if longer, truncate
  if (ENCRYPTION_KEY.length < 64) {
    ENCRYPTION_KEY = ENCRYPTION_KEY.padEnd(64, '0');
  } else if (ENCRYPTION_KEY.length > 64) {
    ENCRYPTION_KEY = ENCRYPTION_KEY.substring(0, 64);
  }
}

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Encrypt data
 * @param {string} text - Text to encrypt
 * @returns {string} Encrypted text (iv:encrypted)
 */
const encrypt = (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Text to encrypt must be a non-empty string');
  }
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    // ENCRYPTION_KEY is 64 hex chars = 32 bytes for AES-256
    const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
    if (keyBuffer.length !== 32) {
      throw new Error(`Invalid encryption key length: expected 32 bytes, got ${keyBuffer.length}`);
    }
    
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    throw new Error('Encryption failed: ' + error.message);
  }
};

/**
 * Decrypt data
 * @param {string} encryptedText - Encrypted text (iv:encrypted)
 * @returns {string} Decrypted text
 */
const decrypt = (encryptedText) => {
  if (!encryptedText || typeof encryptedText !== 'string') {
    throw new Error('Encrypted text must be a non-empty string');
  }
  
  try {
    const textParts = encryptedText.split(':');
    if (textParts.length < 2) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encrypted = Buffer.from(textParts.join(':'), 'hex');
    
    // ENCRYPTION_KEY is 64 hex chars = 32 bytes for AES-256
    const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
    if (keyBuffer.length !== 32) {
      throw new Error(`Invalid encryption key length: expected 32 bytes, got ${keyBuffer.length}`);
    }
    
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error('Decryption failed: ' + error.message);
  }
};

/**
 * Hash data using SHA-256
 * @param {string} data - Data to hash
 * @returns {string} Hashed value
 */
const hash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Generate secure random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} Random token (hex)
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate API key
 * @param {string} prefix - Key prefix (e.g., 'sk_live_')
 * @returns {Object} API key object with key and hash
 */
const generateApiKey = (prefix = 'sk_') => {
  const randomPart = generateSecureToken(32);
  const key = prefix + randomPart;
  const keyHash = hash(key);
  const keyHint = randomPart.substring(randomPart.length - 4); // Last 4 chars as hint

  return {
    key,
    keyHash,
    keyHint,
    keyPrefix: prefix,
  };
};

/**
 * Verify API key hash
 * @param {string} key - API key
 * @param {string} hash - Stored hash
 * @returns {boolean} True if matches
 */
const verifyApiKeyHash = (key, hash) => {
  const computedHash = hashKey(key);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash),
    Buffer.from(hash)
  );
};

/**
 * Hash API key (alias for hash)
 * @param {string} key - API key
 * @returns {string} Hashed key
 */
const hashKey = (key) => {
  return hash(key);
};

/**
 * Check if a string is in encrypted format
 * Encrypted format: {32 hex chars}:{variable hex chars}
 * @param {string} text - Text to check
 * @returns {boolean} True if text appears to be encrypted
 */
const isEncrypted = (text) => {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  // Encrypted format must contain ':'
  if (!text.includes(':')) {
    return false;
  }
  
  const parts = text.split(':');
  
  // Must have at least 2 parts (IV and encrypted data)
  if (parts.length < 2) {
    return false;
  }
  
  const iv = parts[0];
  const encrypted = parts.slice(1).join(':'); // Rejoin in case encrypted data contains ':'
  
  // IV must be exactly 32 hex characters (16 bytes)
  if (iv.length !== 32) {
    return false;
  }
  
  // Both IV and encrypted data must be valid hex strings
  const hexPattern = /^[0-9a-fA-F]+$/;
  if (!hexPattern.test(iv) || !hexPattern.test(encrypted)) {
    return false;
  }
  
  // Encrypted data should not be empty
  if (encrypted.length === 0) {
    return false;
  }
  
  return true;
};

module.exports = {
  encrypt,
  decrypt,
  hash,
  generateSecureToken,
  generateApiKey,
  verifyApiKeyHash,
  hashKey,
  isEncrypted,
};


