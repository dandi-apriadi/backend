// backend/routes/notificationRoutes.js
import express from 'express';
import * as notificationController from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', notificationController.getAllNotifications);
router.post('/', notificationController.createNotification);
router.post('/mark-all-read', notificationController.markAllRead);
router.delete('/delete-all', notificationController.deleteAll);
router.post('/test', notificationController.testNotification);
router.get('/settings', notificationController.getNotificationSettings);
router.post('/settings', notificationController.saveNotificationSettings);
router.post('/:id/read', notificationController.markAsRead);
router.get('/:id', notificationController.getNotificationById); // Debug route to check a notification by ID

export default router;
