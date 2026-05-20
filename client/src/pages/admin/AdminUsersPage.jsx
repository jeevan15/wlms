import { useState, useEffect } from 'react';
import axios from 'axios';

const DEPARTMENTS = ['Receiving','Dispatch','Inventory','Forklift Operations','Management','Administration','Quality Control','Other'];

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-800 border border-surface-600 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
    not_started: { label: 'Not Started', cls: 'bg-surface-600 text-gray-400 border-surface-500' }
  };
  const { label, cls } = map[status] || map.not_started;
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${cls}`}>{label}</span>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null); // null | { mode: 'create' | 'edit', user?: {} }
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([axios.get('/api/admin/users'), axios.get('/api/admin/roles')])
      .then(([u, r]) => { setUsers(u.data); setRoles(r.data.roles); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ name: '', email: '', password: '', department: '', job_role_id: '', role: 'user' });
    setError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (user) => {
    setForm({ name: user.name, email: user.email, password: '', department: user.department || '', job_role_id: user.job_role_id || '', role: user.role });
    setError('');
    setModal({ mode: 'edit', user });
  };

  const handleSave = async e => {
    e.preventDefault();
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
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/admin/users/${id}`);
      setConfirmDelete(null);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete user');
    }
  };

  const filtered = users.filter(u => {
    if (u.role === 'admin') return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRole && String(u.job_role_id) !== String(filterRole)) return false;
    if (filterStatus && u.progress?.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <input className="input w-52" placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input w-40" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            <option value="null">Unassigned</option>
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
        <div className="px-5 py-3 border-b border-surface-600 flex items-center justify-between">
          <span className="text-sm text-gray-400">{filtered.length} employee{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-700/40 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Employee</th>
                  <th className="text-left px-5 py-3 hidden sm:table-cell">Department</th>
                  <th className="text-left px-5 py-3">Job Role</th>
                  <th className="text-left px-5 py-3">Training</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">Progress</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="border-t border-surface-700 hover:bg-surface-700/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">{u.name.charAt(0)}</div>
                        <div>
                          <p className="font-medium text-white">{u.name}</p>
                          <p className="text-gray-500 text-xs">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-400 hidden sm:table-cell text-xs">{u.department || '—'}</td>
                    <td className="px-5 py-4">
                      {u.job_role_name ? (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full border" style={{ color: u.job_role_color, borderColor: u.job_role_color + '66', background: u.job_role_color + '22' }}>
                          {u.job_role_name}
                        </span>
                      ) : <span className="text-xs text-gray-600">Unassigned</span>}
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={u.progress?.status} /></td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-surface-600 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-600 rounded-full" style={{ width: `${u.progress?.percent || 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{u.progress?.percent || 0}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(u)} className="text-xs text-primary-400 hover:text-primary-300 px-2 py-1 rounded hover:bg-surface-700 transition-colors">Edit</button>
                        <button onClick={() => setConfirmDelete(u)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-surface-700 transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan="6" className="px-5 py-12 text-center text-gray-500">No employees found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <Modal title={modal.mode === 'create' ? 'Add New Employee' : 'Edit Employee'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            {error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-2.5 text-sm">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1.5">Full Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1.5">Email Address *</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1.5">
                  Password {modal.mode === 'edit' && <span className="text-gray-600">(leave blank to keep current)</span>}
                </label>
                <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} minLength={modal.mode === 'create' ? 6 : 0} required={modal.mode === 'create'} placeholder={modal.mode === 'edit' ? '••••••••' : ''} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Department</label>
                <select className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                  <option value="">Select…</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Job Role</label>
                <select className="input" value={form.job_role_id} onChange={e => setForm(f => ({ ...f, job_role_id: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">System Role</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="user">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : modal.mode === 'create' ? 'Create Employee' : 'Save Changes'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <Modal title="Delete Employee" onClose={() => setConfirmDelete(null)}>
          <p className="text-gray-300 mb-2">Are you sure you want to delete <strong className="text-white">{confirmDelete.name}</strong>?</p>
          <p className="text-gray-500 text-sm mb-5">This will permanently remove their account and all training progress.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
            <button onClick={() => handleDelete(confirmDelete.id)} className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
