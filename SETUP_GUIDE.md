# MSSQL Inventory Management Setup Guide

This guide will help you set up authentication and connect your frontend to the MSSQL database through your Salesforce integration.

## 📋 Overview

Your application now has:
- ✅ **Authentication UI** - Login page for account name/key
- ✅ **API Service Layer** - Handles all backend communication
- ✅ **Bulk Inventory Management** - Upload, validate, and apply changes
- ✅ **Audit Trail** - Track all changes with employee ID and comments

## 🔍 Step 1: Investigate Your Existing Integration

Follow the [AUTHENTICATION_INVESTIGATION_GUIDE.md](./AUTHENTICATION_INVESTIGATION_GUIDE.md) to discover:
1. How your existing app authenticates to MSSQL
2. What API endpoints it uses
3. What authentication headers are required

### Quick Investigation Steps:
1. Open your existing app in Chrome
2. Press F12 to open DevTools
3. Go to Network tab
4. Perform a database read/write operation
5. Click on the API call and examine:
   - Request URL
   - Request Headers (look for Authorization, x-api-key, etc.)
   - Request Payload

## 🔧 Step 2: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Fill in your API base URL:
```env
VITE_API_BASE_URL=http://localhost:3000/api
# Or your actual backend URL
# VITE_API_BASE_URL=https://your-backend.azurewebsites.net/api
```

## 🏗️ Step 3: Build Your Backend API

You need a backend server to handle:
- Authentication with MSSQL
- Secure database operations
- Business logic

### Option A: Node.js/Express Backend

Create a simple Express server:

```bash
mkdir backend
cd backend
npm init -y
npm install express mssql cors dotenv
```

Create `backend/server.js`:
```javascript
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MSSQL Configuration
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true, // For Azure
    trustServerCertificate: false
  }
};

// Authentication middleware
const authenticate = (req, res, next) => {
  const accountName = req.headers['x-account-name'];
  const accountKey = req.headers['x-account-key'];
  
  // Validate credentials (implement your logic)
  if (accountName && accountKey) {
    req.credentials = { accountName, accountKey };
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Products endpoints
app.post('/api/products/bulk', authenticate, async (req, res) => {
  try {
    const { rows, options } = req.body;
    const pool = await sql.connect(dbConfig);
    
    // Implement your bulk update logic
    // Use the stored procedures from Home.jsx SQL examples
    
    res.json({
      success: true,
      batchId: 'BATCH-' + Date.now(),
      created: 0,
      updated: rows.length,
      skipped: 0,
      message: 'Products updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inventory endpoints
app.post('/api/inventory/bulk', authenticate, async (req, res) => {
  try {
    const { rows, options } = req.body;
    const pool = await sql.connect(dbConfig);
    
    // Implement your bulk update logic
    
    res.json({
      success: true,
      batchId: 'BATCH-' + Date.now(),
      created: 0,
      updated: rows.length,
      skipped: 0,
      message: 'Inventory updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

Create `backend/.env`:
```env
DB_SERVER=yourserver.database.windows.net
DB_NAME=yourdatabase
DB_USER=yourusername
DB_PASSWORD=yourpassword
PORT=3000
```

### Option B: Use Your Existing Salesforce Integration

If you already have Salesforce connected to MSSQL:

1. Create an Apex REST service
2. Call it from your frontend via the Salesforce API
3. Update `src/js/services/api.js` to use Salesforce endpoints

## 📝 Step 4: Update API Service

Once you know your authentication method, update `src/js/services/api.js`:

```javascript
getHeaders() {
  const { accountName, accountKey } = this.getCredentials();
  return {
    'Content-Type': 'application/json',
    // Update these based on your discovery:
    'X-Account-Name': accountName || '',
    'X-Account-Key': accountKey || '',
    // OR for Bearer tokens:
    // 'Authorization': `Bearer ${this.token}`
    // OR for Azure AD:
    // 'Authorization': `Bearer ${this.azureToken}`
  };
}
```

## 🚀 Step 5: Run Your Application

### Frontend:
```bash
npm install
npm run dev
```

### Backend (if using Node.js):
```bash
cd backend
node server.js
```

## 🧪 Step 6: Test

1. Visit http://localhost:5173 (or your dev server URL)
2. Enter your account name and key
3. Try loading sample data
4. Review the diff preview
5. Enable "Dry run" and click "Apply changes"
6. Check the API calls in Network tab

## 📊 Database Schema

Your tables are already configured in the app:

### Products Table
- ProductID, ProductName, SKU, ProductCostPrice, ProductMinPrice, ProductMarkupPrice, etc.

### Inventory Table
- InventoryID, LocationID, ProductID, Quantity, DesiredQuantity, MinimumQuantity, Version

### Inventory_Transactions Table
- TransactionID, ProductID, Quantity, Timestamp, EmployeeID, Comment, TransactionType, etc.

## 🔒 Security Best Practices

1. **NEVER** store credentials in frontend code
2. Use HTTPS for all API calls
3. Store sensitive data in backend environment variables
4. Implement proper authentication on backend
5. Use sessionStorage (not localStorage) for temporary credentials
6. Clear credentials on logout

## 📖 API Endpoints You Need to Implement

Based on `src/js/services/api.js`:

- `POST /api/auth/login` - Authenticate user
- `GET /api/products` - List products
- `POST /api/products/bulk` - Bulk update products
- `POST /api/products/validate` - Validate product data
- `GET /api/inventory` - List inventory
- `POST /api/inventory/bulk` - Bulk update inventory
- `POST /api/inventory/validate` - Validate inventory data
- `GET /api/transactions` - Get transaction history
- `GET /api/audit` - Get audit log
- `POST /api/audit/rollback/:batchId` - Rollback a batch

## 🐛 Troubleshooting

### CORS Errors
Add CORS headers to your backend:
```javascript
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

### Authentication Fails
- Check Network tab for exact error
- Verify credentials are being sent in headers
- Check backend logs

### Database Connection Issues
- Verify connection string
- Check firewall rules (Azure SQL)
- Ensure user has proper permissions

## 📚 Next Steps

1. Follow AUTHENTICATION_INVESTIGATION_GUIDE.md
2. Set up your backend server
3. Implement the bulk update stored procedures (see SQL examples in Home.jsx)
4. Test with sample data
5. Deploy to production

## 🆘 Need Help?

Common patterns:
- **Azure SQL**: Uses connection strings with encrypt=true
- **Salesforce**: Uses OAuth 2.0 with client ID/secret
- **Direct MSSQL**: Uses SQL Server authentication

Check your existing app's Network tab - it has all the answers!

