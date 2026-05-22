const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body; // 'email' field accepts email address or employee ID
  if (!email || !password)
    return res.status(400).json({ error: 'Email / Employee ID and password are required' });

  // Match by email address or employee ID (e.g. EMP001)
  const user = db.prepare(
    'SELECT * FROM users WHERE email = ? OR employee_code = ?'
  ).get(email, email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid email / Employee ID or password' });

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: {
      id: user.id, name: user.name, email: user.email,
      role: user.role, department: user.department,
      employee_type: user.employee_type,
      onboarding_completed: user.onboarding_completed ?? 1
    }
  });
});

// Self-registration is disabled — accounts are created by admins only
router.post('/register', (_req, res) => {
  res.status(403).json({
    error: 'Self-registration is disabled. Please contact an administrator to create your account.'
  });
});

module.exports = router;
