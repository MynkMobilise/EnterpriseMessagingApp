const ExcelJS = require('exceljs');

class ExcelExportService {
  /**
   * Format date range for filename
   */
  formatDateRange(startDate, endDate) {
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    };
    return `${formatDate(startDate)}_to_${formatDate(endDate)}`;
  }

  /**
   * Apply header styling
   */
  styleHeaderRow(worksheet, rowNumber) {
    const row = worksheet.getRow(rowNumber);
    row.font = { bold: true, size: 12 };
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  /**
   * Apply data row styling
   */
  styleDataRow(worksheet, rowNumber) {
    const row = worksheet.getRow(rowNumber);
    row.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  }

  /**
   * Export Message Volume Report
   */
  async exportMessageVolumeReport(data, dateRange) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Message Volume Report');

    // Summary Section
    worksheet.mergeCells('A1:B1');
    worksheet.getCell('A1').value = 'Message Volume Report Summary';
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.addRow([]);

    worksheet.getCell('A3').value = 'Total Messages:';
    worksheet.getCell('B3').value = data.total || 0;
    worksheet.getCell('A4').value = 'Approved:';
    worksheet.getCell('B4').value = data.approved || 0;
    worksheet.getCell('A5').value = 'Rejected:';
    worksheet.getCell('B5').value = data.rejected || 0;
    worksheet.getCell('A6').value = 'Daily Average:';
    worksheet.getCell('B6').value = data.dailyAverage || 0;
    worksheet.getCell('A7').value = 'Date Range:';
    worksheet.getCell('B7').value = `${dateRange.startDate} to ${dateRange.endDate}`;

    worksheet.addRow([]);
    worksheet.addRow([]);

    // Detailed Data Table
    worksheet.getCell('A9').value = 'Date';
    worksheet.getCell('B9').value = 'Total Messages';
    worksheet.getCell('C9').value = 'SMS';
    worksheet.getCell('D9').value = 'WhatsApp';
    worksheet.getCell('E9').value = 'Email';
    worksheet.getCell('F9').value = 'FCM';
    worksheet.getCell('G9').value = 'Approved';
    worksheet.getCell('H9').value = 'Rejected';
    worksheet.getCell('I9').value = 'Success Rate (%)';

    this.styleHeaderRow(worksheet, 9);

    // Add data rows
    let rowNum = 10;
    if (data.chartData && data.chartData.length > 0) {
      data.chartData.forEach((item) => {
        const total = (item.approved || 0) + (item.rejected || 0);
        const successRate = total > 0 ? ((item.approved / total) * 100).toFixed(2) : '0.00';

        worksheet.getCell(`A${rowNum}`).value = item.date || '';
        worksheet.getCell(`B${rowNum}`).value = total;
        worksheet.getCell(`C${rowNum}`).value = 0; // Would need channel breakdown
        worksheet.getCell(`D${rowNum}`).value = 0;
        worksheet.getCell(`E${rowNum}`).value = 0;
        worksheet.getCell(`F${rowNum}`).value = 0;
        worksheet.getCell(`G${rowNum}`).value = item.approved || 0;
        worksheet.getCell(`H${rowNum}`).value = item.rejected || 0;
        worksheet.getCell(`I${rowNum}`).value = parseFloat(successRate);

        this.styleDataRow(worksheet, rowNum);
        rowNum++;
      });
    }

    // Auto-size columns
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    return workbook;
  }

  /**
   * Export Template Performance Report
   */
  async exportTemplatePerformanceReport(data, dateRange) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Performance');

    // Summary Section
    worksheet.mergeCells('A1:B1');
    worksheet.getCell('A1').value = 'Template Performance Summary';
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.addRow([]);

    worksheet.getCell('A3').value = 'Active Templates:';
    worksheet.getCell('B3').value = data.activeTemplates || 0;
    worksheet.getCell('A4').value = 'Avg Delivery Rate (%):';
    worksheet.getCell('B4').value = data.avgDeliveryRate || 0;
    worksheet.getCell('A5').value = 'Avg Read Rate (%):';
    worksheet.getCell('B5').value = data.avgReadRate || 0;
    worksheet.getCell('A6').value = 'Avg Click Rate (%):';
    worksheet.getCell('B6').value = data.avgClickRate || 0;
    worksheet.getCell('A7').value = 'Date Range:';
    worksheet.getCell('B7').value = `${dateRange.startDate} to ${dateRange.endDate}`;

    worksheet.addRow([]);
    worksheet.addRow([]);

    // Detailed Data Table
    worksheet.getCell('A9').value = 'Template Name';
    worksheet.getCell('B9').value = 'Channel';
    worksheet.getCell('C9').value = 'Total Sent';
    worksheet.getCell('D9').value = 'Delivered';
    worksheet.getCell('E9').value = 'Read';
    worksheet.getCell('F9').value = 'Clicked';
    worksheet.getCell('G9').value = 'Success Rate (%)';
    worksheet.getCell('H9').value = 'Avg Delivery Time (ms)';
    worksheet.getCell('I9').value = 'Last Used';

    this.styleHeaderRow(worksheet, 9);

    // Add data rows
    let rowNum = 10;
    if (data.templates && data.templates.length > 0) {
      data.templates.forEach((item) => {
        const successRate = item.sent > 0 ? ((item.delivered / item.sent) * 100).toFixed(2) : '0.00';

        worksheet.getCell(`A${rowNum}`).value = item.template || 'Unnamed';
        worksheet.getCell(`B${rowNum}`).value = 'N/A'; // Would need channel from template
        worksheet.getCell(`C${rowNum}`).value = item.sent || 0;
        worksheet.getCell(`D${rowNum}`).value = item.delivered || 0;
        worksheet.getCell(`E${rowNum}`).value = item.read || 0;
        worksheet.getCell(`F${rowNum}`).value = item.clicked || 0;
        worksheet.getCell(`G${rowNum}`).value = parseFloat(successRate);
        worksheet.getCell(`H${rowNum}`).value = 'N/A'; // Would need delivery time data
        worksheet.getCell(`I${rowNum}`).value = 'N/A'; // Would need last used date

        this.styleDataRow(worksheet, rowNum);
        rowNum++;
      });
    }

    // Auto-size columns
    worksheet.columns.forEach((column) => {
      column.width = 18;
    });

    return workbook;
  }

  /**
   * Export Delivery Success Report
   */
  async exportDeliverySuccessReport(data, dateRange) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Delivery Success');

    // Summary Section
    worksheet.mergeCells('A1:B1');
    worksheet.getCell('A1').value = 'Delivery Success Summary';
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.addRow([]);

    worksheet.getCell('A3').value = 'Overall Success Rate (%):';
    worksheet.getCell('B3').value = data.overallSuccessRate || 0;
    worksheet.getCell('A4').value = 'Total Delivered:';
    worksheet.getCell('B4').value = data.totalDelivered || 0;
    worksheet.getCell('A5').value = 'Failed:';
    worksheet.getCell('B5').value = data.failed || 0;
    worksheet.getCell('A6').value = 'Read Rate (%):';
    worksheet.getCell('B6').value = data.readRate || 0;
    worksheet.getCell('A7').value = 'Date Range:';
    worksheet.getCell('B7').value = `${dateRange.startDate} to ${dateRange.endDate}`;

    worksheet.addRow([]);
    worksheet.addRow([]);

    // Detailed Data Table
    worksheet.getCell('A9').value = 'Period';
    worksheet.getCell('B9').value = 'Total Sent';
    worksheet.getCell('C9').value = 'Delivered';
    worksheet.getCell('D9').value = 'Failed';
    worksheet.getCell('E9').value = 'Success Rate (%)';
    worksheet.getCell('F9').value = 'Trend';

    this.styleHeaderRow(worksheet, 9);

    // Add data rows
    let rowNum = 10;
    if (data.trendData && data.trendData.length > 0) {
      data.trendData.forEach((item, index) => {
        const prevItem = index > 0 ? data.trendData[index - 1] : null;
        const trend = prevItem ? (item.rate > prevItem.rate ? '↑' : item.rate < prevItem.rate ? '↓' : '→') : '-';

        worksheet.getCell(`A${rowNum}`).value = item.week || '';
        worksheet.getCell(`B${rowNum}`).value = 'N/A'; // Would need total sent per period
        worksheet.getCell(`C${rowNum}`).value = 'N/A'; // Would need delivered per period
        worksheet.getCell(`D${rowNum}`).value = 'N/A'; // Would need failed per period
        worksheet.getCell(`E${rowNum}`).value = item.rate || 0;
        worksheet.getCell(`F${rowNum}`).value = trend;

        this.styleDataRow(worksheet, rowNum);
        rowNum++;
      });
    }

    // Auto-size columns
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    return workbook;
  }

  /**
   * Export Cost Analysis Report
   */
  async exportCostAnalysisReport(data, dateRange) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cost Analysis');

    // Summary Section
    worksheet.mergeCells('A1:B1');
    worksheet.getCell('A1').value = 'Cost Analysis Summary';
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.addRow([]);

    worksheet.getCell('A3').value = 'Total Spend ($):';
    worksheet.getCell('B3').value = data.totalSpend || 0;
    worksheet.getCell('A4').value = 'Avg Cost per Message ($):';
    worksheet.getCell('B4').value = data.avgCostPerMessage || 0;
    worksheet.getCell('A5').value = 'Marketing Spend ($):';
    worksheet.getCell('B5').value = data.marketingSpend || 0;
    worksheet.getCell('A6').value = 'Projected Monthly ($):';
    worksheet.getCell('B6').value = data.projectedMonthly || 0;
    worksheet.getCell('A7').value = 'Date Range:';
    worksheet.getCell('B7').value = `${dateRange.startDate} to ${dateRange.endDate}`;

    worksheet.addRow([]);
    worksheet.addRow([]);

    // Detailed Data Table
    worksheet.getCell('A9').value = 'Category';
    worksheet.getCell('B9').value = 'Channel';
    worksheet.getCell('C9').value = 'Messages Sent';
    worksheet.getCell('D9').value = 'Cost per Message ($)';
    worksheet.getCell('E9').value = 'Total Cost ($)';
    worksheet.getCell('F9').value = 'Country';

    this.styleHeaderRow(worksheet, 9);

    // Add data rows
    let rowNum = 10;
    if (data.categoryData && data.categoryData.length > 0) {
      data.categoryData.forEach((item) => {
        worksheet.getCell(`A${rowNum}`).value = item.category || '';
        worksheet.getCell(`B${rowNum}`).value = item.category || '';
        worksheet.getCell(`C${rowNum}`).value = 'N/A'; // Would need message count
        worksheet.getCell(`D${rowNum}`).value = 'N/A'; // Would need cost per message
        worksheet.getCell(`E${rowNum}`).value = item.cost || 0;
        worksheet.getCell(`F${rowNum}`).value = 'N/A'; // Would need country data

        this.styleDataRow(worksheet, rowNum);
        rowNum++;
      });
    }

    // Auto-size columns
    worksheet.columns.forEach((column) => {
      column.width = 18;
    });

    return workbook;
  }

  /**
   * Export User Activity Report
   */
  async exportUserActivityReport(data, dateRange) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('User Activity');

    // Summary Section
    worksheet.mergeCells('A1:B1');
    worksheet.getCell('A1').value = 'User Activity Summary';
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.addRow([]);

    worksheet.getCell('A3').value = 'Active Users:';
    worksheet.getCell('B3').value = data.activeUsers || 0;
    worksheet.getCell('A4').value = 'Top Sender:';
    worksheet.getCell('B4').value = data.topSender || '-';
    worksheet.getCell('A5').value = 'Top Sender Messages:';
    worksheet.getCell('B5').value = data.topSenderMessages || 0;
    worksheet.getCell('A6').value = 'Avg per User:';
    worksheet.getCell('B6').value = data.avgPerUser || 0;
    worksheet.getCell('A7').value = 'Most Active Dept:';
    worksheet.getCell('B7').value = data.mostActiveDept || 'N/A';
    worksheet.getCell('A8').value = 'Date Range:';
    worksheet.getCell('B8').value = `${dateRange.startDate} to ${dateRange.endDate}`;

    worksheet.addRow([]);
    worksheet.addRow([]);

    // Detailed Data Table
    worksheet.getCell('A10').value = 'User';
    worksheet.getCell('B10').value = 'Department';
    worksheet.getCell('C10').value = 'Total Messages';
    worksheet.getCell('D10').value = 'Approved';
    worksheet.getCell('E10').value = 'Rejected';

    this.styleHeaderRow(worksheet, 10);

    // Add data rows
    let rowNum = 11;
    if (data.users && data.users.length > 0) {
      data.users.forEach((item) => {
        worksheet.getCell(`A${rowNum}`).value = item.user || 'Unknown';
        worksheet.getCell(`B${rowNum}`).value = item.dept || 'N/A';
        worksheet.getCell(`C${rowNum}`).value = item.messages || 0;
        worksheet.getCell(`D${rowNum}`).value = item.approved || 0;
        worksheet.getCell(`E${rowNum}`).value = item.rejected || 0;

        this.styleDataRow(worksheet, rowNum);
        rowNum++;
      });
    }

    // Auto-size columns
    worksheet.columns.forEach((column) => {
      column.width = 18;
    });

    return workbook;
  }

  /**
   * Export Channel Comparison Report
   */
  async exportChannelComparisonReport(data, dateRange) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Channel Comparison');

    // Summary Section
    worksheet.mergeCells('A1:B1');
    worksheet.getCell('A1').value = 'Channel Comparison Summary';
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.addRow([]);

    worksheet.getCell('A3').value = 'WhatsApp Share (%):';
    worksheet.getCell('B3').value = data.whatsappShare || 0;
    worksheet.getCell('A4').value = 'SMS Share (%):';
    worksheet.getCell('B4').value = data.smsShare || 0;
    worksheet.getCell('A5').value = 'WhatsApp Read Rate (%):';
    worksheet.getCell('B5').value = data.whatsappReadRate || 0;
    worksheet.getCell('A6').value = 'SMS Read Rate (%):';
    worksheet.getCell('B6').value = data.smsReadRate || 0;
    worksheet.getCell('A7').value = 'Date Range:';
    worksheet.getCell('B7').value = `${dateRange.startDate} to ${dateRange.endDate}`;

    worksheet.addRow([]);
    worksheet.addRow([]);

    // Detailed Data Table
    worksheet.getCell('A9').value = 'Channel';
    worksheet.getCell('B9').value = 'Messages Sent';
    worksheet.getCell('C9').value = 'Delivered';
    worksheet.getCell('D9').value = 'Read';
    worksheet.getCell('E9').value = 'Success Rate (%)';
    worksheet.getCell('F9').value = 'Avg Delivery Time (ms)';
    worksheet.getCell('G9').value = 'Cost ($)';
    worksheet.getCell('H9').value = 'User Satisfaction';

    this.styleHeaderRow(worksheet, 9);

    // Add data rows
    let rowNum = 10;
    if (data.comparisonData && data.comparisonData.length > 0) {
      data.comparisonData.forEach((item) => {
        const successRate = item.sent > 0 ? ((item.delivered / item.sent) * 100).toFixed(2) : '0.00';

        worksheet.getCell(`A${rowNum}`).value = item.channel || '';
        worksheet.getCell(`B${rowNum}`).value = item.sent || 0;
        worksheet.getCell(`C${rowNum}`).value = item.delivered || 0;
        worksheet.getCell(`D${rowNum}`).value = item.read || 0;
        worksheet.getCell(`E${rowNum}`).value = parseFloat(successRate);
        worksheet.getCell(`F${rowNum}`).value = 'N/A'; // Would need delivery time data
        worksheet.getCell(`G${rowNum}`).value = item.cost || 0;
        worksheet.getCell(`H${rowNum}`).value = 'N/A'; // Would need satisfaction data

        this.styleDataRow(worksheet, rowNum);
        rowNum++;
      });
    }

    // Auto-size columns
    worksheet.columns.forEach((column) => {
      column.width = 18;
    });

    return workbook;
  }

  /**
   * Export All Messages Report
   */
  async exportAllMessagesReport(data, dateRange) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('All Messages');

    // Title
    worksheet.mergeCells('A1:J1');
    worksheet.getCell('A1').value = 'All Messages Report';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 30;

    // Date Range
    worksheet.mergeCells('A2:J2');
    worksheet.getCell('A2').value = `Date Range: ${this.formatDateRange(dateRange.startDate, dateRange.endDate).replace(/_/g, ' ')}`;
    worksheet.getCell('A2').font = { size: 10, italic: true };
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 20;

    // Summary Section
    worksheet.addRow([]); // Empty row for spacing
    worksheet.addRow(['Summary']);
    worksheet.getCell('A4').font = { bold: true, size: 12 };
    
    // Handle both array and object formats
    let messages = [];
    if (Array.isArray(data)) {
      messages = data;
    } else if (data && data.messages) {
      messages = data.messages;
    }
    
    // Calculate summary statistics
    const totalMessages = (data && !Array.isArray(data) && data.total) ? data.total : messages.length;
    const byChannel = (data && !Array.isArray(data) && data.byChannel) ? data.byChannel : {
      whatsapp: messages.filter(m => m.channel === 'whatsapp').length,
      sms: messages.filter(m => m.channel === 'sms').length,
      email: messages.filter(m => m.channel === 'email').length,
      fcm: messages.filter(m => m.channel === 'fcm').length,
    };
    const byStatus = (data && !Array.isArray(data) && data.byStatus) ? data.byStatus : {
      sent: messages.filter(m => m.deliveryStatus === 'sent').length,
      delivered: messages.filter(m => m.deliveryStatus === 'delivered').length,
      failed: messages.filter(m => m.deliveryStatus === 'failed').length,
      pending: messages.filter(m => m.deliveryStatus === 'pending').length,
    };
    const byApprovalStatus = (data && !Array.isArray(data) && data.byApprovalStatus) ? data.byApprovalStatus : {
      approved: messages.filter(m => m.approvalStatus === 'approved').length,
      rejected: messages.filter(m => m.approvalStatus === 'rejected').length,
      pending: messages.filter(m => m.approvalStatus === 'pending').length,
    };

    worksheet.addRow(['Total Messages', totalMessages]);
    worksheet.addRow(['WhatsApp', byChannel.whatsapp]);
    worksheet.addRow(['SMS', byChannel.sms]);
    worksheet.addRow(['Email', byChannel.email]);
    worksheet.addRow(['FCM', byChannel.fcm]);
    worksheet.addRow([]);
    worksheet.addRow(['By Delivery Status']);
    worksheet.getCell('A12').font = { bold: true };
    worksheet.addRow(['Sent', byStatus.sent]);
    worksheet.addRow(['Delivered', byStatus.delivered]);
    worksheet.addRow(['Failed', byStatus.failed]);
    worksheet.addRow(['Pending', byStatus.pending]);
    worksheet.addRow([]);
    worksheet.addRow(['By Approval Status']);
    worksheet.getCell('A18').font = { bold: true };
    worksheet.addRow(['Approved', byApprovalStatus.approved]);
    worksheet.addRow(['Rejected', byApprovalStatus.rejected]);
    worksheet.addRow(['Pending', byApprovalStatus.pending]);

    // Detailed Data Table
    worksheet.addRow([]); // Empty row for spacing
    const headerRow = worksheet.addRow([
      'Date/Time',
      'Recipient',
      'Channel',
      'Template Name',
      'Content',
      'Status',
      'Approval Status',
      'Sent By',
      'Created At',
    ]);
    this.styleHeaderRow(worksheet, headerRow.number);

    // Add data rows
    let rowNum = headerRow.number + 1;
    messages.forEach((message) => {
      const recipient = message.recipientPhone || message.recipientEmail || 
        (message.recipientFcmToken ? message.recipientFcmToken.substring(0, 30) + '...' : 'N/A');
      const templateName = message.template?.name || 'No template';
      const content = message.content ? (message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content) : 'N/A';
      const sentBy = message.sentByUser?.email || 'N/A';
      const createdAt = message.createdAt ? new Date(message.createdAt).toLocaleString() : 'N/A';
      const dateTime = message.createdAt ? new Date(message.createdAt).toLocaleString() : 'N/A';

      worksheet.addRow([
        dateTime,
        recipient,
        message.channel || 'N/A',
        templateName,
        content,
        message.deliveryStatus || 'N/A',
        message.approvalStatus || 'N/A',
        sentBy,
        createdAt,
      ]);

      this.styleDataRow(worksheet, rowNum);
      rowNum++;
    });

    // Auto-size columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength + 2;
    });

    return workbook;
  }

  /**
   * Export Contacts to Excel
   */
  async exportContacts(contacts) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Contacts');

    // Title
    worksheet.mergeCells('A1:J1');
    worksheet.getCell('A1').value = 'Contacts Export';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 30;

    // Summary
    worksheet.addRow([]);
    worksheet.addRow(['Summary']);
    worksheet.getCell('A3').font = { bold: true };
    worksheet.addRow(['Total Contacts', contacts.length]);

    // Table Data
    worksheet.addRow([]);
    const headerRow = worksheet.addRow([
      'Name',
      'Phone Number',
      'Email',
      'Company',
      'Tags',
      'Country',
      'City',
      'Job Title',
      'Status',
      'Created At',
    ]);
    this.styleHeaderRow(worksheet, headerRow.number);

    // Add data rows
    let rowNum = headerRow.number + 1;
    contacts.forEach((contact) => {
      const plain = contact.toJSON ? contact.toJSON() : contact;
      const tags = Array.isArray(plain.tags) ? plain.tags.join(', ') : (plain.tags || '');
      const createdAt = plain.createdAt ? new Date(plain.createdAt).toLocaleString() : 'N/A';

      worksheet.addRow([
        plain.name || 'N/A',
        plain.phoneNumber || 'N/A',
        plain.email || 'N/A',
        plain.company || 'N/A',
        tags,
        plain.country || 'N/A',
        plain.city || 'N/A',
        plain.jobTitle || 'N/A',
        plain.status || 'active',
        createdAt,
      ]);

      this.styleDataRow(worksheet, rowNum);
      rowNum++;
    });

    // Auto-size columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength + 2;
    });

    return workbook;
  }

  /**
   * Export Templates to Excel
   */
  async exportTemplates(templates, filters = {}) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Templates');

    // Title
    worksheet.mergeCells('A1:O1');
    worksheet.getCell('A1').value = 'Templates Export';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 30;

    // Summary
    worksheet.addRow([]);
    worksheet.addRow(['Summary']);
    worksheet.getCell('A3').font = { bold: true };
    worksheet.addRow(['Total Templates', templates.length]);
    
    // Summary by channel
    const byChannel = templates.reduce((acc, t) => {
      const channel = t.channel || 'unknown';
      acc[channel] = (acc[channel] || 0) + 1;
      return acc;
    }, {});
    
    worksheet.addRow([]);
    worksheet.addRow(['By Channel']);
    worksheet.getCell('A6').font = { bold: true };
    Object.entries(byChannel).forEach(([channel, count]) => {
      worksheet.addRow([channel, count]);
    });

    // Table Data
    worksheet.addRow([]);
    const headerRow = worksheet.addRow([
      'Name',
      'Channel',
      'Category',
      'Language',
      'Status',
      'Body',
      'Subject',
      'HTML Body',
      'Plain Text Body',
      'Footer',
      'Header Type',
      'Header Content',
      'SMS Template ID',
      'WhatsApp Template ID',
      'Buttons',
      'Variables',
      'Description',
      'Tags',
      'Created At',
    ]);
    this.styleHeaderRow(worksheet, headerRow.number);

    // Add data rows
    let rowNum = headerRow.number + 1;
    templates.forEach((template) => {
      const plain = template.toJSON ? template.toJSON() : template;
      const buttons = plain.buttons ? JSON.stringify(plain.buttons, null, 2) : 'N/A';
      const variables = Array.isArray(plain.variables) ? plain.variables.join(', ') : (plain.variables || 'N/A');
      const tags = Array.isArray(plain.tags) ? plain.tags.join(', ') : (plain.tags || 'N/A');
      const createdAt = plain.createdAt ? new Date(plain.createdAt).toLocaleString() : 'N/A';

      worksheet.addRow([
        plain.name || 'N/A',
        plain.channel || 'N/A',
        plain.category || 'N/A',
        plain.language || 'en',
        plain.status || 'draft',
        plain.body || 'N/A',
        plain.subject || 'N/A',
        plain.htmlBody || 'N/A',
        plain.plainTextBody || 'N/A',
        plain.footer || 'N/A',
        plain.headerType || 'N/A',
        plain.headerContent || 'N/A',
        plain.smsTemplateId || 'N/A',
        plain.whatsappTemplateId || 'N/A',
        buttons,
        variables,
        plain.description || 'N/A',
        tags,
        createdAt,
      ]);

      this.styleDataRow(worksheet, rowNum);
      rowNum++;
    });

    // Auto-size columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : Math.min(maxLength + 2, 50); // Cap at 50 for readability
    });

    return workbook;
  }
}

module.exports = new ExcelExportService();

