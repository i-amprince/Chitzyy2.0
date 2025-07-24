// models/conversation.js (Full File)

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * The Conversation model represents a single chat thread.
 * It can be a 1-on-1 chat or a group chat.
 *
 * This model's primary purpose is to group messages together and
 * to store metadata about the chat itself (like group name or participants).
 */
const conversationSchema = new Schema({
    /**
     * An array of user IDs who are part of this conversation.
     * For a 1-on-1 chat, this array will have 2 user IDs.
     * For a group chat, it will have 3 or more.
     *
     * We create an index on this field to make finding conversations
     * by participants very fast.
     */
    participants: [{
        type: Schema.Types.ObjectId,
        ref: 'User', // This creates a reference to the User model
        required: true
    }],

    /**
     * A reference to the most recent message sent in this conversation.
     * This is extremely useful for displaying a preview of the last message
     * in a chat list (like on WhatsApp or Telegram) without needing to
     * query the entire Message collection.
     */
    lastMessage: {
        type: Schema.Types.ObjectId,
        ref: 'Message' // This creates a reference to the Message model
    },

    // ===============================================
    // Fields specifically for Group Chats
    // ===============================================

    /**
     * A flag to easily distinguish between 1-on-1 chats and group chats.
     * This simplifies frontend logic (e.g., show group name if true).
     */
    isGroupChat: {
        type: Boolean,
        default: false // By default, a conversation is not a group chat
    },

    /**
     * The name of the group chat. This field is only relevant
     * if `isGroupChat` is true.
     */
    groupName: {
        type: String,
        trim: true // Automatically removes leading/trailing whitespace
    },

    /**
     * The URL for the group chat's profile picture.
     * Only relevant if `isGroupChat` is true.
     */
    groupPicture: {
        type: String,
        default: '' // Default to an empty string
    },

    /**
     * The user ID of the person who created the group and has admin
     * privileges (e.g., can add/remove members, change group name).
     * Only relevant if `isGroupChat` is true.
     */
    groupAdmin: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }

}, {
    /**
     * The `timestamps` option automatically adds two fields to our schema:
     * `createdAt`: The date and time when the conversation was created.
     * `updatedAt`: The date and time when the conversation was last updated
     *              (e.g., when a new message was sent). This is very useful
     *              for sorting chat lists by recent activity.
     */
    timestamps: true
});

// Create a Mongoose model from the schema
const Conversation = mongoose.model('Conversation', conversationSchema);

// Export the model so it can be used in other parts of the application
module.exports = Conversation;