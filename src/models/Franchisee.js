const mongoose = require('mongoose');

const franchiseeSchema = new mongoose.Schema({
    franchise_name: {
        type: String,
        required: true,
        unique: true
    },
    full_name: {                     // Added full_name
        type: String,
        required: true
    },
    email: {                         // Added email
        type: String,
        required: true,
        unique: true
    },
    location: {
        type: String,
        required: true
    },
    phone_number: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Franchisee', franchiseeSchema);
