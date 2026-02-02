require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false,
  }
);
console.log(">>> Sequelize config:", {
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS ? process.env.DB_PASS : "(empty)",
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  dialect: process.env.DB_DIALECT || 'mysql'
});


module.exports = sequelize;