const axios = require('axios');

class VitallyService {
  constructor() {
    this.apiKey = process.env.VITALLY_API_KEY;
    this.baseUrl = process.env.VITALLY_BASE_URL || 'https://rest.vitally.io';
    
    if (!this.apiKey) {
      throw new Error('VITALLY_API_KEY environment variable is required');
    }
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async getAccounts(limit = 100, from = null) {
    try {
      const params = { limit };
      if (from) params.from = from;
      
      const response = await this.client.get('/accounts', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching accounts:', error.response?.data || error.message);
      throw error;
    }
  }

  async getAccount(accountId) {
    try {
      const response = await this.client.get(`/accounts/${accountId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching account ${accountId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async getNotes(accountId, limit = 100, from = null) {
    try {
      const params = { 
        limit,
        filters: JSON.stringify([{
          field: 'accountId',
          operator: 'equals',
          value: accountId
        }])
      };
      if (from) params.from = from;
      
      const response = await this.client.get('/notes', { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching notes for account ${accountId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async getTasks(accountId, limit = 100, from = null) {
    try {
      const params = { 
        limit,
        filters: JSON.stringify([{
          field: 'accountId',
          operator: 'equals',
          value: accountId
        }])
      };
      if (from) params.from = from;
      
      const response = await this.client.get('/tasks', { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching tasks for account ${accountId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async getConversations(accountId, limit = 100, from = null) {
    try {
      const params = { 
        limit,
        filters: JSON.stringify([{
          field: 'accountId',
          operator: 'equals',
          value: accountId
        }])
      };
      if (from) params.from = from;
      
      const response = await this.client.get('/conversations', { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching conversations for account ${accountId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async getAccountActivity(accountId, days = 30) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    try {
      const [account, notes, tasks, conversations] = await Promise.all([
        this.getAccount(accountId),
        this.getNotes(accountId),
        this.getTasks(accountId),
        this.getConversations(accountId)
      ]);

      // Filter by date range
      const filterByDate = (items, dateField = 'createdAt') => {
        return items.filter(item => {
          const itemDate = new Date(item[dateField]);
          return itemDate >= cutoffDate;
        });
      };

      return {
        account,
        notes: filterByDate(notes.results || []),
        tasks: filterByDate(tasks.results || []),
        conversations: filterByDate(conversations.results || []),
        period: {
          days,
          from: cutoffDate.toISOString(),
          to: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`Error fetching account activity for ${accountId}:`, error.message);
      throw error;
    }
  }

  async getAllAccountsActivity(days = 30, limit = 50) {
    try {
      const accountsResponse = await this.getAccounts(limit);
      const accounts = accountsResponse.results || [];
      
      const activities = await Promise.allSettled(
        accounts.map(account => this.getAccountActivity(account.id, days))
      );

      return activities.map((result, index) => ({
        accountId: accounts[index].id,
        accountName: accounts[index].name,
        status: result.status,
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason.message : null
      }));
    } catch (error) {
      console.error('Error fetching all accounts activity:', error.message);
      throw error;
    }
  }
}

module.exports = VitallyService;
