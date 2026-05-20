const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper: get courses for a user (role-based or all if no role assigned)
function getCoursesForUser(userId, isAdmin, jobRoleId) {
  if (isAdmin) return db.prepare('SELECT * FROM courses ORDER BY created_at ASC').all();
  if (jobRoleId) {
    return db.prepare(`
      SELECT c.* FROM courses c
      INNER JOIN role_courses rc ON c.id = rc.course_id
      WHERE rc.role_id = ? ORDER BY c.created_at ASC
    `).all(jobRoleId);
  }
  return db.prepare('SELECT * FROM courses ORDER BY created_at ASC').all();
}

router.get('/', authenticateToken, (req, res) => {
  const userRow = db.prepare('SELECT job_role_id FROM users WHERE id = ?').get(req.user.id);
  const courses = getCoursesForUser(req.user.id, req.user.role === 'admin', userRow?.job_role_id);

  const enriched = courses.map(course => {
    const lessons = db.prepare('SELECT id FROM lessons WHERE course_id = ?').all(course.id);
    let completedCount = 0;
    if (lessons.length > 0) {
      const ph = lessons.map(() => '?').join(',');
      completedCount = db.prepare(
        `SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND lesson_id IN (${ph}) AND completed = 1`
      ).get(req.user.id, ...lessons.map(l => l.id)).count;
    }
    return { ...course, totalLessons: lessons.length, completedLessons: completedCount };
  });

  res.json(enriched);
});

router.get('/:id', authenticateToken, (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  // Access check: non-admins can only access courses assigned to their role
  if (req.user.role !== 'admin') {
    const userRow = db.prepare('SELECT job_role_id FROM users WHERE id = ?').get(req.user.id);
    if (userRow?.job_role_id) {
      const assigned = db.prepare(
        'SELECT 1 FROM role_courses WHERE role_id = ? AND course_id = ?'
      ).get(userRow.job_role_id, req.params.id);
      if (!assigned) return res.status(403).json({ error: 'Not assigned to this course' });
    }
  }

  const lessons = db.prepare(
    'SELECT id, title, duration, order_index, has_quiz FROM lessons WHERE course_id = ? ORDER BY order_index ASC'
  ).all(req.params.id);

  let completedIds = [];
  if (lessons.length > 0) {
    const ph = lessons.map(() => '?').join(',');
    completedIds = db.prepare(
      `SELECT lesson_id FROM user_progress WHERE user_id = ? AND lesson_id IN (${ph}) AND completed = 1`
    ).all(req.user.id, ...lessons.map(l => l.id)).map(r => r.lesson_id);
  }

  res.json({
    ...course,
    lessons: lessons.map(l => ({ ...l, completed: completedIds.includes(l.id) }))
  });
});

router.get('/:courseId/lessons/:lessonId', authenticateToken, (req, res) => {
  const lesson = db.prepare(
    'SELECT * FROM lessons WHERE id = ? AND course_id = ?'
  ).get(req.params.lessonId, req.params.courseId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  const progress = db.prepare(
    'SELECT completed, completed_at FROM user_progress WHERE user_id = ? AND lesson_id = ?'
  ).get(req.user.id, lesson.id);

  let quiz = null;
  if (lesson.has_quiz) {
    const questions = db.prepare(
      'SELECT * FROM quiz_questions WHERE lesson_id = ? ORDER BY order_index ASC'
    ).all(lesson.id);
    quiz = questions.map(q => ({
      ...q,
      options: db.prepare('SELECT id, option_text FROM quiz_options WHERE question_id = ?').all(q.id)
    }));
  }

  const allLessons = db.prepare(
    'SELECT id, order_index FROM lessons WHERE course_id = ? ORDER BY order_index ASC'
  ).all(req.params.courseId);
  const idx = allLessons.findIndex(l => l.id === lesson.id);

  const lastAttempt = db.prepare(
    'SELECT score, total, passed FROM quiz_attempts WHERE user_id = ? AND lesson_id = ? ORDER BY attempted_at DESC LIMIT 1'
  ).get(req.user.id, lesson.id);

  res.json({
    ...lesson,
    completed: progress?.completed === 1,
    completed_at: progress?.completed_at,
    quiz,
    lastAttempt: lastAttempt || null,
    prevLessonId: idx > 0 ? allLessons[idx - 1].id : null,
    nextLessonId: idx < allLessons.length - 1 ? allLessons[idx + 1].id : null
  });
});

router.post('/:courseId/lessons/:lessonId/complete', authenticateToken, (req, res) => {
  const lesson = db.prepare(
    'SELECT id FROM lessons WHERE id = ? AND course_id = ?'
  ).get(req.params.lessonId, req.params.courseId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  db.prepare(`
    INSERT INTO user_progress (user_id, lesson_id, completed, completed_at)
    VALUES (?, ?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, lesson_id) DO UPDATE SET completed = 1, completed_at = CURRENT_TIMESTAMP
  `).run(req.user.id, lesson.id);

  res.json({ success: true });
});

router.post('/:courseId/lessons/:lessonId/quiz', authenticateToken, (req, res) => {
  const { answers } = req.body;
  const lesson = db.prepare(
    'SELECT id FROM lessons WHERE id = ? AND course_id = ? AND has_quiz = 1'
  ).get(req.params.lessonId, req.params.courseId);
  if (!lesson) return res.status(404).json({ error: 'Quiz not found' });

  const questions = db.prepare('SELECT id FROM quiz_questions WHERE lesson_id = ?').all(lesson.id);
  let score = 0;
  const results = {};

  questions.forEach(q => {
    const correct = db.prepare('SELECT id FROM quiz_options WHERE question_id = ? AND is_correct = 1').get(q.id);
    const isCorrect = correct && String(answers[q.id]) === String(correct.id);
    if (isCorrect) score++;
    results[q.id] = { correct: isCorrect, correctId: correct?.id };
  });

  const total = questions.length;
  const passed = total > 0 && score / total >= 0.7;

  db.prepare('INSERT INTO quiz_attempts (user_id, lesson_id, score, total, passed) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, lesson.id, score, total, passed ? 1 : 0);

  if (passed) {
    db.prepare(`
      INSERT INTO user_progress (user_id, lesson_id, completed, completed_at)
      VALUES (?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, lesson_id) DO UPDATE SET completed = 1, completed_at = CURRENT_TIMESTAMP
    `).run(req.user.id, lesson.id);
  }

  res.json({ score, total, passed, results });
});

module.exports = router;
