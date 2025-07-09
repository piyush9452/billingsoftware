require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const moment = require('moment');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import Mongoose Models
const Bill = require('./src/models/Bill');
const BillItem = require('./src/models/BillItem');
const Customer = require('./src/models/Customer');
const Product = require('./src/models/Product');
const Stock = require('./src/models/Stock');
const StockTransaction = require('./src/models/StockTransaction');
const User = require('./src/models/User');

// Database connection
const connectDB = require('./src/config/database');
connectDB();

// Startup check: verify all required collections exist and are accessible
const REQUIRED_COLLECTIONS = [
    'customers',
    'stocks',
    'products',
    'bills',
    'billitems',
    'stocktransactions',
    'users'
];

async function checkCollections() {
    try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name.toLowerCase());
        for (const required of REQUIRED_COLLECTIONS) {
            if (collectionNames.includes(required)) {
                console.log(`[Startup Check] Collection '${required}' exists and is accessible.`);
            } else {
                console.error(`[Startup Check] Collection '${required}' is MISSING or not accessible!`);
            }
        }
    } catch (err) {
        console.error('[Startup Check] Error checking collections:', err.message);
    }
}

mongoose.connection.once('open', checkCollections);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// app.use(cors());
app.use(cors({
    origin:process.env.CORS_ORIGIN,
}  
));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password_hash');
        if (!req.user) {
            return res.status(401).json({ error: 'User not found' });
        }
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// Authentication routes
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user._id, username: user.username, role: user.role } });

    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});


// Products API
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.aggregate([
            {
                $lookup: {
                    from: 'stocks',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'stockInfo'
                }
            },
            {
                $unwind: { path: '$stockInfo', preserveNullAndEmptyArrays: true }
            },
            {
                $addFields: {
                    quantity: { $ifNull: ['$stockInfo.quantity', 0] }
                }
            },
            {
                $project: { stockInfo: 0 }
            },
            {
                $sort: { name: 1 }
            }
        ]);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Database error while fetching products' });
    }
});

app.post('/api/products',  async (req, res) => {
    const { name, brand, mrp, purchased_price, description, category } = req.body;
    try {
        const product = await Product.create({ name, brand, mrp, purchased_price, description, category });
        await Stock.create({ product_id: product._id, quantity: 0 });
        res.json({ id: product._id, message: 'Product added successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Database error while creating product' });
    }
});


// Stock API
app.get('/api/stock', async (req, res) => {
    try {
        const stock = await Stock.find({}).populate('product_id', 'id name brand mrp purchased_price');
        const flatStock = stock
            .filter(s => s.product_id)
            .map(s => ({
                stock_id: s._id,
                product_id: s.product_id._id,
                name: s.product_id.name,
                brand: s.product_id.brand,
                mrp: s.product_id.mrp,
                purchased_price: s.product_id.purchased_price,
                quantity: s.quantity,
                min_quantity: s.min_quantity
            }));
        res.json(flatStock);
    } catch (err) {
        res.status(500).json({ error: 'Database error while fetching stock' });
    }
});

app.post('/api/stock',  async (req, res) => {
    const { product_id, quantity, min_quantity, notes } = req.body;
    try {
        await Stock.findOneAndUpdate(
            { product_id: product_id },
            { quantity, min_quantity: min_quantity || 10 },
            { upsert: true }
        );
        await StockTransaction.create({
            product_id,
            transaction_type: 'stock_update',
            quantity: quantity,
            notes: notes || 'Stock updated via API'
        });
        res.json({ message: 'Stock updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Database error while updating stock' });
    }
});

app.delete('/api/stock/:id',  async (req, res) => {
    try {
        const productId = req.params.id;
        // const stock = await Stock.findOneAndDelete({ product_id: productId });
        const stock =   await Product.findByIdAndDelete(productId);
        if (!stock) {
            return res.status(404).json({ error: 'Stock item not found' });
        }
        await StockTransaction.deleteMany({ product_id: productId });
        res.json({ message: 'Stock item deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Database error while deleting stock item' });
    }
});

// PATCH /api/stock/:id/add - increment stock quantity
app.patch('/api/stock/:id/add', async (req, res) => {
    const stockId = req.params.id;
    const addQty = Number(req.body.add_quantity);
    if (isNaN(addQty)) {
        return res.status(400).json({ error: 'add_quantity must be a number' });
    }
    try {
        const stock = await Stock.findByIdAndUpdate(
            stockId,
            { $inc: { quantity: addQty } },
            { new: true }
        );
        if (!stock) {
            return res.status(404).json({ error: 'Stock item not found' });
        }
        await StockTransaction.create({
            product_id: stock.product_id,
            transaction_type: 'stock_add',
            quantity: addQty,
            notes: 'Stock incremented via API'
        });
        res.json({ message: 'Stock quantity incremented', stock });
    } catch (err) {
        res.status(500).json({ error: 'Database error while incrementing stock' });
    }
});


// Customers API
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await Customer.find({}).sort({ name: 1 });
        res.json(customers);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/customers', async (req, res) => {
    const { phone, name, email, address } = req.body;
    try {
        const customer = await Customer.findOneAndUpdate(
            { phone },
            { name, email, address },
            { new: true, upsert: true }
        );
        res.json({ id: customer._id, message: 'Customer saved successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Bills API
app.get('/api/bills', async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 0;
    try {
        let query = Bill.find({})
            .populate('customer_id', 'name phone')
            .sort({ bill_date: -1 });
        
        if (limit > 0) {
            query = query.limit(limit);
        }
        
        const bills = await query;
        res.json(bills);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/bills/:id', async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id);
        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }
        const items = await BillItem.find({ bill_id: bill._id });
        res.json({ ...bill.toObject(), items });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/bills', async (req, res) => {
    const { customer_phone, customer_name, items, total_amount, total_items, notes, service_charges, discount } = req.body;

    // Calculate sum of item totals
    const itemsTotal = items.reduce((sum, item) => sum + (item.price || item.total), 0);
    const serviceCharge = service_charges || 0;
    const Discount = req.body.discount || 0;

    // Calculate the correct total amount
    const totalAmount = itemsTotal + serviceCharge - Discount;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        let customer;
        if (customer_phone && customer_name) {
            customer = await Customer.findOneAndUpdate(
                { phone: customer_phone },
                { $set: { name: customer_name, email: req.body.customer_email || '', address: req.body.customer_address || '' } },
                { new: true, upsert: true, session }
            );
        }
        
        const now = moment();
        const year = now.month() < 3 ? now.year() - 1 : now.year();
        const nextYear = (year + 1).toString().slice(-2);
        const finYear = `${year}-${nextYear}`;
        const month = now.format('MM');
        const franchiseeCode = 'DIP';

        const count = await Bill.countDocuments({ bill_number: new RegExp(`^${franchiseeCode}/${finYear}/${month}-`) }, { session });
        const invoiceNum = (count + 1).toString().padStart(4, '0');
        const bill_number = `${franchiseeCode}/${finYear}/${month}-${invoiceNum}`;

        const billData = {
            bill_number,
            customer_id: customer ? customer._id : null,
            customer_phone,
            customer_name,
            total_amount,
            total_items,
            notes,
            bill_date: now.toDate(),
            service_charges: service_charges || 0 ,
        };

        const createdBillArr = await Bill.create([billData], { session });
        const createdBill = createdBillArr[0];

        for (const item of items) {
            const productId = item.id || item.product_id;
            await BillItem.create([{
                bill_id: createdBill._id,
                product_id: productId,
                product_name: item.name,
                quantity: item.quantity,
                mrp: item.mrp,
                discount: discount || 0,
                service_charges : service_charges || 0,
                total: totalAmount || item.price || item.total,
            }], { session });

            const stock = await Stock.findOne({ product_id: productId }).session(session);
            if (!stock || stock.quantity < item.quantity) {
                throw new Error(`Not enough stock for ${item.name}. Available: ${stock ? stock.quantity : 0}`);
            }

            await Stock.updateOne(
                { product_id: productId },
                { $inc: { quantity: -item.quantity } },
                { session }
            );

            await StockTransaction.create([{
                product_id: productId,
                transaction_type: 'sale',
                quantity: -item.quantity,
                reference_id: createdBill._id,
                reference_type: 'Bill',
                notes: `Sale via Bill #${bill_number}`
            }], { session });
        }

        await session.commitTransaction();
        res.json({ id: createdBill._id, bill_number, message: 'Bill created successfully' });

    } catch (error) {
        await session.abortTransaction();
        console.error('Create bill transaction failed:', error);
        res.status(500).json({ error: `Failed to create bill: ${error.message}` });
    } finally {
        session.endSession();
    }
});




// PDF Generation (assuming data structure is similar)
app.get('/api/bills/:id/pdf', async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id);
        if(!bill) return res.status(404).json({ error: 'Bill not found' });

        const items = await BillItem.find({bill_id: bill._id});

        const doc = new PDFDocument({ margin: 50 });
        const filename = `bill-${bill.bill_number.replace(/\//g, '-')}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);

        // PDF content
        doc.fontSize(20).text('INVOICE', { align: 'center' });
        doc.fontSize(14).text('Dipdips Franchisee: Buddhadeb Mondal (Garg House)', { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(10).text(`Invoice Number: ${bill.bill_number}`);
        doc.text(`Date: ${moment(bill.bill_date).format('DD/MM/YYYY HH:mm')}`);
        doc.text(`Customer: ${bill.customer_name || 'Walk-in Customer'}`);
        if (bill.customer_phone) {
            doc.text(`Phone: ${bill.customer_phone}`);
        }
        doc.moveDown();

        const tableTop = doc.y;
        doc.font('Helvetica-Bold');
        doc.text('Item', 50, tableTop);
        doc.text('Qty', 250, tableTop);
        doc.text('MRP', 300, tableTop);
        doc.text('Total', 420, tableTop, {align: 'right'});
        doc.font('Helvetica');
        doc.moveDown();

        items.forEach(item => {
            const y = doc.y;
            doc.text(item.product_name, 50, y, { width: 180 });
            doc.text(item.quantity.toString(), 250, y, {width: 40, align: 'center'});
            doc.text(`₹${item.mrp.toFixed(2)}`, 300, y, {width: 60, align: 'right'});
            doc.text(`₹${item.total.toFixed(2)}`, 420, y, {align: 'right'});
            doc.moveDown();
        });

        doc.moveDown();
        doc.fontSize(12).text(`Total Amount: ₹${bill.total_amount.toFixed(2)}`, { align: 'right' });
        
        if (bill.notes) {
            doc.moveDown();
            doc.fontSize(10).text(`Notes: ${bill.notes}`);
        }
        
        doc.end();

    } catch(err) {
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// Reports API
app.get('/api/reports/sales', async (req, res) => {
    const { start_date, end_date } = req.query;
    try {
        const matchStage = { status: 'completed' };
        if (start_date && end_date) {
            matchStage.bill_date = {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
            };
        }

        const sales = await Bill.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$bill_date" } },
                    total_bills: { $sum: 1 },
                    total_sales: { $sum: "$total_amount" },
                    total_items_sold: { $sum: "$total_items" }
                }
            },
            { $sort: { _id: -1 } },
            { 
                $project: {
                    _id: 0,
                    date: "$_id",
                    total_bills: 1,
                    total_sales: 1,
                    total_items_sold: 1
                }
            }
        ]);
        res.json(sales);
    } catch(err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/reports/stock', async (req, res) => {
    try {
        const stockReport = await Stock.aggregate([
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $project: {
                    _id: 0,
                    name: '$product.name',
                    brand: '$product.brand',
                    quantity: '$quantity',
                    min_quantity: '$min_quantity',
                    status: {
                        $cond: { if: { $lte: ['$quantity', '$min_quantity'] }, then: 'Low Stock', else: 'In Stock' }
                    }
                }
            },
            { $sort: { quantity: 1 } }
        ]);
        res.json(stockReport);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});


// Search API
app.get('/api/search/products', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);

    try {
        const products = await Product.find({
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { brand: { $regex: q, $options: 'i' } }
            ]
        }).limit(10);
        res.json(products);
    } catch(err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString(), db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Debug route to check MongoDB connection
app.get('/api/debug/db', (req, res) => {
    res.json({
        db: mongoose.connection.name,
        host: mongoose.connection.host,
        readyState: mongoose.connection.readyState
    });
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({ error: err.message || 'Something went wrong!' });
});

// Start the server (Render deployment)
app.listen(PORT, () => {
    console.log(`Smart Billing System server running on port ${PORT}`);
    console.log(`Access the application at: http://localhost:${PORT}`);
}); 