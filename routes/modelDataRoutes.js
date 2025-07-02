import express from 'express';
import { Op } from "sequelize";

const router = express.Router();

/**
 * Routes for retrieving model data from database
 * CLEANED UP VERSION - Removed unused tables: spraying_logs, settings
 */

// Get all devices
router.get('/api/devices', async (req, res) => {
    try {
        // Dynamic import of Device model
        const { Device } = await import("../models/tableModel.js");
        
        const devices = await Device.findAll({
            order: [['device_id', 'ASC']]
        });

        return res.json({
            status: 'success',
            message: 'Devices retrieved successfully',
            data: devices
        });
    } catch (error) {
        console.error('Error fetching devices:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve devices',
            error: error.message
        });
    }
});

// Get all notifications
router.get('/api/notifications', async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            order: [['created_at', 'DESC']],
            include: [{ model: Device, attributes: ['device_name'] }]
        });

        return res.json({
            status: 'success',
            message: 'Notifications retrieved successfully',
            data: notifications
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve notifications',
            error: error.message
        });
    }
});

// Get all schedules
router.get('/api/schedules', async (req, res) => {
    try {
        const schedules = await Schedule.findAll({
            order: [['schedule_id', 'ASC']],
            include: [{ model: Device, attributes: ['device_name'] }]
        });

        return res.json({
            status: 'success',
            message: 'Schedules retrieved successfully',
            data: schedules
        });
    } catch (error) {
        console.error('Error fetching schedules:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve schedules',
            error: error.message
        });
    }
});

export default router;
