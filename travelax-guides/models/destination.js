const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    region: { 
        type: String, 
        enum: ['South East Asia', 'Middle-East', 'East Asia', 'South America', 'North America', 'Europe', 'Africa', 'Oceania'],
        required: true },

    countries: [String],    
    description: String,
    image: { type: String, default: "/images/placeholder.png" },
    
    // UPDATED SCEHMA FIELDS
    type: { 
        type: String, 
        enum: ['guide', 'itinerary'], 
        default: 'itinerary' 
    },
    authorRole: { 
        type: String, 
        enum: ['admin', 'user'], 
        default: 'user' 
    },
    visibility: { 
        type: String, 
        enum: ['public', 'private'], 
        default: 'public' 
    },
    
    budget: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Destination', destinationSchema);