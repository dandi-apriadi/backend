'use strict';

const { v4: uuidv4 } = require('uuid');
const argon2 = require('argon2');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Hash password for default admin
    const hashedPassword = await argon2.hash('admin123');
    
    await queryInterface.bulkInsert('users', [
      {
        user_id: uuidv4(),
        fullname: 'Administrator',
        role: 'admin',
        profile_picture: 'default-profile.png',
        gender: 'male',
        email: 'admin@akuntansi.com',
        password: hashedPassword,
        is_verified: true,
        is_active: true,
        phone_number: '081234567890',
        address: 'Jl. Contoh No. 123, Jakarta',
        city: 'Jakarta',
        country: 'Indonesia',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        user_id: uuidv4(),
        fullname: 'Staff Akuntansi',
        role: 'user',
        profile_picture: 'default-profile.png',
        gender: 'female',
        email: 'staff@akuntansi.com',
        password: hashedPassword,
        is_verified: true,
        is_active: true,
        phone_number: '081234567891',
        address: 'Jl. Contoh No. 124, Jakarta',
        city: 'Jakarta',
        country: 'Indonesia',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', {
      email: ['admin@akuntansi.com', 'staff@akuntansi.com']
    }, {});
  }
};
