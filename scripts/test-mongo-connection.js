const connectDB = require('../src/config/database');

async function testConnection() {
    try {
        console.log('Testing MongoDB connection...');
        await connectDB();
        console.log('✅ MongoDB connection successful!');
        console.log('Your MongoDB setup is working correctly.');
        process.exit(0);
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        console.log('\nPlease check:');
        console.log('1. Your .env file has the correct MONGODB_URI');
        console.log('2. Your MongoDB Atlas cluster is running');
        console.log('3. Your IP is whitelisted in Network Access');
        console.log('4. Your database user credentials are correct');
        process.exit(1);
    }
}

testConnection(); 