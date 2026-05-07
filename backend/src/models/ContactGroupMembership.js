const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ContactGroupMembership = sequelize.define('contact_group_memberships', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  contactId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'contact_id',
    references: {
      model: 'contacts',
      key: 'id',
    },
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'group_id',
    references: {
      model: 'contact_groups',
      key: 'id',
    },
  },
  addedBy: {
    type: DataTypes.INTEGER,
    field: 'added_by',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  addedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'added_at',
  },
}, {
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ['contact_id'] },
    { fields: ['group_id'] },
    {
      unique: true,
      fields: ['contact_id', 'group_id'],
      name: 'unique_contact_group',
    },
  ],
});

module.exports = ContactGroupMembership;


