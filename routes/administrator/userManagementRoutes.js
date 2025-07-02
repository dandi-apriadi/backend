import express from "express";
import { verifyUser } from "../../middleware/AuthUser.js";
import {
    changePassword,
} from "../../controllers/shared/userManagementController.js";

const router = express.Router();

// Profile routes
router.patch('/api/user/change-password', verifyUser, changePassword);

export default router;