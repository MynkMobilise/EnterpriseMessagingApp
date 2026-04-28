const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { Template, TemplateImport } = require('../models');
const templateService = require('./templateService');
const { Op } = require('sequelize');

class TemplateImportService {
  /**
   * Process CSV import for templates
   */
  async processImport(organizationId, importedBy, filePath, channel, options = {}) {
    const { skipDuplicates = true, updateExisting = false } = options;

    // Create import record
    const importRecord = await TemplateImport.create({
      organizationId,
      importedBy,
      filename: path.basename(filePath),
      channel,
      status: 'processing',
    });

    let totalRows = 0;
    let successfulImports = 0;
    let failedImports = 0;
    let duplicateTemplates = 0;
    const errors = [];

    return new Promise((resolve, reject) => {
      const results = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', async (row) => {
          totalRows++;
          results.push(row);
        })
        .on('end', async () => {
          try {
            // Process rows in batches
            const batchSize = 100;
            for (let i = 0; i < results.length; i += batchSize) {
              const batch = results.slice(i, i + batchSize);
              
              for (const row of batch) {
                const rowNum = totalRows - batch.length + batch.indexOf(row) + 1;
                try {
                  // Validate required fields per channel
                  const validationError = this.validateRow(row, channel, rowNum);
                  if (validationError) {
                    failedImports++;
                    errors.push(validationError);
                    continue;
                  }

                  // Prepare template data
                  const templateData = this.prepareTemplateData(row, channel, rowNum, errors);
                  if (!templateData) {
                    failedImports++;
                    continue; // Error already added to errors array
                  }

                  // Check if template exists (using organizationId + name + channel)
                  const existing = await Template.findOne({
                    where: {
                      organizationId, // CRITICAL: Use import organizationId
                      name: row.name.trim(),
                      channel: channel, // CRITICAL: Must match import channel
                      deletedAt: null,
                    },
                  });

                  if (existing) {
                    if (updateExisting) {
                      try {
                        await templateService.update(existing.id, organizationId, templateData);
                        successfulImports++;
                      } catch (error) {
                        failedImports++;
                        errors.push({ 
                          row: rowNum, 
                          error: `Failed to update template: ${error.message}` 
                        });
                      }
                    } else {
                      duplicateTemplates++;
                    }
                  } else {
                    try {
                      await templateService.create(organizationId, importedBy, templateData);
                      successfulImports++;
                    } catch (error) {
                      // Handle SequelizeUniqueConstraintError
                      if (error.name === 'SequelizeUniqueConstraintError') {
                        duplicateTemplates++;
                      } else {
                        failedImports++;
                        errors.push({ 
                          row: rowNum, 
                          error: error.message 
                        });
                      }
                    }
                  }
                } catch (error) {
                  failedImports++;
                  errors.push({ 
                    row: rowNum, 
                    error: error.message 
                  });
                }
              }
            }

            // Update import record
            await importRecord.update({
              totalRows,
              successfulImports,
              failedImports,
              duplicateTemplates,
              status: 'completed',
              completedAt: new Date(),
              errorLog: errors.length > 0 ? errors : null,
            });

            resolve(importRecord);
          } catch (error) {
            await importRecord.update({
              status: 'failed',
              errorLog: [{ error: error.message }],
            });
            reject(error);
          }
        })
        .on('error', async (error) => {
          await importRecord.update({
            status: 'failed',
            errorLog: [{ error: error.message }],
          });
          reject(error);
        });
    });
  }

  /**
   * Validate row data based on channel
   */
  validateRow(row, channel, rowNum) {
    // Required fields for all channels
    if (!row.name || !row.name.trim()) {
      return { row: rowNum, error: "Missing required field 'name'" };
    }

    if (!row.category || !row.category.trim()) {
      return { row: rowNum, error: "Missing required field 'category'" };
    }

    // Validate category enum
    const validCategories = ['marketing', 'transactional', 'utility', 'authentication'];
    if (!validCategories.includes(row.category.toLowerCase())) {
      return { 
        row: rowNum, 
        error: `Invalid category '${row.category}'. Must be one of: ${validCategories.join(', ')}` 
      };
    }

    // Channel-specific validations
    if (channel === 'sms' || channel === 'whatsapp') {
      if (!row.body || !row.body.trim()) {
        return { row: rowNum, error: `Missing required field 'body' for ${channel} template` };
      }
    }

    if (channel === 'email' || channel === 'fcm') {
      // Subject is recommended but not strictly required per validation
      // Body is optional per validation, but we'll allow it
    }

    return null; // No validation errors
  }

  /**
   * Prepare template data from CSV row
   */
  prepareTemplateData(row, channel, rowNum, errors) {
    const templateData = {
      name: row.name.trim(),
      channel: channel,
      category: row.category.toLowerCase(),
      language: row.language ? row.language.trim() : 'en',
      description: row.description ? row.description.trim() : null,
    };

    // Channel-specific fields
    if (channel === 'sms') {
      templateData.body = row.body ? row.body.trim() : '';
      templateData.smsTemplateId = row.smsTemplateId ? row.smsTemplateId.trim() : null;
      if (templateData.smsTemplateId === '') {
        templateData.smsTemplateId = null;
      }
    }

    if (channel === 'whatsapp') {
      templateData.body = row.body ? row.body.trim() : '';
      templateData.whatsappTemplateId = row.whatsappTemplateId ? row.whatsappTemplateId.trim() : null;
      if (templateData.whatsappTemplateId === '') {
        templateData.whatsappTemplateId = null;
      }
      templateData.headerType = row.headerType ? row.headerType.trim() : null;
      templateData.headerContent = row.headerContent ? row.headerContent.trim() : null;
      templateData.footer = row.footer ? row.footer.trim() : null;

      // Parse buttons JSON
      if (row.buttons) {
        try {
          const buttons = JSON.parse(row.buttons);
          if (!Array.isArray(buttons)) {
            errors.push({ 
              row: rowNum, 
              error: "Buttons must be a JSON array" 
            });
            return null;
          }
          // Validate each button
          buttons.forEach((btn, idx) => {
            if (!btn.type || !btn.text || !btn.value) {
              errors.push({ 
                row: rowNum, 
                error: `Button ${idx + 1} missing required fields (type, text, value)` 
              });
            }
          });
          if (errors.some(e => e.row === rowNum && e.error.includes('Button'))) {
            return null; // Validation failed
          }
          templateData.buttons = buttons;
        } catch (parseError) {
          errors.push({ 
            row: rowNum, 
            error: `Invalid buttons JSON: ${parseError.message}` 
          });
          return null;
        }
      }
    }

    if (channel === 'email') {
      templateData.subject = row.subject ? row.subject.trim() : null;
      templateData.body = row.body ? row.body.trim() : (row.htmlBody ? row.htmlBody.trim() : null);
      templateData.htmlBody = row.htmlBody ? row.htmlBody.trim() : null;
      templateData.plainTextBody = row.plainTextBody ? row.plainTextBody.trim() : null;
      // Ensure at least subject or body is provided
      if (!templateData.subject && !templateData.body && !templateData.htmlBody) {
        errors.push({ 
          row: rowNum, 
          error: "Email template must have at least subject, body, or htmlBody" 
        });
        return null;
      }
    }

    if (channel === 'fcm') {
      templateData.subject = row.subject ? row.subject.trim() : null;
      templateData.body = row.body ? row.body.trim() : null;
      // Ensure at least subject or body is provided
      if (!templateData.subject && !templateData.body) {
        errors.push({ 
          row: rowNum, 
          error: "FCM template must have at least subject or body" 
        });
        return null;
      }
    }

    // Tags (optional, comma-separated)
    if (row.tags) {
      templateData.tags = row.tags.split(',').map(t => t.trim()).filter(t => t);
    }

    return templateData;
  }

  /**
   * Get import history
   */
  async getImportHistory(organizationId, filters = {}) {
    const { page = 1, limit = 20, channel } = filters;

    const where = { organizationId };
    if (channel) {
      where.channel = channel;
    }

    const { count, rows } = await TemplateImport.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['created_at', 'DESC']],
    });

    return {
      imports: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }
}

module.exports = new TemplateImportService();

