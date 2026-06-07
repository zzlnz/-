const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 3306,
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '12345678',
  DB_NAME: process.env.DB_NAME || 'house_rental',
  JWT_SECRET: process.env.JWT_SECRET || 'house_rental_secret_key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  UPLOAD_DIR: path.join(__dirname, '..', 'uploads')
};
