const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const connectDB = require('./config/database');
const Customer = require('./models/Customer');
const Product = require('./models/Product');
const Stock = require('./models/Stock');
const Bill = require('./models/Bill');
const BillItem = require('./models/BillItem');
const StockTransaction = require('./models/StockTransaction');
const User = require('./models/User');

// Connect to SQLite database
const dbPath = path.join(__dirname, 'billing.db');
const db = new sqlite3.Database(dbPath);

const migrateData = async () => {
    try {
        // Connect to MongoDB
        await connectDB();
        
        console.log('Starting migration from SQLite to MongoDB...');
        
        // Clear existing data in MongoDB
        await Customer.deleteMany({});
        await Product.deleteMany({});
        await Stock.deleteMany({});
        await Bill.deleteMany({});
        await BillItem.deleteMany({});
        await StockTransaction.deleteMany({});
        await User.deleteMany({});
        
        console.log('Cleared existing MongoDB data');
        
        // Migrate Users
        console.log('Migrating users...');
        db.all('SELECT * FROM users', async (err, users) => {
            if (err) {
                console.error('Error fetching users:', err);
                return;
            }
            
            for (const user of users) {
                await User.create({
                    username: user.username,
                    password_hash: user.password_hash,
                    email: user.email,
                    role: user.role
                });
            }
            console.log(`Migrated ${users.length} users`);
        });
        
        // Migrate Products
        console.log('Migrating products...');
        db.all('SELECT * FROM products', async (err, products) => {
            if (err) {
                console.error('Error fetching products:', err);
                return;
            }
            
            const productMap = new Map(); // SQLite ID to MongoDB ID mapping
            
            for (const product of products) {
                const newProduct = await Product.create({
                    name: product.name,
                    brand: product.brand,
                    mrp: product.mrp,
                    purchased_price: product.purchased_price,
                    description: product.description,
                    category: product.category
                });
                productMap.set(product.id, newProduct._id);
            }
            console.log(`Migrated ${products.length} products`);
            
            // Migrate Stock
            console.log('Migrating stock...');
            db.all('SELECT * FROM stock', async (err, stockItems) => {
                if (err) {
                    console.error('Error fetching stock:', err);
                    return;
                }
                
                for (const stock of stockItems) {
                    const productId = productMap.get(stock.product_id);
                    if (productId) {
                        await Stock.create({
                            product_id: productId,
                            quantity: stock.quantity,
                            min_quantity: stock.min_quantity
                        });
                    }
                }
                console.log(`Migrated ${stockItems.length} stock items`);
            });
            
            // Migrate Customers
            console.log('Migrating customers...');
            db.all('SELECT * FROM customers', async (err, customers) => {
                if (err) {
                    console.error('Error fetching customers:', err);
                    return;
                }
                
                const customerMap = new Map(); // SQLite ID to MongoDB ID mapping
                
                for (const customer of customers) {
                    const newCustomer = await Customer.create({
                        phone: customer.phone,
                        name: customer.name,
                        email: customer.email,
                        address: customer.address
                    });
                    customerMap.set(customer.id, newCustomer._id);
                }
                console.log(`Migrated ${customers.length} customers`);
                
                // Migrate Bills
                console.log('Migrating bills...');
                db.all('SELECT * FROM bills', async (err, bills) => {
                    if (err) {
                        console.error('Error fetching bills:', err);
                        return;
                    }
                    
                    const billMap = new Map(); // SQLite ID to MongoDB ID mapping
                    
                    for (const bill of bills) {
                        const customerId = bill.customer_id ? customerMap.get(bill.customer_id) : null;
                        const newBill = await Bill.create({
                            bill_number: bill.bill_number,
                            customer_id: customerId,
                            customer_phone: bill.customer_phone,
                            customer_name: bill.customer_name,
                            total_amount: bill.total_amount,
                            total_items: bill.total_items,
                            bill_date: bill.bill_date,
                            status: bill.status,
                            notes: bill.notes
                        });
                        billMap.set(bill.id, newBill._id);
                    }
                    console.log(`Migrated ${bills.length} bills`);
                    
                    // Migrate Bill Items
                    console.log('Migrating bill items...');
                    db.all('SELECT * FROM bill_items', async (err, billItems) => {
                        if (err) {
                            console.error('Error fetching bill items:', err);
                            return;
                        }
                        
                        for (const item of billItems) {
                            const billId = billMap.get(item.bill_id);
                            const productId = item.product_id ? productMap.get(item.product_id) : null;
                            
                            if (billId) {
                                await BillItem.create({
                                    bill_id: billId,
                                    product_id: productId,
                                    product_name: item.product_name,
                                    quantity: item.quantity,
                                    mrp: item.mrp,
                                    discount: item.discount,
                                    service_charges: item.service_charges,
                                    total: item.total
                                });
                            }
                        }
                        console.log(`Migrated ${billItems.length} bill items`);
                    });
                    
                    // Migrate Stock Transactions
                    console.log('Migrating stock transactions...');
                    db.all('SELECT * FROM stock_transactions', async (err, transactions) => {
                        if (err) {
                            console.error('Error fetching stock transactions:', err);
                            return;
                        }
                        
                        for (const transaction of transactions) {
                            const productId = productMap.get(transaction.product_id);
                            let referenceId = null;
                            
                            if (transaction.reference_type === 'bill') {
                                referenceId = billMap.get(transaction.reference_id);
                            }
                            
                            if (productId) {
                                await StockTransaction.create({
                                    product_id: productId,
                                    transaction_type: transaction.transaction_type,
                                    quantity: transaction.quantity,
                                    reference_id: referenceId,
                                    reference_type: transaction.reference_type,
                                    notes: transaction.notes
                                });
                            }
                        }
                        console.log(`Migrated ${transactions.length} stock transactions`);
                        
                        console.log('Migration completed successfully!');
                        process.exit(0);
                    });
                });
            });
        });
        
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
};

migrateData(); 