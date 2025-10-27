# How to Discover Your Salesforce-MSSQL Integration

## Method 1: Browser Developer Tools (Easiest)

1. **Open your existing application in Chrome/Edge**
2. **Open DevTools** (F12 or Right-click → Inspect)
3. **Go to the Network tab**
4. **Perform an action** that reads/writes to the database
5. **Look for API calls** - You'll see:
   - Request URL (your backend endpoint)
   - Request Headers (authentication tokens, API keys)
   - Request Payload (the data being sent)
   - Response (what comes back from the database)

### What to look for:
```
Headers might show:
- Authorization: Bearer <token>
- x-api-key: <key>
- AccountName: <account>
- AccountKey: <key>
- Content-Type: application/json
```

## Method 2: Check Application Configuration Files

Look for config files in your existing app:
- `.env` or `.env.local` files
- `config.json` or `appsettings.json`
- `web.config` (for .NET apps)
- Database connection strings

Common patterns:
```bash
# Azure SQL with AAD Authentication
DB_SERVER=yourserver.database.windows.net
DB_NAME=yourdatabase
ACCOUNT_NAME=your-account
ACCOUNT_KEY=your-key

# Or Salesforce Connected App
SF_CLIENT_ID=xxxxx
SF_CLIENT_SECRET=xxxxx
SF_USERNAME=xxxxx
SF_PASSWORD=xxxxx
```

## Method 3: Check Salesforce Setup

1. **Log into Salesforce**
2. **Setup → Platform Tools → Apps → Connected Apps**
   - Look for connected apps related to your database
   - Note the Consumer Key and Consumer Secret
3. **Setup → Security → Named Credentials**
   - Check if there are credentials for MSSQL/Azure
4. **Setup → Platform Tools → External Services**
   - Look for API definitions

## Method 4: Check for Backend API

Your app likely has a backend that talks to MSSQL. Look for:
- Node.js/Express server (`server.js`, `index.js`)
- .NET API (`Controllers/` folder)
- Python Flask/Django (`app.py`, `views.py`)
- Azure Functions or AWS Lambda

## Common Integration Patterns

### Pattern 1: Salesforce → Azure SQL
- Uses Azure AD authentication
- AccountName = Azure tenant/client ID
- AccountKey = Client secret or access token

### Pattern 2: Salesforce → Custom Middleware → MSSQL
- Middleware API handles authentication
- Uses API keys or JWT tokens
- Salesforce calls the middleware, middleware queries MSSQL

### Pattern 3: Direct Connection (less common)
- Connection string with username/password
- Stored in Salesforce Named Credentials

## What Information You Need

To replicate the integration, you need:
1. **Database connection details**:
   - Server address (e.g., myserver.database.windows.net)
   - Database name
   - Port (usually 1433 for MSSQL)

2. **Authentication method**:
   - SQL Server authentication (username/password)
   - Azure AD authentication (tenant ID, client ID, client secret)
   - Token-based authentication

3. **API endpoints** (if using middleware):
   - Base URL
   - Endpoints for CRUD operations
   - Authentication headers needed

## Next Steps

Once you gather this information, I can help you:
1. Build a backend API to handle the authentication
2. Update the frontend to call your API
3. Implement proper security (never expose credentials in frontend)

