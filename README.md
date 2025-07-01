# Smart Billing System

A professional billing system with backend integration, database storage, PDF generation, and WhatsApp integration.

## Features

- **Modern UI/UX**: Clean, responsive design that works on desktop and mobile
- **Backend Integration**: Node.js/Express server with SQLite database
- **Product Management**: Add, edit, and manage products with stock tracking
- **Customer Management**: Store customer information and purchase history
- **Bill Generation**: Create professional bills with itemized details
- **PDF Generation**: Generate downloadable PDF invoices
- **WhatsApp Integration**: Send bills directly to customers via WhatsApp
- **Stock Management**: Track inventory levels and low stock alerts
- **Reports**: Sales reports and stock status reports
- **Authentication**: Secure login system for admin access

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **PDF Generation**: PDFKit
- **Authentication**: JWT, bcryptjs

## Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

### Step 1: Clone/Download the Project

```bash
# If using git
git clone <repository-url>
cd billing-system

# Or download and extract the ZIP file
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Initialize Database

```bash
npm run init-db
```

This will:
- Create the SQLite database file (`billing.db`)
- Create all necessary tables
- Insert sample product data
- Create a default admin user

### Step 4: Start the Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## Default Login Credentials

- **Username**: `admin`
- **Password**: `admin123`

## API Endpoints

### Authentication
- `POST /api/login` - User login

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Add new product (requires auth)

### Stock
- `GET /api/stock` - Get stock information
- `POST /api/stock` - Update stock (requires auth)

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Add/update customer

### Bills
- `GET /api/bills` - Get all bills
- `GET /api/bills/:id` - Get specific bill
- `POST /api/bills` - Create new bill
- `GET /api/bills/:id/pdf` - Download bill as PDF

### Reports
- `GET /api/reports/sales` - Sales reports
- `GET /api/reports/stock` - Stock status reports

### Search
- `GET /api/search/products?q=query` - Search products

## Usage Guide

### 1. Adding Products to Stock

1. Click the "Stock" button in the navigation
2. Fill in the product details:
   - Item Name
   - Brand
   - MRP (Maximum Retail Price)
   - Purchased Price
   - Quantity
3. Click "Add Stock Item"

### 2. Creating a Bill

1. Click "Start Billing" from the home page
2. Enter customer information (optional)
3. Add items to the bill:
   - Type item name (autocomplete will show available products)
   - Set quantity and discount
   - Click "Add Item"
4. Review the bill items and totals
5. Click "Send via WhatsApp" to create the bill and send to customer

### 3. Managing Stock

- View current stock levels in the Stock Management section
- Add new products and quantities
- Monitor low stock items

### 4. Generating Reports

- Sales reports show daily/monthly sales data
- Stock reports show current inventory levels
- PDF bills can be downloaded for each transaction

## Database Schema

### Tables

1. **users** - Admin user accounts
2. **products** - Product catalog
3. **stock** - Inventory levels
4. **customers** - Customer information
5. **bills** - Bill headers
6. **bill_items** - Individual items in bills
7. **stock_transactions** - Stock movement history

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

### Database Configuration

The system uses SQLite by default. The database file (`billing.db`) will be created automatically when you run the initialization script.

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- SQL injection prevention

## File Structure

```
billing-system/
├── index.html          # Main application page
├── registration.html   # Registration page
├── style.css          # Stylesheets
├── script.js          # Frontend JavaScript
├── server.js          # Express server
├── init-database.js   # Database initialization
├── package.json       # Dependencies and scripts
├── billing.db         # SQLite database (created after init)
├── README.md          # This file
└── assets/            # Images and static files
    ├── logo.png
    ├── image.jpg
    └── image1.jpg
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Change the PORT in `.env` file or kill the process using the port

2. **Database errors**
   - Delete `billing.db` and run `npm run init-db` again

3. **CORS errors**
   - Ensure the frontend is being served from the same origin as the API

4. **WhatsApp not opening**
   - Check if the phone number format is correct (should include country code)

### Error Logs

Check the console output for detailed error messages. The server logs all API requests and errors.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Email: info@smartbilling.com
- Phone: +91 9876543210

## Changelog

### Version 1.0.0
- Initial release
- Basic billing functionality
- Backend integration
- Database storage
- PDF generation
- WhatsApp integration 