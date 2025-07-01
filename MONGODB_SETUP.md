# MongoDB Atlas Integration Guide

This guide will help you set up your billing system with MongoDB Atlas while preserving all your existing data and functionality.

## Prerequisites

1. Node.js and npm installed
2. Your existing billing system working with SQLite
3. A MongoDB Atlas account (free tier available)

## Step 1: Install MongoDB Dependencies

```bash
npm install mongoose
```

## Step 2: Set Up MongoDB Atlas

### 2.1 Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for a free account
3. Create a new project

### 2.2 Create a Cluster
1. Click "Build a Database"
2. Choose "FREE" tier (M0)
3. Select your preferred cloud provider and region
4. Click "Create"

### 2.3 Set Up Database Access
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and password (save these!)
5. Select "Read and write to any database"
6. Click "Add User"

### 2.4 Set Up Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for development)
4. Click "Confirm"

### 2.5 Get Connection String
1. Go to "Database" in the left sidebar
2. Click "Connect"
3. Choose "Connect your application"
4. Copy the connection string

## Step 3: Configure Environment Variables

1. Create a `.env` file in your project root:

```bash
# Copy the example file
cp env.example .env
```

2. Edit the `.env` file with your MongoDB Atlas connection string:

```env
MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster.mongodb.net/smart-billing?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3000
```

**Important:** Replace `yourusername`, `yourpassword`, and `cluster.mongodb.net` with your actual MongoDB Atlas credentials.

## Step 4: Migrate Your Data

### 4.1 Backup Your Current Data
```bash
# Create a backup of your SQLite database
cp billing.db billing_backup_$(date +%Y%m%d_%H%M%S).db
```

### 4.2 Run the Migration
```bash
# Migrate all data from SQLite to MongoDB
npm run migrate-to-mongo
```

This will:
- Connect to your MongoDB Atlas database
- Transfer all customers, products, stock, bills, and users
- Preserve all relationships and data integrity
- Show progress for each table

## Step 5: Test MongoDB Integration

### 5.1 Start the MongoDB Server
```bash
# Use the new MongoDB server
node server-mongo.js
```

### 5.2 Verify Data Migration
1. Open your application at `http://localhost:3000`
2. Check that all your existing data is visible
3. Test creating a new bill
4. Verify stock updates work correctly

## Step 6: Switch to MongoDB (Optional)

Once you've verified everything works:

1. Rename your current server:
```bash
mv server.js server-sqlite.js
```

2. Rename the MongoDB server:
```bash
mv server-mongo.js server.js
```

3. Update your package.json scripts:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "init-db": "node init-database.js",
    "migrate-to-mongo": "node migrate-to-mongo.js",
    "start-sqlite": "node server-sqlite.js"
  }
}
```

## Step 7: Deploy to Production

### 7.1 Environment Variables for Production
Set these environment variables in your production environment:

```env
MONGODB_URI=your-production-mongodb-atlas-connection-string
JWT_SECRET=your-production-jwt-secret
PORT=3000
NODE_ENV=production
```

### 7.2 Security Considerations
1. **Change the JWT secret** to a strong, random string
2. **Use environment variables** for all sensitive data
3. **Restrict network access** in MongoDB Atlas to your production IP
4. **Enable MongoDB Atlas security features** like encryption at rest

## Troubleshooting

### Connection Issues
- Verify your MongoDB Atlas connection string
- Check that your IP is whitelisted in Network Access
- Ensure your database user has the correct permissions

### Migration Issues
- Check that your SQLite database file exists
- Verify all required models are created
- Check the console for specific error messages

### Data Issues
- Compare data between SQLite and MongoDB
- Check that all relationships are preserved
- Verify that ObjectIds are properly mapped

## Data Structure Comparison

| SQLite Table | MongoDB Collection | Key Changes |
|--------------|-------------------|-------------|
| customers | customers | Same structure, ObjectId instead of INTEGER |
| products | products | Same structure, ObjectId instead of INTEGER |
| stock | stocks | Same structure, references ObjectIds |
| bills | bills | Same structure, references ObjectIds |
| bill_items | billitems | Same structure, references ObjectIds |
| stock_transactions | stocktransactions | Same structure, references ObjectIds |
| users | users | Same structure, ObjectId instead of INTEGER |

## Benefits of MongoDB Atlas

1. **Scalability**: Easy to scale as your business grows
2. **Cloud-based**: No local database management
3. **Backup & Recovery**: Automatic backups and point-in-time recovery
4. **Security**: Enterprise-grade security features
5. **Monitoring**: Built-in performance monitoring
6. **Global Distribution**: Deploy closer to your users

## Support

If you encounter any issues:
1. Check the MongoDB Atlas documentation
2. Verify your connection string format
3. Test with a simple connection script
4. Check the migration logs for specific errors

Your billing system will now be fully integrated with MongoDB Atlas while maintaining all existing functionality! 