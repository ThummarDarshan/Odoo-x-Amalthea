import ApprovalRule from "../models/ApprovalRule.js";
import User from "../models/UserSchema.js";
import Company from "../models/Company.js";

// Create approval rule
export const createApprovalRule = async (req, res) => {
    try {
        const { name, conditions, approvers, approvalType } = req.body;
        const companyId = req.user.company;

        // Validate approvers
        for (const approver of approvers) {
            const user = await User.findOne({
                _id: approver.user,
                company: companyId,
                role: { $in: ['manager', 'admin'] }
            });
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid approver: ${approver.user}`
                });
            }
        }

        const rule = await ApprovalRule.create({
            name,
            company: companyId,
            conditions,
            approvers,
            approvalType
        });

        res.status(201).json({
            success: true,
            message: "Approval rule created successfully",
            rule
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get approval rules for company
export const getApprovalRules = async (req, res) => {
    try {
        const companyId = req.user.company;
        const rules = await ApprovalRule.find({ company: companyId })
            .populate('approvers.user', 'name email role')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            rules
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update approval rule
export const updateApprovalRule = async (req, res) => {
    try {
        const { ruleId } = req.params;
        const { name, conditions, approvers, approvalType, isActive } = req.body;
        const companyId = req.user.company;

        const rule = await ApprovalRule.findOne({
            _id: ruleId,
            company: companyId
        });

        if (!rule) {
            return res.status(404).json({
                success: false,
                message: "Approval rule not found"
            });
        }

        // Validate approvers if provided
        if (approvers) {
            for (const approver of approvers) {
                const user = await User.findOne({
                    _id: approver.user,
                    company: companyId,
                    role: { $in: ['manager', 'admin'] }
                });
                if (!user) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid approver: ${approver.user}`
                    });
                }
            }
        }

        // Update rule
        if (name) rule.name = name;
        if (conditions) rule.conditions = conditions;
        if (approvers) rule.approvers = approvers;
        if (approvalType) rule.approvalType = approvalType;
        if (typeof isActive === 'boolean') rule.isActive = isActive;

        await rule.save();

        res.status(200).json({
            success: true,
            message: "Approval rule updated successfully",
            rule
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete approval rule
export const deleteApprovalRule = async (req, res) => {
    try {
        const { ruleId } = req.params;
        const companyId = req.user.company;

        const rule = await ApprovalRule.findOneAndDelete({
            _id: ruleId,
            company: companyId
        });

        if (!rule) {
            return res.status(404).json({
                success: false,
                message: "Approval rule not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Approval rule deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Setup default approval rule for company
export const setupDefaultApprovalRule = async (req, res) => {
    try {
        const companyId = req.user.company;
        const userId = req.user._id;

        // Check if user is admin or manager
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Only admins and managers can setup approval rules"
            });
        }

        // Check if default rule already exists
        const existingRule = await ApprovalRule.findOne({
            company: companyId,
            name: "Default Approval Rule"
        });

        if (existingRule) {
            return res.status(400).json({
                success: false,
                message: "Default approval rule already exists"
            });
        }

        // Get all managers and admins in the company
        const approvers = await User.find({
            company: companyId,
            role: { $in: ['manager', 'admin'] },
            isActive: true
        }).select('_id name email role');

        if (approvers.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No managers or admins found in the company"
            });
        }

        // Create default rule
        const defaultRule = await ApprovalRule.create({
            name: "Default Approval Rule",
            company: companyId,
            conditions: {
                amountThreshold: 0, // All amounts require approval
                categories: ["travel", "meals", "accommodation", "transport", "office", "entertainment", "other"]
            },
            approvers: approvers.map((approver, index) => ({
                user: approver._id,
                order: index + 1,
                isRequired: true
            })),
            approvalType: "sequential",
            isActive: true
        });

        res.status(201).json({
            success: true,
            message: "Default approval rule created successfully",
            rule: defaultRule
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
