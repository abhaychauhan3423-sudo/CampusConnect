const router = require('express').Router();

router.get('/health', (_req, res) => res.json({ success: true, message: 'CampusConnect API running' }));
router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/messages', require('./messageRoutes'));
// Later phases mount: posts, connections, events, projects, opportunities,
// notifications, dashboard, search.

module.exports = router;
