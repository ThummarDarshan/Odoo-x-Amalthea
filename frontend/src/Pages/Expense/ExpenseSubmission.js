import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { submitExpenseAPI, countriesAPI, exchangeRateAPI } from '../../utils/ApiRequest';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ExpenseSubmission = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [exchangeRates, setExchangeRates] = useState({});
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    const companyData = JSON.parse(localStorage.getItem('company'));
    
    if (!userData || !localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    
    setUser(userData);
    setCompany(companyData);
    loadCountries();
    loadExchangeRates();
    testAPI();
  }, [navigate]);
  
  const testAPI = async () => {
    try {
      // Test basic API
      const testResponse = await axios.get(`${submitExpenseAPI.replace('/submit', '/test')}`);
      console.log("API test response:", testResponse.data);
      
      // Test auth
      const debugResponse = await axios.get(`${submitExpenseAPI.replace('/submit', '/debug')}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log("Auth debug response:", debugResponse.data);
      
      // Test form data parsing
      const testFormData = new FormData();
      testFormData.append('title', 'Test Title');
      testFormData.append('amount', '50.00');
      testFormData.append('category', 'travel');
      testFormData.append('date', '2024-01-01');
      
      const formTestResponse = await axios.post(`${submitExpenseAPI.replace('/submit', '/debug-form')}`, testFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log("Form data test response:", formTestResponse.data);
    } catch (error) {
      console.error("API test failed:", error);
      if (error.response) {
        console.error("Error response:", error.response.data);
      }
    }
  };

  const [values, setValues] = useState({
    title: '',
    amount: '',
    originalCurrency: 'USD',
    description: '',
    category: 'travel',
    date: new Date().toISOString().split('T')[0],
    receiptImage: null
  });

  const [ocrData, setOcrData] = useState({
    extracted: false,
    merchantName: '',
    extractedAmount: 0,
    extractedDate: '',
    extractedItems: []
  });

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

  const loadCountries = async () => {
    try {
      const response = await axios.get(countriesAPI);
      setCountries(response.data);
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };

  const loadExchangeRates = async () => {
    try {
      const response = await axios.get(exchangeRateAPI('USD'));
      setExchangeRates(response.data.rates);
    } catch (error) {
      console.error('Error loading exchange rates:', error);
    }
  };

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setValues({ ...values, receiptImage: file });
      // TODO: Implement OCR processing
      toast.info('OCR processing will be implemented', toastOptions);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is logged in
    if (!user || !localStorage.getItem('token')) {
      toast.error('Please login to submit expenses', toastOptions);
      navigate('/login');
      return;
    }
    
    // Validate required fields
    if (!values.title || !values.amount || !values.category || !values.date) {
      toast.error('Please fill in all required fields', toastOptions);
      return;
    }
    
    if (values.amount <= 0) {
      toast.error('Amount must be greater than 0', toastOptions);
      return;
    }
    
    setLoading(true);

    try {
      console.log("Submitting expense with values:", values);
      console.log("User:", user);
      console.log("Company:", company);
      
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('amount', values.amount);
      formData.append('originalCurrency', values.originalCurrency);
      formData.append('description', values.description);
      formData.append('category', values.category);
      formData.append('date', values.date);
      if (values.receiptImage) {
        formData.append('receiptImage', values.receiptImage);
      }
      formData.append('ocrData', JSON.stringify(ocrData));
      
      // Debug: Log what we're sending
      console.log("Form data being sent:");
      for (let [key, value] of formData.entries()) {
        console.log(key, ":", value);
      }

      const response = await axios.post(submitExpenseAPI, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        toast.success('Expense submitted successfully!', toastOptions);
        setValues({
          title: '',
          amount: '',
          originalCurrency: 'USD',
          description: '',
          category: 'travel',
          date: new Date().toISOString().split('T')[0],
          receiptImage: null
        });
      } else {
        toast.error(response.data.message, toastOptions);
      }
    } catch (error) {
      console.error('Expense submission error:', error);
      if (error.response) {
        // Server responded with error status
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        toast.error(error.response.data.message || 'Error submitting expense', toastOptions);
      } else if (error.request) {
        // Request was made but no response received
        console.error('No response received:', error.request);
        toast.error('Network error. Please check your connection.', toastOptions);
      } else {
        // Something else happened
        console.error('Request setup error:', error.message);
        toast.error('An unexpected error occurred', toastOptions);
      }
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'travel', label: 'Travel' },
    { value: 'meals', label: 'Meals' },
    { value: 'accommodation', label: 'Accommodation' },
    { value: 'transport', label: 'Transport' },
    { value: 'office', label: 'Office' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <Container className="mt-4">
      <Row>
        <Col md={{ span: 8, offset: 2 }}>
          <Card>
            <Card.Header>
              <h3>Submit New Expense</h3>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Expense Title</Form.Label>
                      <Form.Control
                        type="text"
                        name="title"
                        value={values.title}
                        onChange={handleChange}
                        placeholder="Enter expense title"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Amount</Form.Label>
                      <Form.Control
                        type="number"
                        name="amount"
                        value={values.amount}
                        onChange={handleChange}
                        placeholder="Enter amount"
                        step="0.01"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Currency</Form.Label>
                      <Form.Control
                        as="select"
                        name="originalCurrency"
                        value={values.originalCurrency}
                        onChange={handleChange}
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="AUD">AUD - Australian Dollar</option>
                        <option value="INR">INR - Indian Rupee</option>
                        <option value="JPY">JPY - Japanese Yen</option>
                      </Form.Control>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Category</Form.Label>
                      <Form.Control
                        as="select"
                        name="category"
                        value={values.category}
                        onChange={handleChange}
                      >
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </Form.Control>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="description"
                    value={values.description}
                    onChange={handleChange}
                    placeholder="Enter expense description"
                    rows={3}
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date</Form.Label>
                      <Form.Control
                        type="date"
                        name="date"
                        value={values.date}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Receipt Image</Form.Label>
                      <Form.Control
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {company && (
                  <Alert variant="info">
                    <strong>Company Currency:</strong> {company.currency}
                    {values.originalCurrency !== company.currency && (
                      <div>
                        <strong>Exchange Rate:</strong> {exchangeRates[company.currency] ? 
                          `1 ${values.originalCurrency} = ${exchangeRates[company.currency].toFixed(4)} ${company.currency}` : 
                          'Loading...'}
                      </div>
                    )}
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  className="w-100"
                >
                  {loading ? 'Submitting...' : 'Submit Expense'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <ToastContainer />
    </Container>
  );
};

export default ExpenseSubmission;
