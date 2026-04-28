const {
  encrypt,
  decrypt,
  hash,
  generateApiKey,
  verifyApiKeyHash,
} = require('../../../src/utils/encryption');

describe('Encryption Security Tests', () => {
  describe('Encryption Strength', () => {
    test('should use different IV for each encryption', () => {
      const text = 'sensitive data';
      const encrypted1 = encrypt(text);
      const encrypted2 = encrypt(text);
      
      // Extract IVs (first part before colon)
      const iv1 = encrypted1.split(':')[0];
      const iv2 = encrypted2.split(':')[0];
      
      expect(iv1).not.toBe(iv2);
    });

    test('should not reveal plaintext in encrypted output', () => {
      const text = 'password123';
      const encrypted = encrypt(text);
      expect(encrypted).not.toContain('password');
      expect(encrypted).not.toContain('123');
    });
  });

  describe('Hash Security', () => {
    test('should produce different hashes for different inputs', () => {
      const hash1 = hash('input1');
      const hash2 = hash('input2');
      expect(hash1).not.toBe(hash2);
    });

    test('should be deterministic (same input = same hash)', () => {
      const hash1 = hash('test');
      const hash2 = hash('test');
      expect(hash1).toBe(hash2);
    });

    test('should resist hash collisions (different inputs should not produce same hash)', () => {
      const hash1 = hash('input1');
      const hash2 = hash('input2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('API Key Security', () => {
    test('should generate unique API keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1.key).not.toBe(key2.key);
      expect(key1.keyHash).not.toBe(key2.keyHash);
    });

    test('should hash API keys securely', () => {
      const { key, keyHash } = generateApiKey();
      // Hash should not be reversible
      expect(keyHash).not.toBe(key);
      expect(keyHash.length).toBe(64); // SHA-256
    });

    test('should verify API key hash correctly', () => {
      const { key, keyHash } = generateApiKey();
      expect(verifyApiKeyHash(key, keyHash)).toBe(true);
      expect(verifyApiKeyHash('wrong-key', keyHash)).toBe(false);
    });

    test('should not expose full key in hint', () => {
      const { key, keyHint } = generateApiKey();
      expect(keyHint.length).toBe(4);
      expect(key).not.toBe(keyHint);
    });
  });

  describe('Input Validation', () => {
    test('should handle empty string encryption', () => {
      expect(() => {
        const encrypted = encrypt('');
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe('');
      }).not.toThrow();
    });

    test('should handle special characters in encryption', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encrypt(specialChars);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(specialChars);
    });
  });
});


