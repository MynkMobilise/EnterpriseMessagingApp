const messageService = require('../services/messageService');
const excelExportService = require('../services/excelExportService');
const { NotFoundError } = require('../utils/errorTypes');

class MessageController {
  /**
   * Send single message.
   * `skipApproval` only honored if the caller has `canApproveMessages`; otherwise
   * silently coerced to false so the message goes through normal approval.
   */
  async send(req, res, next) {
    try {
      const body = { ...req.body };
      if (body.skipApproval && !req.userPermissions?.canApproveMessages) {
        body.skipApproval = false;
      }
      const message = await messageService.send(
        req.organizationId,
        req.user.id,
        body
      );
      res.status(201).json({
        success: true,
        data: message,
        message: message.approvalStatus === 'pending'
          ? 'Message submitted for approval'
          : 'Message queued for sending',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send bulk messages
   */
  async sendBulk(req, res, next) {
    try {
      const body = { ...req.body };
      if (body.skipApproval && !req.userPermissions?.canApproveMessages) {
        body.skipApproval = false;
      }
      const result = await messageService.sendBulk(
        req.organizationId,
        req.user.id,
        body
      );
      res.status(201).json({
        success: true,
        data: result,
        message: body.skipApproval
          ? 'Bulk messages queued for sending'
          : 'Bulk messages submitted for approval',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List messages
   */
  async list(req, res, next) {
    try {
      const result = await messageService.list(req.organizationId, req.query);
      res.json({
        success: true,
        data: result.messages,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get message by ID
   */
  async getById(req, res, next) {
    try {
      const message = await messageService.getById(req.params.id, req.organizationId);
      res.json({
        success: true,
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List pending approvals
   */
  async listPendingApprovals(req, res, next) {
    try {
      const result = await messageService.listPendingApprovals(
        req.organizationId,
        req.query
      );
      res.json({
        success: true,
        data: result.messages,
        pagination: result.pagination,
        stats: result.stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve message
   */
  async approve(req, res, next) {
    try {
      const message = await messageService.approve(
        req.params.id,
        req.user.id,
        req.organizationId
      );
      res.json({
        success: true,
        data: message,
        message: 'Message approved and queued for sending',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject message
   */
  async reject(req, res, next) {
    try {
      const message = await messageService.reject(
        req.params.id,
        req.user.id,
        req.body.reason,
        req.organizationId
      );
      res.json({
        success: true,
        data: message,
        message: 'Message rejected',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk approve messages
   */
  async bulkApprove(req, res, next) {
    try {
      const result = await messageService.bulkApprove(
        req.organizationId,
        req.user.id,
        req.body
      );
      res.json({
        success: true,
        data: result,
        message: `${result.approvedCount} messages approved`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export messages to Excel
   */
  async exportMessages(req, res, next) {
    try {
      const { startDate, endDate, channel, status } = req.query;

      // Fetch all messages (no pagination for export)
      const filters = {
        startDate,
        endDate,
        channel,
        status,
        page: 1,
        limit: 10000, // Large limit to get all messages
      };

      const result = await messageService.list(req.organizationId, filters);
      const messages = result.messages || [];

      // Convert Sequelize models to plain objects
      const messagesData = messages.map(msg => {
        const plain = msg.toJSON ? msg.toJSON() : msg;
        return {
          ...plain,
          recipientPhone: plain.recipientPhone || plain.contact?.phoneNumber,
          recipientEmail: plain.recipientEmail || plain.contact?.email,
          recipientFcmToken: plain.recipientFcmToken,
          template: plain.template || null,
          sentByUser: plain.sentByUser || null,
        };
      });

      // Generate Excel file
      const workbook = await excelExportService.exportAllMessagesReport(
        messagesData,
        { startDate, endDate }
      );

      // Set headers for file download
      const dateRangeFormatted = excelExportService.formatDateRange(startDate, endDate);
      const filename = `All_Messages_Report_${dateRangeFormatted}.xlsx`;

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

module.exports = new MessageController();


