// Mock dependencies BEFORE requiring the service
jest.mock('../../../src/services/metaGraphApiService');
jest.mock('../../../src/utils/encryption');
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Mock models
jest.mock('../../../src/models', () => {
  const mockSettings = {
    findOne: jest.fn(),
  };
  return {
    OrganizationSettings: mockSettings,
  };
});

// Create mock transaction
const mockTransaction = {
  commit: jest.fn().mockResolvedValue(true),
  rollback: jest.fn().mockResolvedValue(true),
};

// Mock sequelize - provide minimal interface for transaction
jest.mock('../../../src/config/database', () => {
  return {
    sequelize: {
      transaction: jest.fn().mockResolvedValue(mockTransaction),
    },
  };
});

const whatsappOAuthService = require('../../../src/services/whatsappOAuthService');
const { OrganizationSettings } = require('../../../src/models');
const metaGraphApiService = require('../../../src/services/metaGraphApiService');
const { decrypt } = require('../../../src/utils/encryption');
const sequelize = require('../../../src/config/database');
const { AppError } = require('../../../src/utils/errorTypes');

describe('WhatsApp OAuth Service', () => {
  let testOrgId;
  let mockSettings;

  beforeEach(() => {
    jest.clearAllMocks();
    testOrgId = 'test-org-123';
    
    mockSettings = {
      id: 1,
      organizationId: testOrgId,
      metaOAuthAccessToken: 'encrypted-token',
      whatsappAccessToken: null,
      whatsappBusinessAccountId: '123456789012345',
      whatsappPhoneNumberId: '987654321098765',
      wabaLinkedVia: 'oauth',
      wabaLinkedAt: new Date(),
      wabaLinkedBy: 'user-123',
      metaOAuthExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      update: jest.fn().mockResolvedValue(true),
      reload: jest.fn().mockResolvedValue(true),
    };
    
    // Reset transaction mock
    mockTransaction.commit.mockClear();
    mockTransaction.rollback.mockClear();
    sequelize.transaction.mockResolvedValue(mockTransaction);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateWABAData', () => {
    test('should return valid for correct WABA ID format', () => {
      const result = whatsappOAuthService.validateWABAData('123456789012345');
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('should return invalid for missing WABA ID', () => {
      const result = whatsappOAuthService.validateWABAData(null);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('WABA ID is missing');
    });

    test('should return invalid for empty WABA ID', () => {
      const result = whatsappOAuthService.validateWABAData('');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('WABA ID is missing');
    });

    test('should return invalid for test pattern CRUD_', () => {
      const result = whatsappOAuthService.validateWABAData('CRUD_123456789012345');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('WABA ID appears to be test data');
    });

    test('should return invalid for test pattern TEST_', () => {
      const result = whatsappOAuthService.validateWABAData('TEST_123456789012345');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('WABA ID appears to be test data');
    });

    test('should return invalid for test pattern MOCK_', () => {
      const result = whatsappOAuthService.validateWABAData('MOCK_123456789012345');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('WABA ID appears to be test data');
    });

    test('should return invalid for non-numeric WABA ID', () => {
      const result = whatsappOAuthService.validateWABAData('ABC123456789012345');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('WABA ID format is invalid (should be 15-18 numeric digits)');
    });

    test('should return invalid for WABA ID too short', () => {
      const result = whatsappOAuthService.validateWABAData('12345678901234'); // 14 digits
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('WABA ID format is invalid (should be 15-18 numeric digits)');
    });

    test('should return invalid for WABA ID too long', () => {
      const result = whatsappOAuthService.validateWABAData('1234567890123456789'); // 19 digits
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('WABA ID format is invalid (should be 15-18 numeric digits)');
    });

    test('should return valid for 15-digit WABA ID', () => {
      const result = whatsappOAuthService.validateWABAData('123456789012345');
      expect(result.valid).toBe(true);
    });

    test('should return valid for 18-digit WABA ID', () => {
      const result = whatsappOAuthService.validateWABAData('123456789012345678');
      expect(result.valid).toBe(true);
    });
  });

  describe('validatePhoneNumberData', () => {
    test('should return valid for correct Phone Number ID format', () => {
      const result = whatsappOAuthService.validatePhoneNumberData('987654321098765');
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('should return invalid for missing Phone Number ID', () => {
      const result = whatsappOAuthService.validatePhoneNumberData(null);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Phone Number ID is missing');
    });

    test('should return invalid for test pattern CRUD_', () => {
      const result = whatsappOAuthService.validatePhoneNumberData('CRUD_987654321098765');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Phone Number ID appears to be test data');
    });

    test('should return invalid for non-numeric Phone Number ID', () => {
      const result = whatsappOAuthService.validatePhoneNumberData('ABC987654321098765');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Phone Number ID format is invalid (should be 15-18 numeric digits)');
    });

    test('should return valid with warning for 15-16 digit Phone Number ID (App ID pattern)', () => {
      const result = whatsappOAuthService.validatePhoneNumberData('123456789012345'); // 15 digits
      expect(result.valid).toBe(true);
      expect(result.warning).toBe('Phone Number ID format matches App ID pattern - please verify this is correct');
    });

    test('should return valid with warning for 16-digit Phone Number ID', () => {
      const result = whatsappOAuthService.validatePhoneNumberData('1234567890123456'); // 16 digits
      expect(result.valid).toBe(true);
      expect(result.warning).toBe('Phone Number ID format matches App ID pattern - please verify this is correct');
    });

    test('should return valid without warning for 17-digit Phone Number ID', () => {
      const result = whatsappOAuthService.validatePhoneNumberData('12345678901234567'); // 17 digits
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    test('should return valid without warning for 18-digit Phone Number ID', () => {
      const result = whatsappOAuthService.validatePhoneNumberData('123456789012345678'); // 18 digits
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });
  });

  describe('verifyConnection', () => {
    beforeEach(() => {
      decrypt.mockImplementation((encrypted) => {
        if (encrypted === 'encrypted-token') return 'decrypted-access-token';
        return null;
      });
    });

    test('should return verified false when organization settings not found', async () => {
      OrganizationSettings.findOne.mockResolvedValue(null);

      const result = await whatsappOAuthService.verifyConnection(testOrgId);

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Organization settings not found');
      expect(result.details).toEqual({});
    });

    test('should return verified false when no access token found', async () => {
      const settingsWithoutToken = {
        ...mockSettings,
        metaOAuthAccessToken: null,
        whatsappAccessToken: null,
      };
      OrganizationSettings.findOne.mockResolvedValue(settingsWithoutToken);
      decrypt.mockReturnValue(null);

      const result = await whatsappOAuthService.verifyConnection(testOrgId);

      expect(result.verified).toBe(false);
      expect(result.error).toBe('No access token found');
    });

    test('should verify token successfully', async () => {
      OrganizationSettings.findOne.mockResolvedValue(mockSettings);
      metaGraphApiService.makeRequest.mockResolvedValue({ id: 'user-123', name: 'Test User' });

      const result = await whatsappOAuthService.verifyConnection(testOrgId);

      expect(metaGraphApiService.makeRequest).toHaveBeenCalledWith(
        '/me',
        'decrypted-access-token',
        { params: { fields: 'id,name' } }
      );
      expect(result.details.tokenValid).toBe(true);
    });

    test('should return verified false when token is invalid', async () => {
      OrganizationSettings.findOne.mockResolvedValue(mockSettings);
      metaGraphApiService.makeRequest.mockResolvedValue(null);

      const result = await whatsappOAuthService.verifyConnection(testOrgId);

      expect(result.details.tokenValid).toBe(false);
      expect(result.error).toContain('Access token is invalid or expired');
    });

    test('should verify WABA ID successfully', async () => {
      OrganizationSettings.findOne.mockResolvedValue(mockSettings);
      metaGraphApiService.makeRequest
        .mockResolvedValueOnce({ id: 'user-123', name: 'Test User' }) // Token verification
        .mockResolvedValueOnce({ id: '123456789012345', name: 'Test WABA' }); // WABA verification

      const result = await whatsappOAuthService.verifyConnection(testOrgId);

      expect(metaGraphApiService.makeRequest).toHaveBeenCalledWith(
        '/123456789012345',
        'decrypted-access-token',
        { params: { fields: 'id,name,account_review_status' } }
      );
      expect(result.details.wabaValid).toBe(true);
    });

    test('should return error when WABA ID validation fails', async () => {
      const settingsWithInvalidWABA = {
        ...mockSettings,
        whatsappBusinessAccountId: 'CRUD_INVALID',
      };
      OrganizationSettings.findOne.mockResolvedValue(settingsWithInvalidWABA);
      metaGraphApiService.makeRequest.mockResolvedValue({ id: 'user-123' });

      const result = await whatsappOAuthService.verifyConnection(testOrgId);

      expect(result.error).toContain('WABA ID validation failed');
      expect(result.details.wabaValid).toBe(false);
    });

    test('should verify phone number belongs to WABA', async () => {
      OrganizationSettings.findOne.mockResolvedValue(mockSettings);
      metaGraphApiService.makeRequest
        .mockResolvedValueOnce({ id: 'user-123' }) // Token verification
        .mockResolvedValueOnce({ id: '123456789012345' }) // WABA verification
        .mockResolvedValueOnce({ // Phone numbers
          data: [
            { id: '987654321098765', verified_name: 'Test Business', display_phone_number: '+1234567890' },
          ],
        });

      const result = await whatsappOAuthService.verifyConnection(testOrgId);

      expect(metaGraphApiService.makeRequest).toHaveBeenCalledWith(
        '/123456789012345/phone_numbers',
        'decrypted-access-token',
        { params: { fields: 'id,verified_name,display_phone_number' } }
      );
      expect(result.details.phoneNumberValid).toBe(true);
      expect(result.details.phoneNumberBelongsToWABA).toBe(true);
    });

    test('should return error when phone number not found in WABA', async () => {
      OrganizationSettings.findOne.mockResolvedValue(mockSettings);
      metaGraphApiService.makeRequest
        .mockResolvedValueOnce({ id: 'user-123' })
        .mockResolvedValueOnce({ id: '123456789012345' })
        .mockResolvedValueOnce({ data: [] }); // No phone numbers

      const result = await whatsappOAuthService.verifyConnection(testOrgId);

      expect(result.error).toContain('Phone Number ID not found in WABA phone numbers');
      expect(result.details.phoneNumberValid).toBe(false);
    });

    test('should return verified true when all checks pass', async () => {
      OrganizationSettings.findOne.mockResolvedValue(mockSettings);
      metaGraphApiService.makeRequest
        .mockResolvedValueOnce({ id: 'user-123' })
        .mockResolvedValueOnce({ id: '123456789012345' })
        .mockResolvedValueOnce({
          data: [{ id: '987654321098765' }],
        });

      const result = await whatsappOAuthService.verifyConnection(testOrgId);

      expect(result.verified).toBe(true);
      expect(result.error).toBeNull();
    });

    test('should handle API errors gracefully', async () => {
      OrganizationSettings.findOne.mockResolvedValue(mockSettings);
      metaGraphApiService.makeRequest.mockRejectedValue(new Error('API Error'));

      const result = await whatsappOAuthService.verifyConnection(testOrgId);

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Token verification failed: API Error');
    });
  });

  describe('unlinkWABA', () => {
    test('should successfully unlink WABA with transaction', async () => {
      OrganizationSettings.findOne.mockResolvedValue(mockSettings);
      mockSettings.reload = jest.fn().mockResolvedValue({
        ...mockSettings,
        metaOAuthAccessToken: null,
        whatsappBusinessAccountId: null,
      });

      const result = await whatsappOAuthService.unlinkWABA(testOrgId);

      expect(sequelize.transaction).toHaveBeenCalled();
      expect(OrganizationSettings.findOne).toHaveBeenCalledWith({
        where: { organizationId: testOrgId },
        transaction: mockTransaction,
      });
      expect(mockSettings.update).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should throw error when organization settings not found', async () => {
      OrganizationSettings.findOne.mockResolvedValue(null);

      await expect(whatsappOAuthService.unlinkWABA(testOrgId)).rejects.toThrow(
        'Organization settings not found'
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    test('should clear OAuth fields when wabaLinkedVia is oauth', async () => {
      OrganizationSettings.findOne.mockResolvedValue(mockSettings);
      mockSettings.reload = jest.fn().mockResolvedValue({
        ...mockSettings,
        metaOAuthAccessToken: null,
        whatsappBusinessAccountId: null,
        whatsappPhoneNumberId: null,
        whatsappAccessToken: null,
      });

      await whatsappOAuthService.unlinkWABA(testOrgId);

      expect(mockSettings.update).toHaveBeenCalledWith(
        expect.objectContaining({
          metaOAuthAccessToken: null,
          metaOAuthRefreshToken: null,
          metaOAuthExpiresAt: null,
          wabaLinkedAt: null,
          wabaLinkedBy: null,
          wabaLinkedVia: 'manual',
          whatsappBusinessAccountId: null,
          whatsappPhoneNumberId: null,
          whatsappAccessToken: null,
        }),
        { transaction: mockTransaction }
      );
    });

    test('should preserve manual settings when wabaLinkedVia is manual', async () => {
      const manualSettings = {
        ...mockSettings,
        wabaLinkedVia: 'manual',
      };
      OrganizationSettings.findOne.mockResolvedValue(manualSettings);
      manualSettings.reload = jest.fn().mockResolvedValue({
        ...manualSettings,
        metaOAuthAccessToken: null,
      });

      await whatsappOAuthService.unlinkWABA(testOrgId);

      expect(manualSettings.update).toHaveBeenCalledWith(
        expect.objectContaining({
          wabaLinkedVia: 'manual',
        }),
        { transaction: mockTransaction }
      );
    });

    test('should rollback transaction on validation error', async () => {
      OrganizationSettings.findOne.mockResolvedValue(mockSettings);
      mockSettings.reload = jest.fn().mockResolvedValue({
        ...mockSettings,
        metaOAuthAccessToken: 'still-encrypted', // Still has token after unlink
      });

      await expect(whatsappOAuthService.unlinkWABA(testOrgId)).rejects.toThrow(
        'Failed to unlink WABA: Some fields were not cleared'
      );

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    test('should handle database errors and rollback', async () => {
      sequelize.transaction.mockRejectedValue(new Error('Database error'));

      await expect(whatsappOAuthService.unlinkWABA(testOrgId)).rejects.toThrow();

      expect(sequelize.transaction).toHaveBeenCalled();
    });
  });

  describe('getOAuthStatus', () => {
    test('should return linked false when settings not found', async () => {
      OrganizationSettings.findOne.mockResolvedValue(null);

      const result = await whatsappOAuthService.getOAuthStatus(testOrgId);

      expect(result.linked).toBe(false);
      expect(result.linkedVia).toBeNull();
    });

    test('should return linked true when fully linked via OAuth', async () => {
      OrganizationSettings.findOne.mockResolvedValue(mockSettings);

      const result = await whatsappOAuthService.getOAuthStatus(testOrgId);

      expect(result.linked).toBe(true);
      expect(result.linkedVia).toBe('oauth');
      expect(result.wabaId).toBe('123456789012345');
      expect(result.phoneNumberId).toBe('987654321098765');
    });

    test('should return hasTokens true when tokens exist but no WABA', async () => {
      const settingsWithTokensOnly = {
        ...mockSettings,
        whatsappBusinessAccountId: null,
        wabaLinkedVia: null,
      };
      OrganizationSettings.findOne.mockResolvedValue(settingsWithTokensOnly);

      const result = await whatsappOAuthService.getOAuthStatus(testOrgId);

      expect(result.linked).toBe(false);
      expect(result.hasTokens).toBe(true);
      expect(result.linkedVia).toBe('oauth');
    });

    test('should include data validation results', async () => {
      OrganizationSettings.findOne.mockResolvedValue(mockSettings);

      const result = await whatsappOAuthService.getOAuthStatus(testOrgId);

      expect(result.dataValid).toBeDefined();
      expect(result.dataValid.wabaValid).toBe(true);
      expect(result.dataValid.phoneNumberValid).toBe(true);
    });

    test('should flag invalid WABA ID in validation results', async () => {
      const settingsWithInvalidWABA = {
        ...mockSettings,
        whatsappBusinessAccountId: 'CRUD_INVALID',
      };
      OrganizationSettings.findOne.mockResolvedValue(settingsWithInvalidWABA);

      const result = await whatsappOAuthService.getOAuthStatus(testOrgId);

      expect(result.dataValid.wabaValid).toBe(false);
      expect(result.dataValid.wabaWarning).toContain('test data');
    });

    test('should include expiration status', async () => {
      const expiredSettings = {
        ...mockSettings,
        metaOAuthExpiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };
      OrganizationSettings.findOne.mockResolvedValue(expiredSettings);

      const result = await whatsappOAuthService.getOAuthStatus(testOrgId);

      expect(result.isExpired).toBe(true);
    });
  });
});
