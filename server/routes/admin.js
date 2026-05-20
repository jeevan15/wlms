const express = require('express');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken, requireAdmin);

router.get('/users', (req, res) => {
  const users = db.prepare(
    'SELECT id, name, email, role, department, created_at FROM users ORDER BY created_at ASC'
  ).all();

  const courses = db.prepare('SELECT id, title FROM courses').all();

  const enriched = users.map(user => {
    const courseProgress = courses.map(course => {
      const lessons = db.prepare('SELECT id FROM lessons WHERE course_id = ?').all(course.id);
      const total = lessons.length;
      let completed = 0;
      if (total > 0) {
        const ids = lessons.map(l => l.id);
        const placeholders = ids.map(() => '?').join(',');
        completed = db.prepare(
          `SELECT COUNT(*) as c FROM user_progress WHERE user_id = ? AND lesson_id IN (${placeholders}) AND completed = 1`
        ).get(user.id, ...ids).c;
      }
      const lastAttempt = db.prepare(
        `SELECT passed, score, total FROM quiz_attempts WHERE user_id = ? AND lesson_id IN (SELECT id FROM lessons WHERE course_id = ? AND has_quiz = 1) ORDER BY attempted_at DESC LIMIT 1`
      ).get(user.id, course.id);

      return {
        courseId: course.id,
        title: course.title,
        total,
        completed,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        quizPassed: lastAttempt?.passed === 1,
        quizScore: lastAttempt ? `${lastAttempt.score}/${lastAttempt.total}` : null
      };
    });

    return { ...user, courseProgress };
  });

  res.json(enriched);
});

router.get('/stats', (req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'user'").get().c;
  const totalCourses = db.prepare('SELECT COUNT(*) as c FROM courses').get().c;
  const totalCompletions = db.prepare('SELECT COUNT(*) as c FROM user_progress WHERE completed = 1').get().c;
  const totalQuizPasses = db.prepare('SELECT COUNT(*) as c FROM quiz_attempts WHERE passed = 1').get().c;

  res.json({ totalUsers, totalCourses, totalCompletions, totalQuizPasses });
});

module.exports = router;
