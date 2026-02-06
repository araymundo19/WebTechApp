const mongoose = require('mongoose');

// SCHEMA FOR DESTINATIONS

const destinationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    region: { type: String, required: true }, // PH or Asia
    description: String,
    image: String, // Path to image like "/images/cebu.jpg"
    featured: Boolean
});

module.exports = mongoose.model('Destination', destinationSchema);

// ^^ ABOVE CODE FOR MONGOOSE MODEL, NOT USED IN APP.JS YET. THIS IS FOR FUTURE USE WHEN WE ADD DB FUNCTIONALITY TO OUR APP. ^^