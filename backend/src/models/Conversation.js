const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    // Deterministic pair key "[id1,id2]" sorted to prevent duplicate 1-to-1 conversations concurrently
    participantKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

// Helper to generate normalized participantKey from two user IDs
conversationSchema.statics.getParticipantKey = function (userA, userB) {
  return [userA.toString(), userB.toString()].sort().join(':');
};

module.exports = mongoose.model('Conversation', conversationSchema);
