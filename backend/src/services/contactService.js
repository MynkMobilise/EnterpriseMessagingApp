const { Contact, ContactGroup, ContactGroupMembership } = require('../models');
const { NotFoundError, AppError, ConflictError } = require('../utils/errorTypes');
const { getPaginationMeta } = require('../utils/helpers');
const { Op } = require('sequelize');

class ContactService {
  /**
   * Create contact (or update if exists)
   */
  async create(organizationId, createdBy, data) {
    const { 
      phoneNumber, 
      name, 
      email, 
      company, 
      jobTitle,
      country,
      city,
      tags, 
      productsInterest,
      source,
      assignedTo,
      status,
      whatsappOptIn,
      smsOptIn,
      notes,
      customFields, 
      ...otherData 
    } = data;

    // Check if contact already exists
    let contact = await Contact.findOne({
      where: {
        organizationId,
        phoneNumber,
        deletedAt: null,
      },
    });

    if (contact) {
      // Update existing contact with new data
      const updateData = {
        ...(name && { name }),
        ...(email !== undefined && { email: email || null }),
        ...(company !== undefined && { company: company || null }),
        ...(jobTitle !== undefined && { jobTitle: jobTitle || null }),
        ...(country !== undefined && { country: country || null }),
        ...(city !== undefined && { city: city || null }),
        ...(tags && { tags }),
        ...(source && { source }),
        ...(status && { status }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(customFields && { customFields }),
      };

      // Store productsInterest in customFields if provided
      if (productsInterest) {
        updateData.customFields = {
          ...(contact.customFields || {}),
          productsInterest,
        };
      }

      await contact.update(updateData);
      return contact;
    }

    // Create new contact
    const contactData = {
      organizationId,
      createdBy,
      phoneNumber,
      name: name || null,
      email: email || null,
      company: company || null,
      jobTitle: jobTitle || null,
      country: country || null,
      city: city || null,
      tags: tags || [],
      source: source || 'Manual',
      status: status || 'active',
      notes: notes || null,
      optInStatus: 'pending',
    };

    // Store productsInterest in customFields
    if (productsInterest) {
      contactData.customFields = {
        productsInterest,
      };
    } else {
      contactData.customFields = customFields || {};
    }

    // Handle opt-in preferences
    if (whatsappOptIn === true) {
      contactData.optInStatus = 'opted_in';
      contactData.optInDate = new Date();
    }
    if (smsOptIn === true && contactData.optInStatus === 'pending') {
      contactData.optInStatus = 'opted_in';
      contactData.optInDate = new Date();
    }

    contact = await Contact.create(contactData);
    return contact;
  }

  /**
   * List contacts with pagination and filters
   */
  async list(organizationId, filters = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      tags,
      search,
      groupId,
    } = filters;

    const where = {
      organizationId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (tags && Array.isArray(tags)) {
      where.tags = {
        [Op.overlap]: tags,
      };
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phoneNumber: { [Op.like]: `%${search}%` } },
      ];
    }

    if (groupId) {
      const memberships = await ContactGroupMembership.findAll({
        where: { groupId },
        attributes: ['contactId'],
      });
      const contactIds = memberships.map(m => m.contactId);
      where.id = { [Op.in]: contactIds };
    }

    const { count, rows } = await Contact.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['created_at', 'DESC']],
    });

    return {
      contacts: rows,
      pagination: getPaginationMeta(page, limit, count),
    };
  }

  /**
   * Get contact by ID
   */
  async getById(id, organizationId) {
    const contact = await Contact.findOne({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });

    if (!contact) {
      throw new NotFoundError('Contact');
    }

    return contact;
  }

  /**
   * Update contact
   */
  async update(id, organizationId, data) {
    const contact = await this.getById(id, organizationId);
    
    const {
      name,
      phoneNumber,
      email,
      company,
      jobTitle,
      country,
      city,
      tags,
      productsInterest,
      source,
      assignedTo,
      status,
      whatsappOptIn,
      smsOptIn,
      notes,
      customFields,
    } = data;

    const updateData = {
      ...(name !== undefined && { name }),
      ...(phoneNumber !== undefined && { phoneNumber }),
      ...(email !== undefined && { email: email || null }),
      ...(company !== undefined && { company: company || null }),
      ...(jobTitle !== undefined && { jobTitle: jobTitle || null }),
      ...(country !== undefined && { country: country || null }),
      ...(city !== undefined && { city: city || null }),
      ...(tags !== undefined && { tags }),
      ...(source !== undefined && { source }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes: notes || null }),
    };

    // Store productsInterest in customFields if provided
    if (productsInterest !== undefined) {
      updateData.customFields = {
        ...(contact.customFields || {}),
        productsInterest,
      };
    } else if (customFields) {
      updateData.customFields = customFields;
    }

    // Handle opt-in preferences
    if (whatsappOptIn === true || smsOptIn === true) {
      updateData.optInStatus = 'opted_in';
      if (!contact.optInDate) {
        updateData.optInDate = new Date();
      }
    } else if (whatsappOptIn === false && smsOptIn === false) {
      updateData.optInStatus = 'opted_out';
      updateData.optOutDate = new Date();
    }

    await contact.update(updateData);
    return contact;
  }

  /**
   * Delete contact (soft delete)
   */
  async delete(id, organizationId) {
    const contact = await this.getById(id, organizationId);
    await contact.destroy();
    return { message: 'Contact deleted successfully' };
  }

  /**
   * Bulk operations
   */
  async bulkOperation(organizationId, action, contactIds, data) {
    const contacts = await Contact.findAll({
      where: {
        id: { [Op.in]: contactIds },
        organizationId,
        deletedAt: null,
      },
    });

    let updatedCount = 0;

    switch (action) {
      case 'add_tags':
        for (const contact of contacts) {
          const currentTags = contact.tags || [];
          const newTags = [...new Set([...currentTags, ...(data.tags || [])])];
          await contact.update({ tags: newTags });
          updatedCount++;
        }
        break;

      case 'remove_tags':
        for (const contact of contacts) {
          const currentTags = contact.tags || [];
          const newTags = currentTags.filter(tag => !data.tags.includes(tag));
          await contact.update({ tags: newTags });
          updatedCount++;
        }
        break;

      case 'update_status':
        await Contact.update(
          { status: data.status },
          { where: { id: { [Op.in]: contactIds }, organizationId } }
        );
        updatedCount = contacts.length;
        break;

      case 'delete':
        await Contact.destroy({
          where: { id: { [Op.in]: contactIds }, organizationId },
        });
        updatedCount = contacts.length;
        break;

      default:
        throw new AppError(`Unknown bulk action: ${action}`, 400);
    }

    return { updatedCount, failedCount: contactIds.length - updatedCount };
  }
}

module.exports = new ContactService();


