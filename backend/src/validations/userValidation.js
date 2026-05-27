const Joi = require('joi');

const userValidation = {
  createUser: {
    body: Joi.object({
      email: Joi.string().email().required(),
      firstName: Joi.string().min(1).max(100).required(),
      lastName: Joi.string().min(1).max(100).required(),
      // Either role (legacy enum) or roleId (Phase 2 FK) can be passed.
      // When both are present roleId wins.
      role: Joi.string().valid('super_admin', 'admin', 'manager', 'operator', 'viewer').default('operator'),
      roleId: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).optional(),
      phoneNumber: Joi.string().max(50).allow(null, ''),
      department: Joi.string().max(100).allow(null, ''),
      jobTitle: Joi.string().max(100).allow(null, ''),
      password: Joi.string().min(8).allow(null, ''),
    }),
  },

  updateUser: {
    body: Joi.object({
      firstName: Joi.string().min(1).max(100),
      lastName: Joi.string().min(1).max(100),
      role: Joi.string().valid('super_admin', 'admin', 'manager', 'operator', 'viewer'),
      roleId: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).allow(null).optional(),
      status: Joi.string().valid('active', 'inactive', 'suspended', 'pending'),
      phoneNumber: Joi.string().max(50).allow(null, ''),
      department: Joi.string().max(100).allow(null, ''),
      jobTitle: Joi.string().max(100).allow(null, ''),
      permissions: Joi.object().allow(null),
    }),
  },
};

module.exports = { userValidation };

