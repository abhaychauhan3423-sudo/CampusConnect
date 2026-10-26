const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { calculateExpiryDate, isMessageExpired } = require('../utils/messageExpiry');

const SAFE_USER_FIELDS = 'name avatar college course department year lastSeen';

/**
 * GET /api/messages/conversations
 * List all conversations for the authenticated user, excluding expired preview text.
 */
exports.getConversations = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;

  const conversations = await Conversation.find({ participants: currentUserId })
    .sort({ updatedAt: -1 })
    .populate('participants', SAFE_USER_FIELDS)
    .populate('lastMessage')
    .lean();

  const now = new Date();

  // Process conversations: verify lastMessage is unexpired and calculate unread count
  const results = await Promise.all(
    conversations.map(async (conv) => {
      let lastMsg = conv.lastMessage;

      // If lastMessage is expired or missing, find the most recent unexpired message
      if (lastMsg && lastMsg.expiresAt && new Date(lastMsg.expiresAt) <= now) {
        lastMsg = await Message.findOne({
          conversationId: conv._id,
          $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
        })
          .sort({ createdAt: -1 })
          .lean();
      }

      // Count unread messages addressed to the current user
      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        recipientId: currentUserId,
        readAt: null,
      });

      return {
        _id: conv._id,
        participants: conv.participants,
        lastMessage: lastMsg || null,
        unreadCount,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      };
    })
  );

  res.json({ success: true, data: results });
});

/**
 * POST /api/messages/conversations/:userId
 * Create or retrieve a 1-to-1 conversation with another student.
 */
exports.getOrCreateConversation = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;
  const targetUserId = req.params.userId;

  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw new ApiError(400, 'Invalid student ID.');
  }

  if (targetUserId.toString() === currentUserId.toString()) {
    throw new ApiError(400, 'You cannot start a conversation with yourself.');
  }

  const targetUser = await User.findById(targetUserId).select(SAFE_USER_FIELDS);
  if (!targetUser) {
    throw new ApiError(404, 'Student not found.');
  }

  const participantKey = Conversation.getParticipantKey(currentUserId, targetUserId);

  let conversation;
  try {
    conversation = await Conversation.findOneAndUpdate(
      { participantKey },
      {
        $setOnInsert: {
          participants: [currentUserId, targetUser._id],
          participantKey,
          lastMessage: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('participants', SAFE_USER_FIELDS);
  } catch (err) {
    // In case of any concurrent race condition
    conversation = await Conversation.findOne({ participantKey }).populate('participants', SAFE_USER_FIELDS);
    if (!conversation) throw err;
  }

  res.status(200).json({ success: true, data: conversation });
});

/**
 * GET /api/messages/conversations/:id
 * Get unexpired messages for an authorized conversation, sorted chronologically.
 */
exports.getMessages = asyncHandler(async (req, res) => {
  const conversationId = req.params.id;
  const currentUserId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new ApiError(400, 'Invalid conversation ID.');
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(404, 'Conversation not found.');
  }

  const isMember = conversation.participants.some(
    (p) => p.toString() === currentUserId.toString()
  );
  if (!isMember) {
    throw new ApiError(403, 'You are not authorized to view this conversation.');
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const now = new Date();

  const query = {
    conversationId,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  };

  if (req.query.before) {
    const beforeDate = new Date(req.query.before);
    if (!isNaN(beforeDate.getTime())) {
      query.createdAt = { $lt: beforeDate };
    }
  }

  const messages = await Message.find(query)
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate('senderId', 'name avatar')
    .lean();

  res.json({ success: true, data: messages });
});

/**
 * POST /api/messages/conversations/:id/read
 * Mark messages as read for the current recipient and start the 24h countdown.
 */
exports.markRead = asyncHandler(async (req, res) => {
  const conversationId = req.params.id;
  const currentUserId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new ApiError(400, 'Invalid conversation ID.');
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(404, 'Conversation not found.');
  }

  const isMember = conversation.participants.some(
    (p) => p.toString() === currentUserId.toString()
  );
  if (!isMember) {
    throw new ApiError(403, 'Unauthorized.');
  }

  // Atomically find and mark all unread messages addressed to the caller
  const now = new Date();
  const expiresAt = calculateExpiryDate(now);

  const unreadMessages = await Message.find({
    conversationId,
    recipientId: currentUserId,
    readAt: null,
  }).select('_id');

  if (unreadMessages.length === 0) {
    return res.json({ success: true, count: 0 });
  }

  const ids = unreadMessages.map((m) => m._id);

  // Atomic update to ensure idempotent execution
  await Message.updateMany(
    { _id: { $in: ids }, readAt: null },
    { $set: { readAt: now, expiresAt } }
  );

  res.json({
    success: true,
    count: ids.length,
    messageIds: ids,
    readAt: now,
    expiresAt,
  });
});
