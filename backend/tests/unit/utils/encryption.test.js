const {
  encrypt,
  decrypt,
  hash,
  generateSecureToken,
  generateApiKey,
  verifyApiKeyHash,
  hashKey,
} = require('../../../src/utils/encryption');

describe('Encryption Utility', () => {
  describe('encrypt and decrypt', () => {
    test('should encrypt and decrypt text', () => {
      const originalText = 'sensitive data';
      const encrypted = encrypt(originalText);
      expect(encrypted).toBeDefined();
      expect(encrypted).toContain(':');
      
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(originalText);
    });

    test('should produce different encrypted values for same input', () => {
      const text = 'test';
      const encrypted1 = encrypt(text);
      const encrypted2 = encrypt(text);
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to same value
      expect(decrypt(encrypted1)).toBe(text);
      expect(decrypt(encrypted2)).toBe(text);
    });

    test('should throw error on invalid encrypted text', () => {
      expect(() => {
        decrypt('invalid-encrypted-text');
      }).toThrow();
    });
  });

  describe('hash', () => {
    test('should hash data', () => {
      const data = 'test data';
      const hashed = hash(data);
      expect(hashed).toBeDefined();
      expect(hashed.length).toBe(64); // SHA-256 produces 64 char hex string
    });

    test('should produce same hash for same input', () => {
      const data = 'test';
      const hash1 = hash(data);
      const hash2 = hash(data);
      expect(hash1).toBe(hash2);
    });
  });

  describe('generateSecureToken', () => {
    test('should generate secure token', () => {
      const token = generateSecureToken(32);
      expect(token).toBeDefined();
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    test('should generate different tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateApiKey', () => {
    test('should generate API key with prefix', () => {
      const result = generateApiKey('sk_live_');
      expect(result.key).toContain('sk_live_');
      expect(result.keyHash).toBeDefined();
      expect(result.keyHint).toBeDefined();
      expect(result.keyPrefix).toBe('sk_live_');
    });

    test('should generate unique keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1.key).not.toBe(key2.key);
    });
  });

  describe('verifyApiKeyHash', () => {
    test('should verify correct API key hash', () => {
      const { key, keyHash } = generateApiKey();
      const isValid = verifyApiKeyHash(key, keyHash);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect API key hash', () => {
      const { key } = generateApiKey();
      const wrongHash = hash('wrong-key');
      const isValid = verifyApiKeyHash(key, wrongHash);
      expect(isValid).toBe(false);
    });
  });

  describe('hashKey', () => {
    test('should hash API key', () => {
      const key = 'sk_live_test123';
      const hashed = hashKey(key);
      expect(hashed).toBeDefined();
      expect(hashed.length).toBe(64);
    });
  });
});


