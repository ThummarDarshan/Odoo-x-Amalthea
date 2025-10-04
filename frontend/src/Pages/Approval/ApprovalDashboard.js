import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Form, Alert, Tab, Tabs } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  getPendingApprovalsAPI, 
  approveExpenseAPI, 
  getApprovalRulesAPI, 
  setupDefaultApprovalRuleAPI 
} from '../../utils/ApiRequest';
import axios from 'axios';

const ApprovalDashboard = () => {
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [action, setAction] = useState('');
  const [comments, setComments] = useState('');
  const [approvalRules, setApprovalRules] = useState([]);
  const [setupLoading, setSetupLoading] = useState(false);

  useEffect(() => {
    loadPendingApprovals();
    loadApprovalRules();
  }, []);

  const loadPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await axios.get(getPendingApprovalsAPI, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('Pending approvals response:', response.data);

      if (response.data.success) {
        setPendingExpenses(response.data.expenses);
        
        // Show debug information if available
        if (response.data.debug) {
          console.log('Debug info:', response.data.debug);
          if (response.data.debug.allCompanyExpenses > 0 && response.data.debug.userExpenses === 0) {
            toast.info(`Found ${response.data.debug.allCompanyExpenses} company expenses but none assigned to you. This might be a workflow issue.`, {
              ...toastOptions,
              autoClose: 5000
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading pending approvals:', error);
      toast.error('Error loading pending approvals', toastOptions);
    } finally {
      setLoading(false);
    }
  };

  const loadApprovalRules = async () => {
    try {
      const response = await axios.get(getApprovalRulesAPI, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setApprovalRules(response.data.rules);
      }
    } catch (error) {
      console.error('Error loading approval rules:', error);
    }
  };

  const setupDefaultApprovalRule = async () => {
    try {
      setSetupLoading(true);
      const response = await axios.post(setupDefaultApprovalRuleAPI, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        toast.success('Default approval rule created successfully!', toastOptions);
        loadApprovalRules();
      } else {
        toast.error(response.data.message, toastOptions);
      }
    } catch (error) {
      console.error('Error setting up default approval rule:', error);
      toast.error('Error setting up default approval rule', toastOptions);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleApproval = (expense, action) => {
    setSelectedExpense(expense);
    setAction(action);
    setShowModal(true);
  };

  const submitApproval = async () => {
    if (!selectedExpense || !action) return;

    try {
      setLoading(true);
      // Use the bypass approval endpoint for testing
      const response = await axios.put(
        approveExpenseAPI(selectedExpense._id).replace('/approve', '/bypass-approve'),
        {
          action: action,
          comments: comments
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        toast.success(`Expense ${action}d successfully!`, toastOptions);
        setShowModal(false);
        setComments('');
        loadPendingApprovals();
      } else {
        toast.error(response.data.message, toastOptions);
      }
    } catch (error) {
      console.error('Error submitting approval:', error);
      toast.error('Error submitting approval', toastOptions);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending_approval': { variant: 'warning', text: 'Pending' },
      'approved': { variant: 'success', text: 'Approved' },
      'rejected': { variant: 'danger', text: 'Rejected' },
      'submitted': { variant: 'info', text: 'Submitted' }
    };

    const config = statusConfig[status] || { variant: 'secondary', text: status };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  const toastOptions = {
    position: "bottom-right",
    autoClose: 2000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    progress: undefined,
    theme: "dark",
  };

  if (loading && pendingExpenses.length === 0) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <h2>Approval Dashboard</h2>
          <p className="text-muted">Manage expense approvals and approval rules</p>
        </Col>
      </Row>

      <Tabs defaultActiveKey="pending" id="approval-tabs" className="mb-4">
        <Tab eventKey="pending" title="Pending Approvals">
          <Row>
            <Col>
              <h4>Pending Approvals</h4>
              <p className="text-muted">Review and approve expense claims</p>
              <Button 
                variant="outline-info" 
                size="sm" 
                onClick={async () => {
                  try {
                    const response = await axios.get(`${getPendingApprovalsAPI.replace('/pending', '/debug/company-expenses')}`, {
                      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    console.log('Debug company expenses:', response.data);
                    toast.info('Check console for debug information', toastOptions);
                  } catch (error) {
                    console.error('Debug error:', error);
                  }
                }}
                className="me-2"
              >
                Debug Company Expenses
              </Button>
              <Button 
                variant="outline-warning" 
                size="sm" 
                onClick={async () => {
                  try {
                    setLoading(true);
                    const response = await axios.post(`${getPendingApprovalsAPI.replace('/pending', '/fix-unassigned')}`, {}, {
                      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    console.log('Fix unassigned response:', response.data);
                    toast.success(response.data.message, toastOptions);
                    loadPendingApprovals(); // Reload the list
                  } catch (error) {
                    console.error('Fix unassigned error:', error);
                    toast.error('Error fixing unassigned expenses', toastOptions);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="me-2"
              >
                Fix Unassigned Expenses
              </Button>
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={async () => {
                  try {
                    const response = await axios.get(`${getPendingApprovalsAPI.replace('/pending', '/debug/user')}`, {
                      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    console.log('Debug user info:', response.data);
                    toast.info('Check console for user details', toastOptions);
                  } catch (error) {
                    console.error('Debug user error:', error);
                    toast.error('Error debugging user', toastOptions);
                  }
                }}
                className="me-2"
              >
                Debug User
              </Button>
              <Button 
                variant="outline-danger" 
                size="sm" 
                onClick={async () => {
                  try {
                    setLoading(true);
                    const response = await axios.post(`${getPendingApprovalsAPI.replace('/pending', '/force-assign-all')}`, {}, {
                      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    console.log('Force assign response:', response.data);
                    toast.success(response.data.message, toastOptions);
                    loadPendingApprovals(); // Reload the list
                  } catch (error) {
                    console.error('Force assign error:', error);
                    toast.error('Error force assigning expenses', toastOptions);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="me-2"
              >
                Force Assign All
              </Button>
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={async () => {
                  try {
                    const response = await axios.get(`${getPendingApprovalsAPI.replace('/pending', '/test-auth')}`, {
                      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    console.log('Auth test response:', response.data);
                    toast.info('Check console for auth details', toastOptions);
                  } catch (error) {
                    console.error('Auth test error:', error);
                    toast.error('Auth test failed', toastOptions);
                  }
                }}
              >
                Test Auth
              </Button>
            </Col>
          </Row>

          {pendingExpenses.length === 0 ? (
            <Row>
              <Col>
                <Alert variant="info">
                  <Alert.Heading>No Pending Approvals</Alert.Heading>
                  <p>There are currently no expenses waiting for your approval.</p>
                </Alert>
              </Col>
            </Row>
          ) : (
            <Row>
              {pendingExpenses.map((expense) => (
                <Col md={6} lg={4} key={expense._id} className="mb-4">
                  <Card>
                    <Card.Header className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">{expense.title}</h6>
                      {getStatusBadge(expense.status)}
                    </Card.Header>
                    <Card.Body>
                      <div className="mb-2">
                        <strong>Amount:</strong> {formatCurrency(expense.amount, expense.convertedCurrency)}
                      </div>
                      <div className="mb-2">
                        <strong>Category:</strong> {expense.category}
                      </div>
                      <div className="mb-2">
                        <strong>Submitted by:</strong> {expense.submittedBy?.name}
                      </div>
                      <div className="mb-2">
                        <strong>Date:</strong> {new Date(expense.date).toLocaleDateString()}
                      </div>
                      {expense.description && (
                        <div className="mb-3">
                          <strong>Description:</strong>
                          <p className="text-muted small">{expense.description}</p>
                        </div>
                      )}
                      
                      <div className="d-grid gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleApproval(expense, 'approve')}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleApproval(expense, 'reject')}
                        >
                          Reject
                        </Button>
                        <Button
                          variant="outline-dark"
                          size="sm"
                          onClick={() => { setSelectedExpense(expense); setShowDetailsModal(true); }}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await axios.get(`${getPendingApprovalsAPI.replace('/pending', `/debug/${expense._id}`)}`, {
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                              });
                              console.log('Debug expense details:', response.data);
                              toast.info('Check console for expense details', toastOptions);
                            } catch (error) {
                              console.error('Debug expense error:', error);
                              toast.error('Error debugging expense', toastOptions);
                            }
                          }}
                          className="me-1"
                        >
                          Debug
                        </Button>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await axios.put(`${getPendingApprovalsAPI.replace('/pending', `/${expense._id}/bypass-approve`)}`, {
                                action: 'approve',
                                comments: 'Bypass approval'
                              }, {
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                              });
                              console.log('Bypass approval response:', response.data);
                              toast.success('Bypass approval successful!', toastOptions);
                              loadPendingApprovals(); // Reload the list
                            } catch (error) {
                              console.error('Bypass approval error:', error);
                              toast.error('Bypass approval failed', toastOptions);
                            }
                          }}
                          className="me-1"
                        >
                          Bypass Approve
                        </Button>
                        <Button
                          variant="outline-warning"
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await axios.put(`${getPendingApprovalsAPI.replace('/pending', `/${expense._id}/test-approve`)}`, {
                                action: 'approve',
                                comments: 'Test approval'
                              }, {
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                              });
                              console.log('Test approval response:', response.data);
                              toast.success('Test approval successful!', toastOptions);
                              loadPendingApprovals(); // Reload the list
                            } catch (error) {
                              console.error('Test approval error:', error);
                              toast.error('Test approval failed', toastOptions);
                            }
                          }}
                        >
                          Test Approve
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Tab>

        <Tab eventKey="rules" title="Approval Rules">
          <Row>
            <Col>
              <h4>Approval Rules</h4>
              <p className="text-muted">Configure approval workflows for expenses</p>
            </Col>
          </Row>

          {approvalRules.length === 0 ? (
            <Row>
              <Col>
                <Alert variant="warning">
                  <Alert.Heading>No Approval Rules Found</Alert.Heading>
                  <p>You need to set up approval rules for expenses to be properly routed to approvers.</p>
                  <Button 
                    variant="primary" 
                    onClick={setupDefaultApprovalRule}
                    disabled={setupLoading}
                  >
                    {setupLoading ? 'Setting up...' : 'Setup Default Approval Rule'}
                  </Button>
                </Alert>
              </Col>
            </Row>
          ) : (
            <Row>
              {approvalRules.map((rule) => (
                <Col md={6} lg={4} key={rule._id} className="mb-4">
                  <Card>
                    <Card.Header className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">{rule.name}</h6>
                      <Badge bg={rule.isActive ? 'success' : 'secondary'}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </Card.Header>
                    <Card.Body>
                      <div className="mb-2">
                        <strong>Amount Threshold:</strong> ${rule.conditions.amountThreshold}
                      </div>
                      <div className="mb-2">
                        <strong>Approval Type:</strong> {rule.approvalType}
                      </div>
                      <div className="mb-2">
                        <strong>Approvers:</strong> {rule.approvers.length}
                      </div>
                      <div className="mb-3">
                        <strong>Categories:</strong>
                        <div className="mt-1">
                          {rule.conditions.categories?.map((category, index) => (
                            <Badge key={index} bg="info" className="me-1">{category}</Badge>
                          ))}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Tab>
      </Tabs>

      {/* Approval Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {action === 'approve' ? 'Approve' : 'Reject'} Expense
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedExpense && (
            <div className="mb-3">
              <h6>{selectedExpense.title}</h6>
              <p><strong>Amount:</strong> {formatCurrency(selectedExpense.amount, selectedExpense.convertedCurrency)}</p>
              <p><strong>Submitted by:</strong> {selectedExpense.submittedBy?.name}</p>
            </div>
          )}
          
          <Form.Group className="mb-3">
            <Form.Label>Comments</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={`Add comments for ${action}...`}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button
            variant={action === 'approve' ? 'success' : 'danger'}
            onClick={submitApproval}
            disabled={loading}
          >
            {loading ? 'Processing...' : `${action === 'approve' ? 'Approve' : 'Reject'}`}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Expense Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedExpense && (
            <div>
              <h6>{selectedExpense.title}</h6>
              <p><strong>Status:</strong> {getStatusBadge(selectedExpense.status)}</p>
              {selectedExpense.status === 'rejected' && (
                <p><strong>Rejection Reason:</strong> {selectedExpense.rejectionReason}</p>
              )}
              <p><strong>Amount:</strong> {formatCurrency(selectedExpense.amount, selectedExpense.convertedCurrency)}</p>
              <p><strong>Submitted by:</strong> {selectedExpense.submittedBy?.name}</p>
              <p><strong>Date:</strong> {new Date(selectedExpense.date).toLocaleDateString()}</p>
              <p><strong>Description:</strong> {selectedExpense.description}</p>
              <hr />
              <h6>Approval Workflow</h6>
              <ul>
                {selectedExpense.approvalWorkflow && selectedExpense.approvalWorkflow.length > 0 ? (
                  selectedExpense.approvalWorkflow.map((step, idx) => (
                    <li key={step._id?.$oid || idx}>
                      <strong>Approver:</strong> {step.approver?.name || step.approver?.$oid}
                      <br />
                      <strong>Status:</strong> {step.status}
                      <br />
                      <strong>Comments:</strong> {step.comments || 'No comments'}
                    </li>
                  ))
                ) : (
                  <li>No workflow steps found.</li>
                )}
              </ul>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer />
    </Container>
  );
};

export default ApprovalDashboard;
