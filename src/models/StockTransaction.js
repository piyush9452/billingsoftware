const mongoose = require('mongoose');

const stockTransactionSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    transaction_type: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    reference_id: mongoose.Schema.Types.ObjectId,
    reference_type: String,
    notes: String,
    vendor: String,
    invoice: String,
    date: Date,
    brand: String,
    mrp: Number,
    purchased_price: Number,

    franchise_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: { 
        createdAt: 'created_at', 
        updatedAt: 'updated_at' 
    }
});

module.exports = mongoose.model('StockTransaction', stockTransactionSchema);
