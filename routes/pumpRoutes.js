import express from 'express';
import * as pumpController from '../controllers/pumpController.js';

const router = express.Router();

/**
 * Routes for controlling the pump on the ESP32 device.
 */

// Unified command endpoint - preferred method
router.post('/command/:deviceId', pumpController.pumpCommand);

// Legacy routes - kept for backward compatibility
// Route to toggle the pump ON/OFF
router.post('/toggle/:deviceId', pumpController.togglePump);

// Route to turn the pump ON explicitly
router.post('/on/:deviceId', pumpController.turnPumpOn);

// Route to turn the pump OFF explicitly
router.post('/off/:deviceId', pumpController.turnPumpOff);

// Route to set the pump mode (auto/manual)
router.post('/mode/:deviceId', pumpController.setPumpMode);

export default router;
