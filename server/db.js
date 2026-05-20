const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'lms.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS job_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#7C3AED',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    department TEXT,
    job_role_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_role_id) REFERENCES job_roles(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    color TEXT DEFAULT '#7C3AED',
    icon TEXT DEFAULT 'warehouse',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS role_courses (
    role_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    PRIMARY KEY (role_id, course_id),
    FOREIGN KEY (role_id) REFERENCES job_roles(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    duration TEXT DEFAULT '5:00',
    order_index INTEGER DEFAULT 0,
    has_quiz INTEGER DEFAULT 0,
    FOREIGN KEY (course_id) REFERENCES courses(id)
  );

  CREATE TABLE IF NOT EXISTS quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL,
    question TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
  );

  CREATE TABLE IF NOT EXISTS quiz_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    option_text TEXT NOT NULL,
    is_correct INTEGER DEFAULT 0,
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id)
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lesson_id INTEGER NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at DATETIME,
    UNIQUE(user_id, lesson_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lesson_id INTEGER NOT NULL,
    score INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    passed INTEGER DEFAULT 0,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- ── Compliance & Safety ────────────────────────────────────────────────────

  CREATE TABLE IF NOT EXISTS compliance_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '✅',
    color TEXT DEFAULT '#7C3AED',
    order_index INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS checklists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category_id INTEGER,
    frequency TEXT DEFAULT 'daily',
    assigned_role_id INTEGER,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES compliance_categories(id),
    FOREIGN KEY (assigned_role_id) REFERENCES job_roles(id)
  );

  CREATE TABLE IF NOT EXISTS checklist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    checklist_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_critical INTEGER DEFAULT 0,
    FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS checklist_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    checklist_id INTEGER NOT NULL,
    completed_by INTEGER NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    status TEXT DEFAULT 'in_progress',
    overall_notes TEXT,
    FOREIGN KEY (checklist_id) REFERENCES checklists(id),
    FOREIGN KEY (completed_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS checklist_item_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    completion_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    checked INTEGER DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (completion_id) REFERENCES checklist_completions(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES checklist_items(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    assigned_to INTEGER,
    assigned_role_id INTEGER,
    due_date TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    created_by INTEGER,
    notes TEXT,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_role_id) REFERENCES job_roles(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    severity TEXT DEFAULT 'low',
    reported_by INTEGER NOT NULL,
    injured_party TEXT,
    first_aid_given INTEGER DEFAULT 0,
    first_aider TEXT,
    action_taken TEXT,
    follow_up_required INTEGER DEFAULT 0,
    follow_up_notes TEXT,
    status TEXT DEFAULT 'open',
    occurred_at TEXT,
    reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    FOREIGN KEY (reported_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT,
    summary TEXT,
    content TEXT,
    version TEXT DEFAULT '1.0',
    applies_to TEXT,
    is_active INTEGER DEFAULT 1,
    created_by INTEGER,
    reviewed_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
`);

// ── Migrations for existing databases ─────────────────────────────────────────
try { db.exec('ALTER TABLE users ADD COLUMN job_role_id INTEGER REFERENCES job_roles(id) ON DELETE SET NULL'); } catch (_) {}

module.exports = db;
