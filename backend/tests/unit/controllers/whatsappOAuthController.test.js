const whatsappOAuthController = require('../../../src/controllers/whatsappOAuthController');
const whatsappOAuthService = require('../../../src/services/whatsappOAuthService');
const { AppError } = require('../../../src/utils/errorTypes');

// Mock dependencies
jest.mock('../../../src/services/whatsappOAuthService');
jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('WhatsApp OAuth Controller', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      organizationId: 'test-org-123',
      user: { id: 'user-123' },
      body: {},
      query: {},
    };

    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  describe('unlinkWABA', () => {
    test('should successfully unlink WABA with confirmation', async () => {
      req.body = { confirm: true };
      whatsappOAuthService.unlinkWABA.mockResolvedValue(true);

      await whatsappOAuthController.unlinkWABA(req, res, next);

      expect(whatsappOAuthService.unlinkWABA).toHaveBeenCalledWith('test-org-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'WABA unlinked successfully',
        correlationId: expect.any(String),
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should throw error when confirmation is missing', async () => {
      req.body = {};

      await whatsappOAuthController.unlinkWABA(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.message).toBe('Confirmation is required to unlink WABA');
      expect(error.statusCode).toBe(400);
    });

    test('should throw error when organizationId is missing', async () => {
      req.organizationId = undefined;
      req.body = { confirm: true };

      await whatsappOAuthController.unlinkWABA(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.message).toBe('Organization ID is required');
      expect(error.statusCode).toBe(400);
    });

    test('should handle service errors', async () => {
      req.body = { confirm: true };
      const serviceError = new AppError('Database error', 500);
      whatsappOAuthService.unlinkWABA.mockRejectedValue(serviceError);

      await whatsappOAuthController.unlinkWABA(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
      expect(res.json).not.toHaveBeenCalled();
    });

    test('should include correlation ID in response', async () => {
      req.body = { confirm: true };
      whatsappOAuthService.unlinkWABA.mockResolvedValue(true);

      await whatsappOAuthController.unlinkWABA(req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.correlationId).toBeDefined();
      expect(response.correlationId).toMatch(/^unlink-\d+-[a-z0-9]+$/);
    });
  });

  describe('verifyConnection', () => {
    test('should successfully verify connection', async () => {
      const mockVerification = {
        verified: true,
        error: null,
        warnings: [],
        details: {
          tokenValid: true,
          wabaValid: true,
          phoneNumberValid: true,
          phoneNumberBelongsToWABA: true,
        },
      };
      whatsappOAuthService.verifyConnection.mockResolvedValue(mockVerification);

      await whatsappOAuthController.verifyConnection(req, res, next);

      expect(whatsappOAuthService.verifyConnection).toHaveBeenCalledWith('test-org-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockVerification,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return verification failure', async () => {
      const mockVerification = {
        verified: false,
        error: 'Access token is invalid or expired',
        warnings: [],
        details: {
          tokenValid: false,
          wabaValid: false,
          phoneNumberValid: false,
          phoneNumberBelongsToWABA: false,
        },
      };
      whatsappOAuthService.verifyConnection.mockResolvedValue(mockVerification);

      await whatsappOAuthController.verifyConnection(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockVerification,
      });
    });

    test('should handle service errors', async () => {
      const serviceError = new Error('Service error');
      whatsappOAuthService.verifyConnection.mockRejectedValue(serviceError);

      await whatsappOAuthController.verifyConnection(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
      expect(res.json).not.toHaveBeenCalled();
    });

    test('should log verification request', async () => {
      const logger = require('../../../src/utils/logger');
      const mockVerification = { verified: true, error: null, details: {} };
      whatsappOAuthService.verifyConnection.mockResolvedValue(mockVerification);

      await whatsappOAuthController.verifyConnection(req, res, next);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Connection verification requested')
      );
    });
  });

  describe('getOAuthStatus', () => {
    test('should return OAuth status successfully', async () => {
      const mockStatus = {
        linked: true,
        linkedVia: 'oauth',
        wabaId: '123456789012345',
        phoneNumberId: '987654321098765',
        hasTokens: true,
        isExpired: false,
        dataValid: {
          wabaValid: true,
          phoneNumberValid: true,
        },
      };
      whatsappOAuthService.getOAuthStatus.mockResolvedValue(mockStatus);

      await whatsappOAuthController.getOAuthStatus(req, res, next);

      expect(whatsappOAuthService.getOAuthStatus).toHaveBeenCalledWith('test-org-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus,
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle service errors', async () => {
      const serviceError = new Error('Service error');
      whatsappOAuthService.getOAuthStatus.mockRejectedValue(serviceError);

      await whatsappOAuthController.getOAuthStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
    });
  });
});

