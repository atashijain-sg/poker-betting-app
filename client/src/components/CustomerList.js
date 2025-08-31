import React from 'react';
import { Paper, Typography, List, ListItem, ListItemText, Divider } from '@mui/material';

const CustomerList = ({ customers, onSelectCustomer, selectedCustomer }) => {
  if (!customers || customers.length === 0) {
    return (
      <Paper style={{ padding: '1rem' }}>
        <Typography variant="subtitle1">No customers found</Typography>
      </Paper>
    );
  }

  return (
    <Paper>
      <Typography variant="h6" style={{ padding: '1rem' }}>
        Customers
      </Typography>
      <Divider />
      <List component="nav">
        {customers.map((customer) => (
          <ListItem 
            button 
            key={customer.Id}
            onClick={() => onSelectCustomer(customer)}
            selected={selectedCustomer && selectedCustomer.Id === customer.Id}
          >
            <ListItemText 
              primary={customer.Name} 
              secondary={
                <React.Fragment>
                  <Typography component="span" variant="body2" color="textPrimary">
                    {customer.Industry || 'N/A'}
                  </Typography>
                  {customer.Website && (
                    <Typography component="div" variant="body2">
                      {customer.Website}
                    </Typography>
                  )}
                </React.Fragment>
              } 
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default CustomerList;