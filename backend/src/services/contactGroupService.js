const {
  ContactGroup,
  ContactGroupMembership,
  ContactGroupUserAssignment,
  Contact,
  Organization,
  User,
} = require('../models');
const { NotFoundError, AppError, ConflictError } = require('../utils/errorTypes');
const { getPaginationMeta } = require('../utils/helpers');
const { Op } = require('sequelize');

/**
 * Roles that bypass per-user assignment gating and see every group in their
 * org. Operators and viewers are restricted to the groups admins assigned
 * to them via contact_group_user_assignments.
 */
const PRIVILEGED_ROLES = new Set(['super_admin', 'admin', 'manager']);

function isPrivileged(role) {
  return PRIVILEGED_ROLES.has(role);
}

/**
 * Return the list of group ids a given user is allowed to see. Privileged
 * roles short-circuit to null (= "no restriction"). For everyone else, query
 * the assignment table.
 */
async function visibleGroupIdsForUser({ userId, role }) {
  if (isPrivileged(role)) return null;
  const rows = await ContactGroupUserAssignment.findAll({
    where: { userId },
    attributes: ['groupId'],
  });
  return rows.map((r) => r.groupId);
}

/**
 * Contact groups — two modes:
 *
 *   • Manual   (default): membership is whatever rows exist in
 *                         `contact_group_memberships` for the group.
 *   • Dynamic: `is_dynamic=1` + `filter_conditions` JSON. Members are
 *              computed at read time by running a Sequelize WHERE built
 *              from the criteria. No rows in the membership table.
 *
 * Dynamic criteria JSON shape (validated by buildContactWhere):
 *
 *   {
 *     "logic": "AND" | "OR",
 *     "rules": [
 *       { "field": "department", "op": "equals", "value": "Cost of sales" },
 *       { "field": "region", "op": "in", "value": ["KARNATAKA","TAMIL NADU"] }
 *     ]
 *   }
 *
 * Whitelisted fields below in `ALLOWED_FILTER_FIELDS` — any other field is
 * rejected so the criteria JSON can't be used to query arbitrary columns.
 */

// camelCase Sequelize field → underscored column. Used as the whitelist of
// fields a dynamic group may filter on. Add to this map to expose more.
const ALLOWED_FILTER_FIELDS = {
  // Identity / status
  name: 'name',
  status: 'status',
  // HRMS
  employeeId: 'employee_id',
  employeeStatus: 'employee_status',
  employmentCategory: 'employment_category',
  skillType: 'skill_type',
  hiringType: 'hiring_type',
  costCenterCode: 'cost_center_code',
  costCenterName: 'cost_center_name',
  reportingManagerCode: 'reporting_manager_code',
  reportingManagerName: 'reporting_manager_name',
  designation: 'designation',
  department: 'department',
  subDepartment: 'sub_department',
  region: 'region',
  segmentName: 'segment_name',
  subSegmentName: 'sub_segment_name',
  // Legacy / manual fields
  company: 'company',
  jobTitle: 'job_title',
  city: 'city',
  country: 'country',
};

/**
 * Convert one criteria rule into a Sequelize where fragment.
 * Throws AppError(400) on unknown field or op (so misconfigured criteria
 * are surfaced loudly instead of silently matching everything).
 */
function buildRule(rule) {
  const { field, op, value } = rule || {};
  if (!field || !Object.prototype.hasOwnProperty.call(ALLOWED_FILTER_FIELDS, field)) {
    throw new AppError(`Filter field not allowed: ${field}`, 400);
  }
  switch (op) {
    case 'equals':
      return { [field]: value };
    case 'not_equals':
      return { [field]: { [Op.ne]: value } };
    case 'in':
      if (!Array.isArray(value) || value.length === 0) {
        throw new AppError(`Operator 'in' requires a non-empty array for field ${field}`, 400);
      }
      return { [field]: { [Op.in]: value } };
    case 'not_in':
      if (!Array.isArray(value) || value.length === 0) {
        throw new AppError(`Operator 'not_in' requires a non-empty array for field ${field}`, 400);
      }
      return { [field]: { [Op.notIn]: value } };
    case 'contains':
      return { [field]: { [Op.like]: `%${value}%` } };
    case 'starts_with':
      return { [field]: { [Op.like]: `${value}%` } };
    case 'is_set':
      return { [Op.and]: [{ [field]: { [Op.ne]: null } }, { [field]: { [Op.ne]: '' } }] };
    case 'is_empty':
      return { [Op.or]: [{ [field]: null }, { [field]: '' }] };
    default:
      throw new AppError(`Unknown filter operator: ${op}`, 400);
  }
}

/**
 * Build a Sequelize `where` from the criteria JSON. Always scopes to the
 * caller's organizationId so a criteria can't leak across tenants.
 */
function buildContactWhere(filterConditions, organizationId) {
  const base = { organizationId, deletedAt: null };
  if (!filterConditions || !Array.isArray(filterConditions.rules) || filterConditions.rules.length === 0) {
    return base;
  }
  const logic = (filterConditions.logic || 'AND').toUpperCase();
  const compiled = filterConditions.rules.map(buildRule);
  if (logic === 'OR') {
    base[Op.and] = [{ [Op.or]: compiled }];
  } else {
    base[Op.and] = compiled;
  }
  return base;
}

class ContactGroupService {
  /**
   * Whitelist of fields a dynamic group may filter on. Exported so the
   * frontend can build pickers without hard-coding.
   */
  getAllowedFilterFields() {
    return Object.keys(ALLOWED_FILTER_FIELDS);
  }

  /**
   * List all contact groups for an organization
   */
  async list(organizationId, filters = {}, viewer = null) {
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

    // Scope by assignment for non-privileged roles. If the operator has no
    // assignments, they see an empty list (rather than every group).
    if (viewer && !isPrivileged(viewer.role)) {
      const allowedIds = await visibleGroupIdsForUser(viewer);
      if (!allowedIds || allowedIds.length === 0) {
        return { groups: [], pagination: getPaginationMeta(page, limit, 0) };
      }
      where.id = { [Op.in]: allowedIds };
    }

    const { count, rows } = await ContactGroup.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
    });

    // Compute live contact count — manual groups use the join table,
    // dynamic groups evaluate the filter criteria.
    const groupsWithCounts = await Promise.all(
      rows.map(async (group) => {
        let contactCount = 0;
        if (group.isDynamic) {
          try {
            contactCount = await Contact.count({
              where: buildContactWhere(group.filterConditions, organizationId),
            });
          } catch (_) {
            contactCount = 0; // malformed criteria — show 0 rather than crash
          }
        } else {
          contactCount = await ContactGroupMembership.count({
            where: { groupId: group.id },
          });
        }
        const groupJson = group.toJSON();
        groupJson.contactCount = contactCount;
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
  async getById(id, organizationId, viewer = null) {
    const group = await ContactGroup.findOne({
      where: { id, organizationId, deletedAt: null },
    });

    if (!group) {
      throw new NotFoundError('Contact group');
    }

    // Non-privileged users can only open groups they're assigned to.
    if (viewer && !isPrivileged(viewer.role)) {
      const allowedIds = await visibleGroupIdsForUser(viewer);
      if (!allowedIds || !allowedIds.includes(group.id)) {
        throw new NotFoundError('Contact group');
      }
    }

    let contacts;
    if (group.isDynamic) {
      contacts = await Contact.findAll({
        where: buildContactWhere(group.filterConditions, organizationId),
        attributes: ['id', 'name', 'phoneNumber', 'email', 'status',
                     'employeeId', 'designation', 'department', 'costCenterName', 'region'],
        limit: 500, // cap inline list — UI paginates via getGroupContacts
      });
    } else {
      const memberships = await ContactGroupMembership.findAll({ where: { groupId: id } });
      const contactIds = memberships.map((m) => m.contactId);
      contacts = contactIds.length > 0 ? await Contact.findAll({
        where: { id: { [Op.in]: contactIds }, deletedAt: null },
        attributes: ['id', 'name', 'phoneNumber', 'email', 'status',
                     'employeeId', 'designation', 'department', 'costCenterName', 'region'],
      }) : [];
    }

    const groupJson = group.toJSON();
    groupJson.contacts = contacts;
    groupJson.contactCount = contacts.length;

    if (group.createdBy) {
      const creator = await User.findByPk(group.createdBy, {
        attributes: ['id', 'firstName', 'lastName', 'email'],
      });
      groupJson.creator = creator ? creator.toJSON() : null;
    }

    return groupJson;
  }

  /**
   * Create a new contact group. Supports both manual (contactIds) and
   * dynamic (isDynamic=true + filterConditions) modes.
   */
  async create(organizationId, createdBy, data) {
    const { name, description, color, contactIds, isDynamic, filterConditions } = data;

    const existing = await ContactGroup.findOne({
      where: { organizationId, name, deletedAt: null },
    });
    if (existing) {
      throw new ConflictError('Contact group with this name already exists');
    }

    // If dynamic, validate the criteria upfront by attempting to build the
    // WHERE — throws AppError if any rule is malformed.
    if (isDynamic) {
      if (!filterConditions || !Array.isArray(filterConditions.rules) || filterConditions.rules.length === 0) {
        throw new AppError('Dynamic group requires filterConditions with at least one rule', 400);
      }
      buildContactWhere(filterConditions, organizationId);
    }

    const group = await ContactGroup.create({
      organizationId,
      createdBy,
      name,
      description: description || null,
      color: color || '#3B82F6',
      contactCount: 0,
      isDynamic: !!isDynamic,
      filterConditions: isDynamic ? filterConditions : null,
    });

    // Manual mode: optionally bulk-add seed contacts.
    if (!isDynamic && contactIds && contactIds.length > 0) {
      await this.addContactsToGroup(group.id, organizationId, createdBy, contactIds);
    }

    return await this.getById(group.id, organizationId);
  }

  /**
   * Update contact group
   */
  async update(id, organizationId, data) {
    const group = await ContactGroup.findOne({
      where: { id, organizationId, deletedAt: null },
    });
    if (!group) {
      throw new NotFoundError('Contact group');
    }

    const { name, description, color, isDynamic, filterConditions } = data;

    if (name && name !== group.name) {
      const existing = await ContactGroup.findOne({
        where: { organizationId, name, deletedAt: null, id: { [Op.ne]: id } },
      });
      if (existing) {
        throw new ConflictError('Contact group with this name already exists');
      }
    }

    const patch = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(color && { color }),
    };

    // Mode change handling. We allow flipping manual ↔ dynamic via update.
    // When switching modes the old members are NOT auto-wiped — that's the
    // caller's responsibility (membership rows for a now-dynamic group are
    // just ignored). This avoids destructive surprises.
    if (isDynamic !== undefined) {
      patch.isDynamic = !!isDynamic;
      if (isDynamic) {
        if (!filterConditions || !Array.isArray(filterConditions.rules) || filterConditions.rules.length === 0) {
          throw new AppError('Dynamic group requires filterConditions with at least one rule', 400);
        }
        buildContactWhere(filterConditions, organizationId); // validates
        patch.filterConditions = filterConditions;
      } else {
        patch.filterConditions = null;
      }
    } else if (filterConditions !== undefined && group.isDynamic) {
      // Editing rules on an existing dynamic group.
      buildContactWhere(filterConditions, organizationId);
      patch.filterConditions = filterConditions;
    }

    await group.update(patch);
    return await this.getById(id, organizationId);
  }

  /**
   * Delete contact group (soft delete)
   */
  async delete(id, organizationId) {
    const group = await ContactGroup.findOne({
      where: { id, organizationId, deletedAt: null },
    });
    if (!group) {
      throw new NotFoundError('Contact group');
    }
    await group.destroy();
    await ContactGroupMembership.destroy({ where: { groupId: id } });
    return { message: 'Contact group deleted successfully' };
  }

  /**
   * Add contacts to a manual group. No-op on dynamic groups (membership
   * comes from the filter).
   */
  async addContactsToGroup(groupId, organizationId, addedBy, contactIds) {
    const group = await ContactGroup.findOne({
      where: { id: groupId, organizationId, deletedAt: null },
    });
    if (!group) {
      throw new NotFoundError('Contact group');
    }
    if (group.isDynamic) {
      throw new AppError(
        'Cannot add contacts to a dynamic group — edit its filter criteria instead.',
        400
      );
    }

    const contacts = await Contact.findAll({
      where: { id: { [Op.in]: contactIds }, organizationId, deletedAt: null },
    });
    if (contacts.length !== contactIds.length) {
      throw new AppError('Some contacts not found or do not belong to this organization', 400);
    }

    const existingMemberships = await ContactGroupMembership.findAll({
      where: { groupId, contactId: { [Op.in]: contactIds } },
    });
    const existingContactIds = existingMemberships.map((m) => m.contactId.toString());
    const newContactIds = contactIds.filter((id) => !existingContactIds.includes(id.toString()));

    if (newContactIds.length > 0) {
      await ContactGroupMembership.bulkCreate(
        newContactIds.map((contactId) => ({ groupId, contactId, addedBy }))
      );
      await group.update({
        contactCount: await ContactGroupMembership.count({ where: { groupId } }),
      });
    }
    return await this.getById(groupId, organizationId);
  }

  async removeContactsFromGroup(groupId, organizationId, contactIds) {
    const group = await ContactGroup.findOne({
      where: { id: groupId, organizationId, deletedAt: null },
    });
    if (!group) {
      throw new NotFoundError('Contact group');
    }
    if (group.isDynamic) {
      throw new AppError('Cannot remove contacts from a dynamic group.', 400);
    }
    await ContactGroupMembership.destroy({
      where: { groupId, contactId: { [Op.in]: contactIds } },
    });
    await group.update({
      contactCount: await ContactGroupMembership.count({ where: { groupId } }),
    });
    return await this.getById(groupId, organizationId);
  }

  /**
   * Paginated contacts in a group. Works for both manual and dynamic.
   */
  async getGroupContacts(groupId, organizationId, filters = {}, viewer = null) {
    const { page = 1, limit = 20 } = filters;
    const group = await ContactGroup.findOne({
      where: { id: groupId, organizationId, deletedAt: null },
    });
    if (!group) {
      throw new NotFoundError('Contact group');
    }

    // Non-privileged viewers must be assigned to the group.
    if (viewer && !isPrivileged(viewer.role)) {
      const allowedIds = await visibleGroupIdsForUser(viewer);
      if (!allowedIds || !allowedIds.includes(group.id)) {
        throw new NotFoundError('Contact group');
      }
    }

    if (group.isDynamic) {
      const where = buildContactWhere(group.filterConditions, organizationId);
      const { count, rows } = await Contact.findAndCountAll({
        where,
        attributes: ['id', 'name', 'phoneNumber', 'email', 'status', 'company',
                     'employeeId', 'designation', 'department', 'costCenterName', 'region'],
        order: [['name', 'ASC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
      });
      return {
        contacts: rows,
        pagination: getPaginationMeta(page, limit, count),
      };
    }

    const { count, rows } = await ContactGroupMembership.findAndCountAll({
      where: { groupId },
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['addedAt', 'DESC']],
    });
    const contactIds = rows.map((m) => m.contactId);
    const contacts = contactIds.length > 0 ? await Contact.findAll({
      where: { id: { [Op.in]: contactIds }, deletedAt: null },
      attributes: ['id', 'name', 'phoneNumber', 'email', 'status', 'company',
                   'employeeId', 'designation', 'department', 'costCenterName', 'region'],
    }) : [];
    const contactMap = new Map(contacts.map((c) => [c.id, c]));
    const orderedContacts = rows.map((m) => contactMap.get(m.contactId)).filter(Boolean);
    return {
      contacts: orderedContacts,
      pagination: getPaginationMeta(page, limit, count),
    };
  }

  /**
   * Preview: evaluate a criteria JSON without saving it. Returns the count
   * of matching contacts plus a small sample for the UI to display.
   * Lets the operator iterate on filters before committing.
   */
  async previewFilter(organizationId, filterConditions, sampleLimit = 10) {
    const where = buildContactWhere(filterConditions, organizationId);
    const count = await Contact.count({ where });
    const sample = await Contact.findAll({
      where,
      attributes: ['id', 'name', 'phoneNumber', 'email',
                   'employeeId', 'designation', 'department', 'costCenterName', 'region'],
      order: [['name', 'ASC']],
      limit: sampleLimit,
    });
    return { count, sample };
  }

  /**
   * Distinct values for a field — feeds the dropdown pickers in the UI
   * (e.g. fetching the list of departments the operator can choose from).
   */
  async distinctValues(organizationId, field) {
    if (!Object.prototype.hasOwnProperty.call(ALLOWED_FILTER_FIELDS, field)) {
      throw new AppError(`Field not allowed: ${field}`, 400);
    }
    const rows = await Contact.findAll({
      where: {
        organizationId,
        deletedAt: null,
        [field]: { [Op.ne]: null },
      },
      attributes: [field],
      group: [field],
      order: [[field, 'ASC']],
      limit: 500,
      raw: true,
    });
    return rows
      .map((r) => r[field])
      .filter((v) => v !== null && v !== '');
  }

  /**
   * Return the list of users assigned to a group. Includes minimal user
   * info so the UI can render initials/email/role without a separate fetch.
   */
  async listAssignedUsers(groupId, organizationId) {
    const group = await ContactGroup.findOne({
      where: { id: groupId, organizationId, deletedAt: null },
      attributes: ['id'],
    });
    if (!group) throw new NotFoundError('Contact group');

    const rows = await ContactGroupUserAssignment.findAll({
      where: { groupId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'status'],
        },
      ],
      order: [['assignedAt', 'ASC']],
    });
    return rows.map((r) => ({
      assignmentId: r.id,
      userId: r.userId,
      assignedAt: r.assignedAt,
      assignedBy: r.assignedBy,
      user: r.user ? r.user.toJSON() : null,
    }));
  }

  /**
   * Return the list of group ids currently assigned to one user. Filters by
   * organization so the caller can't probe assignments in other orgs.
   */
  async listUserAssignedGroups(organizationId, userId) {
    // Sanity-check that the user belongs to this org.
    const user = await User.findOne({
      where: { id: userId, organizationId },
      attributes: ['id'],
    });
    if (!user) throw new NotFoundError('User');

    // Join through contact_groups so we naturally exclude assignments whose
    // group was soft-deleted.
    const rows = await ContactGroupUserAssignment.findAll({
      where: { userId },
      include: [
        {
          model: ContactGroup,
          as: 'group',
          required: true,
          where: { organizationId, deletedAt: null },
          attributes: ['id', 'name'],
        },
      ],
      attributes: ['id', 'groupId'],
    });
    return rows.map((r) => ({
      assignmentId: r.id,
      groupId: r.groupId,
      groupName: r.group ? r.group.name : null,
    }));
  }

  /**
   * Replace ALL of a user's group assignments (within one org) with the
   * provided list. Used by the "Update Assigned" workflow where an admin
   * picks an operator, the UI pre-checks their current groups, then the
   * admin adjusts which boxes are checked and saves.
   *
   * Idempotent and cross-tenant safe: drops any groupId that doesn't belong
   * to the caller's org.
   */
  async setUserAssignedGroups(organizationId, userId, groupIds, assignedBy) {
    const user = await User.findOne({
      where: { id: userId, organizationId },
      attributes: ['id'],
    });
    if (!user) throw new NotFoundError('User');

    const requested = Array.isArray(groupIds)
      ? [...new Set(groupIds.map(Number).filter(Number.isInteger))]
      : [];

    // Validate group ownership.
    let validIds = [];
    if (requested.length > 0) {
      const groups = await ContactGroup.findAll({
        where: { id: { [Op.in]: requested }, organizationId, deletedAt: null },
        attributes: ['id'],
      });
      validIds = groups.map((g) => g.id);
    }

    const existing = await ContactGroupUserAssignment.findAll({
      where: { userId },
      include: [
        {
          model: ContactGroup,
          as: 'group',
          required: true,
          where: { organizationId },
          attributes: ['id'],
        },
      ],
      attributes: ['id', 'groupId'],
    });
    const existingByGroup = new Map(existing.map((r) => [r.groupId, r.id]));
    const requestedSet = new Set(validIds);

    const toAdd = validIds.filter((gid) => !existingByGroup.has(gid));
    const toRemoveIds = existing
      .filter((r) => !requestedSet.has(r.groupId))
      .map((r) => r.id);

    if (toRemoveIds.length > 0) {
      await ContactGroupUserAssignment.destroy({
        where: { id: { [Op.in]: toRemoveIds } },
      });
    }
    if (toAdd.length > 0) {
      await ContactGroupUserAssignment.bulkCreate(
        toAdd.map((groupId) => ({ groupId, userId, assignedBy })),
        { ignoreDuplicates: true }
      );
    }

    return {
      userId,
      groupIds: validIds,
      added: toAdd.length,
      removed: toRemoveIds.length,
    };
  }

  /**
   * Bulk-apply group↔user assignments across many groups and many users.
   *
   * Modes:
   *   • 'add'     — insert (groupId, userId) pairs that don't exist yet.
   *   • 'remove'  — delete the listed pairs.
   *   • 'replace' — for each groupId, set its assigned users to userIds
   *                 (additive on missing, removes others within those groups).
   *
   * Cross-tenant safe: drops any groupId or userId that doesn't belong to
   * the caller's org. Returns a per-group summary so the UI can confirm.
   */
  async bulkAssign(organizationId, { groupIds, userIds, mode = 'add' }, assignedBy) {
    if (!['add', 'remove', 'replace'].includes(mode)) {
      throw new AppError(`Unknown bulk-assign mode: ${mode}`, 400);
    }
    const gIds = Array.isArray(groupIds)
      ? [...new Set(groupIds.map(Number).filter(Number.isInteger))]
      : [];
    const uIds = Array.isArray(userIds)
      ? [...new Set(userIds.map(Number).filter(Number.isInteger))]
      : [];

    if (gIds.length === 0 || uIds.length === 0) {
      return { groupsAffected: 0, assignmentsAdded: 0, assignmentsRemoved: 0, summary: [] };
    }

    // Validate ownership — same-org only.
    const groups = await ContactGroup.findAll({
      where: { id: { [Op.in]: gIds }, organizationId, deletedAt: null },
      attributes: ['id', 'name'],
    });
    const users = await User.findAll({
      where: { id: { [Op.in]: uIds }, organizationId },
      attributes: ['id'],
    });
    const validGroupIds = groups.map((g) => g.id);
    const validUserIds = users.map((u) => u.id);

    let added = 0;
    let removed = 0;
    const summary = [];

    for (const groupId of validGroupIds) {
      const existing = await ContactGroupUserAssignment.findAll({
        where: { groupId },
        attributes: ['id', 'userId'],
      });
      const existingByUser = new Map(existing.map((r) => [r.userId, r.id]));

      let groupAdded = 0;
      let groupRemoved = 0;

      if (mode === 'add') {
        const toInsert = validUserIds
          .filter((uid) => !existingByUser.has(uid))
          .map((uid) => ({ groupId, userId: uid, assignedBy }));
        if (toInsert.length > 0) {
          await ContactGroupUserAssignment.bulkCreate(toInsert, { ignoreDuplicates: true });
          groupAdded = toInsert.length;
        }
      } else if (mode === 'remove') {
        const ids = validUserIds
          .map((uid) => existingByUser.get(uid))
          .filter((x) => x !== undefined);
        if (ids.length > 0) {
          await ContactGroupUserAssignment.destroy({ where: { id: { [Op.in]: ids } } });
          groupRemoved = ids.length;
        }
      } else if (mode === 'replace') {
        const requested = new Set(validUserIds);
        const toRemoveIds = existing
          .filter((r) => !requested.has(r.userId))
          .map((r) => r.id);
        const toInsert = validUserIds
          .filter((uid) => !existingByUser.has(uid))
          .map((uid) => ({ groupId, userId: uid, assignedBy }));
        if (toRemoveIds.length > 0) {
          await ContactGroupUserAssignment.destroy({ where: { id: { [Op.in]: toRemoveIds } } });
          groupRemoved = toRemoveIds.length;
        }
        if (toInsert.length > 0) {
          await ContactGroupUserAssignment.bulkCreate(toInsert, { ignoreDuplicates: true });
          groupAdded = toInsert.length;
        }
      }

      added += groupAdded;
      removed += groupRemoved;
      const g = groups.find((x) => x.id === groupId);
      summary.push({
        groupId,
        groupName: g ? g.name : null,
        added: groupAdded,
        removed: groupRemoved,
      });
    }

    return {
      groupsAffected: validGroupIds.length,
      assignmentsAdded: added,
      assignmentsRemoved: removed,
      summary,
    };
  }

  /**
   * Replace the set of users assigned to a group with the provided list.
   * Idempotent: removes assignments not in the list, inserts new ones.
   *
   * Restricted to users in the same organization, and rejects any userId
   * that doesn't belong to that org (prevents cross-tenant data leakage).
   */
  async setAssignedUsers(groupId, organizationId, userIds, assignedBy) {
    const group = await ContactGroup.findOne({
      where: { id: groupId, organizationId, deletedAt: null },
    });
    if (!group) throw new NotFoundError('Contact group');

    const requested = Array.isArray(userIds)
      ? [...new Set(userIds.map((n) => Number(n)).filter(Number.isInteger))]
      : [];

    // Validate that all requested users belong to this org. Drop any that
    // don't rather than 400 — keeps a stale stale-id payload from blocking
    // a legitimate edit.
    let validIds = [];
    if (requested.length > 0) {
      const users = await User.findAll({
        where: { id: { [Op.in]: requested }, organizationId },
        attributes: ['id'],
      });
      validIds = users.map((u) => u.id);
    }

    const existing = await ContactGroupUserAssignment.findAll({
      where: { groupId },
      attributes: ['id', 'userId'],
    });
    const existingIds = new Set(existing.map((r) => r.userId));
    const requestedSet = new Set(validIds);

    const toAdd = validIds.filter((id) => !existingIds.has(id));
    const toRemove = existing
      .filter((r) => !requestedSet.has(r.userId))
      .map((r) => r.id);

    if (toRemove.length > 0) {
      await ContactGroupUserAssignment.destroy({ where: { id: { [Op.in]: toRemove } } });
    }
    if (toAdd.length > 0) {
      await ContactGroupUserAssignment.bulkCreate(
        toAdd.map((userId) => ({ groupId, userId, assignedBy })),
        { ignoreDuplicates: true }
      );
    }

    return this.listAssignedUsers(groupId, organizationId);
  }
}

module.exports = new ContactGroupService();
