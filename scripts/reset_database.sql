-- Script to reset database and fix key limit issue
-- Run this in MySQL to clean up the database

USE kartika;

-- Drop tables in correct order (respect foreign key constraints)
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS spraying_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS alarms;
DROP TABLE IF EXISTS energy_trends;
DROP TABLE IF EXISTS sensors;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS settings;

SET FOREIGN_KEY_CHECKS = 1;

-- Now the backend will recreate all tables with the fixed index definitions
SELECT 'Database tables dropped. Restart the backend server to recreate tables.' AS message;
