const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * The Message model represents a single message bubble.
 * It has been updated to support different content types.
 */
const messageSchema = new Schema({
    conversationId: {
        type: Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },

    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    /**
     * The content of the message.
     * - If type is 'text', this will be the message string.
     * - If type is 'image', this will be the URL to the image on Cloudinary.
     */
    content: {
        type: String,
        trim: true,
        required: true
    },

    /**
     * ======================================================================
     *                            THE KEY CHANGE
     * ======================================================================
     * This new field is crucial. It tells the frontend how to render the
     * 'content' field. We use an enum to ensure data integrity.
     */
    type: {
        type: String,
        enum: ['text', 'image', 'file'], // You can add 'video', 'audio' etc. later
        default: 'text'
    },

    readBy: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]

}, {
    timestamps: true
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;