const reportController = require('./reportController');
const excelExportService = require('../services/excelExportService');
const { AppError } = require('../utils/errorTypes');

class ExportController {
  /**
   * Valid report types
   */
  validReportTypes = [
    'message_volume',
    'template_performance',
    'delivery_success',
    'cost_analysis',
    'user_activity',
    'channel_comparison',
    'all_messages',
  ];

  /**
   * Map report type to controller method
   */
  reportMethodMap = {
    message_volume: 'getMessageVolumeReport',
    template_performance: 'getTemplatePerformanceReport',
    delivery_success: 'getDeliverySuccessReport',
    cost_analysis: 'getCostAnalysisReport',
    user_activity: 'getUserActivityReport',
    channel_comparison: 'getChannelComparisonReport',
    all_messages: 'getAllMessagesReport',
  };

  /**
   * Map report type to export service method
   */
  exportMethodMap = {
    message_volume: 'exportMessageVolumeReport',
    template_performance: 'exportTemplatePerformanceReport',
    delivery_success: 'exportDeliverySuccessReport',
    cost_analysis: 'exportCostAnalysisReport',
    user_activity: 'exportUserActivityReport',
    channel_comparison: 'exportChannelComparisonReport',
    all_messages: 'exportAllMessagesReport',
  };

  /**
   * Map report type to filename
   */
  filenameMap = {
    message_volume: 'Message_Volume_Report',
    template_performance: 'Template_Performance_Report',
    delivery_success: 'Delivery_Success_Report',
    cost_analysis: 'Cost_Analysis_Report',
    user_activity: 'User_Activity_Report',
    channel_comparison: 'Channel_Comparison_Report',
    all_messages: 'All_Messages_Report',
  };

  /**
   * Export report as Excel
   */
  exportReport = async (req, res, next) => {
    try {
      const { reportType, startDate, endDate } = req.query;

      // Validate report type
      if (!reportType || !this.validReportTypes.includes(reportType)) {
        throw new AppError(
          `Invalid report type. Must be one of: ${this.validReportTypes.join(', ')}`,
          400
        );
      }

      // Create request object for report controller
      const reportReq = {
        ...req,
        query: {
          startDate,
          endDate,
        },
      };

      // Get report data from controller
      const controllerMethod = this.reportMethodMap[reportType];
      if (!controllerMethod) {
        throw new AppError(`Report method not found for type: ${reportType}`, 500);
      }

      // Call report controller method and capture response
      const reportData = await new Promise((resolve, reject) => {
        let resolved = false;
        const wrappedRes = {
          json: (data) => {
            if (!resolved) {
              resolved = true;
              resolve(data);
            }
          },
          status: (code) => wrappedRes,
          send: (data) => {
            if (!resolved) {
              resolved = true;
              resolve(data);
            }
          },
        };

        const wrappedNext = (error) => {
          if (error && !resolved) {
            resolved = true;
            reject(error);
          }
        };

        // Call the controller method
        const result = reportController[controllerMethod](reportReq, wrappedRes, wrappedNext);
        
        // If it returns a promise, handle it
        if (result && typeof result.then === 'function') {
          result.catch((err) => {
            if (!resolved) {
              resolved = true;
              reject(err);
            }
          });
        }
      });

      // Check if report data is valid
      if (!reportData || !reportData.success || !reportData.data) {
        throw new AppError('Failed to fetch report data', 500);
      }

      // Generate Excel file
      const exportMethod = this.exportMethodMap[reportType];
      if (!exportMethod) {
        throw new AppError(`Export method not found for type: ${reportType}`, 500);
      }

      const workbook = await excelExportService[exportMethod](
        reportData.data,
        { startDate, endDate }
      );

      // Generate filename
      const dateRange = excelExportService.formatDateRange(startDate, endDate);
      const filename = `${this.filenameMap[reportType]}_${dateRange}.xlsx`;

      // Set response headers
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
  };
}

module.exports = new ExportController();

