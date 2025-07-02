import express from 'express';
import * as analyticsController from "../controllers/analyticsController.js";
const router = express.Router();

// Energy Consumption Analytics Routes
router.get('/api/analytics/energy/:deviceId', analyticsController.getEnergyConsumptionSummary);

// Pump Usage Statistics
router.get('/api/analytics/pump/:deviceId', analyticsController.getPumpUsageStats);

// Device Performance Metrics
router.get('/api/analytics/performance/:deviceId', analyticsController.getDevicePerformance);

// Alarm History
router.get('/api/analytics/alarms', analyticsController.getAlarmHistory);

export default router;
