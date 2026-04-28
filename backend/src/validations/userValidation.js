const Joi = require('joi');

const userValidation = {
  createUser: {
    body: Joi.object({
      email: Joi.string().email().required(),
      firstName: Joi.string().min(1).max(100).required(),
      lastName: Joi.string().min(1).max(100).required(),
      role: Joi.string().valid('super_admin', 'admin', 'manager', 'operator', 'viewer').default('operator'),
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
      status: Joi.string().valid('active', 'inactive', 'suspended', 'pending'),
      phoneNumber: Joi.string().max(50).allow(null, ''),
      department: Joi.string().max(100).allow(null, ''),
      jobTitle: Joi.string().max(100).allow(null, ''),
      permissions: Joi.object().allow(null),
    }),
  },
};

module.exports = { userValidation };

