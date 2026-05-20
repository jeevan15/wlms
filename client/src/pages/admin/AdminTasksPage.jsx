import { useState, useEffect } from 'react';
import axios from 'axios';

const PRIORITY_COLOR = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/40',
  high:     'bg-orange-500/20 text-orange-300 border-orange-500/40',
  medium:   'bg-amber-500/20 text-amber-300 border-amber-500/40',
  low:      'bg-gray-500/20 text-gray-300 border-gray-500/40',
};
const STATUS_COLOR = {
  pending:     'bg-gray-500/20 text-gray-300',
  in_progress: 'bg-blue-500/20 text-blue-300',
  completed:   'bg-green-500/20 text-green-300',
  cancelled:   'bg-red-500/20 text-red-400',
};

const emptyForm = { title: '', description: '', category: 'general', assigned_to: '', assigned_role_id: '', due_date: '', priority: 'medium', notes: '', status: 'pending' };

export default function AdminTasksPage() {
  const [tasks, setTasks]   = useState([]);
  const [stats, setStats]   = useState({});
  const [users, setUsers]   = useState([]);
  const [roles, setRoles]   = useState([]);
  const [filter, setFilter] = useState('all');
  const [modal, setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]     = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetch = () => {
    Promise.all([
      axios.get('/api/tasks/all'),
      axios.get('/api/tasks/stats'),
      axios.get('/api/admin/users'),
      axios.get('/api/admin/roles'),
    ]).then(([t, s, u, r]) => {
      setTasks(t.data);
      setStats(s.data);
      setUsers(u.data);
      setRoles(r.data.roles);
    });
  };

  useEffect(() => { fetch(); }, []);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (task) => {
    setEditing(task.id);
    setForm({
      title: task.title, description: task.description || '', category: task.category || 'general',
      assigned_to: task.assigned_to || '', assigned_role_id: task.assigned_role_id || '',
      due_date: task.due_date || '', priority: task.priority, notes: task.notes || '', status: task.status,
    });
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`/api/tasks/${editing}`, { ...form, assigned_to: form.assigned_to || null, assigned_role_id: form.assigned_role_id || null });
      } else {
        await axios.post('/api/tasks', { ...form, assigned_to: form.assigned_to || null, assigned_role_id: form.assigned_role_id || null });
      }
      setModal(false);
      fetch();
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  };

  const deleteTask = async () => {
    await axios.delete(`/api/tasks/${deleteId}`);
    setDeleteId(null);
    fetch();
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const isOverdue = t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date();

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Pending', value: stats.pending, color: 'text-gray-400' },
          { label: 'In Progress', value: stats.in_progress, color: 'text-blue-400' },
          { label: 'Completed', value: stats.completed, color: 'text-green-400' },
          { label: 'Overdue', value: stats.overdue, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-surface-800 rounded-xl p-3 border border-surface-600 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value ?? '—'}</p>
            <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'in_progress', 'completed'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filter === f ? 'bg-primary-600 text-white' : 'bg-surface-700 text-gray-400 hover:text-white'}`}>
              {f === 'all' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium text-sm transition-colors">
          ＋ New Task
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map(task => (
          <div key={task.id} className={`bg-surface-800 rounded-xl border p-4 flex items-start justify-between gap-3 ${isOverdue(task) ? 'border-red-600/30' : 'border-surface-600'}`}>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-medium text-white text-sm">{task.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLOR[task.priority]}`}>{task.priority}</span>
                {isOverdue(task) && <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">⚠️ Overdue</span>}
              </div>
              {task.description && <p className="text-gray-400 text-xs mb-1.5">{task.description}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                {task.due_date && <span className={isOverdue(task) ? 'text-red-400' : ''}>📅 {task.due_date}</span>}
                {task.assigned_to_name && <span>👤 {task.assigned_to_name}</span>}
                {task.assigned_role_name && <span>🎭 {task.assigned_role_name}</span>}
                <span>📂 {task.category}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[task.status]}`}>{task.status.replace('_', ' ')}</span>
              <button onClick={() => openEdit(task)} className="p-1.5 text-gray-400 hover:text-white hover:bg-surface-700 rounded-lg text-sm transition-colors">✏️</button>
              <button onClick={() => setDeleteId(task.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-surface-700 rounded-lg text-sm transition-colors">🗑️</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-gray-500 py-12">No tasks found.</div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-800 rounded-2xl border border-surface-600 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-surface-600">
              <h2 className="font-semibold text-white">{editing ? 'Edit Task' : 'New Task'}</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Title *</label>
                <input value={form.title} onChange={e => set('title', e.target.value)} required placeholder="Task title" className="input w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className="input w-full resize-none" placeholder="Task details…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Priority</label>
                  <select value={form.priority} onChange={e => set('priority', e.target.value)} className="input w-full">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Category</label>
                  <select value={form.category} onChange={e => set('category', e.target.value)} className="input w-full">
                    {['general','safety','cleaning','maintenance','training','compliance'].map(c => (
                      <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Assign to User</label>
                  <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} className="input w-full">
                    <option value="">— None —</option>
                    {users.filter(u => u.role !== 'admin').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Assign to Role</label>
                  <select value={form.assigned_role_id} onChange={e => set('assigned_role_id', e.target.value)} className="input w-full">
                    <option value="">— None —</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className="input w-full" />
                </div>
                {editing && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Status</label>
                    <select value={form.status} onChange={e => set('status', e.target.value)} className="input w-full">
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="input w-full resize-none" placeholder="Additional notes…" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 py-2.5 bg-surface-700 hover:bg-surface-600 text-gray-300 rounded-xl font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white rounded-xl font-semibold transition-colors">
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-800 rounded-2xl border border-surface-600 p-6 max-w-sm w-full text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="text-white font-semibold mb-2">Delete Task?</h3>
            <p className="text-gray-400 text-sm mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 bg-surface-700 hover:bg-surface-600 text-gray-300 rounded-xl font-medium transition-colors">Cancel</button>
              <button onClick={deleteTask} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
