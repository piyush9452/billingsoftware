const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🚀 MongoDB Atlas Setup Helper\n');

console.log('📋 To set up MongoDB Atlas, follow these steps:\n');

console.log('1️⃣  Go to MongoDB Atlas: https://www.mongodb.com/atlas');
console.log('2️⃣  Sign up for a FREE account (no credit card required)');
console.log('3️⃣  Create a new project');
console.log('4️⃣  Click "Build a Database"');
console.log('5️⃣  Choose "FREE" tier (M0)');
console.log('6️⃣  Select your preferred cloud provider and region');
console.log('7️⃣  Click "Create"\n');

console.log('🔐 Database Access Setup:');
console.log('1️⃣  Go to "Database Access" in the left sidebar');
console.log('2️⃣  Click "Add New Database User"');
console.log('3️⃣  Choose "Password" authentication');
console.log('4️⃣  Create a username and password (save these!)');
console.log('5️⃣  Select "Read and write to any database"');
console.log('6️⃣  Click "Add User"\n');

console.log('🌐 Network Access Setup:');
console.log('1️⃣  Go to "Network Access" in the left sidebar');
console.log('2️⃣  Click "Add IP Address"');
console.log('3️⃣  Click "Allow Access from Anywhere" (0.0.0.0/0)');
console.log('4️⃣  Click "Confirm"\n');

console.log('🔗 Get Connection String:');
console.log('1️⃣  Go to "Database" in the left sidebar');
console.log('2️⃣  Click "Connect"');
console.log('3️⃣  Choose "Connect your application"');
console.log('4️⃣  Copy the connection string\n');

console.log('📝 The connection string should look like:');
console.log('mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority\n');

rl.question('🔑 Enter your MongoDB Atlas connection string: ', (connectionString) => {
    if (!connectionString || connectionString.includes('username:password')) {
        console.log('❌ Please provide a valid connection string with your actual credentials');
        rl.close();
        return;
    }

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
    console.log('\n🧪 Now testing the connection...\n');
    
    rl.close();
    
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
    });
});

rl.on('close', () => {
    console.log('\n📚 For detailed setup instructions, see MONGODB_SETUP.md');
    console.log('🆘 If you need help, check the troubleshooting section in the guide');
}); 