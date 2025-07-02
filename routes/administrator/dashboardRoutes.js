import express from 'express';
import * as dashboardController from "../../controllers/administrator/dashboardController.js";
const router = express.Router();

/**
 * API ROUTES
 * IoT Rice Pest Spraying Automation System
 */

// Dashboard routes
router.get('/api/dashboard/summary', dashboardController.getDashboardSummary);

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