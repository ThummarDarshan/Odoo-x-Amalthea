import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";

// Enhanced User Schema for Enterprise Expense Management
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        validate: validator.isEmail,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [6, "Password must be at least 6 characters"]
    },
    role: {
        type: String,
        enum: ["admin", "manager", "employee"],
        default: "employee"
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    },
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    isManagerApprover: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    avatarImage: {
        type: String,
        default: ""
    },
    isAvatarImageSet: {
        type: Boolean,
        default: false
    },
    permissions: {
        canApprove: { type: Boolean, default: false },
        canCreateUsers: { type: Boolean, default: false },
        canViewAllExpenses: { type: Boolean, default: false },
        canOverrideApprovals: { type: Boolean, default: false }
    },
    transactions: {
        type: [],
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre("save", async function(next) {
    if (!this.isModified("password")) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;