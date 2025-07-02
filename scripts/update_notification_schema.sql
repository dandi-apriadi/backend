-- Update notification table schema if needed
-- Run this script to ensure the database is properly set up for the insect detection feature

-- Check if the notifications table exists
CREATE TABLE IF NOT EXISTS notifications (
    notif_id INT AUTO_INCREMENT PRIMARY KEY,
    device_id INT,
    type VARCHAR(50),
    title VARCHAR(100),
    message TEXT NOT NULL,
    status ENUM('unread', 'read', 'belum terbaca', 'terbaca') NOT NULL DEFAULT 'unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index on device_id if it doesn't exist
-- This helps with the performance of querying notifications by device
ALTER TABLE notifications
ADD INDEX IF NOT EXISTS idx_notifications_device_id (device_id);

-- Add index on type if it doesn't exist
-- This helps with the performance of filtering notifications by type
ALTER TABLE notifications
ADD INDEX IF NOT EXISTS idx_notifications_type (type);

-- Add index on created_at if it doesn't exist
-- This helps with the performance of filtering recent notifications
ALTER TABLE notifications
ADD INDEX IF NOT EXISTS idx_notifications_created_at (created_at);
