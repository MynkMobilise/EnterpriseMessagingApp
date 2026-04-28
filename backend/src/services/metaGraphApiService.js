const axios = require('axios');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errorTypes');

class MetaGraphApiService {
  constructor() {
    this.baseUrl = 'https://graph.facebook.com';
    this.apiVersion = 'v18.0';
  }

  /**
   * Make Graph API request with error handling
   */
  async makeRequest(endpoint, accessToken, options = {}) {
    const { method = 'GET', data = null, params = {}, skipAuth = false } = options;
    
    try {
      const url = `${this.baseUrl}/${this.apiVersion}${endpoint}`;
      const config = {
        method,
        url,
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          ...params,
        },
      };

      // Only add auth if not skipped
      if (!skipAuth && accessToken) {
        config.headers['Authorization'] = `Bearer ${accessToken}`;
        config.params.access_token = accessToken; // Some endpoints require access_token in params
      }

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  /**
   * Get user's businesses
   */
  async getBusinesses(accessToken) {
    try {
      const response = await this.makeRequest('/me/businesses', accessToken, {
        params: {
          fields: 'id,name,primary_page',
        },
      });
      return response.data || [];
    } catch (error) {
      logger.error('Error fetching businesses:', error);
      throw error;
    }
  }

  /**
   * Get WABAs for a business
   */
  async getWABAs(businessId, accessToken) {
    try {
      const response = await this.makeRequest(`/${businessId}/owned_whatsapp_business_accounts`, accessToken, {
        params: {
          fields: 'id,name,account_review_status,message_template_namespace,is_enabled_for_compliance,timezone_id',
        },
      });
      return response.data || [];
    } catch (error) {
      logger.error(`Error fetching WABAs for business ${businessId}:`, error);
      throw error;
    }
  }

  /**
   * Get phone numbers for a WABA
   */
  async getPhoneNumbers(wabaId, accessToken) {
    try {
      const response = await this.makeRequest(`/${wabaId}/phone_numbers`, accessToken, {
        params: {
          fields: 'id,verified_name,display_phone_number,quality_rating,code_verification_status,throughput,last_onboarded_time',
        },
      });
      return response.data || [];
    } catch (error) {
      logger.error(`Error fetching phone numbers for WABA ${wabaId}:`, error);
      throw error;
    }
  }

  /**
   * Get business verification status
   */
  async getBusinessVerificationStatus(businessId, accessToken) {
    try {
      const response = await this.makeRequest(`/${businessId}`, accessToken, {
        params: {
          fields: 'verification_status,is_eligible_for_business_verification',
        },
      });
      return response;
    } catch (error) {
      logger.error(`Error fetching verification status for business ${businessId}:`, error);
      throw error;
    }
  }

  /**
   * Get phone number quality rating
   */
  async getPhoneNumberQualityRating(phoneNumberId, accessToken) {
    try {
      const response = await this.makeRequest(`/${phoneNumberId}`, accessToken, {
        params: {
          fields: 'quality_rating,code_verification_status,verified_name',
        },
      });
      return response;
    } catch (error) {
      logger.error(`Error fetching quality rating for phone ${phoneNumberId}:`, error);
      throw error;
    }
  }


  /**
   * Handle Graph API errors
   */
  handleApiError(error) {
    if (error.response) {
      const { status, data } = error.response;
      const errorMessage = data?.error?.message || 'Graph API error';
      const errorCode = data?.error?.code || status;
      const errorType = data?.error?.type || 'Unknown';

      logger.error(`Graph API Error [${status}]:`, {
        message: errorMessage,
        code: errorCode,
        type: errorType,
        data: data?.error,
      });

      // Handle rate limiting
      if (status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 60;
        throw new AppError(
          `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
          429
        );
      }

      // Handle authentication errors
      if (status === 401 || status === 403) {
        throw new AppError(
          `Authentication failed: ${errorMessage}`,
          status
        );
      }

      // Handle other errors
      throw new AppError(
        `Graph API error: ${errorMessage} (Code: ${errorCode})`,
        status
      );
    }

    // Network or other errors
    logger.error('Graph API request failed:', error.message);
    throw new AppError(
      `Failed to connect to Graph API: ${error.message}`,
      500
    );
  }

  /**
   * Check rate limit from response headers
   */
  checkRateLimit(response) {
    const headers = response.headers || {};
    const callCount = headers['x-app-usage'] || headers['x-business-use-case-usage'] || '{}';
    
    try {
      const usage = typeof callCount === 'string' ? JSON.parse(callCount) : callCount;
      
      // Check if approaching rate limit
      if (usage.call_count > 0.8 || usage.total_cputime > 0.8 || usage.total_time > 0.8) {
        logger.warn('Approaching Graph API rate limit:', usage);
        return {
          warning: true,
          usage,
        };
      }

      return {
        warning: false,
        usage,
      };
    } catch (error) {
      return {
        warning: false,
        usage: {},
      };
    }
  }
}

module.exports = new MetaGraphApiService();

