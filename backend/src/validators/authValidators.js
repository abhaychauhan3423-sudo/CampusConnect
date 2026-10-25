const { body } = require('express-validator');

exports.registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('email').trim().isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
    .matches(/\d/).withMessage('Password must contain a number'),
  body('college').trim().notEmpty().withMessage('College is required'),
  body('course').trim().notEmpty().withMessage('Course is required'),
  body('year').isInt({ min: 1, max: 6 }).withMessage('Year of study must be between 1 and 6').toInt(),
];

exports.loginRules = [
  body('email').trim().isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const optionalUrl = (field) =>
  body(field).optional({ checkFalsy: true }).trim()
    .isURL({ require_protocol: true }).withMessage(`${field} must be a full URL (https://...)`);
const stringList = (field) =>
  body(field).optional().isArray({ max: 20 }).withMessage(`${field} must be a list of up to 20 items`);

exports.updateProfileRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 80 }),
  body('college').optional().trim().notEmpty().withMessage('College cannot be empty'),
  body('course').optional().trim().notEmpty().withMessage('Course cannot be empty'),
  body('department').optional().trim().isLength({ max: 120 }),
  body('year').optional().isInt({ min: 1, max: 6 }).withMessage('Year must be between 1 and 6').toInt(),
  body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio can be at most 500 characters'),
  stringList('skills'), stringList('interests'), stringList('achievements'),
  optionalUrl('avatar'), optionalUrl('github'), optionalUrl('linkedin'), optionalUrl('portfolio'),
];
