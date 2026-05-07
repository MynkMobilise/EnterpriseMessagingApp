const templateService = require('../services/templateService');
const templateSyncService = require('../services/templateSyncService');
const excelExportService = require('../services/excelExportService');
const { NotFoundError, AppError } = require('../utils/errorTypes');

class TemplateController {
  /**
   * Create template
   */
  async create(req, res, next) {
    try {
      const template = await templateService.create(
        req.organizationId,
        req.user.id,
        req.body
      );
      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List templates
   */
  async list(req, res, next) {
    try {
      const result = await templateService.list(req.organizationId, req.query);
      res.json({
        success: true,
        data: result.templates,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get template by ID
   */
  async getById(req, res, next) {
    try {
      const template = await templateService.getById(req.params.id, req.organizationId);
      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update template
   */
  async update(req, res, next) {
    try {
      const template = await templateService.update(
        req.params.id,
        req.organizationId,
        req.body
      );
      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit template for approval
   */
  async submitForApproval(req, res, next) {
    try {
      const template = await templateService.submitForApproval(
        req.params.id,
        req.organizationId
      );
      res.json({
        success: true,
        data: template,
        message: 'Template submitted for approval',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve template
   */
  async approve(req, res, next) {
    try {
      const template = await templateService.approve(
        req.params.id,
        req.organizationId,
        req.user.id
      );
      res.json({
        success: true,
        data: template,
        message: 'Template approved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject template
   */
  async reject(req, res, next) {
    try {
      const template = await templateService.reject(
        req.params.id,
        req.organizationId,
        req.user.id,
        req.body.reason
      );
      res.json({
        success: true,
        data: template,
        message: 'Template rejected',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete template
   */
  async delete(req, res, next) {
    try {
      const result = await templateService.delete(
        req.params.id,
        req.organizationId
      );
      res.json({
        success: true,
        message: result.message || 'Template deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually trigger a sync of WhatsApp templates from Meta for the caller's
   * org. Returns inserted/updated/skipped counts. Used by the "Refresh from
   * Meta" button on the Templates page.
   */
  async syncFromMeta(req, res, next) {
    try {
      const result = await templateSyncService.syncForOrg(req.organizationId);
      if (result.error) {
        return res.status(400).json({ success: false, error: { message: result.error }, data: result });
      }
      res.json({
        success: true,
        data: result,
        message: `Synced ${result.inserted} new, ${result.updated} updated, ${result.skipped} skipped`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export templates to Excel
   */
  async exportTemplates(req, res, next) {
    try {
      // CRITICAL: Use req.organizationId from auth middleware, never from query params
      const filters = {
        ...req.query,
        page: 1,
        limit: 10000, // Large limit to get all templates for export
      };

      const result = await templateService.list(req.organizationId, filters);
      const templates = result.templates || [];

      // Verify all templates belong to organization (safety check)
      const allFromOrg = templates.every(t => t.organizationId === req.organizationId);
      if (!allFromOrg) {
        throw new AppError('Security violation: Template organization mismatch', 500);
      }

      // Generate Excel file
      const workbook = await excelExportService.exportTemplates(templates, filters);

      // Set headers for file download
      const channelFilter = filters.channel ? `_${filters.channel}` : '';
      const filename = `Templates_Export${channelFilter}_${new Date().toISOString().split('T')[0]}.xlsx`;

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

module.exports = new TemplateController();


