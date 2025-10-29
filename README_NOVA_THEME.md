# Nova POS Inventory Management System

A modern, professional inventory management application with Nova POS branding and styling.

## 🎨 Design Features

### Visual Identity
- **Brand Colors**: Purple/Indigo gradient theme (#6366f1 → #8b5cf6)
- **Typography**: Inter font family
- **Style**: Modern, clean, professional POS system aesthetic
- **Animations**: Smooth transitions and hover effects

### Key UI Components
- ✨ Gradient buttons with shadow effects
- 🎯 Status badges with color-coded states
- 📦 Card-based layouts with hover lift
- 🔐 Professional login page with branding
- 📊 Modern data tables
- 🎛️ Styled form inputs with focus states
- 🔔 Alert boxes with icons

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit http://localhost:5173

## 📁 Project Structure

```
Green-app/
├── src/
│   ├── js/
│   │   ├── components/
│   │   │   ├── App.jsx          # Main app with auth flow
│   │   │   ├── Login.jsx        # Nova-themed login
│   │   │   └── Home.jsx         # Inventory management dashboard
│   │   ├── services/
│   │   │   └── api.js           # API service layer
│   │   └── main.jsx
│   └── styles/
│       ├── nova-theme.css       # Nova POS design system
│       └── index.css            # Global styles
├── backend-template.js          # Backend server template
├── .env.example                 # Environment variables
├── QUICK_START.md               # Getting started guide
├── SETUP_GUIDE.md               # Detailed setup
├── AUTHENTICATION_INVESTIGATION_GUIDE.md  # How to discover auth
└── NOVA_THEME_UPDATE.md         # Theme documentation
```

## ✨ Features

### Inventory Management
- 📤 **CSV Upload**: Bulk import products and inventory
- ✅ **Validation**: Real-time data validation with error display
- 👀 **Diff Preview**: See what will change before applying
- 🔄 **Dry Run Mode**: Test changes without committing
- 🔒 **Transactional Updates**: All-or-nothing mode
- ➕ **Upsert Support**: Insert new items or update existing
- 📝 **Audit Trail**: Full logging with employee ID and comments
- 🔙 **Rollback**: Undo changes if needed

### Database Support
- **Products Table**: 33 columns including ShopifyId
- **Inventory Table**: Location-based inventory tracking
- **Inventory_Transactions**: Complete audit log

### Authentication
- 🔐 Secure account name/key authentication
- 💾 Session-based credential storage
- 🚪 Logout functionality

## 🎯 Workflow

1. **Login** → Enter account credentials
2. **Upload** → Import CSV with product/inventory data
3. **Edit Grid** → Review and modify data in spreadsheet view
4. **Review** → Preview changes and configure options
5. **Apply** → Execute changes with full audit trail
6. **Audit** → Review change history and rollback if needed

## 🔧 Configuration

### Frontend (.env.local)
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### Backend (backend/.env)
```env
DB_SERVER=yourserver.database.windows.net
DB_NAME=yourdatabase
DB_USER=yourusername
DB_PASSWORD=yourpassword
PORT=3000
```

## 📚 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Get running in 15 minutes
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete setup instructions
- **[NOVA_THEME_UPDATE.md](./NOVA_THEME_UPDATE.md)** - Theme documentation
- **[AUTHENTICATION_INVESTIGATION_GUIDE.md](./AUTHENTICATION_INVESTIGATION_GUIDE.md)** - Discover your auth method

## 🎨 Nova Theme

The app uses a custom Nova POS design system featuring:

### Colors
- **Primary**: Indigo (#6366f1)
- **Secondary**: Purple (#8b5cf6)
- **Success**: Emerald (#10b981)
- **Warning**: Amber (#f59e0b)
- **Error**: Red (#ef4444)

### Components
All components use the Nova design system for consistent, professional appearance:
- `nova-btn` - Gradient buttons
- `nova-card` - Elevated cards
- `nova-badge` - Status indicators
- `nova-input` - Form inputs
- `nova-alert` - Notification boxes
- `nova-tab` - Navigation tabs

## 🔒 Security

- Credentials never stored in frontend code
- Session-based authentication
- HTTPS recommended for production
- Backend handles all database operations
- Audit logging for all changes

## 📊 API Endpoints

```
POST /api/auth/login           - Authenticate user
POST /api/products/bulk        - Bulk update products
POST /api/inventory/bulk       - Bulk update inventory
GET  /api/transactions         - Get transaction history
GET  /api/audit                - Get audit log
POST /api/audit/rollback/:id   - Rollback changes
```

## 🛠️ Tech Stack

### Frontend
- React 18
- Tailwind CSS
- Nova Theme (Custom CSS)
- Vite

### Backend (Template)
- Node.js + Express
- MSSQL (mssql package)
- CORS

## 🎯 Next Steps

1. **Investigate your existing authentication** (see AUTHENTICATION_INVESTIGATION_GUIDE.md)
2. **Set up environment variables** (copy .env.example to .env.local)
3. **Configure backend** (use backend-template.js or connect to existing)
4. **Test with sample data** (use "Load sample data" button)
5. **Deploy to production**

## 💡 Tips

- Use **Dry Run** mode to test changes safely
- Enable **Transactional** mode for all-or-nothing updates
- Set **Employee ID** for proper audit trails
- Name batches clearly for easy rollback
- Check **Audit Log** tab to review history

## 🐛 Troubleshooting

### CORS Errors
- Ensure backend has CORS configured for your frontend URL
- Check VITE_API_BASE_URL in .env.local

### Authentication Fails
- Verify credentials match what backend expects
- Check Network tab in DevTools for actual error
- Review backend logs

### Database Connection
- Verify connection string in backend .env
- Check firewall rules (Azure SQL)
- Test connection with SQL Management Studio first

## 📝 License

[Your License Here]

## 🤝 Contributing

[Your Contributing Guidelines]

---

**Built with 💜 for Nova POS**

A modern inventory management system with professional design and robust functionality.


