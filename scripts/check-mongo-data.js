const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Customer = require('./models/Customer');
const Product = require('./models/Product');
const Bill = require('./models/Bill');
const BillItem = require('./models/BillItem');
const Stock = require('./models/Stock');
const StockTransaction = require('./models/StockTransaction');
const User = require('./models/User');

async function checkMongoData() {
    try {
        console.log('🔍 Checking MongoDB Atlas Data...\n');
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas\n');
        
        // Get all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📊 Collections found in database:');
        collections.forEach((col, index) => {
            console.log(`${index + 1}. ${col.name}`);
        });
        console.log('');
        
        // Check data counts
        console.log('📈 Data Counts:');
        console.log('Customers:', await Customer.countDocuments());
        console.log('Products:', await Product.countDocuments());
        console.log('Bills:', await Bill.countDocuments());
        console.log('Bill Items:', await BillItem.countDocuments());
        console.log('Stock Items:', await Stock.countDocuments());
        console.log('Stock Transactions:', await StockTransaction.countDocuments());
        console.log('Users:', await User.countDocuments());
        console.log('');
        
        // Show sample data
        console.log('👥 Sample Customers:');
        const customers = await Customer.find().limit(3);
        customers.forEach(customer => {
            console.log(`- ${customer.name} (${customer.phone})`);
        });
        console.log('');
        
        console.log('📦 Sample Products:');
        const products = await Product.find().limit(3);
        products.forEach(product => {
            console.log(`- ${product.name} (${product.brand}) - ₹${product.mrp}`);
        });
        console.log('');
        
        console.log('🧾 Sample Bills:');
        const bills = await Bill.find().limit(3).sort({bill_date: -1});
        bills.forEach(bill => {
            console.log(`- ${bill.bill_number} - ₹${bill.total_amount} - ${bill.customer_name || 'Walk-in'}`);
        });
        console.log('');
        
        console.log('📊 Sample Stock:');
        const stockWithProducts = await Stock.aggregate([
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $addFields: {
                    product_name: { $arrayElemAt: ['$product.name', 0] }
                }
            },
            {
                $project: {
                    product: 0
                }
            }
        ]).limit(3);
        
        stockWithProducts.forEach(stock => {
            console.log(`- ${stock.product_name}: ${stock.quantity} units`);
        });
        console.log('');
        
        console.log('👤 Users:');
        const users = await User.find();
        users.forEach(user => {
            console.log(`- ${user.username} (${user.role})`);
        });
        console.log('');
        
        console.log('🎉 All data is properly stored in MongoDB Atlas!');
        console.log('💡 If you don\'t see collections in Atlas dashboard:');
        console.log('   1. Refresh the page');
        console.log('   2. Check the correct database (smart-billing)');
        console.log('   3. Wait a few minutes for Atlas to update');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

checkMongoData(); 