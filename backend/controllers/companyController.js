import Company from "../models/Company.js";
import User from "../models/UserSchema.js";
import jwt from "jsonwebtoken";

// Create company on first user signup
export const createCompany = async (req, res) => {
    try {
        const { name, country, currency, adminId } = req.body;

        const company = await Company.create({
            name,
            country,
            currency,
            admin: adminId
        });

        // Update user to be admin
        await User.findByIdAndUpdate(adminId, {
            role: "admin",
            permissions: {
                canApprove: true,
                canCreateUsers: true,
                canViewAllExpenses: true,
                canOverrideApprovals: true
            }
        });

        res.status(201).json({
            success: true,
            message: "Company created successfully",
            company
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get company details
export const getCompany = async (req, res) => {
    try {
        const { companyId } = req.params;

        const company = await Company.findById(companyId)
            .populate("admin", "name email role");

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        res.status(200).json({
            success: true,
            company
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update company settings
export const updateCompanySettings = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { settings } = req.body;

        const company = await Company.findByIdAndUpdate(
            companyId,
            { settings },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Company settings updated successfully",
            company
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
