const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const User = require('../models/users');

// Middleware to protect routes
const protectRoute = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Unauthorized - No Token Provided" });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use your JWT_SECRET
        if (!decoded) {
            return res.status(401).json({ error: "Unauthorized - Invalid Token" });
        }
        req.user = decoded; // Add user payload to the request object
        next();
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};


// GET /api/messages/:otherUserId
// Fetches the chat history between the logged-in user and another user.
router.get('/:otherUserId', protectRoute, async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const senderId = req.user.userId;

        // Find the conversation that includes both the sender and the other user
        const conversation = await Conversation.findOne({
            isGroupChat: false,
            participants: { $all: [senderId, otherUserId] },
            $expr: { $eq: [{ $size: "$participants" }, 2] }
        });

        // If no conversation exists, there are no messages to return
        if (!conversation) {
            return res.status(200).json([]);
        }

        // Fetch all messages belonging to this conversation
        const messages = await Message.find({
            conversationId: conversation._id,
        }).sort({ createdAt: 1 }); // Sort by creation time to get chronological order

        res.status(200).json(messages);

    } catch (error) {
        console.error("Error in getMessages route: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/messages/group/:groupId
// Fetches the chat history of a specific group
router.get('/group/:groupId', protectRoute, async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;
        // Ensure user is a participant of the group
        const conversation = await Conversation.findOne({ _id: groupId, participants: userId, isGroupChat: true });
        if (!conversation) {
            return res.status(403).json({ error: 'Not a member of this group' });
        }
        // Populate sender info (username, picture) for each message
        const messages = await Message.find({ conversationId: groupId })
            .sort({ createdAt: 1 })
            .populate('sender', 'username picture');
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch group messages' });
    }
});

module.exports = router;