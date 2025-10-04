import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Expense title is required"],
        trim: true
    },
    amount: {
        type: Number,
        required: [true, "Amount is required"],
        min: [0, "Amount cannot be negative"]
    },
    originalAmount: {
        type: Number,
        required: true
    },
    originalCurrency: {
        type: String,
        required: true
    },
    convertedAmount: {
        type: Number,
        required: true
    },
    convertedCurrency: {
        type: String,
        required: true
    },
    exchangeRate: {
        type: Number,
        default: 1
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        required: [true, "Category is required"],
        enum: ["travel", "meals", "accommodation", "transport", "office", "entertainment", "other"]
    },
    date: {
        type: Date,
        required: [true, "Date is required"],
        default: Date.now
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    },
    status: {
        type: String,
        enum: ["draft", "submitted", "pending_approval", "approved", "rejected", "paid"],
        default: "draft"
    },
    approvalWorkflow: [{
        approver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        },
        comments: {
            type: String,
            default: ""
        },
        approvedAt: {
            type: Date
        },
        order: {
            type: Number,
            required: true
        }
    }],
    currentApprover: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    receiptImage: {
        type: String,
        default: ""
    },
    ocrData: {
        extracted: { type: Boolean, default: false },
        merchantName: { type: String, default: "" },
        extractedAmount: { type: Number },
        extractedDate: { type: Date },
        extractedItems: [{
            description: String,
            amount: Number
        }]
    },
    finalApprover: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    approvedAt: {
        type: Date
    },
    rejectedAt: {
        type: Date
    },
    rejectionReason: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
expenseSchema.pre("save", function(next) {
    this.updatedAt = new Date();
    next();
});

const Expense = mongoose.model("Expense", expenseSchema);
export default Expense;
