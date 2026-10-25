const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');

const EDITABLE = ['name', 'college', 'course', 'department', 'year', 'bio', 'skills', 'interests',
  'achievements', 'avatar', 'github', 'linkedin', 'portfolio'];
const cleanList = (arr) => [...new Set(arr.map((s) => String(s).trim()).filter(Boolean))];

// GET /api/users?q=&page=&limit=  - search by name, college, skills or interests
exports.getUsers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);
  const filter = { _id: { $ne: req.user._id } };
  if (req.query.q && req.query.q.trim()) {
    const rx = new RegExp(escapeRegex(req.query.q.trim()), 'i');
    filter.$or = [{ name: rx }, { college: rx }, { skills: rx }, { interests: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, data: { users, page, pages: Math.ceil(total / limit), total } });
});

// GET /api/users/suggestions - students sharing college, skills or interests
// (Phase 4 will additionally exclude existing connections.)
exports.getSuggestions = asyncHandler(async (req, res) => {
  const me = req.user;
  const candidates = await User.find({
    _id: { $ne: me._id },
    $or: [{ college: me.college }, { skills: { $in: me.skills } }, { interests: { $in: me.interests } }],
  }).limit(50);

  const score = (u) =>
    (u.college === me.college ? 1 : 0) +
    2 * u.skills.filter((s) => me.skills.includes(s)).length +
    u.interests.filter((i) => me.interests.includes(i)).length;

  const users = candidates.sort((a, b) => score(b) - score(a)).slice(0, 6);
  // Fall back to newest students if the user has no overlap yet.
  const result = users.length ? users : await User.find({ _id: { $ne: me._id } }).sort({ createdAt: -1 }).limit(6);
  res.json({ success: true, data: { users: result } });
});

// GET /api/users/:id
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'Student not found.');
  res.json({ success: true, data: { user } });
});

// PATCH /api/users/me - whitelist fields so email/password can't be changed here
exports.updateMe = asyncHandler(async (req, res) => {
  EDITABLE.forEach((f) => {
    if (req.body[f] === undefined) return;
    req.user[f] = Array.isArray(req.body[f]) ? cleanList(req.body[f]) : req.body[f];
  });
  await req.user.save();
  res.json({ success: true, data: { user: req.user } });
});
