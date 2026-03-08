require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);

const express = require('express');
const mongoose = require('mongoose');
const Destination = require('./models/destination');
const app = express();
const axios = require('axios');

// MONGOOSE CONNECTION
const dbURI = "mongodb+srv://webweb:web123@webtechapp.za86sr6.mongodb.net/travelDB?retryWrites=true&w=majority";

mongoose.connect(dbURI)
  .then(() => console.log('✅ CONNECTED TO ATLAS!'))
  .catch(err => console.log('❌ CONNECTION ERROR:', err.message));

// MIDDLEWARE
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true })); // ADD THIS: Important for form submissions later!

// ROUTES

// Home Logic: Fetch all destinations and render the homepage
app.get('/', async (req, res) => {
    try {
        const places = await Destination.find({
            $or: [
                { type: 'guide' },
                { visibility: 'public' },
                { type: { $exists: false } } // This brings back your old/seeded data!
            ]
        });

        console.log("Documents found in Atlas:", places.length); 
        res.render('index', { places, title: 'Travelax | Travel and Relax Guides' });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading travel board.");
    }
});

app.get('/about', (req, res) => {
    res.render('about');
});

app.get('/destinations', (req, res) => {
    res.render('destinations');
});

// Route to show the "Add Destination" page
app.get('/add', (req, res) => {
    res.render('add', { title: 'Add New Destination' });
});

// Private Itinerary Page (only shows private itineraries)
app.get('/my-plans', async (req, res) => {
    try {
        const privatePlans = await Destination.find({ visibility: 'private' });
        res.render('my-plans', { places: privatePlans, title: 'My Private Itineraries' });
    } catch (err) {
        res.redirect('/');
    }
});

// READ ONE (The Detail View) W API INTEGRATION
app.get('/destinations/:id', async (req, res) => {
    try {
        const place = await Destination.findById(req.params.id);
        
        // API KEY - You need to replace this with your actual API key from OpenWeatherMap. You can get a free key by signing up on their website. For security, consider using environment variables in a real application.
        const apiKey = '9fb88fa6557e67770fcdae172f45d3b6'; 
        
        // LOGIC FOR COUNTRY VS CITY SEARCH: We try to search weather by the first country listed, but if there are no countries or it's empty, we fall back to searching by the destination name. This isn't perfect but gives us a better chance of getting a valid weather result.
        const searchLocation = (place.countries && place.countries.length > 0) 
                               ? place.countries[0] 
                               : place.name;

        let weather = null;

        try {
            // API LIVE DATA
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${searchLocation}&units=metric&appid=${apiKey}`;
            const response = await axios.get(weatherUrl);
            weather = response.data;
        } catch (apiErr) {
            console.log("Weather API Note: Location not found or key pending activation.");
            weather = { error: true }; // This triggers our "unavailable" UI
        }

        res.render('detail', { 
            place, 
            weather, 
            title: `${place.name} | Smart Travel 
        });
    } catch (err) {
        console.error(err);
        res.status(404).send("Destination not found.");
    }
});


// Route to handle the Form Submission (POST)
app.post('/destinations', async (req, res) => {
    try {
        const { name, region, countries, description, image, type, visibility, budget } = req.body;

        // Convert the string "Philippines, Vietnam" into an Array ["Philippines", "Vietnam"]
        const countryArray = countries ? countries.split(',').map(c => c.trim()) : [];

        const newEntry = new Destination({
            name,
            region,
            countries: countryArray,
            description,
            // If image is empty, we DON'T save an empty string so the default /images/placeholder.png kicks in
            image: image.trim() === "" ? undefined : image, 
            type,
            visibility,
            budget: budget || 0
        });

        await newEntry.save();
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error saving data.");
    }
});


// SHOW EDIT FORM
app.get('/destinations/edit/:id', async (req, res) => {
    try {
        const place = await Destination.findById(req.params.id);
        res.render('edit', { place, title: 'Edit Destination' });
    } catch (err) {
        res.status(500).send("Error finding destination.");
    }
});

// EDIT UPDATE LOGIC (Handling the Form Submission for the Edit Form)
app.post('/destinations/update/:id', async (req, res) => {
    try {
        const { name, region, countries, description, image, budget } = req.body;

        // Turn comma string back into an array
        const countryArray = countries ? countries.split(',').map(c => c.trim()) : [];

        await Destination.findByIdAndUpdate(req.params.id, {
            name,
            region,
            countries: countryArray,
            description,
            image: image || undefined,
            budget: budget || 0
        });

        res.redirect(`/destinations/${req.params.id}`); // Redirect back to detail page
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating destination.");
    }
});


// DELETE LOGIC
app.post('/destinations/delete/:id', async (req, res) => {
    try {
        await Destination.findByIdAndDelete(req.params.id);
        res.redirect('/');
    } catch (err) {
        res.status(500).send("Error deleting");
    }
});


/** SEED DATABASE
 * This is just a one-time function to add some sample data to the database if it's empty.
 * You can comment this out after the first run to avoid duplicate entries.
 
const seedDB = async () => {
    const count = await Destination.countDocuments();
    if (count === 0) {
        const seedData = [
            { name: "El Nido", region: "Philippines", description: "Crystal clear lagoons and limestone cliffs.", image: "elnido.jpg" },
            { name: "Siargao", region: "Philippines", description: "The surfing capital of the Philippines.", image: "siargao.jpg" },
            { name: "Kyoto", region: "Asia", description: "Traditional temples and beautiful cherry blossoms.", image: "kyoto.jpg" },
            { name: "Bali", region: "Asia", description: "Tropical paradise with lush jungles and beaches.", image: "bali.jpg" }
        ];
        await Destination.insertMany(seedData);
        console.log("Database Seeded!");
    }
};
seedDB();

*/

// START SERVER
app.listen(3000, () => {
    console.log("Server is running! Go to http://localhost:3000");
});