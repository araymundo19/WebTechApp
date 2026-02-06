const express = require('express');
const app = express();

// Tell Node to use the 'public' folder for CSS and Images
app.use(express.static('public'));

// Tell Node to use EJS for our HTML
app.set('view engine', 'ejs');

// This code runs when you visit the homepage (http://localhost:3000)
app.get('/', (req, res) => {
    res.render('index'); // This looks for 'index.ejs' inside the 'views' folder
});


// Route for the About page
app.get('/about', (req, res) => {
    res.render('about'); // This looks for 'about.ejs' in the views folder
});

// Route for the Destinations page
app.get('/destinations', (req, res) => {
    res.render('destinations'); // This looks for 'destinations.ejs'
});

// Start the server
app.listen(3000, () => {
    console.log("Server is running! Go to http://localhost:3000 in your browser.");
});