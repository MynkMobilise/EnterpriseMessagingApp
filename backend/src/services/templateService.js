const { Template, TemplateVersion } = require('../models');
const { NotFoundError, AppError } = require('../utils/errorTypes');
const { getPaginationMeta } = require('../utils/helpers');
const { Op } = require('sequelize');

class TemplateService {
  /**
   * Create template
   */
  async create(organizationId, createdBy, data) {
    const { name, channel, category, body, variables, ...otherData } = data;

    // Extract variables from body based on channel
    // SMS uses #var# format, WhatsApp uses {{var}} format
    let variableMatches = [];
    if (channel === 'sms') {
      // Extract #var# variables for SMS
      variableMatches = body.match(/#var#/g) || [];
    } else {
      // Extract {{var}} variables for WhatsApp, Email, FCM
      variableMatches = body.match(/\{\{(\w+)\}\}/g) || [];
    }
    
    // For SMS, count occurrences of #var#
    // For other channels, extract unique variable names
    let variableCount = 0;
    let extractedVariables = [];
    
    if (channel === 'sms') {
      variableCount = variableMatches.length;
      // Create variable names like var1, var2, var3 for SMS
      extractedVariables = Array.from({ length: variableCount }, (_, i) => `var${i + 1}`);
    } else {
      variableCount = new Set(variableMatches.map(m => m.replace(/[{}]/g, ''))).size;
      extractedVariables = Array.from(new Set(variableMatches.map(m => m.replace(/[{}]/g, ''))));
    }

    const template = await Template.create({
      organizationId,
      createdBy,
      name,
      channel,
      category,
      body,
      variables: variables || extractedVariables,
      variableCount,
      ...otherData,
      status: 'draft',
    });

    return template;
  }

  /**
   * List templates
   */
  async list(organizationId, filters = {}) {
    const { page = 1, limit = 20, channel, status, category } = filters;

    const where = {
      organizationId,
      deletedAt: null,
    };

    if (channel) where.channel = channel;
    if (status) where.status = status;
    if (category) where.category = category;

    const { count, rows } = await Template.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['created_at', 'DESC']],
    });

    return {
      templates: rows,
      pagination: getPaginationMeta(page, limit, count),
    };
  }

  /**
   * Get template by ID
   */
  async getById(id, organizationId) {
    const template = await Template.findOne({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });

    if (!template) {
      throw new NotFoundError('Template');
    }

    return template;
  }

  /**
   * Update template
   */
  async update(id, organizationId, data) {
    const template = await this.getById(id, organizationId);

    // Recalculate variable count if body changed
    if (data.body) {
      let variableMatches = [];
      if (template.channel === 'sms') {
        // Extract #var# variables for SMS
        variableMatches = data.body.match(/#var#/g) || [];
        data.variableCount = variableMatches.length;
        // Update variables array for SMS
        const extractedVariables = Array.from({ length: data.variableCount }, (_, i) => `var${i + 1}`);
        data.variables = extractedVariables;
      } else {
        // Extract {{var}} variables for WhatsApp, Email, FCM
        variableMatches = data.body.match(/\{\{(\w+)\}\}/g) || [];
        data.variableCount = new Set(variableMatches.map(m => m.replace(/[{}]/g, ''))).size;
        // Update variables array for other channels
        const extractedVariables = Array.from(new Set(variableMatches.map(m => m.replace(/[{}]/g, ''))));
        data.variables = extractedVariables;
      }
    }

    // Handle smsTemplateId and whatsappTemplateId - allow empty strings to set to null
    if (data.smsTemplateId !== undefined) {
      data.smsTemplateId = data.smsTemplateId !== null && data.smsTemplateId.trim() !== '' ? data.smsTemplateId.trim() : null;
    }
    if (data.whatsappTemplateId !== undefined) {
      data.whatsappTemplateId = data.whatsappTemplateId !== null && data.whatsappTemplateId.trim() !== '' ? data.whatsappTemplateId.trim() : null;
    }

    await template.update(data);
    
    // Reload to get updated data
    await template.reload();

    return template;
  }

  /**
   * Submit template for approval
   */
  async submitForApproval(id, organizationId) {
    const template = await this.getById(id, organizationId);

    if (template.status !== 'draft') {
      throw new AppError('Only draft templates can be submitted for approval', 400);
    }

    await template.update({
      status: 'pending_approval',
    });

    return template;
  }

  /**
   * Approve template
   */
  async approve(id, organizationId, approvedBy) {
    const template = await this.getById(id, organizationId);

    if (template.status !== 'pending_approval') {
      throw new AppError('Template is not pending approval', 400);
    }

    await template.update({
      status: 'approved',
      approvedBy,
      approvedAt: new Date(),
    });

    return template;
  }

  /**
   * Reject template
   */
  async reject(id, organizationId, rejectedBy, reason) {
    const template = await this.getById(id, organizationId);

    if (template.status !== 'pending_approval') {
      throw new AppError('Template is not pending approval', 400);
    }

    await template.update({
      status: 'rejected',
      rejectedBy,
      rejectedAt: new Date(),
      rejectionReason: reason,
    });

    return template;
  }

  /**
   * Delete template (soft delete)
   */
  async delete(id, organizationId) {
    const template = await this.getById(id, organizationId);

    // Use destroy() which will automatically set deletedAt because paranoid: true
    await template.destroy();

    return { message: 'Template deleted successfully' };
  }
}

module.exports = new TemplateService();

