require('dotenv').config();
require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);

const mongoose = require('mongoose');
const UserAccount = require('../models/UserAccount');
const path = require('path');
// This tells dotenv to look one folder up for the .env file
require('dotenv').config({ path: path.join(__dirname, '../.env') }); 

// Use MONGODB_URI to match your app.js
const dbUrl = process.env.MONGODB_URI;

if (!dbUrl) {
    console.error("❌ ERROR: MONGODB_URI is undefined. Check your .env file!");
    process.exit(1);
}

mongoose.connect(dbUrl)
    .then(() => console.log('✅ SEEDER CONNECTED TO ATLAS!'))
    .catch(err => {
        console.log('❌ CONNECTION ERROR:', err.message);
        process.exit(1);
    });

const seedAccounts = async () => {
    try {
        // 1. CLEAR COLLECTIONS
        await UserAccount.deleteMany({});
        
        // 2. DROP THE OLD GOOGLE ID INDEX (This fixes the duplicate null error)
        try {
            await UserAccount.collection.dropIndex("googleId_1");
            console.log("Dropped old googleId index.");
        } catch (e) {
            console.log("No old index to drop, moving on...");
        }

        // 3. SEED ADMIN
        const adminObj = new UserAccount({
            username: 'admin',
            email: 'admin@travelax.com',
            role: 'admin'
        });
        await UserAccount.register(adminObj, 'admin');
        console.log("✅ Admin Seeded: admin / admin");

        // 4. SEED USER
        const userObj = new UserAccount({
            username: 'user',
            email: 'user@travelax.com',
            role: 'user'
        });
        await UserAccount.register(userObj, 'user');
        console.log("✅ Regular User Seeded: user / user");

        process.exit();
    } catch (err) {
        console.error("❌ Seeding Error:", err);
        process.exit(1);
    }
};;

seedAccounts();