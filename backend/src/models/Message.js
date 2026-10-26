const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'conversationId is required'],
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'senderId is required'],
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'recipientId is required'],
      index: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
      default: '',
    },
    image: {
      type: String,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// MongoDB TTL index: automatically deletes document once expiresAt has passed (expireAfterSeconds: 0)
// When expiresAt is null or undefined, MongoDB TTL background thread ignores the document
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for fast lookup and chronological history
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ conversationId: 1, recipientId: 1, readAt: 1 });

// Helper to filter out expired messages from any query
messageSchema.statics.unexpiredFilter = function (extraConditions = {}) {
  const now = new Date();
  return {
    ...extraConditions,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  };
};

// Ensure at least text or image is present
messageSchema.pre('validate', function (next) {
  if (!this.text?.trim() && !this.image) {
    this.invalidate('text', 'Either message text or an image is required.');
  }
  next();
});

module.exports = mongoose.model('Message', messageSchema);
