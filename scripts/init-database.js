const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'billing.db');

// Delete old DB for a clean start
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Create Tables
    db.run(`CREATE TABLE customers (id INTEGER PRIMARY KEY, phone TEXT UNIQUE, name TEXT, email TEXT, address TEXT)`);
    db.run(`CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, brand TEXT, mrp REAL, purchased_price REAL)`);
    db.run(`CREATE TABLE stock (id INTEGER PRIMARY KEY, product_id INTEGER, quantity INTEGER, FOREIGN KEY(product_id) REFERENCES products(id))`);
    db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password_hash TEXT, role TEXT)`);
    db.run(`CREATE TABLE bills (id INTEGER PRIMARY KEY, bill_number TEXT, customer_id INTEGER, total_amount REAL, bill_date TEXT)`);
    db.run(`CREATE TABLE bill_items (id INTEGER PRIMARY KEY, bill_id INTEGER, product_name TEXT, quantity INTEGER, mrp REAL, total REAL, FOREIGN KEY(bill_id) REFERENCES bills(id))`);

    // Insert Admin User
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`, ['admin', passwordHash, 'admin']);

    // Insert Sample Customers
    db.run(`INSERT INTO customers (phone, name) VALUES ('1234567890', 'John Doe')`);
    db.run(`INSERT INTO customers (phone, name) VALUES ('0987654321', 'Jane Smith')`);

    // Insert Sample Products and Stock
    const products = [
        { name: 'MTR Poha', brand: 'MTR', mrp: 30.00, purchased_price: 25.00, quantity: 50 },
        { name: 'Mom Poha with bhujiya', brand: 'MOM', mrp: 65.00, purchased_price: 55.00, quantity: 30 }
    ];

    const productStmt = db.prepare(`INSERT INTO products (name, brand, mrp, purchased_price) VALUES (?, ?, ?, ?)`);
    const stockStmt = db.prepare(`INSERT INTO stock (product_id, quantity) VALUES (?, ?)`);

    for (const p of products) {
        productStmt.run(p.name, p.brand, p.mrp, p.purchased_price, function(err) {
            if (!err) {
                stockStmt.run(this.lastID, p.quantity);
            }
        });
    }

    productStmt.finalize();
    stockStmt.finalize();
});

db.close(); 