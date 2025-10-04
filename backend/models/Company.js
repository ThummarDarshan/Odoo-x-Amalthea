import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Company name is required"],
        trim: true
    },
    country: {
        type: String,
        required: [true, "Country is required"],
        trim: true
    },
    currency: {
        type: String,
        required: [true, "Currency is required"],
        default: "USD"
    },
    currencySymbol: {
        type: String,
        default: "$"
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    settings: {
        approvalRules: {
            percentageRule: {
                enabled: { type: Boolean, default: false },
                percentage: { type: Number, default: 60 }
            },
            specificApproverRule: {
                enabled: { type: Boolean, default: false },
                requiredApprovers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
            },
            hybridRule: {
                enabled: { type: Boolean, default: false },
                percentage: { type: Number, default: 60 },
                requiredApprovers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
            }
        },
        expenseLimits: {
            employeeLimit: { type: Number, default: 1000 },
            managerLimit: { type: Number, default: 5000 },
            autoApprovalLimit: { type: Number, default: 100 }
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Company = mongoose.model("Company", companySchema);
export default Company;
