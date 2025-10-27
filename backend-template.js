// Backend API Template for MSSQL Inventory Management
// This is a starting point - customize based on your authentication discovery

const express = require('express');
const sql = require('mssql');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

// MSSQL Configuration
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true, // Set to true for Azure
    trustServerCertificate: false,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool;

// Initialize database connection pool
async function initDb() {
  try {
    pool = await sql.connect(dbConfig);
    console.log('✓ Connected to MSSQL database');
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    process.exit(1);
  }
}

// Authentication middleware
const authenticate = (req, res, next) => {
  const accountName = req.headers['x-account-name'];
  const accountKey = req.headers['x-account-key'];
  
  // TODO: Implement your actual authentication logic
  // This could be:
  // - Validate against Azure AD
  // - Check against Salesforce credentials
  // - Validate API keys from database
  // - Verify JWT tokens
  
  if (!accountName || !accountKey) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please provide account name and key' 
    });
  }
  
  // For now, just store credentials in request
  req.credentials = { accountName, accountKey };
  next();
};

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { accountName, accountKey } = req.body;
    
    // TODO: Implement actual authentication
    // Example: Validate against database, Azure AD, or Salesforce
    
    res.json({
      success: true,
      message: 'Authentication successful',
      // Optionally return a JWT token:
      // token: generateJWT({ accountName })
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/verify', authenticate, (req, res) => {
  res.json({ valid: true });
});

// ============================================
// PRODUCTS ENDPOINTS
// ============================================

app.get('/api/products', authenticate, async (req, res, next) => {
  try {
    const { sku, productId } = req.query;
    
    const result = await pool.request()
      .input('SKU', sql.NVarChar, sku)
      .input('ProductID', sql.UniqueIdentifier, productId)
      .query(`
        SELECT TOP 100 
          ProductID, ProductName, SKU, ProductCostPrice, ProductMinPrice, 
          ProductMarkupPrice, ProductIsAvailable, BarcodeNumber, Color,
          WholesalerID, IsTracked, Version
        FROM Products
        WHERE (@SKU IS NULL OR SKU = @SKU)
          AND (@ProductID IS NULL OR ProductID = @ProductID)
        ORDER BY ProductName
      `);
    
    res.json({ products: result.recordset });
  } catch (error) {
    next(error);
  }
});

app.post('/api/products/validate', authenticate, async (req, res, next) => {
  try {
    const { rows } = req.body;
    const issues = [];
    
    // Implement validation logic
    // Check for duplicates, invalid data types, business rules, etc.
    
    res.json({ issues, valid: issues.length === 0 });
  } catch (error) {
    next(error);
  }
});

app.post('/api/products/bulk', authenticate, async (req, res, next) => {
  const transaction = new sql.Transaction(pool);
  
  try {
    const { rows, options } = req.body;
    const { upsert, transactional, dryRun, batchName } = options;
    
    if (transactional) {
      await transaction.begin();
    }
    
    const batchId = `PROD-${Date.now()}`;
    let created = 0, updated = 0, skipped = 0;
    
    for (const row of rows) {
      try {
        const request = transactional 
          ? new sql.Request(transaction) 
          : pool.request();
        
        // Call stored procedure or execute MERGE
        const result = await request
          .input('ProductID', sql.UniqueIdentifier, row.ProductID)
          .input('ProductName', sql.NVarChar, row.ProductName)
          .input('SKU', sql.NVarChar, row.SKU)
          .input('ProductCostPrice', sql.Decimal(18, 2), row.ProductCostPrice)
          .input('ProductMinPrice', sql.Decimal(18, 2), row.ProductMinPrice)
          .input('ProductMarkupPrice', sql.Decimal(18, 2), row.ProductMarkupPrice)
          .input('ProductIsAvailable', sql.Bit, row.ProductIsAvailable)
          // Add all other fields...
          .query(`
            -- Simplified example - use MERGE or stored procedure in production
            IF EXISTS (SELECT 1 FROM Products WHERE ProductID = @ProductID OR SKU = @SKU)
            BEGIN
              UPDATE Products SET 
                ProductName = COALESCE(@ProductName, ProductName),
                ProductCostPrice = COALESCE(@ProductCostPrice, ProductCostPrice),
                ProductMinPrice = COALESCE(@ProductMinPrice, ProductMinPrice),
                ProductMarkupPrice = COALESCE(@ProductMarkupPrice, ProductMarkupPrice),
                ProductIsAvailable = COALESCE(@ProductIsAvailable, ProductIsAvailable)
              WHERE ProductID = @ProductID OR SKU = @SKU
              SELECT 'UPDATED' AS Action
            END
            ELSE IF ${upsert ? '1=1' : '0=1'}
            BEGIN
              INSERT INTO Products (ProductID, ProductName, SKU, ProductCostPrice, ProductMinPrice, ProductMarkupPrice, ProductIsAvailable)
              VALUES (COALESCE(@ProductID, NEWID()), @ProductName, @SKU, @ProductCostPrice, @ProductMinPrice, @ProductMarkupPrice, @ProductIsAvailable)
              SELECT 'CREATED' AS Action
            END
          `);
        
        if (result.recordset[0]?.Action === 'CREATED') created++;
        else if (result.recordset[0]?.Action === 'UPDATED') updated++;
      } catch (rowError) {
        console.error('Row error:', rowError);
        skipped++;
        if (transactional) throw rowError; // Rollback all if transactional
      }
    }
    
    if (dryRun) {
      if (transactional) await transaction.rollback();
    } else {
      if (transactional) await transaction.commit();
    }
    
    res.json({
      success: true,
      batchId,
      created,
      updated,
      skipped,
      message: dryRun 
        ? `Dry run complete: ${updated} would be updated, ${created} would be created`
        : `Successfully processed ${created + updated} products`
    });
  } catch (error) {
    if (transactional && transaction._aborted === false) {
      await transaction.rollback();
    }
    next(error);
  }
});

// ============================================
// INVENTORY ENDPOINTS
// ============================================

app.get('/api/inventory', authenticate, async (req, res, next) => {
  try {
    const { locationId, productId } = req.query;
    
    const result = await pool.request()
      .input('LocationID', sql.NVarChar, locationId)
      .input('ProductID', sql.UniqueIdentifier, productId)
      .query(`
        SELECT TOP 100
          i.InventoryID, i.LocationID, i.ProductID, i.Quantity,
          i.DesiredQuantity, i.MinimumQuantity, i.Version,
          p.SKU, p.ProductName
        FROM Inventory i
        LEFT JOIN Products p ON p.ProductID = i.ProductID
        WHERE (@LocationID IS NULL OR i.LocationID = @LocationID)
          AND (@ProductID IS NULL OR i.ProductID = @ProductID)
        ORDER BY i.LocationID, p.ProductName
      `);
    
    res.json({ inventory: result.recordset });
  } catch (error) {
    next(error);
  }
});

app.post('/api/inventory/bulk', authenticate, async (req, res, next) => {
  const transaction = new sql.Transaction(pool);
  
  try {
    const { rows, options } = req.body;
    const { upsert, transactional, dryRun, batchName, employeeId, reason } = options;
    
    if (transactional) {
      await transaction.begin();
    }
    
    const batchId = `INV-${Date.now()}`;
    let created = 0, updated = 0, skipped = 0;
    
    for (const row of rows) {
      try {
        const request = transactional 
          ? new sql.Request(transaction) 
          : pool.request();
        
        // Resolve ProductID from SKU if needed
        let productId = row.ProductID;
        if (!productId && row.SKU) {
          const lookupResult = await request
            .input('SKU', sql.NVarChar, row.SKU)
            .query('SELECT ProductID FROM Products WHERE SKU = @SKU');
          productId = lookupResult.recordset[0]?.ProductID;
        }
        
        if (!productId) {
          skipped++;
          continue;
        }
        
        // Update inventory and create transaction record
        const result = await request
          .input('LocationID', sql.NVarChar, row.LocationID)
          .input('ProductID', sql.UniqueIdentifier, productId)
          .input('Quantity', sql.Decimal(18, 2), row.Quantity)
          .input('DesiredQuantity', sql.Decimal(18, 2), row.DesiredQuantity)
          .input('MinimumQuantity', sql.Decimal(18, 2), row.MinimumQuantity)
          .input('EmployeeID', sql.Int, employeeId)
          .input('Comment', sql.NVarChar, reason || 'Current quantity was changed')
          .query(`
            DECLARE @OldQty DECIMAL(18,2), @Action NVARCHAR(20);
            
            SELECT @OldQty = Quantity FROM Inventory 
            WHERE ProductID = @ProductID AND LocationID = @LocationID;
            
            IF @OldQty IS NULL AND ${upsert ? '1=1' : '0=0'}
            BEGIN
              INSERT INTO Inventory (LocationID, ProductID, Quantity, DesiredQuantity, MinimumQuantity, Version)
              VALUES (@LocationID, @ProductID, @Quantity, @DesiredQuantity, @MinimumQuantity, 1);
              SET @Action = 'CREATED';
            END
            ELSE IF @OldQty IS NOT NULL
            BEGIN
              UPDATE Inventory SET
                Quantity = COALESCE(@Quantity, Quantity),
                DesiredQuantity = COALESCE(@DesiredQuantity, DesiredQuantity),
                MinimumQuantity = COALESCE(@MinimumQuantity, MinimumQuantity)
              WHERE ProductID = @ProductID AND LocationID = @LocationID;
              SET @Action = 'UPDATED';
              
              -- Log transaction
              IF @Quantity IS NOT NULL AND @Quantity <> @OldQty
              BEGIN
                INSERT INTO Inventory_Transactions (
                  ProductID, Quantity, Timestamp, DstLocationID, EmployeeID, 
                  Comment, TransactionType, CostPrice
                )
                SELECT 
                  @ProductID, 
                  @Quantity - @OldQty,
                  GETUTCDATE(),
                  @LocationID,
                  @EmployeeID,
                  @Comment,
                  'adjust',
                  ProductCostPrice
                FROM Products WHERE ProductID = @ProductID;
              END
            END
            
            SELECT @Action AS Action;
          `);
        
        if (result.recordset[0]?.Action === 'CREATED') created++;
        else if (result.recordset[0]?.Action === 'UPDATED') updated++;
      } catch (rowError) {
        console.error('Row error:', rowError);
        skipped++;
        if (transactional) throw rowError;
      }
    }
    
    if (dryRun) {
      if (transactional) await transaction.rollback();
    } else {
      if (transactional) await transaction.commit();
    }
    
    res.json({
      success: true,
      batchId,
      created,
      updated,
      skipped,
      message: dryRun 
        ? `Dry run complete: ${updated} would be updated, ${created} would be created`
        : `Successfully processed ${created + updated} inventory items`
    });
  } catch (error) {
    if (transactional && transaction._aborted === false) {
      await transaction.rollback();
    }
    next(error);
  }
});

// ============================================
// AUDIT/TRANSACTIONS ENDPOINTS
// ============================================

app.get('/api/transactions', authenticate, async (req, res, next) => {
  try {
    const { productId, limit = 50 } = req.query;
    
    const result = await pool.request()
      .input('ProductID', sql.UniqueIdentifier, productId)
      .input('Limit', sql.Int, limit)
      .query(`
        SELECT TOP (@Limit)
          t.TransactionID, t.ProductID, t.Quantity, t.Timestamp,
          t.SrcLocationID, t.DstLocationID, t.EmployeeID, t.Comment,
          t.TransactionType, t.CostPrice, t.Version,
          p.SKU, p.ProductName
        FROM Inventory_Transactions t
        LEFT JOIN Products p ON p.ProductID = t.ProductID
        WHERE (@ProductID IS NULL OR t.ProductID = @ProductID)
        ORDER BY t.Timestamp DESC
      `);
    
    res.json({ transactions: result.recordset });
  } catch (error) {
    next(error);
  }
});

app.get('/api/audit', authenticate, async (req, res, next) => {
  try {
    // Implement audit log retrieval
    // This might come from a custom audit table you create
    res.json({ batches: [] });
  } catch (error) {
    next(error);
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: pool.connected });
});

// Apply error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database connection...');
  await pool.close();
  process.exit(0);
});

