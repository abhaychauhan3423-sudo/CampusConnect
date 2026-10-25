const router = require('express').Router();

router.get('/health', (_req, res) => res.json({ success: true, message: 'CampusConnect API running' }));
router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
// Later phases mount: posts, connections, conversations, events, projects, opportunities,
// notifications, dashboard, search.

module.exports = router;
