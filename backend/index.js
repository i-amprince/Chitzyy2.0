const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cors = require('cors');

// --- Main Application Imports ---
const { connectDB } = require('./db');

require('dotenv').config();

// --- Database Model Imports ---
const User = require('./models/users');
const Conversation = require('./models/conversation');
const Message = require('./models/message');

// --- Route Imports ---
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const uploadRoutes = require('./routes/upload'); // This line is correct
const aiRoutes = require('./routes/ai');
const groupsRoutes = require('./routes/groups'); // Importing group routes

// --- App & Server Initialization ---
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*" // Allow all origins for simplicity
    }
});

/**
 * In-memory map to track online users for real-time presence.
 * This is the ONLY place we store temporary socket information.
 * Key: permanent userId (from MongoDB)
 * Value: temporary socket.id
 */
const onlineUsers = new Map();

// This line is correct and enables the new feature
app.set('socketio', { io, onlineUsers });

// --- Database Connection ---
connectDB();

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes); // This line is correct
app.use('/api/ai', aiRoutes);
app.use('/api/groups', groupsRoutes); // Using the new group routes

// =======================================================
//                SOCKET.IO LOGIC
// =======================================================
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Get the permanent userId from the JWT token sent during connection
    const decoded_token = jwt.decode(socket.handshake.auth.token);
    if (!decoded_token || !decoded_token.userId) {
        console.log("Connection rejected: Invalid or missing userId in token.");
        return socket.disconnect();
    }
    const userId = decoded_token.userId;

    // --- Presence Management ---
    onlineUsers.set(userId, socket.id);
    console.log(`User Online: ${userId} with socket ${socket.id}`);
    socket.broadcast.emit('user_online', { userId }); // Notify other clients

    // --- Disconnection Handling ---
    socket.on('disconnect', () => {
        onlineUsers.delete(userId);
        console.log(`User Offline: ${userId}`);
        socket.broadcast.emit('user_offline', { userId }); // Notify other clients
    });

    // --- Chat Message Handling (Simple, Sequential Method) ---
    socket.on('chat-msg', async ({ msg, toUserId }) => {
        try {
            const fromUserId = userId; // The sender is the user associated with this socket

            // 1. Find or Create a Conversation between the two users
            let conversation = await Conversation.findOne({
                isGroupChat: false,
                participants: { $all: [fromUserId, toUserId] },
                $expr: { $eq: [{ $size: "$participants" }, 2] }
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    participants: [fromUserId, toUserId],
                    isGroupChat: false
                });
            }

            // This block is correct
            // 2. Create the new message document to be saved
            const newMessage = new Message({
                sender: fromUserId,
                conversationId: conversation._id,
                content: msg,
                type: 'text' // Set the type for text messages
            });

            // --- The Simple, Sequential Database Save ---
            // First, wait for the message to be saved.
            await newMessage.save();

            // Then, after it's saved, update the conversation's `lastMessage`.
            await Conversation.findByIdAndUpdate(conversation._id, {
                lastMessage: newMessage._id,
            });

            // 3. Real-time Delivery (if recipient is online)
            const recipientSocketId = onlineUsers.get(toUserId);
            if (recipientSocketId) {
                const senderInfo = { 
                    id: fromUserId, 
                    name: decoded_token.username, 
                    picture: decoded_token.picture 
                };
                
                // This is also correct
                io.to(recipientSocketId).emit('chat-msg', {
                    msg: newMessage.content,
                    type: newMessage.type,
                    from: senderInfo
                });
            }
        } catch (error) {
            console.error("Error handling chat message:", error.message);
        }
    });

    // --- Group Message Handling ---
    socket.on('group-msg', async ({ msg, groupId }) => {
        try {
            // 1. Find the group conversation and ensure sender is a participant
            const group = await Conversation.findOne({ _id: groupId, isGroupChat: true, participants: userId });
            if (!group) return;
            // 2. Create the new message
            const newMessage = new Message({
                sender: userId,
                conversationId: groupId,
                content: msg,
                type: 'text'
            });
            await newMessage.save();
            await Conversation.findByIdAndUpdate(groupId, { lastMessage: newMessage._id });
            // 3. Emit to all group members except sender
            for (const memberId of group.participants) {
                if (memberId.toString() !== userId) {
                    const memberSocketId = onlineUsers.get(memberId.toString());
                    if (memberSocketId) {
                        socket.to(memberSocketId).emit('group-msg', {
                            msg,
                            groupId,
                            from: { id: userId, picture: (await User.findById(userId)).picture },
                            type: 'text'
                        });
                    }
                }
            }
        } catch (err) {
            // Optionally log error
        }
    });

    // ======================================================================
    //   WebRTC Signaling Event Handlers
    // ======================================================================
    
    // A user is initiating a call and sending their offer
    socket.on('call:offer', ({ offer, toUserId, callType }) => {
        const recipientSocketId = onlineUsers.get(toUserId);
        if (recipientSocketId) {
            console.log(`Relaying call offer from ${userId} to ${toUserId}`);
            // Forward the offer to the recipient, including who it's from.
            socket.to(recipientSocketId).emit('call:incoming', {
                offer,
                from: {
                    userId: userId,
                    username: decoded_token.username,
                    picture: decoded_token.picture
                },
                callType: callType
            });
        }
    });

    // The recipient has accepted the call and is sending their answer back
    socket.on('call:answer', ({ answer, toUserId }) => {
        const recipientSocketId = onlineUsers.get(toUserId);
        if (recipientSocketId) {
            console.log(`Relaying call answer from ${userId} to ${toUserId}`);
            // Forward the answer to the original caller so they can establish the connection.
            socket.to(recipientSocketId).emit('call:accepted', { answer });
        }
    });

    // The two peers are exchanging network information (ICE candidates)
    socket.on('call:ice-candidate', ({ candidate, toUserId }) => {
        const recipientSocketId = onlineUsers.get(toUserId);
        if (recipientSocketId) {
            // Relay the ICE candidate to the other peer.
            socket.to(recipientSocketId).emit('call:ice-candidate', { candidate });
        }
    });

    // A user has hung up the call
    socket.on('call:end', ({ toUserId }) => {
        const recipientSocketId = onlineUsers.get(toUserId);
        if (recipientSocketId) {
            // Inform the other user that the call has ended.
            socket.to(recipientSocketId).emit('call:ended');
        }
    });

    // ======================================================================
    //   CHANGE 1: Add the handler for when a user declines a call
    // ======================================================================
    socket.on('call:decline', ({ toUserId }) => {
        const recipientSocketId = onlineUsers.get(toUserId);
        if (recipientSocketId) {
            console.log(`Relaying call decline from ${userId} to ${toUserId}`);
            // Inform the original caller that their call was declined.
            socket.to(recipientSocketId).emit('call:declined');
        }
    });

    // --- Group Member Count Update ---
    socket.on('request-group-info', async ({ groupId }) => {
        try {
            const group = await Conversation.findOne({ _id: groupId, isGroupChat: true });
            if (group) {
                socket.emit('group-info', {
                    groupId,
                    members: group.participants
                });
            }
        } catch (err) {
            // Optionally log error
        }
    });

});

// =======================================================
//       MAIN USER LIST ENDPOINT (Simple, Sequential Method)
// =======================================================
app.get('/users', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const myInfo = jwt.decode(token);

        // Get all users from the DB, excluding the current user making the request
        const allUsersFromDB = await User.find({ _id: { $ne: myInfo.userId } }).select('username email picture');

        const usersWithConversationInfo = [];
        
        // Use a simple for...of loop for maximum readability
        for (const user of allUsersFromDB) {
            // Find the conversation with this user (only private, not group)
            const conversation = await Conversation.findOne({
                participants: { $all: [myInfo.userId, user._id] },
                isGroupChat: false,
                $expr: { $eq: [ { $size: "$participants" }, 2 ] }
            }).populate("lastMessage");

            usersWithConversationInfo.push({
                id: user._id,
                name: user.username,
                email: user.email,
                picture: user.picture,
                isOnline: onlineUsers.has(user._id.toString()),
                lastMessage: conversation?.lastMessage?.type === 'image'
                    ? '📷 Photo'
                    : (conversation?.lastMessage?.content || ""),
                lastMessageTimestamp: conversation ? conversation.lastMessage?.createdAt : null
            });
        }
        
        // Sort users so the most recent conversations are at the top
        usersWithConversationInfo.sort((a, b) => {
            if (!a.lastMessageTimestamp) return 1;
            if (!b.lastMessageTimestamp) return -1;
            return new Date(b.lastMessageTimestamp) - new Date(a.lastMessageTimestamp);
        });

        res.json(usersWithConversationInfo);

    } catch (error) {
        console.error("Error fetching users:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
});


// --- Server Listener ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});