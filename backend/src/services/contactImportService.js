const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { Contact, ContactImport } = require('../models');
const contactService = require('./contactService');
const { Op } = require('sequelize');

class ContactImportService {
  /**
   * Process CSV import
   */
  async processImport(organizationId, importedBy, filePath, options = {}) {
    const { skipDuplicates = true, updateExisting = false } = options;

    // Create import record
    const importRecord = await ContactImport.create({
      organizationId,
      importedBy,
      filename: path.basename(filePath),
      status: 'processing',
    });

    let totalRows = 0;
    let successfulImports = 0;
    let failedImports = 0;
    let duplicateContacts = 0;
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
                try {
                  const phoneNumber = row.phone || row.phoneNumber || row.phone_number;
                  if (!phoneNumber) {
                    failedImports++;
                    errors.push({ row: totalRows - batch.length + batch.indexOf(row) + 1, error: 'Missing phone number' });
                    continue;
                  }

                  // Check if contact exists
                  const existing = await Contact.findOne({
                    where: {
                      organizationId,
                      phoneNumber,
                      deletedAt: null,
                    },
                  });

                  // Prepare contact data
                  const contactData = {
                    phoneNumber,
                    name: row.name || null,
                    email: row.email || null,
                    company: row.company || null,
                    tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(t => t) : [],
                    country: row.country || null,
                    city: row.city || null,
                    jobTitle: row.jobTitle || row.job_title || null,
                    notes: row.notes || null,
                  };

                  if (existing) {
                    if (updateExisting) {
                      await existing.update(contactData);
                      successfulImports++;
                    } else {
                      duplicateContacts++;
                    }
                  } else {
                    await contactService.create(organizationId, importedBy, contactData);
                    successfulImports++;
                  }
                } catch (error) {
                  failedImports++;
                  errors.push({ row: totalRows - batch.length + batch.indexOf(row) + 1, error: error.message });
                }
              }
            }

            // Update import record
            await importRecord.update({
              totalRows,
              successfulImports,
              failedImports,
              duplicateContacts,
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
   * Get import history
   */
  async getImportHistory(organizationId, filters = {}) {
    const { page = 1, limit = 20 } = filters;

    const { count, rows } = await ContactImport.findAndCountAll({
      where: { organizationId },
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

module.exports = new ContactImportService();

