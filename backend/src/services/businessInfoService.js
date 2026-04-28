const { Organization, OrganizationSettings } = require('../models');
const logger = require('../utils/logger');

class BusinessInfoService {
  /**
   * Get business information from organization for embedded signup pre-filling
   */
  async getBusinessInfoForEmbeddedSignup(organizationId) {
    try {
      const organization = await Organization.findOne({
        where: { id: organizationId },
      });

      if (!organization) {
        return null;
      }

      // Get organization settings for additional info
      const settings = await OrganizationSettings.findOne({
        where: { organizationId },
      });

      // Extract phone number components
      let phoneCode = 91; // Default to India
      let phoneNumber = null;

      if (organization.phone) {
        // Try to extract country code from phone number
        const phoneStr = organization.phone.replace(/\D/g, '');
        if (phoneStr.startsWith('91') && phoneStr.length > 10) {
          phoneCode = 91;
          phoneNumber = phoneStr.substring(2);
        } else if (phoneStr.length === 10) {
          phoneNumber = phoneStr;
        } else {
          phoneNumber = phoneStr;
        }
      }

      // Parse address if available
      let address = {
        streetAddress1: '',
        city: '',
        state: '',
        zipPostal: '',
        country: '',
      };

      if (organization.address) {
        // Simple address parsing (can be enhanced)
        const addressParts = organization.address.split(',').map(s => s.trim());
        if (addressParts.length > 0) {
          address.streetAddress1 = addressParts[0];
        }
        if (addressParts.length > 1) {
          address.city = addressParts[1];
        }
        if (addressParts.length > 2) {
          address.state = addressParts[2];
        }
        if (addressParts.length > 3) {
          address.zipPostal = addressParts[3];
        }
        if (addressParts.length > 4) {
          address.country = addressParts[4];
        }
      }

      // Get timezone (default to UTC+05:30 for India)
      const timezone = this.detectTimezone(organization);

      return {
        name: organization.name || '',
        email: organization.email || '',
        phone: phoneNumber ? {
          code: phoneCode,
          number: phoneNumber,
        } : null,
        address: address,
        timezone: timezone,
        website: organization.website || '',
      };
    } catch (error) {
      logger.error('Error getting business info:', error);
      return null;
    }
  }

  /**
   * Format business information for OAuth extras parameter
   */
  formatBusinessInfoForExtras(businessInfo, options = {}) {
    const {
      displayName,
      category,
      description,
    } = options;

    const extras = {
      feature: 'whatsapp_embedded_signup',
      features: [
        { name: 'marketing_messages_lite' },
      ],
      setup: {},
    };

    // Add business information if available
    if (businessInfo) {
      extras.setup.business = {
        name: businessInfo.name || '',
        email: businessInfo.email || '',
        isWebsiteRequired: false,
      };

      if (businessInfo.phone) {
        extras.setup.business.phone = businessInfo.phone;
      }

      if (businessInfo.address) {
        extras.setup.business.address = businessInfo.address;
      }

      if (businessInfo.timezone) {
        extras.setup.business.timezone = businessInfo.timezone;
      }
    }

    // Add phone display information
    if (displayName || category || description) {
      extras.setup.phone = {};
      if (displayName) {
        extras.setup.phone.displayName = displayName;
      }
      if (category) {
        extras.setup.phone.category = category;
      }
      if (description) {
        extras.setup.phone.description = description;
      }
    }

    return extras;
  }

  /**
   * Detect timezone from organization data or default
   */
  detectTimezone(organization) {
    // Try to detect from address/country
    // For now, default to UTC+05:30 (India)
    // Can be enhanced with country-to-timezone mapping
    return 'UTC+05:30';
  }

  /**
   * Validate business information format
   */
  validateBusinessInfo(businessInfo) {
    const errors = [];

    if (businessInfo.name && businessInfo.name.length > 100) {
      errors.push('Business name must be 100 characters or less');
    }

    if (businessInfo.email && !this.isValidEmail(businessInfo.email)) {
      errors.push('Invalid email format');
    }

    if (businessInfo.phone) {
      if (!businessInfo.phone.code || !businessInfo.phone.number) {
        errors.push('Phone number must include both code and number');
      }
      if (businessInfo.phone.number && !/^\d+$/.test(businessInfo.phone.number)) {
        errors.push('Phone number must contain only digits');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Simple email validation
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = new BusinessInfoService();

