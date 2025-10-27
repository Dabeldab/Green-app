// API Service for MSSQL Database Operations
// This handles all communication with your backend API

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

class ApiService {
  constructor() {
    this.token = null;
    this.accountName = null;
  }

  /**
   * Set authentication credentials
   * Call this after user logs in or on app startup
   */
  setCredentials(accountName, accountKey) {
    this.accountName = accountName;
    // Store securely - consider using sessionStorage instead of memory
    sessionStorage.setItem('accountName', accountName);
    sessionStorage.setItem('accountKey', accountKey);
  }

  /**
   * Get stored credentials
   */
  getCredentials() {
    return {
      accountName: sessionStorage.getItem('accountName'),
      accountKey: sessionStorage.getItem('accountKey')
    };
  }

  /**
   * Clear credentials on logout
   */
  clearCredentials() {
    this.accountName = null;
    this.token = null;
    sessionStorage.removeItem('accountName');
    sessionStorage.removeItem('accountKey');
  }

  /**
   * Get authentication headers
   */
  getHeaders() {
    const { accountName, accountKey } = this.getCredentials();
    return {
      'Content-Type': 'application/json',
      // Adjust these header names based on what you discover in your investigation
      'X-Account-Name': accountName || '',
      'X-Account-Key': accountKey || '',
      // Or if using Bearer token:
      // 'Authorization': `Bearer ${this.token}`
    };
  }

  /**
   * Generic fetch wrapper with error handling
   */
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // ============================================
  // PRODUCTS API
  // ============================================

  /**
   * Fetch products with optional filters
   */
  async getProducts(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/products?${params}`);
  }

  /**
   * Get single product by ID or SKU
   */
  async getProduct(identifier, idType = 'ProductID') {
    return this.request(`/products/${idType}/${identifier}`);
  }

  /**
   * Bulk upload/update products
   */
  async bulkUpdateProducts(data, options = {}) {
    return this.request('/products/bulk', {
      method: 'POST',
      body: JSON.stringify({
        rows: data,
        options: {
          upsert: options.upsert ?? true,
          transactional: options.transactional ?? true,
          dryRun: options.dryRun ?? false,
          batchName: options.batchName || `Products-${Date.now()}`
        }
      })
    });
  }

  /**
   * Validate products data before applying
   */
  async validateProducts(data) {
    return this.request('/products/validate', {
      method: 'POST',
      body: JSON.stringify({ rows: data })
    });
  }

  // ============================================
  // INVENTORY API
  // ============================================

  /**
   * Fetch inventory with optional filters
   */
  async getInventory(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/inventory?${params}`);
  }

  /**
   * Get inventory for specific product and location
   */
  async getInventoryItem(productId, locationId) {
    return this.request(`/inventory/${locationId}/${productId}`);
  }

  /**
   * Bulk upload/update inventory
   */
  async bulkUpdateInventory(data, options = {}) {
    return this.request('/inventory/bulk', {
      method: 'POST',
      body: JSON.stringify({
        rows: data,
        options: {
          upsert: options.upsert ?? true,
          transactional: options.transactional ?? true,
          dryRun: options.dryRun ?? false,
          batchName: options.batchName || `Inventory-${Date.now()}`,
          employeeId: options.employeeId,
          reason: options.reason || 'Current quantity was changed'
        }
      })
    });
  }

  /**
   * Validate inventory data before applying
   */
  async validateInventory(data) {
    return this.request('/inventory/validate', {
      method: 'POST',
      body: JSON.stringify({ rows: data })
    });
  }

  // ============================================
  // INVENTORY TRANSACTIONS API
  // ============================================

  /**
   * Get transaction history
   */
  async getTransactions(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/transactions?${params}`);
  }

  /**
   * Get transactions for a specific product
   */
  async getProductTransactions(productId) {
    return this.request(`/transactions/product/${productId}`);
  }

  // ============================================
  // BATCH/AUDIT API
  // ============================================

  /**
   * Get audit log / recent batches
   */
  async getAuditLog(limit = 50) {
    return this.request(`/audit?limit=${limit}`);
  }

  /**
   * Get details for a specific batch
   */
  async getBatchDetails(batchId) {
    return this.request(`/audit/batch/${batchId}`);
  }

  /**
   * Rollback a batch
   */
  async rollbackBatch(batchId) {
    return this.request(`/audit/rollback/${batchId}`, {
      method: 'POST'
    });
  }

  // ============================================
  // AUTHENTICATION (if needed)
  // ============================================

  /**
   * Login with account credentials
   */
  async login(accountName, accountKey) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ accountName, accountKey })
    });
    
    if (response.token) {
      this.token = response.token;
      this.setCredentials(accountName, accountKey);
    }
    
    return response;
  }

  /**
   * Verify current session is valid
   */
  async verifyAuth() {
    return this.request('/auth/verify');
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearCredentials();
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;

