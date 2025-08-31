import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Typography, TextField, Button, Grid, Paper, CircularProgress } from '@mui/material';
import CustomerList from './components/CustomerList';
import NewsPanel from './components/NewsPanel';
import './App.css';

function App() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  // Fetch customers from Salesforce
  const fetchCustomers = async (search = '') => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/customers${search ? `?search=${search}` : ''}`);
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to fetch customers. Please check your connection and credentials.');
      setCustomers([]);
    }
    setLoading(false);
  };

  // Fetch news for a specific customer
  const fetchNews = async (customerName) => {
    if (!customerName) return;
    
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/news/${encodeURIComponent(customerName)}`);
      setNews(res.data);
    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Failed to fetch news articles. Please try again later.');
      setNews([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCustomers(searchTerm);
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    fetchNews(customer.Name);
  };

  return (
    <Container maxWidth="lg" className="app-container">
      <Typography variant="h3" component="h1" align="center" gutterBottom>
        Salesforce Customer News Tracker
      </Typography>
      
      <Paper className="search-container" elevation={2}>
        <form onSubmit={handleSearch}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={10}>
              <TextField
                fullWidth
                label="Search Customers"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Grid>
            <Grid item xs={2}>
              <Button 
                fullWidth 
                variant="contained" 
                color="primary" 
                type="submit"
                disabled={loading}
              >
                Search
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {error && (
        <Paper className="error-container" elevation={2}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      {loading ? (
        <div className="loading-container">
          <CircularProgress />
        </div>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <CustomerList 
              customers={customers} 
              onSelectCustomer={handleCustomerSelect} 
              selectedCustomer={selectedCustomer}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <NewsPanel 
              news={news} 
              customerName={selectedCustomer ? selectedCustomer.Name : ''} 
            />
          </Grid>
        </Grid>
      )}
    </Container>
  );
}

export default App;