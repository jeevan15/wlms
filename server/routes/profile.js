const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// ─── Get my profile (includes role name for contract lookup) ──────────────────
router.get('/me', (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.name, u.title, u.given_name, u.last_name, u.email,
           u.employee_code, u.employee_type, u.department, u.role,
           u.onboarding_completed, u.tfn, u.bank_details,
           u.superannuation_details, u.employment_contract,
           jr.name AS job_role_name
    FROM users u
    LEFT JOIN job_roles jr ON u.job_role_id = jr.id
    WHERE u.id = ?
  `).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ─── First-time onboarding submission ────────────────────────────────────────
router.post('/onboarding', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.onboarding_completed) return res.status(400).json({ error: 'Onboarding already completed.' });

  const { tfn, bank, super: superDetails, employment_contract_agreed } = req.body;

  if (!employment_contract_agreed)
    return res.status(400).json({ error: 'You must acknowledge and agree to the Employment Contract.' });

  const agreedAt = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' });
  const contractRecord = `${user.employment_contract || 'Employment Agreement'} — Agreed on ${agreedAt} by ${user.name}`;

  db.prepare(`
    UPDATE users SET
      tfn                    = ?,
      bank_details           = ?,
      superannuation_details = ?,
      employment_contract    = ?,
      onboarding_completed   = 1
    WHERE id = ?
  `).run(
    tfn                                   || null,
    bank          ? JSON.stringify(bank)  : null,
    superDetails  ? JSON.stringify(superDetails) : null,
    contractRecord,
    req.user.id
  );

  res.json({ success: true });
});

// ─── Get bank / super details ─────────────────────────────────────────────────
router.get('/bank-details', (req, res) => {
  const row = db.prepare(
    'SELECT bank_details, superannuation_details FROM users WHERE id = ?'
  ).get(req.user.id);
  if (!row) return res.status(404).json({ error: 'User not found' });

  const parse = (raw) => {
    if (!raw) return {};
    try { return JSON.parse(raw); } catch (_) { return { raw }; }
  };

  res.json({ bank: parse(row.bank_details), super: parse(row.superannuation_details) });
});

// ─── Update bank / super details ──────────────────────────────────────────────
router.put('/bank-details', (req, res) => {
  const { bank, super: superDetails } = req.body;
  db.prepare('UPDATE users SET bank_details = ?, superannuation_details = ? WHERE id = ?').run(
    bank         ? JSON.stringify(bank)        : null,
    superDetails ? JSON.stringify(superDetails) : null,
    req.user.id
  );
  res.json({ success: true });
});

module.exports = router;
