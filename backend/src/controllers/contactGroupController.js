const contactGroupService = require('../services/contactGroupService');
const { AppError } = require('../utils/errorTypes');

class ContactGroupController {
  /**
   * List contact groups
   */
  async list(req, res, next) {
    try {
      const result = await contactGroupService.list(req.organizationId, req.query);
      res.json({
        success: true,
        data: result.groups,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get contact group by ID
   */
  async getById(req, res, next) {
    try {
      const group = await contactGroupService.getById(req.params.id, req.organizationId);
      res.json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create contact group
   */
  async create(req, res, next) {
    try {
      const group = await contactGroupService.create(
        req.organizationId,
        req.user.id,
        req.body
      );
      res.status(201).json({
        success: true,
        data: group,
        message: 'Contact group created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update contact group
   */
  async update(req, res, next) {
    try {
      const group = await contactGroupService.update(
        req.params.id,
        req.organizationId,
        req.body
      );
      res.json({
        success: true,
        data: group,
        message: 'Contact group updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete contact group
   */
  async delete(req, res, next) {
    try {
      const result = await contactGroupService.delete(req.params.id, req.organizationId);
      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add contacts to group
   */
  async addContacts(req, res, next) {
    try {
      const { contactIds } = req.body;
      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        throw new AppError('contactIds array is required', 400);
      }

      const group = await contactGroupService.addContactsToGroup(
        req.params.id,
        req.organizationId,
        req.user.id,
        contactIds
      );
      res.json({
        success: true,
        data: group,
        message: 'Contacts added to group successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove contacts from group
   */
  async removeContacts(req, res, next) {
    try {
      const { contactIds } = req.body;
      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        throw new AppError('contactIds array is required', 400);
      }

      const group = await contactGroupService.removeContactsFromGroup(
        req.params.id,
        req.organizationId,
        contactIds
      );
      res.json({
        success: true,
        data: group,
        message: 'Contacts removed from group successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get contacts in a group
   */
  async getContacts(req, res, next) {
    try {
      const result = await contactGroupService.getGroupContacts(
        req.params.id,
        req.organizationId,
        req.query
      );
      res.json({
        success: true,
        data: result.contacts,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContactGroupController();

