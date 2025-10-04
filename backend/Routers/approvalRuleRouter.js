import express from "express";
import {
    createApprovalRule,
    getApprovalRules,
    updateApprovalRule,
    deleteApprovalRule,
    setupDefaultApprovalRule
} from "../controllers/approvalRuleController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Create approval rule
router.post("/", authenticateToken, createApprovalRule);

// Get approval rules
router.get("/", authenticateToken, getApprovalRules);

// Update approval rule
router.put("/:ruleId", authenticateToken, updateApprovalRule);

// Delete approval rule
router.delete("/:ruleId", authenticateToken, deleteApprovalRule);

// Setup default approval rule
router.post("/setup-default", authenticateToken, setupDefaultApprovalRule);

export default router;
