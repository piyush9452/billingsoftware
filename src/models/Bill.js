const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    bill_number: {
        type: String,
        required: true,
        unique: true
    },
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    customer_phone: String,
    customer_name: String,
    total_amount: {
        type: Number,
        required: true
    },
    total_items: {
        type: Number,
        required: true
    },
    bill_date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        default: 'completed'
    },
    notes: String,

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

module.exports = mongoose.model('Bill', billSchema);
