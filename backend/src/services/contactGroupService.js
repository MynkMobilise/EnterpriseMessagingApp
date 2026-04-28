const { ContactGroup, ContactGroupMembership, Contact, Organization, User } = require('../models');
const { NotFoundError, AppError, ConflictError } = require('../utils/errorTypes');
const { getPaginationMeta } = require('../utils/helpers');
const { Op } = require('sequelize');

class ContactGroupService {
  /**
   * List all contact groups for an organization
   */
  async list(organizationId, filters = {}) {
    const { page = 1, limit = 20, search } = filters;

    const where = {
      organizationId,
      deletedAt: null,
    };

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await ContactGroup.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    // Get contact counts for each group
    const groupsWithCounts = await Promise.all(
      rows.map(async (group) => {
        const contactCount = await ContactGroupMembership.count({
          where: { groupId: group.id },
        });
        const groupJson = group.toJSON();
        groupJson.contactCount = contactCount;
        // Get creator info separately
        if (group.createdBy) {
          const creator = await User.findByPk(group.createdBy, {
            attributes: ['id', 'firstName', 'lastName', 'email'],
          });
          groupJson.creator = creator ? creator.toJSON() : null;
        }
        return groupJson;
      })
    );

    return {
      groups: groupsWithCounts,
      pagination: getPaginationMeta(page, limit, count),
    };
  }

  /**
   * Get contact group by ID
   */
  async getById(id, organizationId) {
    const group = await ContactGroup.findOne({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });

    if (!group) {
      throw new NotFoundError('Contact group');
    }

    // Get contacts in this group
    const memberships = await ContactGroupMembership.findAll({
      where: { groupId: id },
    });

    const contactIds = memberships.map((m) => m.contactId);
    const contacts = contactIds.length > 0 ? await Contact.findAll({
      where: { id: { [Op.in]: contactIds } },
      attributes: ['id', 'name', 'phoneNumber', 'email', 'status'],
    }) : [];

    const groupJson = group.toJSON();
    groupJson.contacts = contacts;
    groupJson.contactCount = contacts.length;
    
    // Get creator info separately
    if (group.createdBy) {
      const creator = await User.findByPk(group.createdBy, {
        attributes: ['id', 'firstName', 'lastName', 'email'],
      });
      groupJson.creator = creator ? creator.toJSON() : null;
    }

    return groupJson;
  }

  /**
   * Create a new contact group
   */
  async create(organizationId, createdBy, data) {
    const { name, description, color, contactIds } = data;

    // Check if group with same name exists
    const existing = await ContactGroup.findOne({
      where: {
        organizationId,
        name,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictError('Contact group with this name already exists');
    }

    // Create group
    const group = await ContactGroup.create({
      organizationId,
      createdBy,
      name,
      description: description || null,
      color: color || '#3B82F6',
      contactCount: 0,
    });

    // Add contacts to group if provided
    if (contactIds && contactIds.length > 0) {
      await this.addContactsToGroup(group.id, organizationId, createdBy, contactIds);
    }

    return await this.getById(group.id, organizationId);
  }

  /**
   * Update contact group
   */
  async update(id, organizationId, data) {
    const group = await ContactGroup.findOne({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });

    if (!group) {
      throw new NotFoundError('Contact group');
    }

    const { name, description, color } = data;

    // Check name uniqueness if name is being changed
    if (name && name !== group.name) {
      const existing = await ContactGroup.findOne({
        where: {
          organizationId,
          name,
          deletedAt: null,
          id: { [Op.ne]: id },
        },
      });

      if (existing) {
        throw new ConflictError('Contact group with this name already exists');
      }
    }

    await group.update({
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(color && { color }),
    });

    return await this.getById(id, organizationId);
  }

  /**
   * Delete contact group (soft delete)
   */
  async delete(id, organizationId) {
    const group = await ContactGroup.findOne({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });

    if (!group) {
      throw new NotFoundError('Contact group');
    }

    // Soft delete the group
    await group.destroy();

    // Optionally, remove all memberships
    await ContactGroupMembership.destroy({
      where: { groupId: id },
    });

    return { message: 'Contact group deleted successfully' };
  }

  /**
   * Add contacts to a group
   */
  async addContactsToGroup(groupId, organizationId, addedBy, contactIds) {
    const group = await ContactGroup.findOne({
      where: {
        id: groupId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!group) {
      throw new NotFoundError('Contact group');
    }

    // Verify all contacts belong to the organization
    const contacts = await Contact.findAll({
      where: {
        id: { [Op.in]: contactIds },
        organizationId,
        deletedAt: null,
      },
    });

    if (contacts.length !== contactIds.length) {
      throw new AppError('Some contacts not found or do not belong to this organization', 400);
    }

    // Add memberships (skip if already exists)
    const existingMemberships = await ContactGroupMembership.findAll({
      where: {
        groupId,
        contactId: { [Op.in]: contactIds },
      },
    });

    const existingContactIds = existingMemberships.map((m) => m.contactId.toString());
    const newContactIds = contactIds.filter(
      (id) => !existingContactIds.includes(id.toString())
    );

    if (newContactIds.length > 0) {
      await ContactGroupMembership.bulkCreate(
        newContactIds.map((contactId) => ({
          groupId,
          contactId,
          addedBy,
        }))
      );

      // Update contact count
      await group.update({
        contactCount: await ContactGroupMembership.count({ where: { groupId } }),
      });
    }

    return await this.getById(groupId, organizationId);
  }

  /**
   * Remove contacts from a group
   */
  async removeContactsFromGroup(groupId, organizationId, contactIds) {
    const group = await ContactGroup.findOne({
      where: {
        id: groupId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!group) {
      throw new NotFoundError('Contact group');
    }

    await ContactGroupMembership.destroy({
      where: {
        groupId,
        contactId: { [Op.in]: contactIds },
      },
    });

    // Update contact count
    await group.update({
      contactCount: await ContactGroupMembership.count({ where: { groupId } }),
    });

    return await this.getById(groupId, organizationId);
  }

  /**
   * Get contacts in a group
   */
  async getGroupContacts(groupId, organizationId, filters = {}) {
    const { page = 1, limit = 20 } = filters;

    const group = await ContactGroup.findOne({
      where: {
        id: groupId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!group) {
      throw new NotFoundError('Contact group');
    }

    const { count, rows } = await ContactGroupMembership.findAndCountAll({
      where: { groupId },
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['addedAt', 'DESC']],
    });

    const contactIds = rows.map((m) => m.contactId);
    const contacts = contactIds.length > 0 ? await Contact.findAll({
      where: { id: { [Op.in]: contactIds } },
      attributes: ['id', 'name', 'phoneNumber', 'email', 'status', 'company'],
    }) : [];

    // Map contacts to maintain order
    const contactMap = new Map(contacts.map((c) => [c.id, c]));
    const orderedContacts = rows.map((m) => contactMap.get(m.contactId)).filter(Boolean);

    return {
      contacts: orderedContacts,
      pagination: getPaginationMeta(page, limit, count),
    };
  }
}

module.exports = new ContactGroupService();

