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
const multer = require('multer');
const nodemailer = require('nodemailer');

// Import Mongoose Models
const Bill = require('./src/models/Bill');
const BillItem = require('./src/models/BillItem');
const Customer = require('./src/models/Customer');
const Product = require('./src/models/Product');
const Stock = require('./src/models/Stock');
const StockTransaction = require('./src/models/StockTransaction');
const User = require('./src/models/User');
const Franchisee = require('./src/models/Franchisee');
const VendorProfile = require('./src/models/VendorProfile');

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
app.use('/uploads', express.static('uploads'));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Allow images and documents
        if (file.mimetype.startsWith('image/') || 
            file.mimetype === 'application/pdf' ||
            file.mimetype === 'application/msword' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images, PDFs, and Word documents are allowed.'), false);
        }
    }
});
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Try to find in User model first
        let user = await User.findById(decoded.id).select('-password_hash');
        if (!user) {
            // If not found, check Franchisee model
            user = await Franchisee.findById(decoded.id).select('-password');
        }

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        req.role = decoded.role || 'franchisee';  // fallback if role isn't set
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};


const authorizeAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden: Admins only' });
    }
};

//1. register for franchise
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { full_name, email, franchise_name, location, phone_number, password } = req.body;
    if (!full_name || !email || !franchise_name || !location || !phone_number || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const nameExists = await Franchisee.findOne({ franchise_name });
    if (nameExists) {
      return res.status(400).json({ error: 'Franchise name already exists.' });
    }

    const emailExists = await Franchisee.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ error: 'Email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const franchisee = new Franchisee({
      full_name,
      email,
      franchise_name,
      location,
      phone_number,
      password: hashedPassword
    });

    await franchisee.save();

    // Send email to user
    const mailOptionsUser = {
      from: `"DipDips Franchise" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Registration Successful',
      text: `Hello ${full_name},\n\nYour franchise registration was successful. You can now log in.\n\nThank you!`
    };

    // Send mail to admin
    const mailOptionsAdmin = {
      from: `"DipDips Franchise" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: 'New Franchise Registration',
      text: `New franchise registration:\n\nName: ${full_name}\nEmail: ${email}\nFranchise: ${franchise_name}\nLocation: ${location}\nPhone: ${phone_number}`
    };

    // Send both emails asynchronously
    await Promise.all([
      transporter.sendMail(mailOptionsUser),
      transporter.sendMail(mailOptionsAdmin)
    ]);

    res.status(201).json({ message: 'Registration successful. You can now log in.' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});



// 2. Login for franchisee
app.post('/api/login', async (req, res) => {
  try {
    const { franchise_name, password } = req.body;
    if (!franchise_name || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const franchisee = await Franchisee.findOne({ franchise_name });
    if (!franchisee) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, franchisee.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // Since you removed status and approval, no need to check here

    const token = jwt.sign(
      { id: franchisee._id, role: 'franchisee' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Franchisee login successful.',
      token,
      franchisee: {
        id: franchisee._id,
        franchise_name: franchisee.franchise_name,
        location: franchisee.location,
        phone_number: franchisee.phone_number
      }
    });
  } catch (err) {
    console.error('Franchisee login error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});


// 3. Login for admin
app.post('/api/adminlogin', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      message: 'Admin login successful.',
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// 4. Get all franchisees (Admin only)
app.get('/api/all', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const franchisees = await Franchisee.find({}, '-password').sort({ createdAt: -1 });
    res.json(franchisees);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// 5. Approve a franchisee (Admin only)
app.post('/api/approve', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Franchisee ID required.' });

    const franchisee = await Franchisee.findByIdAndUpdate(id, { pending_approval: false }, { new: true });
    if (!franchisee) return res.status(404).json({ error: 'Franchisee not found.' });

    res.json({ message: 'Franchisee approved.', franchisee });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});
// approved franchise
app.get('/api/approved-franchises', async (req, res) => {
  try {
    const approvedFranchises = await Franchisee.find({ pending_approval: false });
    res.json(approvedFranchises);
  } catch (err) {
    console.error('Error fetching approved franchises:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 6. Disapprove/Delete a franchisee (Admin only)
app.post('/api/disapprove', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Franchisee ID required.' });

    const franchisee = await Franchisee.findByIdAndDelete(id);
    if (!franchisee) return res.status(404).json({ error: 'Franchisee not found.' });

    res.json({ message: 'Franchisee disapproved and deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

//franchise status
app.patch('/api/franchise/:id/status', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const franchisee = await Franchisee.findByIdAndUpdate(
  id,
  {
    status,
    pending_approval: status !== 'approved'
  },
  { new: true }
);

    if (!franchisee) return res.status(404).json({ error: 'Franchisee not found' });

    res.json({ message: `Franchisee ${status}`, franchisee });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


app.get('/api/franchise/:id', async (req, res) => {
  try {
    const franchise = await Franchisee.findById(req.params.id);
    if (!franchise) {
      return res.status(404).json({ error: 'Franchise not found' });
    }
    res.json(franchise);
  } catch (err) {
    console.error('Error fetching franchise:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/franchise-approvals', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const franchisees = await Franchisee.find({}, '-password').sort({ createdAt: -1 });
    res.json(franchisees);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

//Product API
app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const franchise_id = isAdmin ? (req.query.franchise_id || req.user._id) : req.user._id;
    const franchiseFilter = franchise_id ? { franchise_id } : {};

    const products = await Product.aggregate([
      { $match: franchiseFilter },
      {
        $lookup: {
          from: 'stocks',
          let: { productId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$product_id', '$$productId'] },
                ...franchiseFilter
              }
            }
          ],
          as: 'stockInfo'
        }
      },
      { $unwind: { path: '$stockInfo', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          quantity: { $ifNull: ['$stockInfo.quantity', 0] }
        }
      },
      { $project: { stockInfo: 0 } },
      { $sort: { name: 1 } }
    ]);

    res.json(products);
  } catch (err) {
    console.error('Product fetch error:', err.message);
    res.status(500).json({ error: 'Database error while fetching products' });
  }
});




app.post('/api/products', authenticateToken, async (req, res) => {
    const {
        name,
        category,
        brand,
        mrp,
        purchased_price,
        selling_price,
        hsn,
        gst_rate,
        unit,
        description,
        franchise_id: bodyFranchiseId
    } = req.body;

    try {
        const franchise_id = req.isAdmin ? bodyFranchiseId : req.user._id;

        if (!franchise_id) {
            return res.status(400).json({ error: 'Franchise ID is required' });
        }

        const existingProduct = await Product.findOne({ name, franchise_id });
        if (existingProduct) {
            return res.status(409).json({ error: 'Product already exists for this franchise' });
        }

        const newProduct = await Product.create({
            name,
            category,
            brand,
            mrp,
            purchased_price,
            selling_price,
            hsn,
            gst_rate,
            unit,
            description,
            franchise_id
        });

        res.status(201).json({ message: 'Product created successfully', product: newProduct });
    } catch (err) {
        console.error('Error creating product:', err.message);
        res.status(500).json({ error: 'Database error while creating product' });
    }
});

//stock API
app.get('/api/stock', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const franchise_id = isAdmin ? (req.query.franchise_id || null) : req.user._id;
    const filter = franchise_id ? { franchise_id } : {};

    const allProducts = await Product.find(filter);
    const stockEntries = await Stock.find(filter).populate('product_id', 'id name brand mrp purchased_price');

    const stockMap = new Map();
    stockEntries.forEach(s => {
      if (s.product_id) {
        stockMap.set(s.product_id._id.toString(), s);
      }
    });

    const flatStock = allProducts.map(product => {
      const stockEntry = stockMap.get(product._id.toString());
      return {
        stock_id: stockEntry ? stockEntry._id : null,
        product_id: product._id,
        name: product.name,
        brand: product.brand,
        mrp: product.mrp,
        purchased_price: product.purchased_price,
        quantity: stockEntry ? stockEntry.quantity : 0,
        min_quantity: stockEntry ? stockEntry.min_quantity : 10
      };
    });

    res.json(flatStock);
  } catch (err) {
    console.error('Stock fetch error:', err.message);
    res.status(500).json({ error: 'Database error while fetching stock' });
  }
});


app.post('/api/stock', authenticateToken, async (req, res) => {
    const {
        product_id,
        quantity,
        min_quantity,
        notes,
        vendor,
        invoice,
        date,
        brand,
        mrp,
        purchased_price
    } = req.body;

    try {
        const franchise_id = req.user._id;

        const stock = await Stock.findOneAndUpdate(
            { product_id: product_id, franchise_id },
            {
                $set: {
                    quantity,
                    min_quantity: min_quantity || 10
                }
            },
            { upsert: true, new: true }
        );

        await StockTransaction.create({
            product_id,
            transaction_type: 'stock_update',
            quantity,
            notes: notes || 'Stock updated via API',
            vendor,
            invoice,
            date,
            brand,
            mrp,
            purchased_price,
            franchise_id
        });

        res.json({ message: 'Stock updated successfully' });
    } catch (err) {
        console.error('Stock update error:', err.message);
        res.status(500).json({ error: 'Database error while updating stock' });
    }
});

// PATCH /api/stock/:id/add - increment stock quantity
app.delete('/api/stock/:id', authenticateToken, async (req, res) => {
    try {
        const productId = req.params.id;
        const franchiseFilter = req.user.role === 'admin'
            ? { _id: productId }
            : { _id: productId, franchise_id: req.user._id };

        // Delete product only if it belongs to this franchise (or admin)
        const deletedProduct = await Product.findOneAndDelete(franchiseFilter);
        if (!deletedProduct) {
            return res.status(404).json({ error: 'Product not found or not authorized to delete' });
        }

        // Delete related stock
        await Stock.deleteOne({ product_id: productId, franchise_id: req.user._id });

        // Delete stock transactions
        await StockTransaction.deleteMany({ product_id: productId, franchise_id: req.user._id });

        res.json({ message: 'Stock item deleted successfully' });
    } catch (err) {
        console.error('Stock deletion error:', err.message);
        res.status(500).json({ error: 'Database error while deleting stock item' });
    }
});


app.patch('/api/stock/:id/add', authenticateToken, async (req, res) => {
    const stockId = req.params.id;
    const addQty = Number(req.body.add_quantity);

    if (isNaN(addQty)) {
        return res.status(400).json({ error: 'add_quantity must be a number' });
    }

    try {
        const franchiseFilter = req.user.role === 'admin'
            ? { _id: stockId }
            : { _id: stockId, franchise_id: req.user._id };

        const stock = await Stock.findOneAndUpdate(
            franchiseFilter,
            { $inc: { quantity: addQty } },
            { new: true }
        );

        if (!stock) {
            return res.status(404).json({ error: 'Stock item not found or access denied' });
        }

        await StockTransaction.create({
            product_id: stock.product_id,
            transaction_type: 'stock_add',
            quantity: addQty,
            notes: 'Stock incremented via API',
            franchise_id: req.user._id
        });

        res.json({ message: 'Stock quantity incremented', stock });
    } catch (err) {
        console.error('Stock increment error:', err.message);
        res.status(500).json({ error: 'Database error while incrementing stock' });
    }
});

// Customers API
app.get('/api/customers', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const franchise_id = isAdmin ? (req.query.franchise_id || null) : req.user._id;
    const matchStage = franchise_id ? { franchise_id } : {};

    const customers = await Customer.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'bills',
          localField: '_id',
          foreignField: 'customer_id',
          as: 'bills'
        }
      },
      {
        $addFields: {
          totalBills: { $size: '$bills' },
          totalValue: { $sum: '$bills.total_amount' },
          lastPurchaseDate: { $max: '$bills.date' }
        }
      },
      {
        $project: {
          name: 1,
          phone: 1,
          totalBills: 1,
          totalValue: 1,
          lastPurchaseDate: 1
        }
      }
    ]);

    res.json(customers);
  } catch (err) {
    console.error('Error fetching customers:', err.message);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});



app.post('/api/customers', authenticateToken, async (req, res) => {
    const { phone, name, email, address } = req.body;

    try {
        const franchise_id = req.user._id;

        const customer = await Customer.findOneAndUpdate(
            { phone, franchise_id },
            {
                $set: {
                    name,
                    email,
                    address,
                    franchise_id
                }
            },
            { new: true, upsert: true }
        );

        res.json({ id: customer._id, message: 'Customer saved successfully' });
    } catch (err) {
        console.error('Customer save error:', err.message);
        res.status(500).json({ error: 'Database error while saving customer' });
    }
});

// Bills API
app.get('/api/bills', authenticateToken, async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 0;

  try {
    const isAdmin = req.user.role === 'admin';
    const franchise_id = isAdmin ? (req.query.franchise_id || null) : req.user._id;
    const filter = franchise_id ? { franchise_id } : {};

    let query = Bill.find(filter)
      .populate('customer_id', 'name phone')
      .sort({ bill_date: -1 });

    if (limit > 0) {
      query = query.limit(limit);
    }

    const bills = await query;
    res.json(bills);
  } catch (err) {
    console.error('Bill fetch error:', err.message);
    res.status(500).json({ error: 'Database error while fetching bills' });
  }
});


app.get('/api/bills/:id', authenticateToken, async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id);

        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        // Restrict access if user is not admin and doesn't own the bill
        if (req.user.role !== 'admin' && bill.franchise_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const items = await BillItem.find({ bill_id: bill._id });
        res.json({ ...bill.toObject(), items });
    } catch (err) {
        console.error('Bill fetch by ID error:', err.message);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/bills', authenticateToken, async (req, res) => {
    const { customer_phone, customer_name, items, total_items, notes, service_charges, discount } = req.body;

    const itemsTotal = items.reduce((sum, item) => sum + (item.price || item.total), 0);
    const serviceCharge = service_charges || 0;
    const Discount = discount || 0;
    const totalAmount = itemsTotal + serviceCharge - Discount;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const franchise_id = req.user._id;

        let customer;
        if (customer_phone && customer_name) {
            customer = await Customer.findOneAndUpdate(
                { phone: customer_phone, franchise_id },
                {
                    $set: {
                        name: customer_name,
                        email: req.body.customer_email || '',
                        address: req.body.customer_address || '',
                        franchise_id
                    }
                },
                { new: true, upsert: true, session }
            );
        }

        // Generate bill number
        const now = moment();
        const year = now.month() < 3 ? now.year() - 1 : now.year();
        const nextYear = (year + 1).toString().slice(-2);
        const finYear = `${year}-${nextYear}`;
        const month = now.format('MM');
        const franchiseeCode = req.user.username?.toUpperCase()?.slice(0, 3) || 'FRN';

        const count = await Bill.countDocuments({
            bill_number: new RegExp(`^${franchiseeCode}/${finYear}/${month}-`),
            franchise_id
        }, { session });

        const invoiceNum = (count + 1).toString().padStart(4, '0');
        const bill_number = `${franchiseeCode}/${finYear}/${month}-${invoiceNum}`;

        const billData = {
            bill_number,
            customer_id: customer ? customer._id : null,
            customer_phone,
            customer_name,
            total_amount: totalAmount,
            total_items,
            notes,
            bill_date: now.toDate(),
            service_charges: serviceCharge,
            franchise_id
        };

        const [createdBill] = await Bill.create([billData], { session });

        for (const item of items) {
            const productId = item.id || item.product_id;

            // Verify franchise access to product & stock
            const stock = await Stock.findOne({ product_id: productId, franchise_id }).session(session);
            if (!stock || stock.quantity < item.quantity) {
                throw new Error(`Not enough stock for ${item.name}. Available: ${stock ? stock.quantity : 0}`);
            }

            await BillItem.create([{
                bill_id: createdBill._id,
                product_id: productId,
                product_name: item.name,
                quantity: item.quantity,
                mrp: item.mrp,
                discount: item.discount || 0,
                service_charges: serviceCharge,
                total: item.total,
                franchise_id
            }], { session });

            await Stock.updateOne(
                { product_id: productId, franchise_id },
                { $inc: { quantity: -item.quantity } },
                { session }
            );

            await StockTransaction.create([{
                product_id: productId,
                transaction_type: 'sale',
                quantity: -item.quantity,
                reference_id: createdBill._id,
                reference_type: 'Bill',
                notes: `Sale via Bill #${bill_number}`,
                franchise_id
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

app.get('/api/bills/:id/pdf', authenticateToken, async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id);

        if (!bill) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        // Access control: franchise or admin
        if (req.user.role !== 'admin' && bill.franchise_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const items = await BillItem.find({ bill_id: bill._id });

        const doc = new PDFDocument({ margin: 50 });
        const filename = `bill-${bill.bill_number.replace(/\//g, '-')}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);

        // PDF content
        doc.fontSize(20).text('INVOICE', { align: 'center' });
        doc.fontSize(14).text(`Franchisee: ${req.user.username}`, { align: 'center' });
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
        doc.text('Total', 420, tableTop, { align: 'right' });
        doc.font('Helvetica');
        doc.moveDown();

        items.forEach(item => {
            const y = doc.y;
            doc.text(item.product_name, 50, y, { width: 180 });
            doc.text(item.quantity.toString(), 250, y, { width: 40, align: 'center' });
            doc.text(`₹${item.mrp.toFixed(2)}`, 300, y, { width: 60, align: 'right' });
            doc.text(`₹${item.total.toFixed(2)}`, 420, y, { align: 'right' });
            doc.moveDown();
        });

        doc.moveDown();
        doc.fontSize(12).text(`Total Amount: ₹${bill.total_amount.toFixed(2)}`, { align: 'right' });

        if (bill.notes) {
            doc.moveDown();
            doc.fontSize(10).text(`Notes: ${bill.notes}`);
        }

        doc.end();

    } catch (err) {
        console.error('PDF generation error:', err.message);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

app.get('/api/reports/sales', authenticateToken, async (req, res) => {
    const { start_date, end_date } = req.query;

    try {
        const matchStage = { status: 'completed' };

        if (start_date && end_date) {
            matchStage.bill_date = {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
            };
        }

        // Add franchise filter for non-admins
        if (req.user.role !== 'admin') {
            matchStage.franchise_id = req.user._id;
        }

        const sales = await Bill.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$bill_date" }
                    },
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
    } catch (err) {
        console.error('❌ Sales report error:', err.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// Search API
app.get('/api/reports/sales', authenticateToken, async (req, res) => {
    try {
        const franchise_id = req.user.role === 'admin' ? req.query.franchise_id : req.user._id;

        if (!franchise_id) {
            return res.status(400).json({ error: 'Franchise ID is required' });
        }

        // Fetch products for pending stock value
        const products = await Product.find({ franchise_id });

        let pendingStockValue = 0;
        let totalStockQty = 0;

        products.forEach(p => {
            const qty = p.stock_quantity || 0;
            const cost = p.purchased_price || 0;
            pendingStockValue += qty * cost;
            totalStockQty += qty;
        });

        // Fetch all bills
        const bills = await Bill.find({ franchise_id });

        const totalSalesTillDate = bills.reduce((sum, bill) => {
            return sum + (bill.total_amount || 0);
        }, 0);

        // Sales in current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const billsThisMonth = bills.filter(b => new Date(b.date) >= startOfMonth);
        const totalSalesThisMonth = billsThisMonth.reduce((sum, b) => sum + (b.total_amount || 0), 0);

        res.json({
            pendingStockValue,
            totalStockQty,
            totalSalesTillDate,
            totalSalesThisMonth
        });

    } catch (err) {
        console.error('Error generating sales report:', err.message);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// Vendor Profile API
app.post('/api/vendor-profile', authenticateToken, upload.fields([
    { name: 'profilePic', maxCount: 1 },
    { name: 'aadharPhoto', maxCount: 1 },
    { name: 'documents', maxCount: 10 }
]), async (req, res) => {
    try {
        const {
            fullName,
            phoneNumber,
            permanentAddress,
            temporaryAddress,
            emailAddress,
            dateOfBirth,
            aadharNumber,
            gender,
            qualification,
            yearOfPassing,
            institution,
            workPeriod,
            organization,
            designation,
            responsibilities,
            criminalOffense,
            followRules,
            stallAddress,
            existingStall,
            signatureData
        } = req.body;

        // Validate required fields
        if (!fullName || !phoneNumber || !permanentAddress || !emailAddress || 
            !dateOfBirth || !aadharNumber || !gender || !stallAddress || 
            !existingStall || !criminalOffense || !followRules || !signatureData) {
            return res.status(400).json({ error: 'All required fields must be filled' });
        }

        // Validate Aadhar number format
        if (!/^\d{12}$/.test(aadharNumber)) {
            return res.status(400).json({ error: 'Aadhar number must be 12 digits' });
        }

        // Handle uploaded files
        const documents = {};
        if (req.files) {
            if (req.files.profilePic) {
                documents.profile_picture = req.files.profilePic[0].filename;
            }
            if (req.files.aadharPhoto) {
                documents.aadhar_photo = req.files.aadharPhoto[0].filename;
            }
            if (req.files.documents) {
                documents.additional_documents = req.files.documents.map(file => file.filename);
            }
        }

        // Create vendor profile object
        const vendorProfile = {
            franchise_id: req.user._id,
            personal_info: {
                full_name: fullName,
                phone_number: phoneNumber,
                permanent_address: permanentAddress,
                temporary_address: temporaryAddress || '',
                email_address: emailAddress,
                date_of_birth: new Date(dateOfBirth),
                aadhar_number: aadharNumber,
                gender: gender
            },
            education: qualification ? qualification.map((qual, index) => ({
                qualification: qual,
                year_of_passing: yearOfPassing[index],
                institution: institution[index]
            })) : [],
            work_experience: workPeriod ? workPeriod.map((period, index) => ({
                period: period,
                organization: organization[index],
                designation: designation[index],
                responsibilities: responsibilities[index]
            })) : [],
            franchise_info: {
                stall_address: stallAddress,
                existing_stall: existingStall
            },
            declarations: {
                criminal_offense: criminalOffense,
                follow_rules: followRules
            },
            documents: documents,
            signature_data: signatureData,
            status: 'pending',
            submitted_at: new Date()
        };

        // Save to database using the VendorProfile model
        const profile = new VendorProfile(vendorProfile);
        await profile.save();

        res.json({ 
            message: 'Vendor profile submitted successfully',
            profile_id: profile._id 
        });

    } catch (err) {
        console.error('Error submitting vendor profile:', err.message);
        res.status(500).json({ error: 'Failed to submit vendor profile' });
    }
});

// Error handling for file uploads
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Too many files uploaded.' });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ error: 'Unexpected file field.' });
        }
    }
    if (error.message.includes('Invalid file type')) {
        return res.status(400).json({ error: error.message });
    }
    next(error);
});

// Health check
app.get('/api/search/products', authenticateToken, async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);

    try {
        const query = {
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { brand: { $regex: q, $options: 'i' } }
            ]
        };

        if (req.user.role !== 'admin') {
            query.franchise_id = req.user._id;
        }

        const products = await Product.find(query).limit(10);
        res.json(products);
    } catch (err) {
        console.error('Product search error:', err.message);
        res.status(500).json({ error: 'Database error' });
    }
});


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