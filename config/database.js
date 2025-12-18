const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DATABASE_PATH || './database/dashboard.db',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

module.exports = sequelize;
