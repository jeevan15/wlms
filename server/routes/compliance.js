const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ── Categories ─────────────────────────────────────────────────────────────

// GET /api/compliance/categories
router.get('/categories', authenticateToken, (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT cc.*,
        COUNT(DISTINCT c.id) AS checklist_count
      FROM compliance_categories cc
      LEFT JOIN checklists c ON c.category_id = cc.id AND c.is_active = 1
      GROUP BY cc.id
      ORDER BY cc.order_index, cc.name
    `).all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Checklists ─────────────────────────────────────────────────────────────

// GET /api/compliance/checklists  — optionally filter by category or role
router.get('/checklists', authenticateToken, (req, res) => {
  try {
    const { category_id, my_role } = req.query;
    let query = `
      SELECT cl.*,
        cc.name AS category_name, cc.icon AS category_icon, cc.color AS category_color,
        jr.name AS role_name,
        COUNT(ci.id) AS item_count
      FROM checklists cl
      LEFT JOIN compliance_categories cc ON cc.id = cl.category_id
      LEFT JOIN job_roles jr ON jr.id = cl.assigned_role_id
      LEFT JOIN checklist_items ci ON ci.checklist_id = cl.id
      WHERE cl.is_active = 1
    `;
    const params = [];
    if (category_id) { query += ' AND cl.category_id = ?'; params.push(category_id); }
    if (my_role) { query += ' AND (cl.assigned_role_id IS NULL OR cl.assigned_role_id = ?)'; params.push(my_role); }
    query += ' GROUP BY cl.id ORDER BY cc.order_index, cl.title';

    const checklists = db.prepare(query).all(...params);
    res.json(checklists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compliance/checklists/:id  — includes items
router.get('/checklists/:id', authenticateToken, (req, res) => {
  try {
    const checklist = db.prepare(`
      SELECT cl.*,
        cc.name AS category_name, cc.icon AS category_icon, cc.color AS category_color,
        jr.name AS role_name
      FROM checklists cl
      LEFT JOIN compliance_categories cc ON cc.id = cl.category_id
      LEFT JOIN job_roles jr ON jr.id = cl.assigned_role_id
      WHERE cl.id = ?
    `).get(req.params.id);

    if (!checklist) return res.status(404).json({ error: 'Checklist not found' });

    checklist.items = db.prepare(`
      SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY order_index
    `).all(req.params.id);

    res.json(checklist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/compliance/checklists  (admin)
router.post('/checklists', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, category_id, frequency, assigned_role_id, description, items = [] } = req.body;
    const result = db.prepare(`
      INSERT INTO checklists (title, category_id, frequency, assigned_role_id, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(title, category_id || null, frequency || 'daily', assigned_role_id || null, description || null);

    const checklistId = result.lastInsertRowid;
    items.forEach((item, idx) => {
      db.prepare(`
        INSERT INTO checklist_items (checklist_id, title, description, order_index, is_critical)
        VALUES (?, ?, ?, ?, ?)
      `).run(checklistId, item.title, item.description || null, idx, item.is_critical ? 1 : 0);
    });

    res.json({ id: checklistId, message: 'Checklist created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/compliance/checklists/:id  (admin)
router.put('/checklists/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, category_id, frequency, assigned_role_id, description, is_active } = req.body;
    db.prepare(`
      UPDATE checklists SET title=?, category_id=?, frequency=?, assigned_role_id=?, description=?, is_active=?
      WHERE id=?
    `).run(title, category_id || null, frequency, assigned_role_id || null, description || null,
           is_active !== undefined ? (is_active ? 1 : 0) : 1, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/compliance/checklists/:id  (admin)
router.delete('/checklists/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('UPDATE checklists SET is_active=0 WHERE id=?').run(req.params.id);
    res.json({ message: 'Archived' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Checklist Runs (completions) ───────────────────────────────────────────

// POST /api/compliance/checklists/:id/start  — begin a completion run
router.post('/checklists/:id/start', authenticateToken, (req, res) => {
  try {
    const checklist = db.prepare('SELECT * FROM checklists WHERE id=?').get(req.params.id);
    if (!checklist) return res.status(404).json({ error: 'Not found' });

    const result = db.prepare(`
      INSERT INTO checklist_completions (checklist_id, completed_by, status)
      VALUES (?, ?, 'in_progress')
    `).run(req.params.id, req.user.id);

    const completionId = result.lastInsertRowid;

    // pre-populate item completion rows
    const items = db.prepare('SELECT id FROM checklist_items WHERE checklist_id=? ORDER BY order_index').all(req.params.id);
    items.forEach(item => {
      db.prepare('INSERT INTO checklist_item_completions (completion_id, item_id) VALUES (?,?)').run(completionId, item.id);
    });

    res.json({ completion_id: completionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compliance/runs/:completionId  — get run with items
router.get('/runs/:completionId', authenticateToken, (req, res) => {
  try {
    const run = db.prepare(`
      SELECT cc.*, cl.title AS checklist_title, cl.frequency,
        u.name AS completed_by_name
      FROM checklist_completions cc
      JOIN checklists cl ON cl.id = cc.checklist_id
      JOIN users u ON u.id = cc.completed_by
      WHERE cc.id = ?
    `).get(req.params.completionId);

    if (!run) return res.status(404).json({ error: 'Not found' });

    run.items = db.prepare(`
      SELECT cic.*, ci.title, ci.description, ci.is_critical, ci.order_index
      FROM checklist_item_completions cic
      JOIN checklist_items ci ON ci.id = cic.item_id
      WHERE cic.completion_id = ?
      ORDER BY ci.order_index
    `).all(req.params.completionId);

    res.json(run);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/compliance/runs/:completionId/items/:itemId  — tick/untick item
router.put('/runs/:completionId/items/:itemId', authenticateToken, (req, res) => {
  try {
    const { checked, notes } = req.body;
    db.prepare(`
      UPDATE checklist_item_completions SET checked=?, notes=?
      WHERE completion_id=? AND item_id=?
    `).run(checked ? 1 : 0, notes || null, req.params.completionId, req.params.itemId);
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/compliance/runs/:completionId/complete  — finalise the run
router.post('/runs/:completionId/complete', authenticateToken, (req, res) => {
  try {
    const { overall_notes } = req.body;
    db.prepare(`
      UPDATE checklist_completions
      SET status='completed', completed_at=CURRENT_TIMESTAMP, overall_notes=?
      WHERE id=?
    `).run(overall_notes || null, req.params.completionId);
    res.json({ message: 'Checklist completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compliance/history  — recent completions for the current user (or all for admin)
router.get('/history', authenticateToken, (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const params = isAdmin ? [] : [req.user.id];
    const where = isAdmin ? '' : 'WHERE cc.completed_by = ?';

    const rows = db.prepare(`
      SELECT cc.id, cc.status, cc.started_at, cc.completed_at,
        cl.title AS checklist_title, cl.frequency,
        cat.name AS category_name, cat.icon AS category_icon, cat.color AS category_color,
        u.name AS completed_by_name,
        COUNT(cic.id) AS total_items,
        SUM(cic.checked) AS checked_items
      FROM checklist_completions cc
      JOIN checklists cl ON cl.id = cc.checklist_id
      LEFT JOIN compliance_categories cat ON cat.id = cl.category_id
      JOIN users u ON u.id = cc.completed_by
      LEFT JOIN checklist_item_completions cic ON cic.completion_id = cc.id
      ${where}
      GROUP BY cc.id
      ORDER BY cc.started_at DESC
      LIMIT 100
    `).all(...params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compliance/stats  — summary for dashboard
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const totalChecklists = db.prepare('SELECT COUNT(*) AS c FROM checklists WHERE is_active=1').get().c;
    const completedToday = db.prepare(`
      SELECT COUNT(*) AS c FROM checklist_completions
      WHERE status='completed' AND date(completed_at)=date('now')
    `).get().c;
    const pendingRuns = db.prepare(`
      SELECT COUNT(*) AS c FROM checklist_completions WHERE status='in_progress'
    `).get().c;
    const totalRuns = db.prepare('SELECT COUNT(*) AS c FROM checklist_completions').get().c;

    res.json({ totalChecklists, completedToday, pendingRuns, totalRuns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
