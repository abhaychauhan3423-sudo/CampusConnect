const router = require('express').Router();

router.get('/health', (_req, res) => res.json({ success: true, message: 'CampusConnect API running' }));
router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/posts', require('./postRoutes'));
router.use('/reports', require('./reportRoutes'));
router.use('/notifications', require('./notificationRoutes'));
// Later phases mount: connections, conversations, events, projects, opportunities,
// dashboard, search. Those modules can create persisted notifications through
// services/notificationService.

module.exports = router;
