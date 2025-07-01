const fs = require('fs');

console.log('🚀 Quick MongoDB Atlas Setup\n');

console.log('📋 Follow these steps to get your MongoDB Atlas connection:\n');

console.log('1️⃣  Go to: https://www.mongodb.com/atlas');
console.log('2️⃣  Click "Try Free" and create an account');
console.log('3️⃣  Create a new project');
console.log('4️⃣  Click "Build a Database"');
console.log('5️⃣  Choose "FREE" tier (M0)');
console.log('6️⃣  Select any cloud provider and region');
console.log('7️⃣  Click "Create"\n');

console.log('🔐 Set up database access:');
console.log('1️⃣  Go to "Database Access" → "Add New Database User"');
console.log('2️⃣  Username: billinguser');
console.log('3️⃣  Password: billing123456');
console.log('4️⃣  Select "Read and write to any database"');
console.log('5️⃣  Click "Add User"\n');

console.log('🌐 Set up network access:');
console.log('1️⃣  Go to "Network Access" → "Add IP Address"');
console.log('2️⃣  Click "Allow Access from Anywhere"');
console.log('3️⃣  Click "Confirm"\n');

console.log('🔗 Get your connection string:');
console.log('1️⃣  Go to "Database" → "Connect"');
console.log('2️⃣  Choose "Connect your application"');
console.log('3️⃣  Copy the connection string\n');

console.log('📝 Your connection string will look like:');
console.log('mongodb+srv://billinguser:billing123456@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority\n');

console.log('💡 Once you have your connection string, run:');
console.log('node quick-mongo-setup.js "your-connection-string"');

// Check if connection string is provided as argument
const connectionString = process.argv[2];

if (connectionString) {
    console.log('🔧 Setting up MongoDB connection...\n');
    
    // Add database name to connection string
    let mongoURI = connectionString;
    if (!mongoURI.includes('/smart-billing')) {
        mongoURI = mongoURI.replace('?retryWrites=true&w=majority', '/smart-billing?retryWrites=true&w=majority');
    }

    // Create .env file content
    const envContent = `# MongoDB Atlas Connection String
MONGODB_URI=${mongoURI}

# JWT Secret (change this in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Port
PORT=3000
`;

    // Write to .env file
    fs.writeFileSync('.env', envContent);
    
    console.log('✅ .env file updated successfully!');
    console.log('🔗 Connection string saved');
    console.log('\n🧪 Testing the connection...\n');
    
    // Test the connection
    const { exec } = require('child_process');
    exec('npm run test-mongo', (error, stdout, stderr) => {
        if (error) {
            console.log('❌ Connection test failed. Please check:');
            console.log('1. Your connection string is correct');
            console.log('2. Your MongoDB Atlas cluster is running');
            console.log('3. Your IP is whitelisted');
            console.log('4. Your database user credentials are correct');
            return;
        }
        console.log(stdout);
        console.log('\n🎉 MongoDB Atlas is now connected!');
        console.log('🚀 You can now run: npm run migrate-to-mongo');
    });
} else {
    console.log('❌ No connection string provided.');
    console.log('💡 Run: node quick-mongo-setup.js "your-connection-string"');
} 