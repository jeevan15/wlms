const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/tasks  — tasks assigned to me (or assigned to my role, or all for admin)
router.get('/', authenticateToken, (req, res) => {
  try {
    const { status, priority } = req.query;
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);

    let where = 'WHERE (t.assigned_to = ? OR t.assigned_role_id = ?)';
    const params = [req.user.id, user.job_role_id || -1];

    if (status) { where += ' AND t.status = ?'; params.push(status); }
    if (priority) { where += ' AND t.priority = ?'; params.push(priority); }

    const tasks = db.prepare(`
      SELECT t.*,
        u.name AS assigned_to_name,
        jr.name AS assigned_role_name,
        cb.name AS created_by_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN job_roles jr ON jr.id = t.assigned_role_id
      LEFT JOIN users cb ON cb.id = t.created_by
      ${where}
      ORDER BY
        CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        t.due_date ASC NULLS LAST,
        t.created_at DESC
    `).all(...params);

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/all  (admin — all tasks)
router.get('/all', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status, priority, assigned_to } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (status) { where += ' AND t.status = ?'; params.push(status); }
    if (priority) { where += ' AND t.priority = ?'; params.push(priority); }
    if (assigned_to) { where += ' AND t.assigned_to = ?'; params.push(assigned_to); }

    const tasks = db.prepare(`
      SELECT t.*,
        u.name AS assigned_to_name,
        jr.name AS assigned_role_name,
        cb.name AS created_by_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN job_roles jr ON jr.id = t.assigned_role_id
      LEFT JOIN users cb ON cb.id = t.created_by
      ${where}
      ORDER BY
        CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        t.due_date ASC NULLS LAST,
        t.created_at DESC
    `).all(...params);

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/stats
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
    const roleId = user.job_role_id || -1;

    const where = isAdmin ? '' : 'WHERE (assigned_to = ? OR assigned_role_id = ?)';
    const params = isAdmin ? [] : [req.user.id, roleId];

    const total    = db.prepare(`SELECT COUNT(*) AS c FROM tasks ${where}`).get(...params).c;
    const pending  = db.prepare(`SELECT COUNT(*) AS c FROM tasks ${where ? where + ' AND' : 'WHERE'} status='pending'`).get(...params).c;
    const inProg   = db.prepare(`SELECT COUNT(*) AS c FROM tasks ${where ? where + ' AND' : 'WHERE'} status='in_progress'`).get(...params).c;
    const done     = db.prepare(`SELECT COUNT(*) AS c FROM tasks ${where ? where + ' AND' : 'WHERE'} status='completed'`).get(...params).c;
    const overdue  = db.prepare(`SELECT COUNT(*) AS c FROM tasks ${where ? where + ' AND' : 'WHERE'} status!='completed' AND due_date < date('now')`).get(...params).c;

    res.json({ total, pending, in_progress: inProg, completed: done, overdue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const task = db.prepare(`
      SELECT t.*,
        u.name AS assigned_to_name,
        jr.name AS assigned_role_name,
        cb.name AS created_by_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN job_roles jr ON jr.id = t.assigned_role_id
      LEFT JOIN users cb ON cb.id = t.created_by
      WHERE t.id = ?
    `).get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks  (admin)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, description, category, assigned_to, assigned_role_id, due_date, priority, notes } = req.body;
    const result = db.prepare(`
      INSERT INTO tasks (title, description, category, assigned_to, assigned_role_id, due_date, priority, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title, description || null, category || 'general',
      assigned_to || null, assigned_role_id || null,
      due_date || null, priority || 'medium', notes || null, req.user.id
    );

    // Notify assigned user
    if (assigned_to) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, 'New Task Assigned', ?, 'info')
      `).run(assigned_to, `You have been assigned a new task: "${title}"`);
    }

    res.json({ id: result.lastInsertRowid, message: 'Task created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id  (admin edit)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, description, category, assigned_to, assigned_role_id, due_date, priority, status, notes } = req.body;
    db.prepare(`
      UPDATE tasks SET title=?, description=?, category=?, assigned_to=?, assigned_role_id=?,
        due_date=?, priority=?, status=?, notes=?,
        completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id=?
    `).run(
      title, description || null, category || 'general',
      assigned_to || null, assigned_role_id || null,
      due_date || null, priority, status, notes || null,
      status, req.params.id
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id/status  — worker updates their own task status
router.patch('/:id/status', authenticateToken, (req, res) => {
  try {
    const { status, notes } = req.body;
    const allowed = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Not found' });

    const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
    const canEdit = req.user.role === 'admin' ||
                    task.assigned_to === req.user.id ||
                    (task.assigned_role_id && task.assigned_role_id === user.job_role_id);
    if (!canEdit) return res.status(403).json({ error: 'Forbidden' });

    db.prepare(`
      UPDATE tasks SET status=?, notes=COALESCE(?, notes),
        completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id=?
    `).run(status, notes || null, status, req.params.id);

    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id  (admin)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
