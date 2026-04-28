const templateImportService = require('../services/templateImportService');
const { AppError } = require('../utils/errorTypes');

class TemplateImportController {
  /**
   * Upload and import templates from CSV
   */
  async import(req, res, next) {
    try {
      if (!req.file) {
        throw new AppError('CSV file is required', 400);
      }

      // Validate channel parameter
      const { channel } = req.body;
      const validChannels = ['sms', 'whatsapp', 'email', 'fcm'];
      
      if (!channel || !validChannels.includes(channel)) {
        throw new AppError(
          'Invalid channel. Import only supports: sms, whatsapp, email, fcm. Channel "both" is not supported for bulk import.',
          400
        );
      }

      const result = await templateImportService.processImport(
        req.organizationId, // CRITICAL: Use from auth middleware
        req.user.id,
        req.file.path,
        channel,
        {
          skipDuplicates: req.body.skipDuplicates !== 'false',
          updateExisting: req.body.updateExisting === 'true',
        }
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'Import completed. Check import status for details.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get import history
   */
  async getImportHistory(req, res, next) {
    try {
      const result = await templateImportService.getImportHistory(
        req.organizationId, // CRITICAL: Use from auth middleware
        req.query
      );
      res.json({
        success: true,
        data: result.imports,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download import template
   */
  async downloadTemplate(req, res, next) {
    try {
      const { channel } = req.query;
      const validChannels = ['sms', 'whatsapp', 'email', 'fcm'];
      
      if (!channel || !validChannels.includes(channel)) {
        throw new AppError('Invalid channel. Must be one of: sms, whatsapp, email, fcm', 400);
      }

      let csvContent = '';
      
      if (channel === 'sms') {
        csvContent = `name,body,smsTemplateId,category,language,description
# SMS Template Import - Required: name, body, category. Optional: smsTemplateId, language, description
# Variables: Use #var# in body for dynamic content (e.g., "Hello #var# your OTP is #var#")
Welcome SMS,Hello #var# your OTP is #var#,1207163922745202205,transactional,en,Welcome message with OTP
Order Confirmation,Your order #var# has been confirmed. Amount: #var#,1207163922745202206,transactional,en,Order confirmation message`;
      } else if (channel === 'whatsapp') {
        csvContent = `name,body,whatsappTemplateId,category,language,headerType,headerContent,footer,buttons,description
# WhatsApp Template Import - Required: name, body, category. Optional: whatsappTemplateId, language, headerType, headerContent, footer, buttons, description
# Variables: Use {{var}} in body for dynamic content (e.g., "Hello {{name}} your order is {{orderId}}")
# Buttons: JSON array string, e.g. [{"type":"url","text":"Click Here","value":"https://example.com"}]
Product Alert,Check out our new product {{productName}}! Available now.,whatsapp_123,marketing,en,image,https://example.com/image.jpg,Thank you for shopping with us,"[{\"type\":\"url\",\"text\":\"View Product\",\"value\":\"https://shop.com/product\"}]",Product announcement template
Order Update,Your order {{orderId}} status: {{status}},whatsapp_124,transactional,en,,,,"[{\"type\":\"url\",\"text\":\"Track Order\",\"value\":\"https://shop.com/track/{{orderId}}\"}]",Order status update`;
      } else if (channel === 'email') {
        csvContent = `name,subject,body,htmlBody,plainTextBody,category,language,description
# Email Template Import - Required: name, category. Optional: subject, body, htmlBody, plainTextBody, language, description
# Variables: Use {{var}} in subject/body for dynamic content
Welcome Email,Welcome to {{companyName}}!,Welcome {{name}}! Thank you for joining us.,<h1>Welcome {{name}}!</h1><p>Thank you for joining {{companyName}}.</p>,Welcome {{name}}! Thank you for joining us.,marketing,en,Welcome email for new users
Order Receipt,Order Confirmation - {{orderId}},Your order {{orderId}} has been confirmed.,<h2>Order {{orderId}}</h2><p>Total: {{amount}}</p>,Order {{orderId}} - Total: {{amount}},transactional,en,Order confirmation email`;
      } else if (channel === 'fcm') {
        csvContent = `name,subject,body,category,language,description
# FCM Template Import - Required: name, category. Optional: subject, body, language, description
# Variables: Use {{var}} in subject/body for dynamic content
Push Notification,New Message,You have a new message from {{senderName}},utility,en,New message notification
Order Alert,Order Update,Your order {{orderId}} is ready for pickup!,transactional,en,Order ready notification`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="template_import_template_${channel}.csv"`);
      res.send(csvContent);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TemplateImportController();

