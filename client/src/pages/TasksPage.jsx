import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

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
const STATUS_LABEL = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };

export default function TasksPage() {
  const [tasks, setTasks]   = useState([]);
  const [stats, setStats]   = useState({});
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const fetchTasks = () => {
    Promise.all([
      axios.get('/api/tasks'),
      axios.get('/api/tasks/stats'),
    ]).then(([t, s]) => {
      setTasks(t.data);
      setStats(s.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(); }, []);

  const updateStatus = async (taskId, status) => {
    setUpdating(taskId);
    try {
      await axios.patch(`/api/tasks/${taskId}/status`, { status });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
      setStats(prev => ({ ...prev })); // trigger re-calc
    } catch (e) {
      alert('Failed to update task');
    }
    setUpdating(null);
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const isOverdue = (task) =>
    task.status !== 'completed' && task.due_date && new Date(task.due_date) < new Date();

  if (loading) return (
    <div className="min-h-screen bg-surface-900"><Navbar />
      <div className="flex items-center justify-center h-64 text-gray-400">Loading tasks...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-8">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Work Management</p>
          <h1 className="text-3xl font-bold text-white">My Tasks</h1>
          <p className="text-gray-400 mt-1">Tasks assigned to you or your role.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'text-white' },
            { label: 'Pending', value: stats.pending, color: 'text-gray-400' },
            { label: 'In Progress', value: stats.in_progress, color: 'text-blue-400' },
            { label: 'Completed', value: stats.completed, color: 'text-green-400' },
            { label: 'Overdue', value: stats.overdue, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-surface-800 rounded-xl p-3 border border-surface-600 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value ?? '—'}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'pending', 'in_progress', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${filter === f ? 'bg-primary-600 text-white' : 'bg-surface-700 text-gray-400 hover:text-white'}`}
            >
              {f === 'all' ? 'All Tasks' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>

        {/* Tasks */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center text-gray-500 py-16">
              <div className="text-4xl mb-3">📋</div>
              <p>No tasks found.</p>
            </div>
          )}
          {filtered.map(task => (
            <div
              key={task.id}
              className={`bg-surface-800 rounded-xl border p-5 transition-colors ${isOverdue(task) ? 'border-red-600/40' : 'border-surface-600 hover:border-surface-500'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white text-sm">{task.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.medium}`}>
                      {task.priority}
                    </span>
                    {isOverdue(task) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">⚠️ Overdue</span>
                    )}
                  </div>
                  {task.description && <p className="text-gray-400 text-sm mb-2">{task.description}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    {task.due_date && (
                      <span className={isOverdue(task) ? 'text-red-400' : ''}>
                        📅 Due {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {task.assigned_to_name && <span>👤 {task.assigned_to_name}</span>}
                    {task.assigned_role_name && <span>🎭 {task.assigned_role_name}</span>}
                    <span className="capitalize">📂 {task.category}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[task.status]}`}>
                    {STATUS_LABEL[task.status]}
                  </span>

                  {/* Status actions */}
                  {task.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(task.id, 'in_progress')}
                      disabled={updating === task.id}
                      className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-60"
                    >Start</button>
                  )}
                  {task.status === 'in_progress' && (
                    <button
                      onClick={() => updateStatus(task.id, 'completed')}
                      disabled={updating === task.id}
                      className="px-3 py-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors disabled:opacity-60"
                    >✓ Complete</button>
                  )}
                </div>
              </div>

              {task.notes && (
                <div className="mt-3 pt-3 border-t border-surface-600 text-xs text-gray-500 italic">
                  Notes: {task.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
