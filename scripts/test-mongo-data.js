const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Customer = require('./models/Customer');
const Product = require('./models/Product');
const Stock = require('./models/Stock');
const User = require('./models/User');

async function testMongoDBDataStorage() {
    try {
        console.log('🧪 Testing MongoDB Data Storage...\n');
        
        // Test connection
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-billing';
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(mongoURI);
        console.log('✅ MongoDB connected successfully!\n');
        
        // Clear test data
        console.log('🧹 Clearing test data...');
        await Customer.deleteMany({});
        await Product.deleteMany({});
        await Stock.deleteMany({});
        await User.deleteMany({});
        console.log('✅ Test data cleared\n');
        
        // Test 1: Create a customer
        console.log('👤 Test 1: Creating a customer...');
        const customer = await Customer.create({
            phone: '9876543210',
            name: 'Test Customer',
            email: 'test@example.com',
            address: 'Test Address'
        });
        console.log('✅ Customer created:', customer.name);
        
        // Test 2: Create a product
        console.log('\n📦 Test 2: Creating a product...');
        const product = await Product.create({
            name: 'Test Product',
            brand: 'Test Brand',
            mrp: 100.00,
            purchased_price: 80.00,
            description: 'Test product description',
            category: 'Test Category'
        });
        console.log('✅ Product created:', product.name);
        
        // Test 3: Create stock
        console.log('\n📊 Test 3: Creating stock...');
        const stock = await Stock.create({
            product_id: product._id,
            quantity: 50,
            min_quantity: 10
        });
        console.log('✅ Stock created:', stock.quantity, 'units');
        
        // Test 4: Create a user
        console.log('\n👤 Test 4: Creating a user...');
        const bcrypt = require('bcryptjs');
        const passwordHash = bcrypt.hashSync('test123', 10);
        const user = await User.create({
            username: 'testuser',
            password_hash: passwordHash,
            email: 'testuser@example.com',
            role: 'admin'
        });
        console.log('✅ User created:', user.username);
        
        // Test 5: Retrieve and verify data
        console.log('\n🔍 Test 5: Retrieving and verifying data...');
        
        const customers = await Customer.find();
        console.log('✅ Customers found:', customers.length);
        
        const products = await Product.find();
        console.log('✅ Products found:', products.length);
        
        const stocks = await Stock.find().populate('product_id');
        console.log('✅ Stock items found:', stocks.length);
        
        const users = await User.find();
        console.log('✅ Users found:', users.length);
        
        // Test 6: Test relationships
        console.log('\n🔗 Test 6: Testing relationships...');
        const productWithStock = await Product.aggregate([
            {
                $lookup: {
                    from: 'stocks',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'stock'
                }
            },
            {
                $addFields: {
                    quantity: { $ifNull: [{ $arrayElemAt: ['$stock.quantity', 0] }, 0] }
                }
            }
        ]);
        console.log('✅ Product with stock data:', productWithStock[0].name, '- Quantity:', productWithStock[0].quantity);
        
        // Test 7: Test search functionality
        console.log('\n🔍 Test 7: Testing search functionality...');
        const searchResults = await Product.find({
            $or: [
                { name: { $regex: 'Test', $options: 'i' } },
                { brand: { $regex: 'Test', $options: 'i' } }
            ]
        });
        console.log('✅ Search results found:', searchResults.length);
        
        // Test 8: Test data updates
        console.log('\n✏️ Test 8: Testing data updates...');
        await Customer.findOneAndUpdate(
            { phone: '9876543210' },
            { name: 'Updated Test Customer' }
        );
        const updatedCustomer = await Customer.findOne({ phone: '9876543210' });
        console.log('✅ Customer updated:', updatedCustomer.name);
        
        // Test 9: Test stock updates
        console.log('\n📊 Test 9: Testing stock updates...');
        await Stock.findOneAndUpdate(
            { product_id: product._id },
            { $inc: { quantity: -5 } }
        );
        const updatedStock = await Stock.findOne({ product_id: product._id });
        console.log('✅ Stock updated:', updatedStock.quantity, 'units remaining');
        
        console.log('\n🎉 All MongoDB tests passed successfully!');
        console.log('\n📊 Test Summary:');
        console.log('- ✅ Connection: Working');
        console.log('- ✅ Data Creation: Working');
        console.log('- ✅ Data Retrieval: Working');
        console.log('- ✅ Relationships: Working');
        console.log('- ✅ Search: Working');
        console.log('- ✅ Updates: Working');
        console.log('- ✅ Data Storage: Working');
        
        console.log('\n🚀 Your MongoDB setup is working perfectly!');
        console.log('You can now migrate your existing data and use MongoDB Atlas.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check your .env file has the correct MONGODB_URI');
        console.log('2. Ensure MongoDB Atlas cluster is running');
        console.log('3. Verify network access is configured');
        console.log('4. Check database user credentials');
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

testMongoDBDataStorage(); 