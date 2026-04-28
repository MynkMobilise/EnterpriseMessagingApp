const contactService = require('../services/contactService');
const excelExportService = require('../services/excelExportService');
const { NotFoundError } = require('../utils/errorTypes');

class ContactController {
  /**
   * Create contact
   */
  async create(req, res, next) {
    try {
      const contact = await contactService.create(
        req.organizationId,
        req.user.id,
        req.body
      );
      res.status(201).json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List contacts
   */
  async list(req, res, next) {
    try {
      const result = await contactService.list(req.organizationId, req.query);
      res.json({
        success: true,
        data: {
          contacts: result.contacts,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get contact by ID
   */
  async getById(req, res, next) {
    try {
      const contact = await contactService.getById(req.params.id, req.organizationId);
      res.json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update contact
   */
  async update(req, res, next) {
    try {
      const contact = await contactService.update(
        req.params.id,
        req.organizationId,
        req.body
      );
      res.json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete contact
   */
  async delete(req, res, next) {
    try {
      const result = await contactService.delete(req.params.id, req.organizationId);
      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk operations
   */
  async bulkOperation(req, res, next) {
    try {
      const { action, contactIds, ...data } = req.body;
      const result = await contactService.bulkOperation(
        req.organizationId,
        action,
        contactIds,
        data
      );
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export contacts to Excel
   */
  async exportContacts(req, res, next) {
    try {
      // Get all contacts with filters (no pagination for export)
      const filters = {
        ...req.query,
        page: 1,
        limit: 10000, // Large limit to get all contacts
      };

      const result = await contactService.list(req.organizationId, filters);
      const contacts = result.contacts || [];

      // Generate Excel file
      const workbook = await excelExportService.exportContacts(contacts);

      // Set headers for file download
      const filename = `Contacts_Export_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Write workbook to response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContactController();


