const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/sops  — list (no content, for card view)
router.get('/', authenticateToken, (req, res) => {
  try {
    const { category, search } = req.query;
    let where = 'WHERE s.is_active = 1';
    const params = [];

    if (category) { where += ' AND s.category = ?'; params.push(category); }
    if (search)   { where += ' AND (s.title LIKE ? OR s.summary LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    const sops = db.prepare(`
      SELECT s.id, s.title, s.category, s.summary, s.version, s.applies_to,
        s.reviewed_at, s.created_at, u.name AS created_by_name
      FROM sops s
      LEFT JOIN users u ON u.id = s.created_by
      ${where}
      ORDER BY s.category, s.title
    `).all(...params);

    res.json(sops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sops/categories  — distinct categories
router.get('/categories', authenticateToken, (req, res) => {
  try {
    const cats = db.prepare("SELECT DISTINCT category FROM sops WHERE is_active=1 AND category IS NOT NULL ORDER BY category").all();
    res.json(cats.map(r => r.category));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sops/:id  — full including content
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const sop = db.prepare(`
      SELECT s.*, u.name AS created_by_name
      FROM sops s
      LEFT JOIN users u ON u.id = s.created_by
      WHERE s.id = ? AND s.is_active = 1
    `).get(req.params.id);
    if (!sop) return res.status(404).json({ error: 'Not found' });
    res.json(sop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sops  (admin)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, category, summary, content, version, applies_to, reviewed_at } = req.body;
    const result = db.prepare(`
      INSERT INTO sops (title, category, summary, content, version, applies_to, created_by, reviewed_at)
      VALUES (?,?,?,?,?,?,?,?)
    `).run(title, category || null, summary || null, content || null,
           version || '1.0', applies_to || null, req.user.id, reviewed_at || null);
    res.json({ id: result.lastInsertRowid, message: 'SOP created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sops/:id  (admin)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, category, summary, content, version, applies_to, reviewed_at, is_active } = req.body;
    db.prepare(`
      UPDATE sops SET title=?, category=?, summary=?, content=?, version=?, applies_to=?,
        reviewed_at=?, is_active=?
      WHERE id=?
    `).run(title, category || null, summary || null, content || null,
           version || '1.0', applies_to || null, reviewed_at || null,
           is_active !== undefined ? (is_active ? 1 : 0) : 1, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sops/:id  (admin — soft delete)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('UPDATE sops SET is_active=0 WHERE id=?').run(req.params.id);
    res.json({ message: 'Archived' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
