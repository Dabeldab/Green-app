# Quick Start Guide 🚀

## What I've Built For You

✅ **Authentication System**
- Login page with account name/key
- Session management
- Logout functionality

✅ **API Service Layer** (`src/js/services/api.js`)
- Handles all backend communication
- Products API (bulk upload, validate)
- Inventory API (bulk upload, validate)
- Transactions/Audit API

✅ **UI Components**
- `Login.jsx` - Authentication page
- `Home.jsx` - Main inventory management (updated with API calls)
- `App.jsx` - Handles auth state

✅ **Configuration**
- `.env.example` - Environment variables template
- `backend-template.js` - Ready-to-use backend server

## 🎯 Your Next Steps

### 1. Discover Your Authentication (15 minutes)

Open your existing application and:

1. **Press F12** to open Chrome DevTools
2. **Go to Network tab**
3. **Perform a database operation** (read or write)
4. **Look at the API call**:
   - What's the URL?
   - What headers are sent? (Authorization, x-api-key, etc.)
   - What's in the request body?

📖 Full guide: [AUTHENTICATION_INVESTIGATION_GUIDE.md](./AUTHENTICATION_INVESTIGATION_GUIDE.md)

### 2. Set Up Environment Variables (2 minutes)

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 3. Choose Your Backend Approach

#### Option A: Quick Node.js Backend (Recommended for testing)

```bash
# Create backend directory
mkdir backend && cd backend

# Initialize project
npm init -y
npm install express mssql cors dotenv

# Copy template
cp ../backend-template.js server.js

# Create .env file
cat > .env << EOF
DB_SERVER=yourserver.database.windows.net
DB_NAME=yourdatabase
DB_USER=yourusername
DB_PASSWORD=yourpassword
PORT=3000
FRONTEND_URL=http://localhost:5173
EOF

# Run it
node server.js
```

#### Option B: Use Existing Salesforce Integration

Update `src/js/services/api.js` to call your Salesforce endpoints instead.

### 4. Update Authentication Headers (5 minutes)

Based on what you discovered in Step 1, update `src/js/services/api.js`:

```javascript
getHeaders() {
  const { accountName, accountKey } = this.getCredentials();
  return {
    'Content-Type': 'application/json',
    // Update these based on your discovery:
    'X-Account-Name': accountName,      // ← Change these header names
    'X-Account-Key': accountKey,         // ← to match what you found
  };
}
```

### 5. Run Your App (1 minute)

```bash
# Terminal 1: Frontend
npm install
npm run dev

# Terminal 2: Backend (if using Node.js)
cd backend
node server.js
```

Visit: http://localhost:5173

## 🧪 Testing

1. **Login** with your account credentials
2. **Click "Load sample data"** to test with sample products/inventory
3. **Enable "Dry run"** toggle
4. **Click "Apply changes"** to test the API call
5. **Check Network tab** to see the API request/response

## 📊 Database Tables Already Configured

- ✅ **Products** - All 33 columns including ShopifyId
- ✅ **Inventory** - InventoryID, LocationID, ProductID, Quantity, etc.
- ✅ **Inventory_Transactions** - Full audit trail support

## 🔍 What to Look For in Your Investigation

When examining your existing app's Network tab:

### Headers (Most Important)
```
Authorization: Bearer eyJhbGc...     ← JWT token
x-api-key: abc123...                 ← API key
x-account-name: your-account         ← Account identifier
x-account-key: secret-key            ← Secret key
Content-Type: application/json
```

### Common Patterns

**Azure SQL + Azure AD:**
```javascript
headers: {
  'Authorization': `Bearer ${azureToken}`,
  'Content-Type': 'application/json'
}
```

**Salesforce Connected App:**
```javascript
headers: {
  'Authorization': `Bearer ${salesforceToken}`,
  'Content-Type': 'application/json'
}
```

**Custom API Key:**
```javascript
headers: {
  'x-api-key': accountKey,
  'x-tenant-id': accountName,
  'Content-Type': 'application/json'
}
```

## 🐛 Troubleshooting

### "Network Error" or "CORS Error"
- Make sure backend is running
- Check `VITE_API_BASE_URL` in `.env.local`
- Add CORS middleware to backend

### "401 Unauthorized"
- Verify credentials are correct
- Check header names match what backend expects
- Look at backend console for auth errors

### "Connection to SQL Server Failed"
- Check `DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` in backend `.env`
- Verify firewall allows connection (Azure SQL)
- Test connection with SQL Management Studio first

## 📚 Full Documentation

- 📖 [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Complete setup instructions
- 🔍 [AUTHENTICATION_INVESTIGATION_GUIDE.md](./AUTHENTICATION_INVESTIGATION_GUIDE.md) - How to discover your auth
- 💻 [backend-template.js](./backend-template.js) - Backend server template

## ✨ Features Ready to Use

- ✅ CSV file upload
- ✅ Data validation (types, business rules)
- ✅ Diff preview (see what will change)
- ✅ Dry run mode
- ✅ Transactional updates (all-or-nothing)
- ✅ Upsert support (insert if not exists)
- ✅ Employee ID + Comment for audit trail
- ✅ Error handling and display

## 🎉 You're All Set!

The frontend is fully functional and ready to connect to your backend. Just:
1. Investigate your existing auth (15 min)
2. Set up backend (30 min)
3. Test and iterate

Need help? Check the investigation guide first - your existing app has all the answers! 🔍

