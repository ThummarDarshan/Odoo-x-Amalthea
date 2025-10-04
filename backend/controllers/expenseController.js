import Expense from "../models/Expense.js";
import User from "../models/UserSchema.js";
import Company from "../models/Company.js";
import ApprovalRule from "../models/ApprovalRule.js";

// Submit expense
export const submitExpense = async (req, res) => {
    try {
        console.log("Expense submission request received:");
        console.log("Body:", req.body);
        console.log("File:", req.file);
        console.log("User from auth:", req.user);
        
        const { title, amount, originalCurrency, description, category, date, ocrData } = req.body;
        const receiptImage = req.file;
        const userId = req.user._id;
        const companyId = req.user.company;
        
        console.log("User ID:", userId, "Company ID:", companyId);
        console.log("Category received:", category);
        console.log("Title:", title);
        console.log("Amount:", amount, "Type:", typeof amount);
        console.log("Date:", date);
        console.log("Original Currency:", originalCurrency);
        
        // Validate category
        console.log("Validating category:", category);
        const validCategories = ["travel", "meals", "accommodation", "transport", "office", "entertainment", "other"];
        if (!validCategories.includes(category)) {
            console.log("Category validation failed:", category);
            return res.status(400).json({
                success: false,
                message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
            });
        }
        console.log("Category validation passed");
        
        // Validate required fields
        console.log("Validating required fields...");
        if (!title || !amount || !category || !date) {
            console.log("Required fields validation failed:", { title: !!title, amount: !!amount, category: !!category, date: !!date });
            return res.status(400).json({
                success: false,
                message: "Missing required fields: title, amount, category, and date are required"
            });
        }
        console.log("Required fields validation passed");
        
        // Validate and convert amount
        console.log("Validating amount:", amount, "Type:", typeof amount);
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            console.log("Amount validation failed:", amount);
            return res.status(400).json({
                success: false,
                message: "Amount must be a positive number"
            });
        }
        console.log("Amount validation passed, converted to:", numericAmount);

        // Get company currency
        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        // Convert currency if needed
        let convertedAmount = numericAmount;
        let exchangeRate = 1;
        
        if (originalCurrency !== company.currency) {
            // TODO: Implement currency conversion API call
            // For now, using 1:1 conversion
            convertedAmount = numericAmount;
            exchangeRate = 1;
        }

        // Create expense
        console.log("Creating expense with data:", {
            title,
            amount: convertedAmount,
            originalAmount: numericAmount,
            originalCurrency,
            convertedAmount,
            convertedCurrency: company.currency,
            exchangeRate,
            description,
            category,
            date,
            submittedBy: userId,
            company: companyId,
            status: "submitted"
        });
        
        let expense;
        try {
            expense = await Expense.create({
                title,
                amount: convertedAmount,
                originalAmount: numericAmount,
                originalCurrency,
                convertedAmount,
                convertedCurrency: company.currency,
                exchangeRate,
                description,
                category,
                date,
                submittedBy: userId,
                company: companyId,
                receiptImage: receiptImage ? {
                    filename: receiptImage.originalname,
                    mimetype: receiptImage.mimetype,
                    size: receiptImage.size,
                    buffer: receiptImage.buffer
                } : null,
                ocrData: ocrData ? JSON.parse(ocrData) : {},
                status: "submitted"
            });
            console.log("Expense created successfully:", expense._id);
        } catch (createError) {
            console.error("Error creating expense:", createError);
            return res.status(400).json({
                success: false,
                message: `Error creating expense: ${createError.message}`
            });
        }

        // Determine approval workflow
        try {
            await setupApprovalWorkflow(expense);
            console.log("Approval workflow setup completed");
            
            // Reload the expense to get the updated data
            const updatedExpense = await Expense.findById(expense._id)
                .populate("currentApprover", "name email")
                .populate("submittedBy", "name email");
            
            console.log("Expense after workflow setup:", {
                id: updatedExpense._id,
                status: updatedExpense.status,
                currentApprover: updatedExpense.currentApprover?.name,
                submittedBy: updatedExpense.submittedBy?.name
            });
        } catch (workflowError) {
            console.error("Error setting up approval workflow:", workflowError);
            // Don't fail the entire request if workflow setup fails
        }

        res.status(201).json({
            success: true,
            message: "Expense submitted successfully",
            expense: {
                _id: expense._id,
                title: expense.title,
                amount: expense.amount,
                category: expense.category,
                status: expense.status,
                date: expense.date
            }
        });
    } catch (error) {
        console.error("Expense submission error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Setup approval workflow for expense
const setupApprovalWorkflow = async (expense) => {
    try {
        console.log("Setting up approval workflow for expense:", expense._id);
        
        // Get applicable approval rules
        const rules = await ApprovalRule.find({
            company: expense.company,
            isActive: true,
            "conditions.amountThreshold": { $lte: expense.amount }
        }).sort({ "conditions.amountThreshold": -1 });

        console.log("Found approval rules:", rules.length);

        if (rules.length === 0) {
            console.log("No approval rules found, setting up default workflow");
            
            // Find managers/admins in the company to assign as approvers
            const managers = await User.find({
                company: expense.company,
                role: { $in: ['manager', 'admin'] },
                isActive: true
            }).sort({ role: 1 }); // Admins first, then managers

            console.log("Found managers/admins:", managers.length);

            if (managers.length > 0) {
                // Create a simple workflow with available managers
                const workflow = managers.map((manager, index) => ({
                    approver: manager._id,
                    status: "pending",
                    order: index + 1
                }));

                expense.approvalWorkflow = workflow;
                expense.currentApprover = workflow[0]?.approver;
                expense.status = "pending_approval";
                console.log("Assigned managers as approvers:", managers.length);
                console.log("Current approver set to:", expense.currentApprover);
                console.log("Workflow created:", workflow);
            } else {
                console.log("No managers found, setting status to pending_approval without approver");
                expense.status = "pending_approval";
                // This will be handled by the fix-unassigned endpoint
            }
            await expense.save();
            return;
        }

        // Apply the most specific rule
        const rule = rules[0];
        const workflow = [];

        // Add approvers in order
        for (let i = 0; i < rule.approvers.length; i++) {
            const approver = rule.approvers[i];
            workflow.push({
                approver: approver.user,
                status: "pending",
                order: approver.order
            });
        }

        expense.approvalWorkflow = workflow;
        expense.currentApprover = workflow[0]?.approver;
        await expense.save();
        console.log("Approval workflow setup completed");
    } catch (error) {
        console.error("Error setting up approval workflow:", error);
        // Set expense to pending approval as fallback
        try {
            expense.status = "pending_approval";
            await expense.save();
        } catch (saveError) {
            console.error("Error saving expense after workflow setup failure:", saveError);
        }
    }
};

// Get expenses for user
export const getUserExpenses = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status, page = 1, limit = 10 } = req.query;

        const query = { submittedBy: userId };
        if (status) {
            query.status = status;
        }

        const expenses = await Expense.find(query)
            .populate("currentApprover", "name email")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Expense.countDocuments(query);

        res.status(200).json({
            success: true,
            expenses,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get expenses pending approval
export const getPendingApprovals = async (req, res) => {
    try {
        const userId = req.user._id;
        const companyId = req.user.company;
        const { page = 1, limit = 10 } = req.query;

        console.log("Getting pending approvals for user:", userId, "company:", companyId);

        // First, let's check what expenses exist in the company
        const allCompanyExpenses = await Expense.find({
            company: companyId,
            status: { $in: ["pending_approval", "submitted"] }
        })
        .populate("submittedBy", "name email")
        .populate("currentApprover", "name email")
        .populate("company", "name currency");

        console.log("All company expenses with pending/submitted status:", allCompanyExpenses.length);
        console.log("Expenses details:", allCompanyExpenses.map(e => ({
            id: e._id,
            title: e.title,
            status: e.status,
            currentApprover: e.currentApprover,
            submittedBy: e.submittedBy?.name
        })));

        // Find expenses where current user is the current approver
        let expenses = await Expense.find({
            currentApprover: userId,
            status: "pending_approval"
        })
        .populate("submittedBy", "name email")
        .populate("company", "name currency")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

        console.log("Expenses assigned to current user:", expenses.length);

        // If no expenses found and user is manager/admin, show all company expenses that need approval
        if (expenses.length === 0 && (req.user.role === 'manager' || req.user.role === 'admin')) {
            console.log("No direct assignments found, showing all company expenses needing approval...");
            expenses = await Expense.find({
                company: companyId,
                status: { $in: ["pending_approval", "submitted"] }
            })
            .populate("submittedBy", "name email")
            .populate("currentApprover", "name email")
            .populate("company", "name currency")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

            console.log("Found company expenses needing approval:", expenses.length);
        }

        const total = await Expense.countDocuments({
            currentApprover: userId,
            status: "pending_approval"
        });

        res.status(200).json({
            success: true,
            expenses,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total,
            debug: {
                allCompanyExpenses: allCompanyExpenses.length,
                userExpenses: expenses.length
            }
        });
    } catch (error) {
        console.error("Error in getPendingApprovals:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Approve/Reject expense
export const approveExpense = async (req, res) => {
    try {
        const { expenseId } = req.params;
        const { action, comments } = req.body; // action: "approve" or "reject"
        
        const userId = req.user._id;
        console.log("Approval request:", { expenseId, action, comments, userId });

        // Normalize action values
        const normalizedAction = action === "approve" ? "approved" : 
                                action === "reject" ? "rejected" : action;
        
        console.log("Normalized action:", normalizedAction);

        const expense = await Expense.findById(expenseId);
        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        // Simplified authorization - allow any manager/admin in the same company
        const isManagerOrAdmin = (req.user.role === 'admin' || req.user.role === 'manager');
        const isSameCompany = expense.company.toString() === req.user.company.toString();
        
        console.log("Authorization check:", {
            userId,
            userRole: req.user.role,
            isManagerOrAdmin,
            expenseCompany: expense.company,
            userCompany: req.user.company,
            isSameCompany,
            currentApprover: expense.currentApprover
        });
        
        if (!isManagerOrAdmin || !isSameCompany) {
            console.log("Authorization failed:", { isManagerOrAdmin, isSameCompany });
            return res.status(403).json({
                success: false,
                message: `Authorization failed. Role: ${req.user.role}, Company match: ${isSameCompany}`
            });
        }
        
        console.log("Authorization passed - proceeding with approval");

        // Update current approver's decision
        let currentApproverIndex = -1;
        
        if (expense.approvalWorkflow && expense.approvalWorkflow.length > 0) {
            currentApproverIndex = expense.approvalWorkflow.findIndex(
                w => w.approver.toString() === userId && w.status === "pending"
            );
        }

        if (currentApproverIndex === -1) {
            // If no workflow exists, create a simple one or handle directly
            if (!expense.approvalWorkflow || expense.approvalWorkflow.length === 0) {
                // Create a simple workflow entry
                expense.approvalWorkflow = [{
                    approver: userId,
                    status: normalizedAction,
                    comments: comments,
                    approvedAt: new Date(),
                    order: 1
                }];
            } else {
                return res.status(400).json({
                    success: false,
                    message: "No pending approval found for this user"
                });
            }
        } else {
            expense.approvalWorkflow[currentApproverIndex].status = normalizedAction;
            expense.approvalWorkflow[currentApproverIndex].comments = comments;
            expense.approvalWorkflow[currentApproverIndex].approvedAt = new Date();
        }

        if (normalizedAction === "rejected") {
            expense.status = "rejected";
            expense.rejectedAt = new Date();
            expense.rejectionReason = comments;
        } else {
            // Check if there are more approvers
            const nextApprover = expense.approvalWorkflow.find(
                w => w.status === "pending"
            );

            if (nextApprover) {
                expense.currentApprover = nextApprover.approver;
            } else {
                // All approvers have approved
                expense.status = "approved";
                expense.approvedAt = new Date();
                expense.finalApprover = userId;
                expense.currentApprover = null; // Clear current approver
            }
        }

        await expense.save();

        res.status(200).json({
            success: true,
            message: `Expense ${action}d successfully`,
            expense
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all expenses (Admin/Manager)
export const getAllExpenses = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { status, page = 1, limit = 10 } = req.query;

        const query = { company: companyId };
        if (status) {
            query.status = status;
        }

        const expenses = await Expense.find(query)
            .populate("submittedBy", "name email role")
            .populate("currentApprover", "name email")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Expense.countDocuments(query);

        res.status(200).json({
            success: true,
            expenses,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
