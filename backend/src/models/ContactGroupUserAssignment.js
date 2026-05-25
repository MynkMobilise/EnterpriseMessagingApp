const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Maps contact groups to specific users (operators). Used to scope what
 * groups an operator sees in the Contact Groups list and the Send Message
 * group picker. Higher roles ignore this table.
 */
const ContactGroupUserAssignment = sequelize.define(
  'contact_group_user_assignments',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'group_id',
      references: { model: 'contact_groups', key: 'id' },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
    },
    assignedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'assigned_by',
      references: { model: 'users', key: 'id' },
    },
    assignedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'assigned_at',
    },
  },
  {
    timestamps: false,
    underscored: true,
    indexes: [
      { unique: true, fields: ['group_id', 'user_id'], name: 'unique_group_user' },
      { fields: ['user_id'], name: 'idx_cgua_user' },
    ],
  }
);

module.exports = ContactGroupUserAssignment;
