import express from "express";
import { createCompany, getCompany, updateCompanySettings } from "../controllers/companyController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Create company (on first signup)
router.post("/", createCompany);

// Get company details
router.get("/:companyId", authenticateToken, getCompany);

// Update company settings
router.put("/:companyId/settings", authenticateToken, updateCompanySettings);

export default router;
