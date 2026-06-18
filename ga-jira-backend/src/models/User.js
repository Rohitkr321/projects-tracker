const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: true, references: { model: 'organizations', key: 'id' } },
  firstName: { type: DataTypes.STRING(100), allowNull: false },
  lastName: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  avatar: { type: DataTypes.STRING(500) },
  role: {
    type: DataTypes.ENUM('super_admin', 'org_admin', 'project_manager', 'team_lead', 'developer', 'reporter', 'viewer'),
    defaultValue: 'developer',
  },
  timezone: { type: DataTypes.STRING(100), defaultValue: 'UTC' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  isEmailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  lastLoginAt: { type: DataTypes.DATE },
  passwordResetToken: { type: DataTypes.STRING(255) },
  passwordResetExpires: { type: DataTypes.DATE },
  emailVerificationToken: { type: DataTypes.STRING(255) },
  refreshToken: { type: DataTypes.TEXT },
  notificationPreferences: {
    type: DataTypes.JSON,
    defaultValue: { email: true, inApp: true, mentions: true, assignments: true },
  },
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) user.password = await bcrypt.hash(user.password, 12);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) user.password = await bcrypt.hash(user.password, 12);
    },
  },
});

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  delete values.refreshToken;
  delete values.passwordResetToken;
  delete values.emailVerificationToken;
  return values;
};

module.exports = User;
