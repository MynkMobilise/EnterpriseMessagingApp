const contactImportService = require('../services/contactImportService');
const { uploadSingle } = require('../utils/fileUpload');
const { AppError } = require('../utils/errorTypes');

class ContactImportController {
  /**
   * Upload and import contacts from CSV
   */
  async import(req, res, next) {
    try {
      if (!req.file) {
        throw new AppError('CSV file is required', 400);
      }

      const result = await contactImportService.processImport(
        req.organizationId,
        req.user.id,
        req.file.path,
        req.body
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'Import started. Check import status for progress.',
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
      const result = await contactImportService.getImportHistory(
        req.organizationId,
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
      const csvContent = `name,phoneNumber,email,company,tags,country,city,jobTitle,notes
John Doe,+1234567890,john.doe@example.com,Acme Corp,"Sales,Marketing",USA,New York,Sales Manager,Interested in product demo
Jane Smith,+1987654321,jane.smith@example.com,Tech Inc,"Support,Enterprise",USA,San Francisco,CTO,VIP customer`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="contact_import_template.csv"');
      res.send(csvContent);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContactImportController();


