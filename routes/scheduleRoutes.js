import express from 'express';
import * as scheduleController from "../controllers/scheduleController.js";

const router = express.Router();

// Schedule Routes
router.get('/', scheduleController.getAllSchedules);
router.get('/:id', scheduleController.getScheduleById);
router.post('/', scheduleController.createSchedule);
router.put('/:id', scheduleController.updateSchedule);
router.delete('/:id', scheduleController.deleteSchedule);
router.patch('/:id/toggle', scheduleController.toggleScheduleStatus);

// Special routes for dashboard
router.get('/active/all', scheduleController.getActiveSchedules);
router.get('/today', scheduleController.getTodaySchedules);

// ESP32 schedule management routes
router.get('/esp32/:device_id/get', scheduleController.getSchedulesFromESP32);
router.post('/esp32/:device_id/sync', scheduleController.syncSchedulesToESP32);

export default router;
