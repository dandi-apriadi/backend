import express from 'express';
import * as dashboardController from "../../controllers/administrator/dashboardController.js";
const router = express.Router();

/**
 * API ROUTES
 * IoT Rice Pest Spraying Automation System
 */

// Dashboard routes
router.get('/api/dashboard/summary', dashboardController.getDashboardSummary);

// Test route for debugging
router.get('/test', async (req, res) => {
    try {
        console.log('Test route accessed');
        
        // Test environment variables
        console.log('Environment variables check:');
        console.log('DB_NAME:', process.env.DB_NAME ? 'Set' : 'Not set');
        console.log('DB_USER:', process.env.DB_USER ? 'Set' : 'Not set');
        console.log('DB_PASS:', process.env.DB_PASS ? 'Set' : 'Not set');
        console.log('DB_HOST:', process.env.DB_HOST ? 'Set' : 'Not set');
        
        // Test database connection
        const db = await import("../../config/Database.js");
        await db.default.authenticate();
        console.log('Database authentication successful');
        
        // Test model import
        const { Device } = await import("../../models/tableModel.js");
        console.log('Device model imported successfully');
        
        // Test basic query
        const count = await Device.count();
        console.log(`Device count: ${count}`);
        
        res.json({
            status: 'success',
            message: 'All tests passed',
            data: {
                environment: 'OK',
                database: 'Connected',
                model: 'Loaded',
                deviceCount: count
            }
        });
    } catch (error) {
        console.error('Test route error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            stack: error.stack
        });
    }
});

// Device management routes
router.get('/devices', dashboardController.getAllDevices);
router.get('/devices/:id', dashboardController.getDeviceById);
router.post('/devices', dashboardController.createDevice);
router.put('/devices/:id', dashboardController.updateDevice);
router.delete('/devices/:id', dashboardController.deleteDevice);
router.put('/devices/:id/status', dashboardController.updateDeviceStatus);

// Sensor data routes
router.get('/sensors', dashboardController.getAllSensorData);
router.get('/sensors/device/:deviceId', dashboardController.getSensorDataByDevice);
router.get('/sensors/latest', dashboardController.getLatestSensorData);
router.post('/sensors', dashboardController.recordSensorData);

// Spraying management routes
router.get('/spraying-logs', dashboardController.getSprayingLogs);
router.get('/spraying-logs/device/:deviceId', dashboardController.getSprayingLogsByDevice);
router.post('/spraying/manual/:deviceId', dashboardController.initiateManualSpraying);
router.put('/spraying-logs/:id/complete', dashboardController.completeSprayingLog);

// Notification routes
router.get('/notifications', dashboardController.getNotifications);
router.put('/notifications/:id/read', dashboardController.markNotificationAsRead);
router.delete('/notifications/:id', dashboardController.deleteNotification);

// Settings routes
router.get('/settings', dashboardController.getAllSettings);
router.put('/settings/:id', dashboardController.updateSetting);

export default router;