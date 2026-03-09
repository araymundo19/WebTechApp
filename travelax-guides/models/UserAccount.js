const mongoose = require('mongoose');

const UserAccountSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true
    },
    displayName: String,
    email: {
        type: String,
        required: true,
        unique: true
    },
    avatar: String, // Store their Google profile picture
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user' // Default role for all new signups
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('UserAccount', UserAccountSchema);