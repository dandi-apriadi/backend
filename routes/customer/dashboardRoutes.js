import express from "express";
import { getDashboard } from "../../controllers/customer/dashboardController.js";

const router = express.Router();

router.get('/dashboard', getDashboard);

export default router;