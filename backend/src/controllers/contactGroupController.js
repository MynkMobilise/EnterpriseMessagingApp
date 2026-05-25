const contactGroupService = require('../services/contactGroupService');
const { AppError } = require('../utils/errorTypes');

// Build the `viewer` object the service uses for assignment-based gating.
// Service trusts viewer.role — it always comes from req.user, never from
// the request body, so it can't be spoofed.
function viewerOf(req) {
  return { userId: req.user.id, role: req.user.role };
}

class ContactGroupController {
  /**
   * List contact groups
   */
  async list(req, res, next) {
    try {
      const result = await contactGroupService.list(req.organizationId, req.query, viewerOf(req));
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
      const group = await contactGroupService.getById(
        req.params.id,
        req.organizationId,
        viewerOf(req)
      );
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
   * Preview a dynamic-group filter without saving — returns the count of
   * contacts that would match + a small sample. Used by the create/edit UI
   * to give the operator feedback before committing.
   */
  async previewFilter(req, res, next) {
    try {
      const { filterConditions, sampleLimit } = req.body || {};
      const result = await contactGroupService.previewFilter(
        req.organizationId,
        filterConditions,
        Math.min(50, Math.max(1, Number(sampleLimit) || 10))
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Distinct values for a column, scoped to the org. Feeds the dropdown
   * pickers on the dynamic-group form so users can pick from the values
   * that actually exist in their data.
   */
  async distinctValues(req, res, next) {
    try {
      const values = await contactGroupService.distinctValues(
        req.organizationId,
        req.params.field
      );
      res.json({ success: true, data: values });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Return the whitelist of fields a dynamic group may filter on. Lets the
   * UI build its picker without hard-coding.
   */
  async allowedFields(req, res, next) {
    try {
      res.json({ success: true, data: contactGroupService.getAllowedFilterFields() });
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
        req.query,
        viewerOf(req)
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

  /**
   * List users assigned to a group (admin tool).
   */
  async listAssignedUsers(req, res, next) {
    try {
      const data = await contactGroupService.listAssignedUsers(
        req.params.id,
        req.organizationId
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /contact-groups/assigned-to/:userId
   * List groups currently assigned to one operator. Used by the "Update
   * Assigned" workflow to pre-check the right boxes before the admin edits.
   */
  async listUserAssignedGroups(req, res, next) {
    try {
      const userId = Number(req.params.userId);
      if (!Number.isInteger(userId)) {
        throw new AppError('userId must be an integer', 400);
      }
      const data = await contactGroupService.listUserAssignedGroups(
        req.organizationId,
        userId
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /contact-groups/assigned-to/:userId
   * Replace one operator's group assignments. Body: { groupIds: number[] }.
   */
  async setUserAssignedGroups(req, res, next) {
    try {
      const userId = Number(req.params.userId);
      if (!Number.isInteger(userId)) {
        throw new AppError('userId must be an integer', 400);
      }
      const { groupIds } = req.body || {};
      if (!Array.isArray(groupIds)) {
        throw new AppError('groupIds must be an array', 400);
      }
      const data = await contactGroupService.setUserAssignedGroups(
        req.organizationId,
        userId,
        groupIds,
        req.user.id
      );
      res.json({ success: true, data, message: 'Assignments updated' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk-apply assignments across many groups and many users.
   * Body: { groupIds: number[], userIds: number[], mode?: 'add'|'remove'|'replace' }
   */
  async bulkAssign(req, res, next) {
    try {
      const { groupIds, userIds, mode } = req.body || {};
      if (!Array.isArray(groupIds) || !Array.isArray(userIds)) {
        throw new AppError('groupIds and userIds must be arrays', 400);
      }
      const result = await contactGroupService.bulkAssign(
        req.organizationId,
        { groupIds, userIds, mode: mode || 'add' },
        req.user.id
      );
      res.json({ success: true, data: result, message: 'Bulk assignment applied' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Replace the set of users assigned to a group. Body: { userIds: number[] }.
   */
  async setAssignedUsers(req, res, next) {
    try {
      const { userIds } = req.body || {};
      if (!Array.isArray(userIds)) {
        throw new AppError('userIds must be an array', 400);
      }
      const data = await contactGroupService.setAssignedUsers(
        req.params.id,
        req.organizationId,
        userIds,
        req.user.id
      );
      res.json({ success: true, data, message: 'Assignments updated' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContactGroupController();

