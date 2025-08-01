const mongoose = require('mongoose');

const franchiseeSchema = new mongoose.Schema({
    franchise_name: {
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
    },
    pending_approval: {
        type: Boolean,
        default: true
    },
    status: {
  type: String,
  enum: ['pending', 'approved', 'rejected'],
  default: 'pending'
}

}, {
    timestamps: true
});

module.exports = mongoose.model('Franchisee', franchiseeSchema); 