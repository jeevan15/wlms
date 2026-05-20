const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const notifications = db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 25'
  ).all(req.user.id);
  const unreadCount = db.prepare(
    'SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read = 0'
  ).get(req.user.id).c;
  res.json({ notifications, unreadCount });
});

router.put('/read-all', authenticateToken, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ success: true });
});

router.put('/:id/read', authenticateToken, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  res.json({ success: true });
});

module.exports = router;
