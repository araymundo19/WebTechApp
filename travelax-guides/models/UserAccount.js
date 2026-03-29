const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const UserAccountSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: false, // CHANGE TO FALSE so seed accounts can work!!!
        unique: true,
        sparse: true // Allows multiple users to have 'null' googleId
    },
    displayName: String,
    email: {
        type: String,
        required: true,
        unique: true
    },
    avatar: String, 
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user' 
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// THIS ADDS THE .register() FUNCTION AND PASSWORD LOGIC; THIS IS FOR SEEDER TO WORK!!!
UserAccountSchema.plugin(passportLocalMongoose.default || passportLocalMongoose);

module.exports = mongoose.model('UserAccount', UserAccountSchema);