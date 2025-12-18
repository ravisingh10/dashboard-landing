const sequelize = require('../config/database');
const User = require('./User');
const ServiceLink = require('./ServiceLink');

const models = {
  User,
  ServiceLink,
  sequelize,
};

module.exports = models;
