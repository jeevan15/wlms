import { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

// ── Department → role names mapping ──────────────────────────────────────────
const DEPT_ROLE_NAMES = {
  Office:        ['HR', 'Accountant', 'IT'],
  Warehouse:     ['Warehouse Admin', 'Forklift', 'Pick & Packer', 'Pure Packer'],
  Manufacturing: ['Team Leader', 'Supervisor', 'Production Manager', 'Head of Operations', 'Production Worker'],
};

// ── Department → system access options ───────────────────────────────────────
// value maps to users.role in the DB ('user' = standard, 'admin' = elevated)
const SYSTEM_ACCESS_OPTS = {
  Office:        [{ value: 'user', label: 'Admin Access' },  { value: 'admin', label: 'Full Access' }],
  Warehouse:     [{ value: 'user', label: 'Worker' },        { value: 'admin', label: 'Warehouse Admin' }],
  Manufacturing: [{ value: 'user', label: 'Worker' },        { value: 'admin', label: 'Manufacturing Admin' }],
};
const DEFAULT_ACCESS_OPTS = [
  { value: 'user',  label: 'Standard Access' },
  { value: 'admin', label: 'Full Access' },
];

// Employment contract auto-assigned by role name
const CONTRACT_BY_ROLE = {
  'HR':                     'HR Staff Employment Agreement',
  'Accountant':             'Accounting Staff Employment Agreement',
  'IT':                     'IT Staff Employment Agreement',
  'Warehouse Admin':        'Warehouse Administrator Employment Agreement',
  'Forklift':               'Forklift Operator Employment Agreement',
  'Pick & Packer':          'Picker & Packer Employment Agreement',
  'Pure Packer':            'Packer Employment Agreement',
  'Team Leader':            'Team Leader Employment Agreement',
  'Supervisor':             'Supervisor Employment Agreement',
  'Production Manager':     'Production Manager Agreement',
  'Head of Operations':     'Head of Operations Agreement',
  'Production Worker':      'Production Worker Employment Agreement',
};

const DEPARTMENTS = Object.keys(DEPT_ROLE_NAMES);

const TITLES = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Other'];

const BLANK_FORM = {
  employee_type: 'existing',
  title: '', given_name: '', last_name: '', employee_code: '', email: '', password: '',
  department: '', job_role_id: '', role: 'user', employment_contract: '',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 overflow-y-auto"
         onClick={onClose}>
      <div className="bg-surface-800 border border-surface-600 rounded-2xl w-full max-w-2xl shadow-2xl my-6"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-600">
          <h2 className="font-bold text-white text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    completed:   { label: 'Completed',   cls: 'bg-green-900/40 text-green-400 border-green-700' },
    in_progress: { label: 'In Progress', cls: 'bg-yellow-900/40 text-yellow-400 border-yellow-700' },
    not_started: { label: 'Not Started', cls: 'bg-surface-600 text-gray-400 border-surface-500' },
  };
  const { label, cls } = map[status] || map.not_started;
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${cls}`}>{label}</span>;
}

function FieldRow({ label, required, hint, children }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
        {hint && <span className="text-gray-600 font-normal ml-1">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

// ── Password policy helpers ───────────────────────────────────────────────────

const PW_RULES = [
  { key: 'len',     label: 'At least 8 characters',          test: v => v.length >= 8 },
  { key: 'upper',   label: 'One uppercase letter (A–Z)',      test: v => /[A-Z]/.test(v) },
  { key: 'lower',   label: 'One lowercase letter (a–z)',      test: v => /[a-z]/.test(v) },
  { key: 'digit',   label: 'One number (0–9)',                test: v => /[0-9]/.test(v) },
  { key: 'special', label: 'One special character (!@#$ …)',  test: v => /[^A-Za-z0-9]/.test(v) },
];

function getPwStrength(value) {
  if (!value) return { score: 0, label: '', color: '' };
  const met = PW_RULES.filter(r => r.test(value)).length;
  if (met <= 1) return { score: 1, label: 'Weak',       color: 'bg-red-500' };
  if (met === 2) return { score: 2, label: 'Fair',       color: 'bg-orange-500' };
  if (met === 3) return { score: 3, label: 'Good',       color: 'bg-yellow-400' };
  if (met === 4) return { score: 4, label: 'Strong',     color: 'bg-emerald-400' };
  return              { score: 5, label: 'Very Strong', color: 'bg-green-400' };
}

function PasswordField({ value, onChange, required, placeholder, showPolicy }) {
  const [show,    setShow]    = useState(false);
  const [focused, setFocused] = useState(false);

  const strength  = getPwStrength(value);
  const showMeter = showPolicy && (focused || value.length > 0);

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="input pr-10"
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          autoComplete="new-password"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-sm select-none"
          tabIndex={-1}
        >
          {show ? '🙈' : '👁️'}
        </button>
      </div>

      {/* Strength bar */}
      {showMeter && (
        <>
          <div className="flex gap-1 h-1.5">
            {[1,2,3,4,5].map(i => (
              <div key={i}
                   className={`flex-1 rounded-full transition-colors duration-200 ${
                     i <= strength.score ? strength.color : 'bg-surface-600'
                   }`} />
            ))}
          </div>
          <p className={`text-xs font-medium ${
            strength.score <= 1 ? 'text-red-400' :
            strength.score === 2 ? 'text-orange-400' :
            strength.score === 3 ? 'text-yellow-400' :
            'text-emerald-400'
          }`}>
            {strength.label && `Strength: ${strength.label}`}
          </p>

          {/* Requirements checklist */}
          <ul className="space-y-1 mt-1">
            {PW_RULES.map(rule => {
              const met = rule.test(value);
              return (
                <li key={rule.key} className={`flex items-center gap-2 text-xs transition-colors ${
                  met ? 'text-emerald-400' : 'text-gray-500'
                }`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${
                    met ? 'bg-emerald-500/30 text-emerald-400' : 'bg-surface-600 text-gray-600'
                  }`}>
                    {met ? '✓' : '·'}
                  </span>
                  {rule.label}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

// ── Email validation helper ───────────────────────────────────────────────────

function validateEmailFmt(email) {
  if (!email) return 'Email is required';
  if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email.trim()))
    return 'Enter a valid email address (e.g. jane@warehouse.com)';
  return '';
}

function isPwValid(value) {
  return PW_RULES.every(r => r.test(value));
}

function fmtTime(seconds) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users,         setUsers]         = useState([]);
  const [roles,         setRoles]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [filterDept,    setFilterDept]    = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [modal,         setModal]         = useState(null); // null | { mode: 'create'|'edit', user? }
  const [form,          setForm]          = useState(BLANK_FORM);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [fieldErrors,   setFieldErrors]   = useState({ email: '', password: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expandedUser,  setExpandedUser]  = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([axios.get('/api/admin/users'), axios.get('/api/admin/roles')])
      .then(([u, r]) => { setUsers(u.data); setRoles(r.data.roles); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Roles available for the currently selected department.
  // Primary: match r.department (always set by the API now).
  // Fallback: match against the known name list in case of legacy data.
  const availableRoles = form.department
    ? roles.filter(r => {
        if (r.department) return r.department === form.department;
        const names = DEPT_ROLE_NAMES[form.department] || [];
        return names.includes(r.name);
      })
    : roles;

  // System access options change per department
  const accessOpts = SYSTEM_ACCESS_OPTS[form.department] || DEFAULT_ACCESS_OPTS;

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleDeptChange = dept => {
    setForm(f => ({ ...f, department: dept, job_role_id: '', employment_contract: '', role: 'user' }));
  };

  const handleRoleChange = roleId => {
    const role = roles.find(r => String(r.id) === String(roleId));
    const contract = role ? (CONTRACT_BY_ROLE[role.name] || '') : '';
    setForm(f => ({ ...f, job_role_id: roleId, employment_contract: contract }));
  };

  const openCreate = () => {
    setForm({ ...BLANK_FORM });
    setError('');
    setFieldErrors({ email: '', password: '' });
    setModal({ mode: 'create' });
  };

  const openEdit = user => {
    setForm({
      employee_type:       user.employee_type    || 'existing',
      title:               user.title            || '',
      given_name:          user.given_name       || '',
      last_name:           user.last_name        || '',
      employee_code:       user.employee_code    || '',
      email:               user.email,
      password:            '',
      department:          user.department       || '',
      job_role_id:         user.job_role_id      || '',
      role:                user.role,
      employment_contract: user.employment_contract || '',
    });
    setError('');
    setFieldErrors({ email: '', password: '' });
    setModal({ mode: 'edit', user });
  };

  const handleSave = async e => {
    e.preventDefault();

    // ── Client-side validation ──────────────────────────────────────────────
    const emailErr = validateEmailFmt(form.email);
    const needPw   = modal.mode === 'create' || form.password.trim().length > 0;
    const pwErr    = needPw && !isPwValid(form.password)
      ? 'Password does not meet all requirements'
      : '';

    setFieldErrors({ email: emailErr, password: pwErr });
    if (emailErr || pwErr) return;

    setSaving(true);
    setError('');
    try {
      const payload = { ...form, job_role_id: form.job_role_id || null };
      if (modal.mode === 'create') {
        await axios.post('/api/admin/users', payload);
      } else {
        await axios.put(`/api/admin/users/${modal.user.id}`, payload);
      }
      setModal(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    try {
      await axios.delete(`/api/admin/users/${id}`);
      setConfirmDelete(null);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete user');
    }
  };

  const filtered = users.filter(u => {
    if (u.id === currentUser?.id) return false; // hide yourself (the logged-in admin)
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) &&
        !u.email.toLowerCase().includes(search.toLowerCase()) &&
        !(u.employee_code || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterDept   && u.department !== filterDept) return false;
    if (filterStatus && u.progress?.status !== filterStatus) return false;
    return true;
  });

  const isNewEmployee = form.employee_type === 'new';

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <input className="input w-52" placeholder="Search name, email, ID…"
                 value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input w-40" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="input w-40" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <button onClick={openCreate} className="btn-primary whitespace-nowrap">+ Add Employee</button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-600">
          <span className="text-sm text-gray-400">{filtered.length} employee{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-700/40 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Employee</th>
                  <th className="text-left px-5 py-3 hidden sm:table-cell">Dept / Role</th>
                  <th className="text-left px-5 py-3">Training</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">Progress</th>
                  <th className="text-left px-5 py-3 hidden lg:table-cell">Time Spent</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const expanded = expandedUser === u.id;
                  return (
                    <Fragment key={u.id}>
                      <tr
                          className="border-t border-surface-700 hover:bg-surface-700/20 transition-colors cursor-pointer"
                          onClick={() => setExpandedUser(expanded ? null : u.id)}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-white">{u.name}</p>
                              <p className="text-gray-500 text-xs">{u.email}</p>
                              {u.employee_code && <p className="text-gray-600 text-xs">ID: {u.employee_code}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <p className="text-gray-400 text-xs">{u.department || '—'}</p>
                          {u.job_role_name ? (
                            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full border font-medium"
                                  style={{ color: u.job_role_color, borderColor: u.job_role_color + '66', background: u.job_role_color + '22' }}>
                              {u.job_role_name}
                            </span>
                          ) : <span className="text-xs text-gray-600">Unassigned</span>}
                        </td>
                        <td className="px-5 py-4"><StatusBadge status={u.progress?.status} /></td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-surface-600 rounded-full overflow-hidden">
                              <div className="h-full bg-primary-600 rounded-full"
                                   style={{ width: `${u.progress?.percent || 0}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{u.progress?.percent || 0}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell text-xs text-gray-500">
                          {fmtTime(u.progress?.totalTimeSeconds)}
                        </td>
                        <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openEdit(u)}
                                    className="text-xs text-primary-400 hover:text-primary-300 px-2 py-1 rounded hover:bg-surface-700 transition-colors">
                              Edit
                            </button>
                            <button onClick={() => setConfirmDelete(u)}
                                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-surface-700 transition-colors">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row — course progress */}
                      {expanded && (
                        <tr className="bg-surface-700/10 border-t border-surface-700">
                          <td colSpan="6" className="px-5 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {(u.progress?.courseProgress || []).map(cp => (
                                <div key={cp.courseId}
                                     className="bg-surface-800 rounded-lg p-3 border border-surface-600">
                                  <p className="font-medium text-white text-sm mb-2">{cp.title}</p>
                                  <div className="w-full h-1.5 bg-surface-600 rounded-full mb-2">
                                    <div className="h-full bg-primary-600 rounded-full"
                                         style={{ width: `${cp.percent}%` }} />
                                  </div>
                                  <div className="flex justify-between text-xs text-gray-400">
                                    <span>{cp.completed}/{cp.total} lessons</span>
                                    <span>{cp.percent}%</span>
                                  </div>
                                  {cp.quizScore && (
                                    <p className={`text-xs mt-1 ${cp.quizPassed ? 'text-green-400' : 'text-red-400'}`}>
                                      Assessment: {cp.quizScore} — {cp.quizPassed ? 'Passed ✓' : 'Not passed ✗'}
                                    </p>
                                  )}
                                </div>
                              ))}
                              {(!u.progress?.courseProgress?.length) && (
                                <p className="text-gray-500 text-sm">No courses assigned.</p>
                              )}
                            </div>
                            {u.employment_contract && (
                              <div className="mt-3 pt-3 border-t border-surface-700 text-xs text-gray-500">
                                📄 {u.employment_contract}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan="6" className="px-5 py-12 text-center text-gray-500">No employees found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Add New Employee' : `Edit — ${modal.user?.name}`}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSave} className="space-y-5">
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-2.5 text-sm">
                {error}
              </div>
            )}

            {/* Employee type toggle */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Employee Type <span className="text-red-400">*</span></p>
              <div className="flex gap-2">
                {['existing', 'new'].map(type => (
                  <button key={type} type="button"
                    onClick={() => setField('employee_type', type)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      form.employee_type === type
                        ? 'bg-primary-600 border-primary-500 text-white'
                        : 'bg-surface-700 border-surface-500 text-gray-400 hover:text-white'
                    }`}>
                    {type === 'existing' ? '👤 Existing Employee' : '🆕 New Employee'}
                  </button>
                ))}
              </div>
            </div>

            {/* Title + Name row */}
            <div className="grid grid-cols-3 gap-3">
              <FieldRow label="Title">
                <select className="input" value={form.title}
                        onChange={e => setField('title', e.target.value)}>
                  <option value="">—</option>
                  {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Given Name" required>
                <input className="input" value={form.given_name}
                       onChange={e => setField('given_name', e.target.value)} required
                       placeholder="Jane" />
              </FieldRow>
              <FieldRow label="Last Name" required>
                <input className="input" value={form.last_name}
                       onChange={e => setField('last_name', e.target.value)} required
                       placeholder="Smith" />
              </FieldRow>
            </div>

            {/* ID + Email row */}
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Employee ID" required>
                <input className="input" value={form.employee_code}
                       onChange={e => setField('employee_code', e.target.value)} required
                       placeholder="EMP001" />
              </FieldRow>
              <FieldRow label="Email Address" required>
                <input
                  type="text"
                  className={`input ${fieldErrors.email ? 'border-red-500 focus:border-red-400' : ''}`}
                  value={form.email}
                  onChange={e => {
                    setField('email', e.target.value);
                    if (fieldErrors.email)
                      setFieldErrors(fe => ({ ...fe, email: validateEmailFmt(e.target.value) }));
                  }}
                  onBlur={e => setFieldErrors(fe => ({ ...fe, email: validateEmailFmt(e.target.value) }))}
                  required
                  placeholder="jane@warehouse.com"
                  autoComplete="off"
                />
                {fieldErrors.email && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <span>⚠</span>{fieldErrors.email}
                  </p>
                )}
              </FieldRow>
            </div>

            {/* Password */}
            <FieldRow
              label="Password"
              required={modal.mode === 'create'}
              hint={modal.mode === 'edit' ? '(leave blank to keep current)' : ''}
            >
              <PasswordField
                value={form.password}
                onChange={e => {
                  setField('password', e.target.value);
                  if (fieldErrors.password)
                    setFieldErrors(fe => ({ ...fe, password: '' }));
                }}
                required={modal.mode === 'create'}
                placeholder={modal.mode === 'edit' ? 'New password (optional)' : 'Create a strong password'}
                showPolicy={modal.mode === 'create' || form.password.length > 0}
              />
              {fieldErrors.password && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <span>⚠</span>{fieldErrors.password}
                </p>
              )}
            </FieldRow>

            {/* Department + Role row */}
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Department" required>
                <select className="input" value={form.department}
                        onChange={e => handleDeptChange(e.target.value)} required>
                  <option value="">Select…</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Role" required>
                <select className="input" value={form.job_role_id}
                        onChange={e => handleRoleChange(e.target.value)} required
                        disabled={!form.department}>
                  <option value="">Select…</option>
                  {availableRoles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </FieldRow>
            </div>

            {/* System access — options depend on selected department */}
            <FieldRow label="System Access">
              <select className="input" value={form.role}
                      onChange={e => setField('role', e.target.value)}>
                {accessOpts.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FieldRow>

            {/* Employment contract — auto-assigned, shown whenever a role is selected */}
            {form.employment_contract && (
              <FieldRow label="Employment Contract" hint="(auto-assigned based on role)">
                <input className="input bg-surface-600 text-gray-400 cursor-default"
                       value={form.employment_contract}
                       readOnly />
              </FieldRow>
            )}

            {/* New-employee notice */}
            {isNewEmployee && (
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl px-4 py-3 text-xs text-blue-300">
                🆕 <strong>New employee:</strong> On first login they will be prompted to fill in their TFN, bank details, superannuation, and acknowledge their employment contract before accessing training.
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : modal.mode === 'create' ? 'Create Employee' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete confirm ──────────────────────────────────────────────────── */}
      {confirmDelete && (
        <Modal title="Delete Employee" onClose={() => setConfirmDelete(null)}>
          <p className="text-gray-300 mb-2">
            Are you sure you want to delete <strong className="text-white">{confirmDelete.name}</strong>?
          </p>
          <p className="text-gray-500 text-sm mb-5">
            This permanently removes their account and all training progress.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
            <button onClick={() => handleDelete(confirmDelete.id)}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
