require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);

const express = require('express');
const mongoose = require('mongoose');
const Destination = require('./models/destination');
const app = express();

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

// Combine the logic into ONE home route
app.get('/', async (req, res) => {
    try {
        const allDestinations = await Destination.find();
        // This is the one that sends 'places' to index.ejs
        res.render('index', { 
            title: 'Travelax Guides',
            places: allDestinations 
        });
    } catch (err) {
        console.log(err);
        res.render('index', { title: 'Error', places: [] });
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

// Route to handle the Form Submission (POST)
app.post('/destinations', async (req, res) => {
    const destination = new Destination(req.body);

    try {
        await destination.save();
        res.redirect('/'); // Go back to homepage to see the new card!
    } catch (err) {
        console.log(err);
        res.send("Error saving to database."); // Error Message
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

// UPDATE LOGIC (Handling the Form Submission)
app.post('/destinations/update/:id', async (req, res) => {
    try {
        await Destination.findByIdAndUpdate(req.params.id, req.body);
        res.redirect('/');
    } catch (err) {
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