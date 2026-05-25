const Joi = require('joi');

/**
 * One rule inside a dynamic-group criteria. `field` is verified server-side
 * against the whitelist in contactGroupService.ALLOWED_FILTER_FIELDS; Joi
 * just sanity-checks shape.
 */
const filterRuleSchema = Joi.object({
  field: Joi.string().required(),
  op: Joi.string()
    .valid('equals', 'not_equals', 'in', 'not_in', 'contains', 'starts_with', 'is_set', 'is_empty')
    .required(),
  value: Joi.alternatives().try(
    Joi.string().allow(''),
    Joi.number(),
    Joi.boolean(),
    Joi.array().items(Joi.alternatives().try(Joi.string(), Joi.number())),
  ).optional(),
});

const filterConditionsSchema = Joi.object({
  logic: Joi.string().valid('AND', 'OR').default('AND'),
  rules: Joi.array().items(filterRuleSchema).min(1).required(),
});

const contactGroupValidation = {
  create: Joi.object({
    name: Joi.string().required().max(255),
    description: Joi.string().allow(null, '').optional(),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
    contactIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    isDynamic: Joi.boolean().optional(),
    filterConditions: filterConditionsSchema.optional(),
  }),

  update: Joi.object({
    name: Joi.string().max(255).optional(),
    description: Joi.string().allow(null, '').optional(),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
    isDynamic: Joi.boolean().optional(),
    filterConditions: filterConditionsSchema.allow(null).optional(),
  }),

  addContacts: Joi.object({
    contactIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
  }),

  removeContacts: Joi.object({
    contactIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
  }),
};

module.exports = { contactGroupValidation };
