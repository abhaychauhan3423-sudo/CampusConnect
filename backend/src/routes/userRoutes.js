const router = require('express').Router();
const { getUsers, getSuggestions, getUserById, updateMe } = require('../controllers/userController');
const { updateProfileRules } = require('../validators/authValidators');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getUsers);
router.get('/suggestions', getSuggestions); // must stay above '/:id'
router.patch('/me', updateProfileRules, validate, updateMe);
router.get('/:id', getUserById);

module.exports = router;
