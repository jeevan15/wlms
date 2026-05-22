const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken, requireAdmin);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAssignedCourses(jobRoleId) {
  if (jobRoleId) {
    return db.prepare(`
      SELECT c.* FROM courses c
      INNER JOIN role_courses rc ON c.id = rc.course_id
      WHERE rc.role_id = ? ORDER BY c.created_at ASC
    `).all(jobRoleId);
  }
  return db.prepare('SELECT * FROM courses ORDER BY created_at ASC').all();
}

function calcProgress(userId, jobRoleId) {
  const courses = getAssignedCourses(jobRoleId);
  let totalLessons = 0, completedLessons = 0;
  const courseProgress = courses.map(course => {
    const lessons = db.prepare('SELECT id FROM lessons WHERE course_id = ?').all(course.id);
    let done = 0;
    if (lessons.length > 0) {
      const ph = lessons.map(() => '?').join(',');
      done = db.prepare(
        `SELECT COUNT(*) as c FROM user_progress WHERE user_id = ? AND lesson_id IN (${ph}) AND completed = 1`
      ).get(userId, ...lessons.map(l => l.id)).c;
    }
    totalLessons += lessons.length;
    completedLessons += done;
    const lastAttempt = db.prepare(
      `SELECT passed, score, total FROM quiz_attempts WHERE user_id = ?
       AND lesson_id IN (SELECT id FROM lessons WHERE course_id = ? AND has_quiz = 1)
       ORDER BY attempted_at DESC LIMIT 1`
    ).get(userId, course.id);
    return {
      courseId: course.id, title: course.title, color: course.color,
      total: lessons.length, completed: done,
      percent: lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0,
      quizPassed: lastAttempt?.passed === 1,
      quizScore: lastAttempt ? `${lastAttempt.score}/${lastAttempt.total}` : null
    };
  });
  const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const status = totalLessons === 0 ? 'not_started'
    : completedLessons === 0 ? 'not_started'
    : completedLessons < totalLessons ? 'in_progress'
    : 'completed';
  const totalTimeSeconds = db.prepare(
    'SELECT COALESCE(SUM(time_spent_seconds), 0) as t FROM user_progress WHERE user_id = ?'
  ).get(userId).t;
  return { totalLessons, completedLessons, percent, status, courseProgress, totalTimeSeconds };
}

function safeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

router.get('/stats', (req, res) => {
  const users = db.prepare("SELECT id, job_role_id FROM users WHERE role = 'user'").all();
  let completed = 0, inProgress = 0, notStarted = 0;
  users.forEach(u => {
    const s = calcProgress(u.id, u.job_role_id).status;
    if (s === 'completed') completed++;
    else if (s === 'in_progress') inProgress++;
    else notStarted++;
  });

  // Compliance snapshot
  const checklistsToday = db.prepare(
    "SELECT COUNT(*) AS c FROM checklist_completions WHERE status='completed' AND date(completed_at)=date('now')"
  ).get().c;
  const openIncidents = db.prepare("SELECT COUNT(*) AS c FROM incidents WHERE status='open'").get().c;
  const overdueTasks = db.prepare(
    "SELECT COUNT(*) AS c FROM tasks WHERE status!='completed' AND due_date < date('now')"
  ).get().c;

  res.json({
    totalUsers: users.length,
    totalCourses: db.prepare('SELECT COUNT(*) as c FROM courses').get().c,
    totalRoles: db.prepare('SELECT COUNT(*) as c FROM job_roles').get().c,
    completed, inProgress, notStarted,
    checklistsToday, openIncidents, overdueTasks
  });
});

// ─── Compliance Overview (admin) ──────────────────────────────────────────────

router.get('/compliance/overview', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT cc.*,
        COUNT(DISTINCT cl.id) AS checklist_count,
        SUM(CASE WHEN comp.status='completed' AND date(comp.completed_at)=date('now') THEN 1 ELSE 0 END) AS completed_today
      FROM compliance_categories cc
      LEFT JOIN checklists cl ON cl.category_id = cc.id AND cl.is_active = 1
      LEFT JOIN checklist_completions comp ON comp.checklist_id = cl.id
      GROUP BY cc.id
      ORDER BY cc.order_index
    `).all();

    const recentRuns = db.prepare(`
      SELECT comp.id, comp.status, comp.started_at, comp.completed_at,
        cl.title AS checklist_title, cl.frequency,
        u.name AS completed_by_name,
        COUNT(cic.id) AS total_items, SUM(cic.checked) AS checked_items
      FROM checklist_completions comp
      JOIN checklists cl ON cl.id = comp.checklist_id
      JOIN users u ON u.id = comp.completed_by
      LEFT JOIN checklist_item_completions cic ON cic.completion_id = comp.id
      GROUP BY comp.id
      ORDER BY comp.started_at DESC
      LIMIT 20
    `).all();

    const overdueTasks = db.prepare(`
      SELECT t.*, u.name AS assigned_to_name, jr.name AS assigned_role_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN job_roles jr ON jr.id = t.assigned_role_id
      WHERE t.status != 'completed' AND t.due_date < date('now')
      ORDER BY t.due_date ASC
    `).all();

    const openIncidents = db.prepare(`
      SELECT i.*, u.name AS reported_by_name
      FROM incidents i JOIN users u ON u.id = i.reported_by
      WHERE i.status = 'open'
      ORDER BY
        CASE i.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        i.reported_at DESC
    `).all();

    res.json({ categories, recentRuns, overdueTasks, openIncidents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Training Matrix (admin) ──────────────────────────────────────────────────

router.get('/training-matrix', (req, res) => {
  try {
    const roles = db.prepare('SELECT * FROM job_roles ORDER BY name').all();
    const courses = db.prepare('SELECT * FROM courses ORDER BY created_at').all();

    const matrix = roles.map(role => {
      const assignedCourseIds = db.prepare(
        'SELECT course_id FROM role_courses WHERE role_id = ?'
      ).all(role.id).map(r => r.course_id);

      const users = db.prepare(
        'SELECT id, name FROM users WHERE job_role_id = ? AND role = \'user\''
      ).all(role.id);

      const userProgress = users.map(user => {
        const courseData = courses.map(course => {
          if (!assignedCourseIds.includes(course.id)) return { courseId: course.id, assigned: false };
          const lessons = db.prepare('SELECT id FROM lessons WHERE course_id = ?').all(course.id);
          let done = 0;
          if (lessons.length > 0) {
            const ph = lessons.map(() => '?').join(',');
            done = db.prepare(
              `SELECT COUNT(*) as c FROM user_progress WHERE user_id=? AND lesson_id IN (${ph}) AND completed=1`
            ).get(user.id, ...lessons.map(l => l.id)).c;
          }
          const pct = lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0;
          const qa = db.prepare(
            `SELECT passed FROM quiz_attempts WHERE user_id=? AND lesson_id IN (SELECT id FROM lessons WHERE course_id=? AND has_quiz=1) ORDER BY attempted_at DESC LIMIT 1`
          ).get(user.id, course.id);
          return { courseId: course.id, assigned: true, total: lessons.length, completed: done, percent: pct, quizPassed: qa?.passed === 1 };
        });
        const assigned = courseData.filter(c => c.assigned);
        const overall = assigned.length > 0
          ? Math.round(assigned.reduce((s, c) => s + c.percent, 0) / assigned.length)
          : 0;
        return { userId: user.id, userName: user.name, courses: courseData, overallPercent: overall };
      });

      return {
        roleId: role.id, roleName: role.name, roleColor: role.color,
        assignedCourseIds, userProgress
      };
    });

    res.json({ roles, courses, matrix });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Users CRUD ───────────────────────────────────────────────────────────────

router.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT u.*, jr.name as job_role_name, jr.color as job_role_color
    FROM users u LEFT JOIN job_roles jr ON u.job_role_id = jr.id
    ORDER BY u.created_at DESC
  `).all();
  res.json(users.map(u => ({ ...safeUser(u), progress: calcProgress(u.id, u.job_role_id) })));
});

router.post('/users', (req, res) => {
  const {
    title, given_name, last_name, employee_code, employee_type,
    email, password, department, job_role_id, role, employment_contract
  } = req.body;

  const name = [given_name, last_name].filter(Boolean).join(' ').trim() || req.body.name || '';
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Given name, last name, email and password are required' });

  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email))
    return res.status(409).json({ error: 'Email already in use' });

  if (employee_code && db.prepare('SELECT id FROM users WHERE employee_code = ?').get(employee_code))
    return res.status(409).json({ error: 'Employee ID already in use' });

  // New employees must complete onboarding (TFN/bank/super) on first login
  const onboarding_completed = (employee_type === 'new') ? 0 : 1;
  const hash = bcrypt.hashSync(password, 10);
  const newId = db.prepare(`
    INSERT INTO users
      (name, title, given_name, last_name, employee_code, employee_type,
       email, password, department, job_role_id, role,
       employment_contract, onboarding_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, title || null, given_name || null, last_name || null, employee_code || null, employee_type || 'existing',
    email, hash, department || null, job_role_id || null, role || 'user',
    employment_contract || null, onboarding_completed
  ).lastInsertRowid;

  const courses = getAssignedCourses(job_role_id);
  db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run(
    newId, 'Welcome to the Training Portal! 🎉',
    `Your account has been created${courses.length > 0 ? ` and you have been assigned ${courses.length} training course${courses.length !== 1 ? 's' : ''}` : ''}. Start your training from the dashboard.`,
    'info'
  );

  const created = db.prepare(`
    SELECT u.*, jr.name as job_role_name, jr.color as job_role_color
    FROM users u LEFT JOIN job_roles jr ON u.job_role_id = jr.id WHERE u.id = ?
  `).get(newId);
  res.status(201).json({ ...safeUser(created), progress: calcProgress(newId, job_role_id) });
});

router.put('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const {
    title, given_name, last_name, employee_code, employee_type,
    email, password, department, job_role_id, role, employment_contract
  } = req.body;

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!existing) return res.status(404).json({ error: 'User not found' });

  if (db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId))
    return res.status(409).json({ error: 'Email already in use' });

  if (employee_code && db.prepare('SELECT id FROM users WHERE employee_code = ? AND id != ?').get(employee_code, userId))
    return res.status(409).json({ error: 'Employee ID already in use' });

  const name = [given_name, last_name].filter(Boolean).join(' ').trim() || req.body.name || existing.name;
  const hash = (password && password.trim()) ? bcrypt.hashSync(password, 10) : existing.password;
  const roleChanged = existing.job_role_id !== (job_role_id || null);

  db.prepare(`
    UPDATE users SET
      name=?, title=?, given_name=?, last_name=?, employee_code=?, employee_type=?,
      email=?, password=?, department=?, job_role_id=?, role=?,
      employment_contract=?
    WHERE id=?
  `).run(
    name, title || null, given_name || null, last_name || null, employee_code || null, employee_type || 'existing',
    email, hash, department || null, job_role_id || null, role || 'user',
    employment_contract || null,
    userId
  );

  if (roleChanged) {
    const courses = getAssignedCourses(job_role_id);
    db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run(
      userId, 'Training Modules Updated',
      `Your training role has been updated. You now have ${courses.length} course${courses.length !== 1 ? 's' : ''} assigned. Please check your dashboard.`,
      'info'
    );
  }

  const updated = db.prepare(`
    SELECT u.*, jr.name as job_role_name, jr.color as job_role_color
    FROM users u LEFT JOIN job_roles jr ON u.job_role_id = jr.id WHERE u.id = ?
  `).get(userId);
  res.json({ ...safeUser(updated), progress: calcProgress(userId, job_role_id) });
});

router.delete('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  if (userId === req.user.id)
    return res.status(400).json({ error: 'Cannot delete your own account' });
  if (!db.prepare('SELECT id FROM users WHERE id = ?').get(userId))
    return res.status(404).json({ error: 'User not found' });

  db.prepare('DELETE FROM user_progress WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM quiz_attempts WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ success: true });
});

// ─── Job Roles CRUD ───────────────────────────────────────────────────────────

// Hardcoded name → department map used as a guaranteed fallback
// so the department is always present in the API response even on old DBs
const ROLE_DEPT_MAP = {
  'HR': 'Office', 'Accountant': 'Office', 'IT': 'Office',
  'Warehouse Admin': 'Warehouse', 'Forklift': 'Warehouse', 'Pick & Packer': 'Warehouse', 'Pure Packer': 'Warehouse',
  'Team Leader': 'Manufacturing', 'Supervisor': 'Manufacturing',
  'Production Manager': 'Manufacturing', 'Head of Operations': 'Manufacturing', 'Production Worker': 'Manufacturing',
};

router.get('/roles', (req, res) => {
  const roles = db.prepare('SELECT * FROM job_roles ORDER BY name ASC').all();
  const allCourses = db.prepare('SELECT * FROM courses ORDER BY created_at ASC').all();
  const enriched = roles.map(r => ({
    ...r,
    // Guarantee department is always set: DB value → name-based lookup → null
    department: r.department || ROLE_DEPT_MAP[r.name] || null,
    userCount: db.prepare('SELECT COUNT(*) as c FROM users WHERE job_role_id = ?').get(r.id).c,
    courses: db.prepare(`
      SELECT c.id, c.title, c.color, c.icon FROM courses c
      INNER JOIN role_courses rc ON c.id = rc.course_id WHERE rc.role_id = ?
    `).all(r.id)
  }));
  res.json({ roles: enriched, allCourses });
});

router.post('/roles', (req, res) => {
  const { name, color, description, courseIds } = req.body;
  if (!name) return res.status(400).json({ error: 'Role name is required' });
  if (db.prepare('SELECT id FROM job_roles WHERE name = ?').get(name))
    return res.status(409).json({ error: 'Role name already exists' });

  const roleId = db.prepare('INSERT INTO job_roles (name, color, description) VALUES (?, ?, ?)')
    .run(name, color || '#7C3AED', description || null).lastInsertRowid;

  if (courseIds?.length > 0) {
    const ins = db.prepare('INSERT INTO role_courses (role_id, course_id) VALUES (?, ?)');
    courseIds.forEach(cid => ins.run(roleId, cid));
  }

  const created = db.prepare('SELECT * FROM job_roles WHERE id = ?').get(roleId);
  res.status(201).json({
    ...created, userCount: 0,
    courses: db.prepare('SELECT c.id, c.title, c.color FROM courses c INNER JOIN role_courses rc ON c.id = rc.course_id WHERE rc.role_id = ?').all(roleId)
  });
});

router.put('/roles/:id', (req, res) => {
  const roleId = parseInt(req.params.id);
  const { name, color, description } = req.body;
  if (!db.prepare('SELECT id FROM job_roles WHERE id = ?').get(roleId))
    return res.status(404).json({ error: 'Role not found' });

  db.prepare('UPDATE job_roles SET name=?, color=?, description=? WHERE id=?')
    .run(name, color, description || null, roleId);

  const updated = db.prepare('SELECT * FROM job_roles WHERE id = ?').get(roleId);
  res.json({
    ...updated,
    userCount: db.prepare('SELECT COUNT(*) as c FROM users WHERE job_role_id = ?').get(roleId).c,
    courses: db.prepare('SELECT c.id, c.title, c.color FROM courses c INNER JOIN role_courses rc ON c.id = rc.course_id WHERE rc.role_id = ?').all(roleId)
  });
});

router.put('/roles/:id/courses', (req, res) => {
  const roleId = parseInt(req.params.id);
  const { courseIds } = req.body;
  if (!db.prepare('SELECT id FROM job_roles WHERE id = ?').get(roleId))
    return res.status(404).json({ error: 'Role not found' });

  db.prepare('DELETE FROM role_courses WHERE role_id = ?').run(roleId);
  if (courseIds?.length > 0) {
    const ins = db.prepare('INSERT INTO role_courses (role_id, course_id) VALUES (?, ?)');
    courseIds.forEach(cid => ins.run(roleId, cid));
    // Notify affected users
    db.prepare('SELECT id FROM users WHERE job_role_id = ?').all(roleId).forEach(u => {
      db.prepare('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)')
        .run(u.id, 'Training Modules Updated',
          'Your assigned training modules have been updated by an administrator. Please check your dashboard.', 'info');
    });
  }
  res.json({ success: true });
});

router.delete('/roles/:id', (req, res) => {
  const roleId = parseInt(req.params.id);
  if (!db.prepare('SELECT id FROM job_roles WHERE id = ?').get(roleId))
    return res.status(404).json({ error: 'Role not found' });
  db.prepare('UPDATE users SET job_role_id = NULL WHERE job_role_id = ?').run(roleId);
  db.prepare('DELETE FROM role_courses WHERE role_id = ?').run(roleId);
  db.prepare('DELETE FROM job_roles WHERE id = ?').run(roleId);
  res.json({ success: true });
});

// ─── Reports ──────────────────────────────────────────────────────────────────

router.get('/reports', (req, res) => {
  const { status, job_role_id, department } = req.query;

  let q = `SELECT u.id, u.name, u.email, u.department, u.created_at, u.job_role_id,
           jr.name as job_role_name, jr.color as job_role_color
           FROM users u LEFT JOIN job_roles jr ON u.job_role_id = jr.id
           WHERE u.role = 'user'`;
  const params = [];
  if (job_role_id) { q += ' AND u.job_role_id = ?'; params.push(job_role_id); }
  if (department)  { q += ' AND u.department = ?';  params.push(department); }
  q += ' ORDER BY u.name ASC';

  let users = db.prepare(q).all(...params).map(u => ({
    ...u, ...calcProgress(u.id, u.job_role_id)
  }));

  if (status) users = users.filter(u => u.status === status);

  const departments = [...new Set(
    db.prepare("SELECT DISTINCT department FROM users WHERE role='user' AND department IS NOT NULL").all().map(r => r.department)
  )];

  res.json({
    users,
    summary: {
      total: users.length,
      completed:  users.filter(u => u.status === 'completed').length,
      inProgress: users.filter(u => u.status === 'in_progress').length,
      notStarted: users.filter(u => u.status === 'not_started').length
    },
    departments
  });
});

router.get('/reports/csv', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.department, u.job_role_id,
           jr.name as job_role_name
    FROM users u LEFT JOIN job_roles jr ON u.job_role_id = jr.id
    WHERE u.role = 'user' ORDER BY u.name ASC
  `).all();

  const rows = [['Name','Email','Department','Job Role','Course','Lessons Completed','Total Lessons','Progress %','Status','Assessment Passed']];

  users.forEach(u => {
    const courses = getAssignedCourses(u.job_role_id);
    if (courses.length === 0) {
      rows.push([u.name, u.email, u.department||'', u.job_role_name||'Unassigned','No courses assigned','0','0','0%','Not Started','']);
    } else {
      courses.forEach(c => {
        const lessons = db.prepare('SELECT id FROM lessons WHERE course_id = ?').all(c.id);
        let done = 0;
        if (lessons.length > 0) {
          const ph = lessons.map(() => '?').join(',');
          done = db.prepare(`SELECT COUNT(*) as cnt FROM user_progress WHERE user_id = ? AND lesson_id IN (${ph}) AND completed = 1`).get(u.id, ...lessons.map(l => l.id)).cnt;
        }
        const pct = lessons.length > 0 ? Math.round((done/lessons.length)*100) : 0;
        const st = done === 0 ? 'Not Started' : done < lessons.length ? 'In Progress' : 'Completed';
        const qa = db.prepare(`SELECT passed FROM quiz_attempts WHERE user_id = ? AND lesson_id IN (SELECT id FROM lessons WHERE course_id = ? AND has_quiz = 1) ORDER BY attempted_at DESC LIMIT 1`).get(u.id, c.id);
        rows.push([u.name, u.email, u.department||'', u.job_role_name||'Unassigned', c.title, done.toString(), lessons.length.toString(), `${pct}%`, st, qa ? (qa.passed?'Yes':'No') : 'N/A']);
      });
    }
  });

  const csv = rows.map(r => r.map(cell => `"${String(cell||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="training-report-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
});

module.exports = router;
