import express from 'express';
import UserManagementRoute from './administrator/userManagementRoutes.js';
import CustomerDashboardRoute from './customer/dashboardRoutes.js';
import SharedRoute from './shared/authRoutes.js';

const router = express.Router();

router.use('/api/admin', UserManagementRoute);
router.use('/api/customer', CustomerDashboardRoute);
router.use('/api/shared', SharedRoute);

export default router;