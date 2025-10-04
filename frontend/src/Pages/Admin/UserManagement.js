import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Badge, Alert } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getUsersAPI, createUserAPI, updateUserAPI, deleteUserAPI } from '../../utils/ApiRequest';
import axios from 'axios';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [action, setAction] = useState('');

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    manager: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(getUsersAPI, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.success) {
        setUsers(response.data.users);
      } else {
        toast.error(response.data.message, toastOptions);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      if (error.response) {
        toast.error(error.response.data.message || 'Error loading users', toastOptions);
      } else {
        toast.error('Network error. Please try again.', toastOptions);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      setLoading(true);
      const response = await axios.post(createUserAPI, newUser, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        toast.success('User created successfully!', toastOptions);
        setShowModal(false);
        setNewUser({
          name: '',
          email: '',
          password: '',
          role: 'employee',
          manager: ''
        });
        loadUsers();
      } else {
        toast.error(response.data.message, toastOptions);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.response) {
        toast.error(error.response.data.message || 'Error creating user', toastOptions);
      } else {
        toast.error('Network error. Please try again.', toastOptions);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      setLoading(true);
      const response = await axios.put(updateUserAPI(userId), updates, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        toast.success('User updated successfully!', toastOptions);
        loadUsers();
      } else {
        toast.error(response.data.message, toastOptions);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      if (error.response) {
        toast.error(error.response.data.message || 'Error updating user', toastOptions);
      } else {
        toast.error('Network error. Please try again.', toastOptions);
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      'admin': { variant: 'danger', text: 'Admin' },
      'manager': { variant: 'warning', text: 'Manager' },
      'employee': { variant: 'info', text: 'Employee' }
    };

    const config = roleConfig[role] || { variant: 'secondary', text: role };
    return <Badge bg={config.variant}>{config.text}</Badge>;
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

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>User Management</h2>
            <Button
              variant="primary"
              onClick={() => setShowModal(true)}
            >
              Add New User
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5>Company Users</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{getRoleBadge(user.role)}</td>
                        <td>
                          <Badge bg={user.isActive ? 'success' : 'danger'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="btn-group" role="group">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setAction('edit');
                                setShowModal(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleUpdateUser(user._id, { isActive: !user.isActive })}
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Create/Edit User Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {action === 'edit' ? 'Edit User' : 'Add New User'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={action === 'edit' ? selectedUser?.name : newUser.name}
                    onChange={(e) => {
                      if (action === 'edit') {
                        setSelectedUser({ ...selectedUser, name: e.target.value });
                      } else {
                        setNewUser({ ...newUser, name: e.target.value });
                      }
                    }}
                    placeholder="Enter full name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={action === 'edit' ? selectedUser?.email : newUser.email}
                    onChange={(e) => {
                      if (action === 'edit') {
                        setSelectedUser({ ...selectedUser, email: e.target.value });
                      } else {
                        setNewUser({ ...newUser, email: e.target.value });
                      }
                    }}
                    placeholder="Enter email address"
                  />
                </Form.Group>
              </Col>
            </Row>

            {action !== 'edit' && (
              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Enter password"
                />
              </Form.Group>
            )}

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Role</Form.Label>
                  <Form.Control
                    as="select"
                    value={action === 'edit' ? selectedUser?.role : newUser.role}
                    onChange={(e) => {
                      if (action === 'edit') {
                        setSelectedUser({ ...selectedUser, role: e.target.value });
                      } else {
                        setNewUser({ ...newUser, role: e.target.value });
                      }
                    }}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Manager</Form.Label>
                  <Form.Control
                    as="select"
                    value={action === 'edit' ? selectedUser?.manager : newUser.manager}
                    onChange={(e) => {
                      if (action === 'edit') {
                        setSelectedUser({ ...selectedUser, manager: e.target.value });
                      } else {
                        setNewUser({ ...newUser, manager: e.target.value });
                      }
                    }}
                  >
                    <option value="">Select Manager</option>
                    {users.filter(user => user.role === 'manager').map(manager => (
                      <option key={manager._id} value={manager._id}>
                        {manager.name}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={action === 'edit' ? () => handleUpdateUser(selectedUser._id, selectedUser) : handleCreateUser}
            disabled={loading}
          >
            {loading ? 'Processing...' : (action === 'edit' ? 'Update User' : 'Create User')}
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer />
    </Container>
  );
};

export default UserManagement;
