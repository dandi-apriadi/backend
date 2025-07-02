import express from 'express';
import { changePassword, getUserProfile } from '../../controllers/administrator/profileController.js';
import { verifyUser } from '../../middleware/AuthUser.js';

const router = express.Router();

// Password management
router.post('/change-password', verifyUser, changePassword);

// Profile management
router.get('/', verifyUser, getUserProfile);

export default router;