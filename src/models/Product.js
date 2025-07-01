const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    brand: String,
    mrp: {
        type: Number,
        required: true
    },
    purchased_price: Number,
    description: String,
    category: String
}, {
    timestamps: { 
        createdAt: 'created_at', 
        updatedAt: 'updated_at' 
    }
});

module.exports = mongoose.model('Product', productSchema); 