const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Conversation = require('../models/conversation');
const User = require('../models/users');

const protectRoute = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Unauthorized - No Token Provided" });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).json({ error: "Unauthorized - Invalid Token" });
        }
        req.user = decoded;
        next();
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};

// ... (create and my-groups routes are fine)
router.post('/create', protectRoute, async (req, res) => {
    try {
        const { groupName, groupPicture, members } = req.body;
        if (!groupName || !Array.isArray(members) || members.length < 2) {
            return res.status(400).json({ error: 'Group name and at least 2 members are required' });
        }
        const allMembers = [...new Set([...members, req.user.userId])];
        const conversation = new Conversation({
            participants: allMembers, isGroupChat: true, groupName,
            groupPicture: groupPicture || '', groupAdmin: req.user.userId
        });
        await conversation.save();
        const { io, onlineUsers } = req.app.get('socketio');
        for (const memberId of allMembers) {
            if (memberId.toString() !== req.user.userId) {
                const memberSocketId = onlineUsers.get(memberId.toString());
                if (memberSocketId) {
                    io.to(memberSocketId).emit('group-created', { group: conversation });
                }
            }
        }
        res.status(201).json(conversation);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create group chat' });
    }
});
router.get('/my-groups', protectRoute, async (req, res) => {
    try {
        const groups = await Conversation.find({ participants: req.user.userId, isGroupChat: true })
            .sort({ updatedAt: -1 })
            .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'username picture' } });
        res.status(200).json(groups);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch group chats' });
    }
});

// ======================================================================
//             FINAL, CORRECTED /leave ROUTE WITH AUTOMATIC PROMOTION
// ======================================================================
router.post('/leave', protectRoute, async (req, res) => {
    try {
        const { groupId } = req.body;
        const userId = req.user.userId;
        const group = await Conversation.findOne({ _id: groupId, isGroupChat: true });

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const isUserAdmin = group.groupAdmin.toString() === userId;
        const originalParticipants = [...group.participants];

        // Remove the current user from the participants list
        const remainingParticipants = group.participants.filter(id => id.toString() !== userId);
        group.participants = remainingParticipants;

        // Check if the user leaving was the admin
        if (isUserAdmin) {
            // If there are still members left in the group...
            if (remainingParticipants.length > 0) {
                // ...automatically assign the admin role to the next person in the list.
                group.groupAdmin = remainingParticipants[0];
                await group.save();
            } else {
                // ...otherwise, the admin was the last member, so delete the group.
                await Conversation.findByIdAndDelete(groupId);
            }
        } else {
            // If the user was not an admin, just save the updated participant list.
            await group.save();
        }

        // Notify all original members (including the one who left) about the update.
        const { io, onlineUsers } = req.app.get('socketio');
        originalParticipants.forEach(memberId => {
            const socketId = onlineUsers.get(memberId.toString());
            if (socketId) {
                io.to(socketId).emit('group-updated', { groupId });
            }
        });
        
        res.status(200).json({ success: true, message: 'Successfully left group.' });
    } catch (err) {
        console.error("Error in /leave route:", err.message);
        res.status(500).json({ error: 'Failed to leave group' });
    }
});


// ... (The rest of your routes are correct and unchanged)
router.post('/add-member', protectRoute, async (req, res) => {
    try {
        const { groupId, userIdToAdd } = req.body;
        const group = await Conversation.findOne({ _id: groupId, isGroupChat: true });
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.participants.map(id => id.toString()).includes(userIdToAdd)) {
            return res.status(400).json({ error: 'User is already in the group' });
        }
        group.participants.push(userIdToAdd);
        await group.save();
        const { io, onlineUsers } = req.app.get('socketio');
        group.participants.forEach(memberId => {
            const socketId = onlineUsers.get(memberId.toString());
            if (socketId) {
                io.to(socketId).emit('group-updated', { groupId: group._id });
            }
        });
        res.status(200).json({ success: true, message: 'User added successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add user to group' });
    }
});
router.post('/participants', protectRoute, async (req, res) => {
    try {
        const { memberIds } = req.body;
        if (!Array.isArray(memberIds)) return res.json([]);
        const users = await User.find({ _id: { $in: memberIds } }, 'username');
        res.json(users.map(u => u.username));
    } catch {
        res.json([]);
    }
});
router.get('/not-in-group/:groupId', protectRoute, async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = await Conversation.findOne({ _id: groupId, isGroupChat: true });
        if (!group) return res.status(404).json({ error: 'Group not found' });
        const users = await User.find({ _id: { $nin: group.participants } }, 'username picture');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// We don't need the /promote-admin route with this new logic
// so it has been removed for simplicity.

module.exports = router;