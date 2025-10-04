# Testing the Approval Flow

## Steps to Test the Complete Approval System

### 1. **Backend Setup**
Make sure the backend is running on `http://localhost:5000`

### 2. **Create Test Users**
1. Register an admin/manager user
2. Register an employee user (both should be in the same company)

### 3. **Test Expense Submission**
1. Login as an employee
2. Go to "Submit Expense" page
3. Submit an expense with amount > $100 (to trigger approval workflow)
4. Check the console logs for workflow setup

### 4. **Test Approval Dashboard**
1. Login as a manager/admin
2. Go to "Approvals" page
3. You should see the submitted expense
4. If not, use the debug buttons:
   - Click "Debug Company Expenses" to see all expenses
   - Click "Fix Unassigned Expenses" to assign unassigned expenses

### 5. **Test Approval Process**
1. Click "Approve" or "Reject" on an expense
2. Add comments if needed
3. Submit the decision
4. Check that the expense status updates

## Debug Information

### Console Logs to Check:
- Expense submission logs
- Workflow setup logs
- Approval assignment logs
- API response logs

### Common Issues and Solutions:

1. **No expenses showing in approval page:**
   - Check if expenses have `currentApprover` set
   - Use "Fix Unassigned Expenses" button
   - Check console for debug information

2. **Expenses not getting assigned:**
   - Ensure there are managers/admins in the company
   - Check the workflow setup logic
   - Verify user roles are correct

3. **API errors:**
   - Check authentication tokens
   - Verify API endpoints are correct
   - Check network connectivity

## API Endpoints for Testing:

- `GET /api/expenses/pending` - Get pending approvals
- `GET /api/expenses/debug/company-expenses` - Debug all company expenses
- `POST /api/expenses/fix-unassigned` - Fix unassigned expenses
- `PUT /api/expenses/:id/approve` - Approve/reject expense

## Expected Behavior:

1. Employee submits expense → System creates approval workflow
2. Manager/admin sees expense in approval dashboard
3. Manager can approve/reject with comments
4. Expense status updates accordingly
5. System handles workflow progression
