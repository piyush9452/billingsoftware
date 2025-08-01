const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: String,
    address: String,

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

// Optional: create a compound index to allow same phone in different franchises
customerSchema.index({ phone: 1, franchise_id: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);
