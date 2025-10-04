import express from "express";
import { 
    getCompanyUsers, 
    createUser, 
    updateUser, 
    deleteUser, 
    getUserDetails 
} from "../controllers/userManagementController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Get all users in company (Admin/Manager only)
router.get("/", authenticateToken, requireRole(['admin', 'manager']), getCompanyUsers);

// Get user details (Admin/Manager only)
router.get("/:userId", authenticateToken, requireRole(['admin', 'manager']), getUserDetails);

// Create new user (Admin only)
router.post("/", authenticateToken, requireRole(['admin']), createUser);

// Update user (Admin only)
router.put("/:userId", authenticateToken, requireRole(['admin']), updateUser);

// Delete user (Admin only)
router.delete("/:userId", authenticateToken, requireRole(['admin']), deleteUser);

export default router;
