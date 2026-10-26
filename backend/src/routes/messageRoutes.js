const router = require('express').Router();
const {
  getConversations,
  getOrCreateConversation,
  getMessages,
  markRead,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/conversations', getConversations);
router.post('/conversations/:userId', getOrCreateConversation);
router.get('/conversations/:id', getMessages);
router.post('/conversations/:id/read', markRead);

module.exports = router;
