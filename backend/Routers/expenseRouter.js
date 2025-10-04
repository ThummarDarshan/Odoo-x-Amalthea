import express from "express";
import multer from "multer";
import { 
    submitExpense, 
    getUserExpenses, 
    getPendingApprovals, 
    approveExpense, 
    getAllExpenses 
} from "../controllers/expenseController.js";
import { authenticateToken } from "../middleware/auth.js";
import Expense from "../models/Expense.js";
import User from "../models/UserSchema.js";

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

// Submit new expense
router.post("/submit", authenticateToken, upload.single('receiptImage'), submitExpense);

// Get user's expenses
router.get("/user", authenticateToken, getUserExpenses);

// Get expenses pending approval
router.get("/pending", authenticateToken, getPendingApprovals);

// Debug endpoint to check all expenses in company
router.get("/debug/company-expenses", authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.company;
        const userId = req.user._id;
        
        console.log("Debug request from user:", userId, "company:", companyId);
        
        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "User not associated with a company"
            });
        }
        
        const allExpenses = await Expense.find({ company: companyId })
            .populate("submittedBy", "name email")
            .populate("currentApprover", "name email")
            .sort({ createdAt: -1 });
            
        console.log("Found expenses:", allExpenses.length);
            
        res.json({
            success: true,
            user: { id: userId, company: companyId },
            expenses: allExpenses.map(e => ({
                id: e._id,
                title: e.title,
                amount: e.amount,
                status: e.status,
                submittedBy: e.submittedBy?.name,
                currentApprover: e.currentApprover?.name,
                createdAt: e.createdAt
            }))
        });
    } catch (error) {
        console.error("Debug endpoint error:", error);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Force assign all expenses to managers endpoint
router.post("/force-assign-all", authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.company;
        const userId = req.user._id;
        
        console.log("Force assign all request from user:", userId, "company:", companyId);
        
        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "User not associated with a company"
            });
        }
        
        // Find all expenses in the company that need approval
        const allExpenses = await Expense.find({
            company: companyId,
            status: { $in: ["pending_approval", "submitted"] }
        });
        
        console.log("Found all expenses needing approval:", allExpenses.length);
        
        // Find managers/admins in the company
        const managers = await User.find({
            company: companyId,
            role: { $in: ['manager', 'admin'] },
            isActive: true
        });
        
        console.log("Found managers:", managers.length);
        
        if (managers.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No managers or admins found in the company"
            });
        }
        
        // Assign all expenses to the first manager
        let assignedCount = 0;
        for (const expense of allExpenses) {
            try {
                // Assign to the first available manager
                expense.currentApprover = managers[0]._id;
                expense.status = "pending_approval";
                
                // Create a simple workflow if it doesn't exist
                if (!expense.approvalWorkflow || expense.approvalWorkflow.length === 0) {
                    expense.approvalWorkflow = managers.map((manager, index) => ({
                        approver: manager._id,
                        status: "pending",
                        order: index + 1
                    }));
                }
                
                await expense.save();
                assignedCount++;
                console.log("Assigned expense:", expense._id, "to manager:", managers[0]._id);
            } catch (saveError) {
                console.error("Error saving expense:", expense._id, saveError);
            }
        }
        
        res.json({
            success: true,
            message: `Force assigned ${assignedCount} expenses to managers`,
            assignedCount,
            totalExpenses: allExpenses.length
        });
    } catch (error) {
        console.error("Error force assigning expenses:", error);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Fix unassigned expenses endpoint
router.post("/fix-unassigned", authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.company;
        const userId = req.user._id;
        
        console.log("Fix unassigned request from user:", userId, "company:", companyId);
        
        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "User not associated with a company"
            });
        }
        
        // Find expenses that need approval but don't have a currentApprover
        const unassignedExpenses = await Expense.find({
            company: companyId,
            status: { $in: ["pending_approval", "submitted"] },
            $or: [
                { currentApprover: { $exists: false } },
                { currentApprover: null }
            ]
        });
        
        console.log("Found unassigned expenses:", unassignedExpenses.length);
        
        // Find managers/admins in the company
        const managers = await User.find({
            company: companyId,
            role: { $in: ['manager', 'admin'] },
            isActive: true
        });
        
        console.log("Found managers:", managers.length);
        
        if (managers.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No managers or admins found in the company"
            });
        }
        
        // Assign expenses to managers
        let assignedCount = 0;
        for (const expense of unassignedExpenses) {
            try {
                // Assign to the first available manager
                expense.currentApprover = managers[0]._id;
                expense.status = "pending_approval";
                
                // Create a simple workflow if it doesn't exist
                if (!expense.approvalWorkflow || expense.approvalWorkflow.length === 0) {
                    expense.approvalWorkflow = managers.map((manager, index) => ({
                        approver: manager._id,
                        status: "pending",
                        order: index + 1
                    }));
                }
                
                await expense.save();
                assignedCount++;
                console.log("Assigned expense:", expense._id, "to manager:", managers[0]._id);
            } catch (saveError) {
                console.error("Error saving expense:", expense._id, saveError);
            }
        }
        
        res.json({
            success: true,
            message: `Fixed ${assignedCount} unassigned expenses`,
            assignedCount,
            totalUnassigned: unassignedExpenses.length
        });
    } catch (error) {
        console.error("Error fixing unassigned expenses:", error);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Approve/Reject expense
router.put("/:expenseId/approve", authenticateToken, approveExpense);

// Bypass approval endpoint - no authorization checks for testing
router.put("/:expenseId/bypass-approve", authenticateToken, async (req, res) => {
    try {
        const { expenseId } = req.params;
        const { action, comments } = req.body;
        const userId = req.user._id;
        
        console.log("Bypass approval request:", { 
            expenseId, 
            action, 
            comments, 
            userId, 
            userRole: req.user.role,
            userCompany: req.user.company,
            userEmail: req.user.email
        });
        
        const expense = await Expense.findById(expenseId);
        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }
        
        console.log("Expense found:", {
            id: expense._id,
            title: expense.title,
            status: expense.status,
            company: expense.company,
            submittedBy: expense.submittedBy
        });
        
        // Simple approval logic - no authorization checks
        const normalizedAction = action === "approve" ? "approved" : 
                                action === "reject" ? "rejected" : action;
        
        if (normalizedAction === "rejected") {
            expense.status = "rejected";
            expense.rejectedAt = new Date();
            expense.rejectionReason = comments;
        } else {
            expense.status = "approved";
            expense.approvedAt = new Date();
            expense.finalApprover = userId;
        }
        
        // Update current approver
        expense.currentApprover = userId;
        
        await expense.save();
        
        console.log("Expense updated successfully:", {
            status: expense.status,
            approvedAt: expense.approvedAt,
            rejectedAt: expense.rejectedAt
        });
        
        res.json({
            success: true,
            message: `Expense ${normalizedAction} successfully`,
            expense: {
                id: expense._id,
                status: expense.status,
                approvedAt: expense.approvedAt,
                rejectedAt: expense.rejectedAt
            }
        });
    } catch (error) {
        console.error("Bypass approval error:", error);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Simple approval endpoint - bypasses complex authorization
router.put("/:expenseId/simple-approve", authenticateToken, async (req, res) => {
    try {
        const { expenseId } = req.params;
        const { action, comments } = req.body;
        const userId = req.user._id;
        
        console.log("Simple approval request:", { expenseId, action, comments, userId, userRole: req.user.role });
        
        const expense = await Expense.findById(expenseId);
        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }
        
        // Check if user is manager/admin in same company
        const isManagerOrAdmin = (req.user.role === 'admin' || req.user.role === 'manager');
        const isSameCompany = expense.company.toString() === req.user.company.toString();
        
        if (!isManagerOrAdmin || !isSameCompany) {
            return res.status(403).json({
                success: false,
                message: `Not authorized. Role: ${req.user.role}, Company match: ${isSameCompany}`
            });
        }
        
        // Simple approval logic
        const normalizedAction = action === "approve" ? "approved" : 
                                action === "reject" ? "rejected" : action;
        
        if (normalizedAction === "rejected") {
            expense.status = "rejected";
            expense.rejectedAt = new Date();
            expense.rejectionReason = comments;
        } else {
            expense.status = "approved";
            expense.approvedAt = new Date();
            expense.finalApprover = userId;
        }
        
        // Update current approver
        expense.currentApprover = userId;
        
        await expense.save();
        
        res.json({
            success: true,
            message: `Expense ${normalizedAction} successfully`,
            expense: {
                id: expense._id,
                status: expense.status,
                approvedAt: expense.approvedAt,
                rejectedAt: expense.rejectedAt
            }
        });
    } catch (error) {
        console.error("Simple approval error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Temporary test endpoint - allows any authenticated user to approve
router.put("/:expenseId/test-approve", authenticateToken, async (req, res) => {
    try {
        const { expenseId } = req.params;
        const { action, comments } = req.body;
        const userId = req.user._id;
        
        console.log("Test approval request:", { expenseId, action, comments, userId, userRole: req.user.role });
        
        const expense = await Expense.findById(expenseId);
        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }
        
        // Simple approval logic for testing
        const normalizedAction = action === "approve" ? "approved" : 
                                action === "reject" ? "rejected" : action;
        
        if (normalizedAction === "rejected") {
            expense.status = "rejected";
            expense.rejectedAt = new Date();
            expense.rejectionReason = comments;
        } else {
            expense.status = "approved";
            expense.approvedAt = new Date();
            expense.finalApprover = userId;
        }
        
        await expense.save();
        
        res.json({
            success: true,
            message: `Expense ${normalizedAction} successfully`,
            expense: {
                id: expense._id,
                status: expense.status,
                approvedAt: expense.approvedAt,
                rejectedAt: expense.rejectedAt
            }
        });
    } catch (error) {
        console.error("Test approval error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Debug endpoint to check user authentication
router.get("/debug/user", authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            user: {
                id: req.user._id,
                email: req.user.email,
                name: req.user.name,
                role: req.user.role,
                company: req.user.company,
                isActive: req.user.isActive
            }
        });
    } catch (error) {
        console.error("Debug user error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Debug endpoint to check expense details
router.get("/debug/:expenseId", authenticateToken, async (req, res) => {
    try {
        const { expenseId } = req.params;
        const userId = req.user._id;
        
        const expense = await Expense.findById(expenseId)
            .populate("submittedBy", "name email")
            .populate("currentApprover", "name email")
            .populate("company", "name");
            
        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }
        
        res.json({
            success: true,
            expense: {
                id: expense._id,
                title: expense.title,
                status: expense.status,
                submittedBy: expense.submittedBy,
                currentApprover: expense.currentApprover,
                company: expense.company,
                approvalWorkflow: expense.approvalWorkflow
            },
            user: {
                id: userId,
                role: req.user.role,
                company: req.user.company
            }
        });
    } catch (error) {
        console.error("Debug expense error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all expenses (Admin/Manager)
router.get("/company/:companyId", authenticateToken, getAllExpenses);

// Test endpoint
router.get("/test", (req, res) => {
    res.json({ success: true, message: "Expense API is working" });
});

// Test endpoint with authentication
router.get("/test-auth", authenticateToken, (req, res) => {
    res.json({ 
        success: true, 
        message: "Auth is working",
        user: {
            id: req.user._id,
            email: req.user.email,
            role: req.user.role,
            company: req.user.company
        }
    });
});

// Debug endpoint to check auth
router.get("/debug", authenticateToken, (req, res) => {
    res.json({ 
        success: true, 
        message: "Auth is working",
        user: {
            id: req.user._id,
            email: req.user.email,
            company: req.user.company,
            role: req.user.role
        }
    });
});

// Debug endpoint to test form data parsing
router.post("/debug-form", authenticateToken, upload.single('receiptImage'), (req, res) => {
    console.log("Debug form data received:");
    console.log("Body:", req.body);
    console.log("File:", req.file);
    console.log("Headers:", req.headers);
    console.log("Content-Type:", req.headers['content-type']);
    
    res.json({
        success: true,
        message: "Form data received",
        receivedData: req.body,
        file: req.file ? { name: req.file.originalname, size: req.file.size } : null,
        contentType: req.headers['content-type']
    });
});

export default router;
