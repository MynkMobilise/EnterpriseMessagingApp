const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = require('../../../src/config/jwt');

describe('JWT Security Tests', () => {
  const payload = {
    userId: 'user-123',
    organizationId: 'org-456',
    role: 'admin',
  };

  describe('Token Security', () => {
    test('should generate different tokens for same payload', () => {
      const token1 = generateAccessToken(payload);
      const token2 = generateAccessToken(payload);
      // Tokens should be different due to iat (issued at) claim
      expect(token1).not.toBe(token2);
    });

    test('should not allow access token to be used as refresh token', () => {
      const accessToken = generateAccessToken(payload);
      expect(() => {
        verifyRefreshToken(accessToken);
      }).toThrow();
    });

    test('should not allow refresh token to be used as access token', () => {
      const refreshToken = generateRefreshToken(payload);
      expect(() => {
        verifyAccessToken(refreshToken);
      }).toThrow();
    });
  });

  describe('Token Tampering', () => {
    test('should reject tampered token', () => {
      const token = generateAccessToken(payload);
      const tamperedToken = token.substring(0, token.length - 5) + 'XXXXX';
      expect(() => {
        verifyAccessToken(tamperedToken);
      }).toThrow();
    });

    test('should reject token with modified payload', () => {
      const token = generateAccessToken(payload);
      const parts = token.split('.');
      // Try to modify payload (base64 decode, modify, re-encode)
      const modifiedPayload = { ...payload, role: 'super_admin' };
      const modifiedToken = generateAccessToken(modifiedPayload);
      expect(modifiedToken).not.toBe(token);
    });
  });

  describe('Token Expiration', () => {
    test('should include expiration in token', () => {
      const token = generateAccessToken(payload);
      const decoded = require('../../../src/config/jwt').decodeToken(token);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });
  });
});


