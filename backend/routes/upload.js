const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken'); // <-- 1. ADD THIS LINE

// Import your database models
const Conversation = require('../models/conversation');
const Message = require('../models/message');

// --- Configure Cloudinary ---
// This uses the credentials from your .env file, which was loaded by index.js
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- Middleware to Protect Route ---
// This ensures only logged-in users can upload files
// require('dotenv').config(); // <-- 2. REMOVE THIS LINE. It's not needed here.
const protectRoute = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Unauthorized - No Token Provided" });
        }
        // Use your JWT secret from .env for verification
        req.user = jwt.verify(token, process.env.JWT_SECRET); // Use the imported 'jwt'
        next();
    } catch (error) {
        console.error("Error in protectRoute middleware:", error.message);
        return res.status(401).json({ error: "Unauthorized - Invalid Token" });
    }
};

// --- Configure Multer Storage with Cloudinary ---
// This tells Multer where to send the files
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'chat_app_files', // A folder name in your Cloudinary account
        allowed_formats: ['jpeg', 'png', 'jpg', 'gif'], // Allowed image formats
    },
});

const upload = multer({ storage: storage });

// --- The Main File Upload Route ---
// This handles POST requests to /api/upload/file
router.post('/file', protectRoute, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded or file type is not supported.' });
        }

        const fromUserId = req.user.userId;
        const { toUserId } = req.body; // Sent from the frontend FormData

        // The secure URL is provided by Cloudinary via req.file.path
        const fileUrl = req.file.path;
        
        // Find or Create a Conversation (same logic as in index.js)
        let conversation = await Conversation.findOne({
            participants: { $all: [fromUserId, toUserId] },
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [fromUserId, toUserId],
            });
        }
        
        // Create the new message document for the image
        const newMessage = new Message({
            sender: fromUserId,
            conversationId: conversation._id,
            content: fileUrl,   // The Cloudinary URL
            type: 'image'       // The type is 'image'
        });

        await newMessage.save();

        // Update the conversation's last message
        await Conversation.findByIdAndUpdate(conversation._id, {
            lastMessage: newMessage._id,
        });

        // --- Real-time emission via Socket.IO ---
        // Get the io and onlineUsers objects we attached to the app in index.js
        const { io, onlineUsers } = req.app.get('socketio');
        const recipientSocketId = onlineUsers.get(toUserId);

        if (recipientSocketId) {
             const senderInfo = { 
                id: fromUserId, 
                name: req.user.username, 
                picture: req.user.picture 
            };
            
            // Emit the message to the recipient so they see it instantly
            io.to(recipientSocketId).emit('chat-msg', {
                msg: newMessage.content,
                type: newMessage.type,
                from: senderInfo
            });
        }

        // Send a success response back to the uploader (the frontend)
        // with the details of the new message.
        res.status(201).json(newMessage);

    } catch (error) {
        console.error("Error in file upload route:", error.message);
        res.status(500).json({ error: "Server error during file upload." });
    }
});

module.exports = router;