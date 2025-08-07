const mongoose = require('mongoose');

const vendorProfileSchema = new mongoose.Schema({
    franchise_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Franchisee',
        required: true
    },
    personal_info: {
        full_name: {
            type: String,
            required: true,
            trim: true
        },
        phone_number: {
            type: String,
            required: true,
            trim: true
        },
        permanent_address: {
            type: String,
            required: true,
            trim: true
        },
        temporary_address: {
            type: String,
            trim: true,
            default: ''
        },
        email_address: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        date_of_birth: {
            type: Date,
            required: true
        },
        aadhar_number: {
            type: String,
            required: true,
            trim: true,
            validate: {
                validator: function(v) {
                    return /^\d{12}$/.test(v);
                },
                message: 'Aadhar number must be exactly 12 digits'
            }
        },
        gender: {
            type: String,
            required: true,
            enum: ['male', 'female']
        }
    },
    education: [{
        qualification: {
            type: String,
            required: true,
            trim: true
        },
        year_of_passing: {
            type: Number,
            required: true,
            min: 1900,
            max: 2030
        },
        institution: {
            type: String,
            required: true,
            trim: true
        }
    }],
    work_experience: [{
        period: {
            type: String,
            trim: true
        },
        organization: {
            type: String,
            trim: true
        },
        designation: {
            type: String,
            trim: true
        },
        responsibilities: {
            type: String,
            trim: true
        }
    }],
    franchise_info: {
        stall_address: {
            type: String,
            required: true,
            trim: true
        },
        existing_stall: {
            type: String,
            required: true,
            enum: ['yes', 'no']
        }
    },
    declarations: {
        criminal_offense: {
            type: String,
            required: true,
            enum: ['yes', 'no']
        },
        follow_rules: {
            type: String,
            required: true,
            enum: ['yes', 'no']
        }
    },
    documents: {
        profile_picture: {
            type: String,
            trim: true
        },
        aadhar_photo: {
            type: String,
            trim: true
        },
        additional_documents: [{
            type: String,
            trim: true
        }]
    },
    signature_data: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    admin_notes: {
        type: String,
        trim: true
    },
    reviewed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewed_at: {
        type: Date
    }
}, {
    timestamps: {
        createdAt: 'submitted_at',
        updatedAt: 'updated_at'
    }
});

// Index for better query performance
vendorProfileSchema.index({ franchise_id: 1, status: 1 });
vendorProfileSchema.index({ 'personal_info.aadhar_number': 1 });
vendorProfileSchema.index({ status: 1, submitted_at: -1 });

// Virtual for age calculation
vendorProfileSchema.virtual('personal_info.age').get(function() {
    if (!this.personal_info.date_of_birth) return null;
    const today = new Date();
    const birthDate = new Date(this.personal_info.date_of_birth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
});

// Method to check if profile is complete
vendorProfileSchema.methods.isComplete = function() {
    return this.personal_info.full_name &&
           this.personal_info.phone_number &&
           this.personal_info.permanent_address &&
           this.personal_info.email_address &&
           this.personal_info.date_of_birth &&
           this.personal_info.aadhar_number &&
           this.personal_info.gender &&
           this.franchise_info.stall_address &&
           this.franchise_info.existing_stall &&
           this.declarations.criminal_offense &&
           this.declarations.follow_rules &&
           this.signature_data;
};

// Static method to get pending applications
vendorProfileSchema.statics.getPendingApplications = function() {
    return this.find({ status: 'pending' })
               .populate('franchise_id', 'name email phone')
               .sort({ submitted_at: -1 });
};

// Static method to get applications by status
vendorProfileSchema.statics.getApplicationsByStatus = function(status) {
    return this.find({ status })
               .populate('franchise_id', 'name email phone')
               .populate('reviewed_by', 'username')
               .sort({ submitted_at: -1 });
};

module.exports = mongoose.model('VendorProfile', vendorProfileSchema); 