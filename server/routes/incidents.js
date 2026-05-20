const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/incidents  — own incidents (or all for admin)
router.get('/', authenticateToken, (req, res) => {
  try {
    const { status, type, severity } = req.query;
    const isAdmin = req.user.role === 'admin';

    let where = isAdmin ? 'WHERE 1=1' : 'WHERE i.reported_by = ?';
    const params = isAdmin ? [] : [req.user.id];

    if (status)   { where += ' AND i.status = ?';   params.push(status); }
    if (type)     { where += ' AND i.type = ?';     params.push(type); }
    if (severity) { where += ' AND i.severity = ?'; params.push(severity); }

    const incidents = db.prepare(`
      SELECT i.*, u.name AS reported_by_name
      FROM incidents i
      JOIN users u ON u.id = i.reported_by
      ${where}
      ORDER BY i.reported_at DESC
    `).all(...params);

    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/incidents/stats
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const total    = db.prepare("SELECT COUNT(*) AS c FROM incidents").get().c;
    const open     = db.prepare("SELECT COUNT(*) AS c FROM incidents WHERE status='open'").get().c;
    const thisMonth = db.prepare("SELECT COUNT(*) AS c FROM incidents WHERE strftime('%Y-%m', reported_at)=strftime('%Y-%m','now')").get().c;
    const critical  = db.prepare("SELECT COUNT(*) AS c FROM incidents WHERE severity='critical' AND status='open'").get().c;
    res.json({ total, open, this_month: thisMonth, critical });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/incidents/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const incident = db.prepare(`
      SELECT i.*, u.name AS reported_by_name
      FROM incidents i
      JOIN users u ON u.id = i.reported_by
      WHERE i.id = ?
    `).get(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Not found' });

    // Only admin or reporter can view
    if (req.user.role !== 'admin' && incident.reported_by !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/incidents  — report a new incident
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      type, title, description, location, severity,
      injured_party, first_aid_given, first_aider,
      action_taken, follow_up_required, follow_up_notes,
      occurred_at
    } = req.body;

    const result = db.prepare(`
      INSERT INTO incidents (
        type, title, description, location, severity, reported_by,
        injured_party, first_aid_given, first_aider,
        action_taken, follow_up_required, follow_up_notes, occurred_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      type, title, description || null, location || null, severity || 'low', req.user.id,
      injured_party || null, first_aid_given ? 1 : 0, first_aider || null,
      action_taken || null, follow_up_required ? 1 : 0, follow_up_notes || null,
      occurred_at || null
    );

    // Notify all admins
    const admins = db.prepare("SELECT id FROM users WHERE role='admin'").all();
    admins.forEach(admin => {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, 'alert')
      `).run(admin.id, `New Incident Reported: ${title}`,
              `A new ${severity} severity incident has been reported by ${req.user.name || 'a user'}.`);
    });

    res.json({ id: result.lastInsertRowid, message: 'Incident reported' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/incidents/:id  (admin — update status / follow-up)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const {
      status, action_taken, follow_up_required, follow_up_notes,
      type, title, description, location, severity,
      injured_party, first_aid_given, first_aider, occurred_at
    } = req.body;

    db.prepare(`
      UPDATE incidents SET
        type=?, title=?, description=?, location=?, severity=?,
        injured_party=?, first_aid_given=?, first_aider=?,
        action_taken=?, follow_up_required=?, follow_up_notes=?,
        occurred_at=?, status=?,
        closed_at = CASE WHEN ? = 'closed' THEN CURRENT_TIMESTAMP ELSE closed_at END
      WHERE id=?
    `).run(
      type, title, description || null, location || null, severity,
      injured_party || null, first_aid_given ? 1 : 0, first_aider || null,
      action_taken || null, follow_up_required ? 1 : 0, follow_up_notes || null,
      occurred_at || null, status, status, req.params.id
    );

    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/incidents/:id  (admin)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM incidents WHERE id=?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
