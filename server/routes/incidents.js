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

    res.status(201).json({ id: result.lastInsertRowid, message: 'Incident reported' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/incidents/:id  (admin — update status / follow-up)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    // Load existing record so partial updates don't wipe required fields
    const existing = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const b = req.body;
    const type             = b.type             !== undefined ? b.type             : existing.type;
    const title            = b.title            !== undefined ? b.title            : existing.title;
    const description      = b.description      !== undefined ? b.description      : existing.description;
    const location         = b.location         !== undefined ? b.location         : existing.location;
    const severity         = b.severity         !== undefined ? b.severity         : existing.severity;
    const injured_party    = b.injured_party    !== undefined ? b.injured_party    : existing.injured_party;
    const first_aid_given  = b.first_aid_given  !== undefined ? (b.first_aid_given ? 1 : 0) : existing.first_aid_given;
    const first_aider      = b.first_aider      !== undefined ? b.first_aider      : existing.first_aider;
    const action_taken     = b.action_taken     !== undefined ? b.action_taken     : existing.action_taken;
    const follow_up_required = b.follow_up_required !== undefined ? (b.follow_up_required ? 1 : 0) : existing.follow_up_required;
    const follow_up_notes  = b.follow_up_notes  !== undefined ? b.follow_up_notes  : existing.follow_up_notes;
    const occurred_at      = b.occurred_at      !== undefined ? b.occurred_at      : existing.occurred_at;
    const status           = b.status           !== undefined ? b.status           : existing.status;

    db.prepare(`
      UPDATE incidents SET
        type=?, title=?, description=?, location=?, severity=?,
        injured_party=?, first_aid_given=?, first_aider=?,
        action_taken=?, follow_up_required=?, follow_up_notes=?,
        occurred_at=?, status=?,
        closed_at = CASE WHEN ? = 'closed' THEN CURRENT_TIMESTAMP ELSE closed_at END
      WHERE id=?
    `).run(
      type, title, description, location, severity,
      injured_party, first_aid_given, first_aider,
      action_taken, follow_up_required, follow_up_notes,
      occurred_at, status, status, req.params.id
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
