require('dotenv').config();
require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);


const express = require('express');
const mongoose = require('mongoose');
const { ObjectId } = require('mongoose').Types;
const axios = require('axios');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

// Cloudinary constants
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Models
const Destination = require('./models/destination');
const UserAccount = require('./models/UserAccount');

// App Initialization
const app = express();

// helmet.js configuration (optional, but recommended for better security)
app.use(helmet({
    contentSecurityPolicy: false, // We set this to false so your external image URLs still work for now
}));

// Cloudinary Configuration and Engine Setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'travelax_uploads', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg'], // formats allowed
    transformation: [{ width: 1000, crop: 'limit' }] // Auto-resize for performance
  },
});

const upload = multer({ storage: storage });

// DATABASE CONNECTION
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ CONNECTED TO ATLAS!'))
    .catch(err => console.log('❌ CONNECTION ERROR:', err.message));

// APP CONFIGURATION & MIDDLEWARE
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'travelax_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
}));

// Passport Init
app.use(passport.initialize());
app.use(passport.session());

passport.use(UserAccount.createStrategy());

// Passport Logic
passport.serializeUser(UserAccount.serializeUser());
passport.deserializeUser(UserAccount.deserializeUser());


// Login Using Seeded Accounts (Local Strategy)
app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/',
    failureFlash: false 
}));



// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await UserAccount.findOne({ googleId: profile.id });
        if (!user) {
            user = await UserAccount.create({
                googleId: profile.id,
                username: profile.emails[0].value,
                displayName: profile.displayName,
                email: profile.emails[0].value,
                avatar: profile.photos[0].value
            });
        }
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

// Global Variable Middleware (Must be after Passport session)
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});

// CUSTOM MIDDLEWARE GUARDS
// GUARD: 1 (Login Required)
const isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/google');
};

// GUARD 2: Check Ownership or Admin Status
const canEditOrDelete = async (req, res, next) => {
    try {
        const place = await Destination.findById(req.params.id);
        if (!place) return res.status(404).send("Destination not found.");

        const isOwner = place.author && place.author.id.equals(req.user._id);
        const isAdmin = req.user.role === 'admin';

        // LOGIC: Admins can edit anything EXCEPT other's itineraries
        // Users can only edit their own stuff.
        if (isOwner) return next();
        
        if (isAdmin && place.type === 'guide') return next();

        // Special Rule: Admins can DELETE but NOT EDIT public itineraries
        if (isAdmin && place.type === 'itinerary' && req.method === 'POST' && req.path.includes('delete')) {
            return next();
        }

        res.status(403).send("Security: You do not have permission to modify this.");
    } catch (err) {
        res.status(500).send("Server Error");
    }
};

// GUARD 3: Privacy Shield (For the Detail Page)
const canView = async (req, res, next) => {
    try {
        const place = await Destination.findById(req.params.id);
        if (!place) return res.status(404).send("Not found");

        if (place.visibility === 'public') return next();

        // If Private, only the owner can see it
        if (req.isAuthenticated() && place.author.id.equals(req.user._id)) {
            return next();
        }

        res.status(403).send("This itinerary is private.");
    } catch (err) {
        res.status(500).send("Error");
    }
};

// AUTH ROUTES 
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => res.redirect('/')
);

app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

// PUBLIC ROUTES
//Home Page - Shows all public guides and itineraries, plus my private stuff if I'm logged in
app.get('/', async (req, res) => {
    try {
        let conditions = [
                { visibility: 'public' },
                { type: 'guide' }
            ];

            if (req.user) {
            conditions.push({ 'author.id': new mongoose.Types.ObjectId(req.user._id)
            });
        }

        const places = await Destination.find({ $or: conditions });

        res.render('index', { places, title: 'Travelax | Home' });
    } catch (err) {
        console.error("Home Route Error:", err);
        res.status(500).send("Error loading travel board.");
    }
});


// Detail Page - Shows weather data and respects privacy settings
app.get('/destinations/:id', canView, async (req, res) => {
    try {
        const place = await Destination.findById(req.params.id);
        const apiKey = process.env.OPENWEATHER_API_KEY; 
        const searchLocation = (place.countries && place.countries.length > 0) ? place.countries[0] : place.name;

        let weather = null;
        try {
            const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${searchLocation}&units=metric&appid=${apiKey}`);
            weather = response.data;
        } catch (apiErr) {
            weather = { error: true };
        }
        res.render('detail', { place, weather, title: `${place.name} | Travelax Guide` });
    } catch (err) {
        res.status(404).send("Destination not found.");
    }
});

// PROTECTED USER ROUTES (Login Required)

// Show Add Form
app.get('/add', isLoggedIn, (req, res) => {
    res.render('add', { title: 'Add New Destination' });
});

// Private Itinerary Page
app.get('/my-plans', isLoggedIn, async (req, res) => {
    try {
        const privatePlans = await Destination.find({ 
            visibility: 'private',
            'author.id': req.user._id 
        });
        res.render('my-plans', { places: privatePlans, title: 'My Private Itineraries' });
    } catch (err) {
        res.redirect('/');
    }
});

// Handle Add Submission
app.post('/destinations', isLoggedIn, upload.single('imageFile'), async (req, res, next) => {
    try {
        const { name, region, countries, description, image, type, visibility, budget } = req.body;
        const countryArray = countries ? countries.split(',').map(c => c.trim()) : [];
        const imageUrl = req.file ? req.file.path : "/images/placeholder.png";
        const newEntry = new Destination({
            name,
            region,
            description,
            type,
            visibility,
            countries: countryArray,
            budget: budget || 0,
            image: req.file ? req.file.path : "/images/placeholder.png",
            // Author Tracker
            author: {
                id: new mongoose.Types.ObjectId(req.user._id),
                username: req.user.displayName
            }
        });
        await newEntry.save();
        res.redirect('/');
    } catch (err) {
        next(err);
    }
});

// ADMIN ROUTES (Admin Role Required)

app.get('/destinations/edit/:id', isLoggedIn, canEditOrDelete, async (req, res) => {
    try {
        const place = await Destination.findById(req.params.id);
        res.render('edit', { place, title: 'Edit Destination' });
    } catch (err) {
        res.status(500).send("Error finding destination.");
    }
});

app.post('/destinations/update/:id', isLoggedIn, canEditOrDelete, upload.single('imageFile'), async (req, res, next) => {
    try {
        const { name, region, countries, description, budget } = req.body;
        const countryArray = countries ? countries.split(',').map(c => c.trim()) : [];

        const updateData = {
            name,
            region,
            description,
            budget: budget || 0,
            countries: countryArray
        };

        if (req.file) {
            updateData.image = req.file.path; // Update to new Cloudinary URL
        }

        await Destination.findByIdAndUpdate(req.params.id, updateData);
        
        res.redirect(`/destinations/${req.params.id}`);
    } catch (err) {
        next(err); 
    }
});

app.post('/destinations/delete/:id', isLoggedIn, canEditOrDelete, async (req, res) => {
    try {
        await Destination.findByIdAndDelete(req.params.id);
        res.redirect('/');
    } catch (err) {
        res.status(500).send("Error deleting");
    }
});

// Error Handling Middleware (Catch-all)
app.use((err, req, res, next) => {
    console.error("❌ SERVER ERROR:", err.stack);
    const status = err.status || 500;
    res.status(status).send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1>🌍 Travelax Error</h1>
            <p>Something went wrong: ${err.message || "Internal Server Error"}</p>
            <a href="/">Go Back Home</a>
        </div>
    `);
});

// START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));