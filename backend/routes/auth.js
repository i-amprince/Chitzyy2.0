const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/users');

// The route handler must be `async` to use `await` for database operations.
router.post('/google', async (req, res) => {
    try {
        const { email, username, picture } = req.body;

        if (!email || !username || !picture) {
            return res.status(400).json({ error: 'Invalid user data' });
        }

        // ======================================================================
        //                      THE NEW FEATURE LOGIC
        // ======================================================================

        // STEP 1: Check if the user already exists BEFORE the main operation.
        // We do this to determine if the next step will be a create or an update.
        const existingUser = await User.findOne({ email: email });

        // STEP 2: Find/Update the user, which also creates them if they don't exist.
        // This is an efficient way to handle both logins and new registrations.
        const user = await User.findOneAndUpdate(
            { email: email }, // The unique field to find the user by
            {
                // The data to set. This will update the username/picture if they change.
                $set: {
                    username: username,
                    picture: picture,
                },
            },
            {
                new: true,    // Return the new/updated document, not the old one
                upsert: true, // IMPORTANT: Create the document if it doesn't exist
            }
        );
        
        // STEP 3: If 'existingUser' was null, it means this was a new registration.
        // Broadcast the event to all other clients to tell them to refresh their user list.
        if (!existingUser) {
            console.log(`A new user registered: ${user.username}. Broadcasting event.`);
            // Access the 'io' object we shared from index.js
            const { io } = req.app.get('socketio');
            // Emit a global event that all clients will receive.
            io.emit('new_user_added'); 
        }

        // STEP 4: Create the JWT token using the user's permanent database ID.
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                username: user.username,
                picture: user.picture,
            },
            process.env.JWT_SECRET, // Make sure to use your secret from .env
            { expiresIn: '1d' }
        );

        // STEP 5: Send the correctly formatted token back to the client.
        res.json({ token });

    } catch (error) {
        console.error("Error in /google auth route:", error.message);
        res.status(500).json({ error: "Server error during authentication" });
    }
});

module.exports = router;