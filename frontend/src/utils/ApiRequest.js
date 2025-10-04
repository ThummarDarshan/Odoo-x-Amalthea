// const host = "https://expense-tracker-app-knl1.onrender.com";
const host = "http://localhost:5000";

// Authentication APIs
export const registerAPI = `${host}/api/auth/register`;
export const loginAPI = `${host}/api/auth/login`;
export const setAvatarAPI = `${host}/api/auth/setAvatar`;

// Company APIs
export const createCompanyAPI = `${host}/api/company`;
export const getCompanyAPI = (companyId) => `${host}/api/company/${companyId}`;
export const updateCompanySettingsAPI = (companyId) => `${host}/api/company/${companyId}/settings`;

// User Management APIs
export const getUsersAPI = `${host}/api/users`;
export const createUserAPI = `${host}/api/users`;
export const updateUserAPI = (userId) => `${host}/api/users/${userId}`;
export const deleteUserAPI = (userId) => `${host}/api/users/${userId}`;
export const getUserDetailsAPI = (userId) => `${host}/api/users/${userId}`;

// Expense APIs
export const submitExpenseAPI = `${host}/api/expenses/submit`;
export const getUserExpensesAPI = `${host}/api/expenses/user`;
export const getPendingApprovalsAPI = `${host}/api/expenses/pending`;
export const approveExpenseAPI = (expenseId) => `${host}/api/expenses/${expenseId}/approve`;
export const getAllExpensesAPI = (companyId) => `${host}/api/expenses/company/${companyId}`;

// Approval Rule APIs
export const getApprovalRulesAPI = `${host}/api/approval-rules`;
export const createApprovalRuleAPI = `${host}/api/approval-rules`;
export const updateApprovalRuleAPI = (ruleId) => `${host}/api/approval-rules/${ruleId}`;
export const deleteApprovalRuleAPI = (ruleId) => `${host}/api/approval-rules/${ruleId}`;
export const setupDefaultApprovalRuleAPI = `${host}/api/approval-rules/setup-default`;

// Legacy Transaction APIs (for backward compatibility)
export const addTransaction = `${host}/api/v1/addTransaction`;
export const getTransactions = `${host}/api/v1/getTransaction`;
export const editTransactions = `${host}/api/v1/updateTransaction`;
export const deleteTransactions = `${host}/api/v1/deleteTransaction`;

// External APIs
export const countriesAPI = "https://restcountries.com/v3.1/all?fields=name,currencies";
export const exchangeRateAPI = (baseCurrency) => `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`;