import mongoose from "mongoose";

const approvalRuleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Rule name is required"],
        trim: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    },
    conditions: {
        amountThreshold: {
            type: Number,
            required: true
        },
        categories: [{
            type: String,
            enum: ["travel", "meals", "accommodation", "transport", "office", "entertainment", "other"]
        }],
        departments: [{
            type: String
        }]
    },
    approvers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        order: {
            type: Number,
            required: true
        },
        isRequired: {
            type: Boolean,
            default: false
        }
    }],
    approvalType: {
        type: String,
        enum: ["sequential", "percentage", "specific", "hybrid"],
        default: "sequential"
    },
    percentageRule: {
        enabled: { type: Boolean, default: false },
        percentage: { type: Number, default: 60 }
    },
    specificApprovers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const ApprovalRule = mongoose.model("ApprovalRule", approvalRuleSchema);
export default ApprovalRule;
