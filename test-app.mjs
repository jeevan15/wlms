const BASE = 'http://localhost:5000/api';
let passed = 0, failed = 0, warnings = 0;
const results = [];

const log = (status, group, name, detail = '') => {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  results.push({ status, group, name, detail });
  console.log(`${icon} [${group}] ${name}${detail ? ' — ' + detail : ''}`);
  if (status === 'PASS') passed++;
  else if (status === 'FAIL') failed++;
  else warnings++;
};

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

// ── 1. AUTH ──────────────────────────────────────────────────────────────────
console.log('\n──── 1. AUTH ─────────────────────────────────────────────────────');

let r = await req('POST', '/auth/login', { email: 'wrong@test.com', password: 'bad' });
r.status === 401 ? log('PASS','Auth','Rejects invalid credentials') : log('FAIL','Auth','Rejects invalid credentials', `got ${r.status}`);

r = await req('POST', '/auth/login', { email: '' });
r.status === 400 ? log('PASS','Auth','Rejects empty fields') : log('FAIL','Auth','Rejects empty fields', `got ${r.status}`);

r = await req('POST', '/auth/login', { email: 'admin@warehouse.com', password: 'admin123' });
const adminToken = r.data?.token;
r.status === 200 && adminToken ? log('PASS','Auth','Admin login succeeds', `token OK`) : log('FAIL','Auth','Admin login succeeds', `got ${r.status}`);

r = await req('POST', '/auth/login', { email: 'john.smith@warehouse.com', password: 'user123' });
const userToken = r.data?.token;
r.status === 200 && userToken ? log('PASS','Auth','User login via email', `onboarding_completed=${r.data?.user?.onboarding_completed}`) : log('FAIL','Auth','User login via email', `got ${r.status}`);

r = await req('POST', '/auth/login', { email: 'EMP001', password: 'user123' });
r.status === 200 && r.data?.token ? log('PASS','Auth','Login via Employee ID (EMP001)', `user=${r.data?.user?.name}`) : log('FAIL','Auth','Login via Employee ID', `got ${r.status}`);

r = await req('GET', '/admin/users');
r.status === 401 || r.status === 403 ? log('PASS','Auth','Blocks unauthenticated request') : log('FAIL','Auth','Blocks unauthenticated request', `got ${r.status}`);

r = await req('GET', '/admin/users', null, userToken);
r.status === 403 ? log('PASS','Auth','Non-admin blocked from admin routes') : log('FAIL','Auth','Non-admin blocked from admin routes', `got ${r.status}`);

// ── 2. ADMIN: USERS ───────────────────────────────────────────────────────────
console.log('\n──── 2. ADMIN: USERS ─────────────────────────────────────────────');

r = await req('GET', '/admin/users', null, adminToken);
const userList = r.data;
r.status === 200 && Array.isArray(userList)
  ? log('PASS','Admin/Users','GET /admin/users', `${userList.length} users`)
  : log('FAIL','Admin/Users','GET /admin/users', `got ${r.status}`);

Array.isArray(userList) && userList.every(u => !u.password)
  ? log('PASS','Admin/Users','Passwords stripped from all users')
  : log('FAIL','Admin/Users','Passwords stripped from all users');

Array.isArray(userList) && userList.every(u => u.progress !== undefined)
  ? log('PASS','Admin/Users','Progress data on every user')
  : log('FAIL','Admin/Users','Progress data missing on some users');

Array.isArray(userList) && userList.every(u => u.progress?.courseProgress !== undefined)
  ? log('PASS','Admin/Users','courseProgress included on every user')
  : log('WARN','Admin/Users','courseProgress missing on some users');

// Create
r = await req('POST', '/admin/users', {
  title: 'Ms', given_name: 'Temp', last_name: 'User',
  employee_code: 'EMP998', employee_type: 'new',
  email: 'temp.testuser@warehouse.com', password: 'testpass123',
  department: 'Warehouse', job_role_id: null, role: 'user'
}, adminToken);
const newUserId = r.data?.id;
r.status === 201 && newUserId ? log('PASS','Admin/Users','Create new user (POST)', `id=${newUserId}`) : log('FAIL','Admin/Users','Create new user', `got ${r.status}: ${r.data?.error}`);
r.data?.onboarding_completed === 0 ? log('PASS','Admin/Users','New employee has onboarding_completed=0') : log('FAIL','Admin/Users','New employee onboarding flag wrong', `got ${r.data?.onboarding_completed}`);

// Duplicate email
r = await req('POST', '/admin/users', { given_name: 'Dup', last_name: 'User', email: 'temp.testuser@warehouse.com', password: 'pass' }, adminToken);
r.status === 409 ? log('PASS','Admin/Users','Duplicate email rejected (409)') : log('FAIL','Admin/Users','Duplicate email not rejected', `got ${r.status}`);

// Edit
if (newUserId) {
  r = await req('PUT', `/admin/users/${newUserId}`, {
    title: 'Ms', given_name: 'Temp', last_name: 'Edited',
    employee_code: 'EMP998', employee_type: 'new',
    email: 'temp.testuser@warehouse.com', department: 'Warehouse', role: 'user'
  }, adminToken);
  r.status === 200 && r.data?.last_name === 'Edited'
    ? log('PASS','Admin/Users','Edit user (PUT)', `name updated to ${r.data?.name}`)
    : log('FAIL','Admin/Users','Edit user', `got ${r.status}`);

  // Cannot delete self
  r = await req('DELETE', `/admin/users/${newUserId}`, null, adminToken);
  r.status === 200 ? log('PASS','Admin/Users','Delete user (DELETE)') : log('FAIL','Admin/Users','Delete user', `got ${r.status}`);
}

// ── 3. ADMIN: ROLES ───────────────────────────────────────────────────────────
console.log('\n──── 3. ADMIN: ROLES ─────────────────────────────────────────────');

r = await req('GET', '/admin/roles', null, adminToken);
const rolesData = r.data;
r.status === 200 && Array.isArray(rolesData?.roles)
  ? log('PASS','Admin/Roles','GET /admin/roles', `${rolesData.roles.length} roles, ${rolesData.allCourses?.length} courses available`)
  : log('FAIL','Admin/Roles','GET /admin/roles', `got ${r.status}`);

const officeRoles = rolesData?.roles?.filter(x => x.department === 'Office') || [];
const officeNames = officeRoles.map(x => x.name).sort();
JSON.stringify(officeNames) === JSON.stringify(['Accountant','HR','IT'])
  ? log('PASS','Admin/Roles','Office roles = HR, Accountant, IT', officeNames.join(', '))
  : log('FAIL','Admin/Roles','Office roles mismatch', `got: ${officeNames.join(', ')}`);

const warehouseRoles = rolesData?.roles?.filter(x => x.department === 'Warehouse') || [];
warehouseRoles.length === 4
  ? log('PASS','Admin/Roles','Warehouse has 4 roles', warehouseRoles.map(x=>x.name).join(', '))
  : log('FAIL','Admin/Roles','Warehouse role count wrong', `got ${warehouseRoles.length}`);

const mfgRoles = rolesData?.roles?.filter(x => x.department === 'Manufacturing') || [];
mfgRoles.length === 5
  ? log('PASS','Admin/Roles','Manufacturing has 5 roles', `${mfgRoles.length} roles`)
  : log('FAIL','Admin/Roles','Manufacturing role count wrong', `got ${mfgRoles.length}`);

!rolesData?.roles?.some(x => x.name === 'Manufacturing Admin')
  ? log('PASS','Admin/Roles','Manufacturing Admin not a job role (system access only)')
  : log('FAIL','Admin/Roles','Manufacturing Admin should not be a job role');

rolesData?.roles?.every(x => x.department)
  ? log('PASS','Admin/Roles','All roles have department set')
  : log('FAIL','Admin/Roles','Some roles missing department', rolesData?.roles?.filter(x=>!x.department).map(x=>x.name).join(', '));

// ── 4. ADMIN: STATS ───────────────────────────────────────────────────────────
console.log('\n──── 4. ADMIN: STATS ─────────────────────────────────────────────');

r = await req('GET', '/admin/stats', null, adminToken);
r.status === 200 && typeof r.data?.totalUsers === 'number'
  ? log('PASS','Admin/Stats','GET /admin/stats', `users=${r.data.totalUsers}, courses=${r.data.totalCourses}, roles=${r.data.totalRoles}, overdueTasks=${r.data.overdueTasks}`)
  : log('FAIL','Admin/Stats','GET /admin/stats', `got ${r.status}`);

// ── 5. COURSES & LESSONS ──────────────────────────────────────────────────────
console.log('\n──── 5. COURSES & LESSONS ────────────────────────────────────────');

r = await req('GET', '/courses', null, userToken);
const courses = r.data;
r.status === 200 && Array.isArray(courses)
  ? log('PASS','Courses','GET /courses', `${courses.length} courses assigned`)
  : log('FAIL','Courses','GET /courses', `got ${r.status}`);

for (const course of (courses || [])) {
  // Full course with lessons
  r = await req('GET', `/courses/${course.id}`, null, userToken);
  const lessons = r.data?.lessons;
  r.status === 200 && Array.isArray(lessons)
    ? log('PASS','Courses',`"${course.title}" lessons`, `${lessons.length} lessons`)
    : log('FAIL','Courses',`"${course.title}" lessons`, `got ${r.status}`);

  // Individual lesson
  const firstLesson = lessons?.[0];
  if (firstLesson) {
    r = await req('GET', `/courses/${course.id}/lessons/${firstLesson.id}`, null, userToken);
    r.status === 200 && r.data?.content
      ? log('PASS','Courses',`Lesson detail for "${firstLesson.title}"`, `content length: ${r.data.content?.length} chars`)
      : log('FAIL','Courses',`Lesson detail`, `got ${r.status}`);
  }

  // Quiz lesson
  const quizLesson = lessons?.find(l => l.has_quiz);
  if (quizLesson) {
    r = await req('GET', `/courses/${course.id}/lessons/${quizLesson.id}`, null, userToken);
    const quiz = r.data?.quiz;
    r.status === 200 && Array.isArray(quiz) && quiz.length > 0
      ? log('PASS','Courses',`Quiz for "${course.title}"`, `${quiz.length} questions`)
      : log('FAIL','Courses',`Quiz for "${course.title}"`, `got ${r.status}, quiz=${JSON.stringify(quiz)?.slice(0,50)}`);

    quiz?.every(q => q.image_url)
      ? log('PASS','Courses','All quiz questions have image_url')
      : log('WARN','Courses','Some quiz questions missing image_url', quiz?.filter(q=>!q.image_url).map(q=>q.question?.slice(0,30)).join('; '));

    quiz?.every(q => Array.isArray(q.options) && q.options.length === 4)
      ? log('PASS','Courses','All questions have exactly 4 options')
      : log('WARN','Courses','Question option count off', quiz?.map(q=>q.options?.length).join(','));

    // is_correct is intentionally hidden from the client API (answers not exposed before submit)
    // Verify instead that options don't accidentally leak is_correct
    const leaksAnswer = quiz?.some(q => q.options?.some(o => o.is_correct !== undefined));
    leaksAnswer
      ? log('WARN','Courses','Quiz options expose is_correct field (answer leak)')
      : log('PASS','Courses','Quiz options do not expose correct-answer flag (secure)');
  }
}

// ── 6. COMPLIANCE: CHECKLISTS ─────────────────────────────────────────────────
console.log('\n──── 6. COMPLIANCE: CHECKLISTS ───────────────────────────────────');

r = await req('GET', '/compliance/checklists', null, userToken);
const checklists = r.data;
r.status === 200 && Array.isArray(checklists)
  ? log('PASS','Compliance','GET /compliance/checklists', `${checklists.length} checklists`)
  : log('FAIL','Compliance','GET /compliance/checklists', `got ${r.status}`);

const frequencies = [...new Set(checklists?.map(c => c.frequency) || [])];
['daily','weekly','monthly'].forEach(f => {
  checklists?.some(c => c.frequency === f)
    ? log('PASS','Compliance',`${f} checklists exist`, checklists.filter(c=>c.frequency===f).map(c=>c.title).join(', '))
    : log('FAIL','Compliance',`No ${f} checklists found`);
});

r = await req('GET', '/compliance/categories', null, userToken);
r.status === 200 && Array.isArray(r.data)
  ? log('PASS','Compliance','GET /compliance/categories', `${r.data.length} categories: ${r.data.map(c=>c.name).join(', ')}`)
  : log('FAIL','Compliance','GET /compliance/categories', `got ${r.status}`);

// Start a checklist run
if (checklists?.length > 0) {
  const cl = checklists[0];
  r = await req('POST', `/compliance/checklists/${cl.id}/start`, {}, userToken);
  r.status === 200 || r.status === 201
    ? log('PASS','Compliance',`Start checklist run for "${cl.title}"`, `completionId=${r.data?.id}`)
    : log('FAIL','Compliance',`Start checklist run`, `got ${r.status}: ${r.data?.error}`);
}

// ── 7. TASKS ──────────────────────────────────────────────────────────────────
console.log('\n──── 7. TASKS ────────────────────────────────────────────────────');

r = await req('GET', '/tasks', null, adminToken);
const tasksData = r.data;
// Tasks may return array directly or {tasks, stats}
const taskArray = Array.isArray(tasksData) ? tasksData : tasksData?.tasks;
r.status === 200 && (Array.isArray(taskArray))
  ? log('PASS','Tasks','Admin GET /tasks', `${taskArray.length} tasks`)
  : log('FAIL','Tasks','Admin GET /tasks', `got ${r.status}, shape=${JSON.stringify(Object.keys(tasksData||{}))}`);

r = await req('GET', '/tasks', null, userToken);
const userTasks = Array.isArray(r.data) ? r.data : r.data?.tasks;
r.status === 200
  ? log('PASS','Tasks','User GET /tasks (filtered by assignment)', `${userTasks?.length} tasks visible`)
  : log('FAIL','Tasks','User GET /tasks', `got ${r.status}`);

// Admin sees more tasks than a user
const adminCount = Array.isArray(tasksData) ? tasksData.length : tasksData?.tasks?.length;
const userCount  = Array.isArray(r.data) ? r.data.length : r.data?.tasks?.length;
adminCount >= (userCount || 0)
  ? log('PASS','Tasks','Admin sees >= tasks than regular user', `admin=${adminCount}, user=${userCount}`)
  : log('WARN','Tasks','Admin task count unexpected', `admin=${adminCount}, user=${userCount}`);

// ── 8. SOPs ───────────────────────────────────────────────────────────────────
console.log('\n──── 8. SOPs ─────────────────────────────────────────────────────');

r = await req('GET', '/sops', null, userToken);
const sops = r.data;
r.status === 200 && Array.isArray(sops)
  ? log('PASS','SOPs','GET /sops', `${sops.length} SOPs`)
  : log('FAIL','SOPs','GET /sops', `got ${r.status}`);

const expectedSOPs = ['Pick Packer', 'Forklift Driver', 'Cold Room', 'Racking', 'Traffic Management', 'WHS', 'Compliance'];
const sopTitles = sops?.map(s => s.title) || [];
expectedSOPs.forEach(name => {
  sopTitles.some(t => t.includes(name))
    ? log('PASS','SOPs',`SOP exists: "${name}"`)
    : log('FAIL','SOPs',`Missing SOP: "${name}"`, `available: ${sopTitles.join(' | ')}`);
});

// Fetch single SOP
if (sops?.length > 0) {
  r = await req('GET', `/sops/${sops[0].id}`, null, userToken);
  r.status === 200 && r.data?.content
    ? log('PASS','SOPs',`GET /sops/:id detail`, `content length: ${r.data.content?.length} chars`)
    : log('FAIL','SOPs','GET /sops/:id', `got ${r.status}`);
}

// ── 9. INCIDENTS ──────────────────────────────────────────────────────────────
console.log('\n──── 9. INCIDENTS ────────────────────────────────────────────────');

r = await req('GET', '/incidents', null, userToken);
const incidents = Array.isArray(r.data) ? r.data : r.data?.incidents;
r.status === 200 && Array.isArray(incidents)
  ? log('PASS','Incidents','GET /incidents', `${incidents.length} incidents`)
  : log('FAIL','Incidents','GET /incidents', `got ${r.status}`);

// Create incident
r = await req('POST', '/incidents', {
  type: 'near_miss', title: 'Test Near Miss', description: 'Automated test incident',
  location: 'Zone A', severity: 'low', occurred_at: new Date().toISOString().split('T')[0]
}, userToken);
const newIncidentId = r.data?.id;
r.status === 201 && newIncidentId
  ? log('PASS','Incidents','Create incident (POST)', `id=${newIncidentId}`)
  : log('FAIL','Incidents','Create incident', `got ${r.status}: ${r.data?.error}`);

// Close incident (admin)
if (newIncidentId) {
  r = await req('PUT', `/incidents/${newIncidentId}`, { status: 'closed' }, adminToken);
  r.status === 200
    ? log('PASS','Incidents','Update incident status (admin)')
    : log('WARN','Incidents','Update incident', `got ${r.status}`);
}

// ── 10. NOTIFICATIONS ─────────────────────────────────────────────────────────
console.log('\n──── 10. NOTIFICATIONS ───────────────────────────────────────────');

r = await req('GET', '/notifications', null, userToken);
const notifData = r.data;
const notifs = Array.isArray(notifData) ? notifData : notifData?.notifications;
r.status === 200 && Array.isArray(notifs)
  ? log('PASS','Notifications','GET /notifications', `${notifs.length} notifications`)
  : log('FAIL','Notifications','GET /notifications', `got ${r.status}, type=${typeof notifData}`);

r = await req('PUT', '/notifications/read-all', null, userToken);
r.status === 200
  ? log('PASS','Notifications','PUT /notifications/read-all (mark all read)')
  : log('WARN','Notifications','mark-all-read', `got ${r.status}`);

// ── 11. PROFILE ───────────────────────────────────────────────────────────────
console.log('\n──── 11. PROFILE ─────────────────────────────────────────────────');

r = await req('GET', '/profile/me', null, userToken);
r.status === 200 && r.data?.email
  ? log('PASS','Profile','GET /profile/me', `user=${r.data.name}, dept=${r.data.department}, role=${r.data.role}`)
  : log('FAIL','Profile','GET /profile/me', `got ${r.status}`);

r = await req('GET', '/profile/bank-details', null, userToken);
r.status === 200
  ? log('PASS','Profile','GET /profile/bank-details', `keys: ${Object.keys(r.data||{}).join(', ')}`)
  : log('FAIL','Profile','GET /profile/bank-details', `got ${r.status}`);

// ── 12. TRAINING MATRIX ───────────────────────────────────────────────────────
console.log('\n──── 12. ADMIN: TRAINING MATRIX ──────────────────────────────────');

r = await req('GET', '/admin/training-matrix', null, adminToken);
r.status === 200 && Array.isArray(r.data?.matrix)
  ? log('PASS','Matrix','GET /admin/training-matrix', `${r.data.matrix.length} role rows, ${r.data.courses?.length} courses`)
  : log('FAIL','Matrix','GET /admin/training-matrix', `got ${r.status}`);

r = await req('GET', '/admin/compliance/overview', null, adminToken);
r.status === 200 && r.data?.categories
  ? log('PASS','Matrix','GET /admin/compliance/overview', `${r.data.categories?.length} categories, ${r.data.openIncidents?.length} open incidents`)
  : log('FAIL','Matrix','GET /admin/compliance/overview', `got ${r.status}`);

// ── 13. EDGE CASES ────────────────────────────────────────────────────────────
console.log('\n──── 13. EDGE CASES ──────────────────────────────────────────────');

// 404 for unknown route
r = await req('GET', '/nonexistent-route', null, adminToken);
r.status === 404 ? log('PASS','EdgeCases','Unknown route returns 404') : log('WARN','EdgeCases','Unknown route', `got ${r.status}`);

// Create user without required fields
r = await req('POST', '/admin/users', { email: 'missing@test.com' }, adminToken);
r.status === 400 || r.status === 422
  ? log('PASS','EdgeCases','Create user with missing required fields rejected', `got ${r.status}`)
  : log('FAIL','EdgeCases','Missing fields should be rejected', `got ${r.status}`);

// Delete non-existent user
r = await req('DELETE', '/admin/users/99999', null, adminToken);
r.status === 404
  ? log('PASS','EdgeCases','Delete non-existent user returns 404')
  : log('WARN','EdgeCases','Delete non-existent user', `got ${r.status}`);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════');
console.log(`  FINAL:  ✅ ${passed} passed   ❌ ${failed} failed   ⚠️  ${warnings} warnings`);
console.log(`  TOTAL TESTS: ${passed + failed + warnings}`);
console.log('══════════════════════════════════════════════════════════════════');
if (failed > 0) {
  console.log('\n❌ FAILURES:');
  results.filter(r => r.status === 'FAIL').forEach(r => console.log(`   [${r.group}] ${r.name}${r.detail ? ' — ' + r.detail : ''}`));
}
if (warnings > 0) {
  console.log('\n⚠️  WARNINGS:');
  results.filter(r => r.status === 'WARN').forEach(r => console.log(`   [${r.group}] ${r.name}${r.detail ? ' — ' + r.detail : ''}`));
}
