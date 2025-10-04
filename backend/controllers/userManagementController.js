import User from "../models/UserSchema.js";
import Company from "../models/Company.js";
import bcrypt from "bcrypt";

// Get all users in company
export const getCompanyUsers = async (req, res) => {
    try {
        const companyId = req.user.company;
        const { page = 1, limit = 10, role, isActive } = req.query;

        const query = { company: companyId };
        if (role) query.role = role;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        const users = await User.find(query)
            .populate("manager", "name email")
            .select("-password")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await User.countDocuments(query);

        res.status(200).json({
            success: true,
            users,
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

// Create new user
export const createUser = async (req, res) => {
    try {
        const { name, email, password, role, manager } = req.body;
        const companyId = req.user.company;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User with this email already exists"
            });
        }

        // Validate manager if provided
        if (manager) {
            const managerUser = await User.findOne({ 
                _id: manager, 
                company: companyId,
                role: { $in: ['manager', 'admin'] }
            });
            if (!managerUser) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid manager selected"
                });
            }
        }

        // Create user
        const newUser = await User.create({
            name,
            email,
            password,
            role: role || 'employee',
            company: companyId,
            manager: manager || null,
            permissions: {
                canApprove: role === 'admin' || role === 'manager',
                canCreateUsers: role === 'admin',
                canViewAllExpenses: role === 'admin' || role === 'manager',
                canOverrideApprovals: role === 'admin'
            }
        });

        // Remove password from response
        const userResponse = { ...newUser.toObject() };
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: "User created successfully",
            user: userResponse
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update user
export const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, email, role, manager, isActive } = req.body;
        const companyId = req.user.company;

        // Check if user exists and belongs to company
        const user = await User.findOne({ _id: userId, company: companyId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: "Email already in use"
                });
            }
        }

        // Validate manager if provided
        if (manager) {
            const managerUser = await User.findOne({ 
                _id: manager, 
                company: companyId,
                role: { $in: ['manager', 'admin'] }
            });
            if (!managerUser) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid manager selected"
                });
            }
        }

        // Update user
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (role) {
            updateData.role = role;
            // Update permissions based on role
            updateData.permissions = {
                canApprove: role === 'admin' || role === 'manager',
                canCreateUsers: role === 'admin',
                canViewAllExpenses: role === 'admin' || role === 'manager',
                canOverrideApprovals: role === 'admin'
            };
        }
        if (manager !== undefined) updateData.manager = manager;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).select("-password");

        res.status(200).json({
            success: true,
            message: "User updated successfully",
            user: updatedUser
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete user (soft delete by deactivating)
export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company;

        // Check if user exists and belongs to company
        const user = await User.findOne({ _id: userId, company: companyId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Don't allow deleting admin users
        if (user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: "Cannot delete admin users"
            });
        }

        // Soft delete by deactivating
        await User.findByIdAndUpdate(userId, { isActive: false });

        res.status(200).json({
            success: true,
            message: "User deactivated successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get user details
export const getUserDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company;

        const user = await User.findOne({ _id: userId, company: companyId })
            .populate("manager", "name email")
            .select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
