import { useState, useEffect } from 'react';
import axios from 'axios';

const COLOR_PRESETS = ['#7C3AED','#3B82F6','#10B981','#F59E0B','#EF4444','#EC4899','#6B7280','#06B6D4'];
const ICONS = { building: '🏗️', tool: '🔧', warehouse: '🏭', safety: '⛑️' };

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-800 border border-surface-600 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-600">
          <h2 className="font-bold text-white text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [savingCourses, setSavingCourses] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', color: '#7C3AED', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingCourses, setPendingCourses] = useState({});

  const load = () => {
    setLoading(true);
    axios.get('/api/admin/roles')
      .then(r => { setRoles(r.data.roles); setAllCourses(r.data.allCourses); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const toggleExpand = (roleId) => {
    setExpanded(e => e === roleId ? null : roleId);
    const role = roles.find(r => r.id === roleId);
    if (role) {
      setPendingCourses(prev => ({ ...prev, [roleId]: role.courses.map(c => c.id) }));
    }
  };

  const toggleCourse = (roleId, courseId) => {
    setPendingCourses(prev => {
      const current = prev[roleId] || [];
      return { ...prev, [roleId]: current.includes(courseId) ? current.filter(id => id !== courseId) : [...current, courseId] };
    });
  };

  const saveCourses = async (roleId) => {
    setSavingCourses(roleId);
    await axios.put(`/api/admin/roles/${roleId}/courses`, { courseIds: pendingCourses[roleId] || [] });
    setSavingCourses(null);
    load();
  };

  const openCreate = () => {
    setForm({ name: '', color: '#7C3AED', description: '' });
    setError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (role) => {
    setForm({ name: role.name, color: role.color, description: role.description || '' });
    setError('');
    setModal({ mode: 'edit', role });
  };

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (modal.mode === 'create') await axios.post('/api/admin/roles', form);
      else await axios.put(`/api/admin/roles/${modal.role.id}`, form);
      setModal(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`Delete role "${role.name}"? This will unassign ${role.userCount} user${role.userCount !== 1 ? 's' : ''}.`)) return;
    await axios.delete(`/api/admin/roles/${role.id}`);
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-7 h-7 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">Assign training courses to each job role. Employees will only see courses assigned to their role.</p>
        </div>
        <button onClick={openCreate} className="btn-primary whitespace-nowrap">+ New Role</button>
      </div>

      {/* Available courses overview */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Available Training Courses</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allCourses.map(c => (
            <div key={c.id} className="flex items-center gap-3 p-3 bg-surface-700 rounded-lg">
              <span className="text-xl">{ICONS[c.icon] || '📚'}</span>
              <div>
                <p className="text-sm font-medium text-white">{c.title}</p>
                <p className="text-xs text-gray-500">{c.category}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role cards */}
      <div className="space-y-3">
        {roles.map(role => {
          const isOpen = expanded === role.id;
          const pending = pendingCourses[role.id] ?? role.courses.map(c => c.id);
          return (
            <div key={role.id} className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: role.color + '33', border: `1px solid ${role.color}66`, color: role.color }}>
                    {role.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white">{role.name}</h3>
                      <span className="text-xs text-gray-500">{role.userCount} user{role.userCount !== 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5 truncate">{role.description || 'No description'}</p>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {role.courses.length === 0
                        ? <span className="text-xs text-gray-600">No courses assigned</span>
                        : role.courses.map(c => (
                          <span key={c.id} className="text-xs px-2 py-0.5 rounded-full border" style={{ color: c.color, borderColor: c.color + '55', background: c.color + '22' }}>{c.title}</span>
                        ))
                      }
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(role)} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-surface-700 transition-colors">Edit</button>
                  <button onClick={() => handleDelete(role)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-surface-700 transition-colors">Delete</button>
                  <button onClick={() => toggleExpand(role.id)} className="text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-surface-700 transition-colors text-lg leading-none">
                    {isOpen ? '▲' : '▼'}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-surface-600 px-5 py-4 bg-surface-700/30">
                  <p className="text-xs text-gray-400 font-medium mb-3">Assign training courses for <span style={{ color: role.color }}>{role.name}</span>:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                    {allCourses.map(course => {
                      const assigned = pending.includes(course.id);
                      return (
                        <label key={course.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${assigned ? 'border-primary-600 bg-primary-900/20' : 'border-surface-500 bg-surface-700 hover:border-surface-400'}`}>
                          <input type="checkbox" checked={assigned} onChange={() => toggleCourse(role.id, course.id)} className="w-4 h-4 rounded accent-primary-600" />
                          <span className="text-lg">{ICONS[course.icon] || '📚'}</span>
                          <div>
                            <p className="text-sm font-medium text-white">{course.title}</p>
                            <p className="text-xs text-gray-500">{course.category}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => toggleExpand(null)} className="btn-secondary text-sm px-4 py-2">Cancel</button>
                    <button onClick={() => saveCourses(role.id)} disabled={savingCourses === role.id} className="btn-primary text-sm px-4 py-2">
                      {savingCourses === role.id ? 'Saving…' : 'Save Course Assignment'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Create New Role' : 'Edit Role'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            {error && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-2.5 text-sm">{error}</div>}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Role Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Forklift Operator" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Description</label>
              <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of this role" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Colour</label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_PRESETS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ background: c }} />
                ))}
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-0" title="Custom colour" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : modal.mode === 'create' ? 'Create Role' : 'Save Changes'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
