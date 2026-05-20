import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const SEV_COLOR = {
  low:      'bg-gray-500/20 text-gray-300',
  medium:   'bg-amber-500/20 text-amber-300',
  high:     'bg-orange-500/20 text-orange-300',
  critical: 'bg-red-500/20 text-red-300',
};
const PRIORITY_COLOR = {
  critical: 'text-red-400', high: 'text-orange-400', medium: 'text-amber-400', low: 'text-gray-400'
};

export default function AdminCompliancePage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = () => {
    Promise.all([
      axios.get('/api/admin/compliance/overview'),
    ]).then(([ov]) => {
      setData(ov.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const closeIncident = async (id) => {
    await axios.put(`/api/incidents/${id}`, { ...(data.openIncidents.find(i => i.id === id)), status: 'closed' });
    fetchData();
  };

  if (loading) return <div className="text-center text-gray-400 py-16">Loading compliance data…</div>;
  if (!data)   return <div className="text-center text-gray-400 py-16">Failed to load.</div>;

  const { categories, recentRuns, overdueTasks, openIncidents } = data;
  const totalChecklists = categories.reduce((s, c) => s + (c.checklist_count || 0), 0);
  const doneToday       = categories.reduce((s, c) => s + (c.completed_today || 0), 0);

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Checklists', value: totalChecklists, icon: '📋', color: 'text-blue-400' },
          { label: 'Done Today', value: doneToday, icon: '✅', color: 'text-green-400' },
          { label: 'Overdue Tasks', value: overdueTasks.length, icon: '⚠️', color: overdueTasks.length > 0 ? 'text-red-400' : 'text-gray-400' },
          { label: 'Open Incidents', value: openIncidents.length, icon: '🚨', color: openIncidents.length > 0 ? 'text-red-400' : 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-surface-800 rounded-xl p-4 border border-surface-600">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{s.icon}</span>
              <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
            </div>
            <p className="text-gray-400 text-sm">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-surface-800 rounded-xl p-1 border border-surface-600 w-fit">
        {['overview', 'incidents', 'tasks', 'history'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === t ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview — category cards */}
      {activeTab === 'overview' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map(cat => (
            <div key={cat.id} className="bg-surface-800 rounded-xl border border-surface-600 p-4 hover:border-surface-500 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{cat.icon}</span>
                <h3 className="font-semibold text-white text-sm">{cat.name}</h3>
              </div>
              {cat.description && <p className="text-xs text-gray-500 mb-3">{cat.description}</p>}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{cat.checklist_count} checklists</span>
                <span className={`font-medium ${cat.completed_today > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                  {cat.completed_today || 0} done today
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Incidents */}
      {activeTab === 'incidents' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Open Incidents ({openIncidents.length})</h2>
            <Link to="/incidents" className="text-sm text-primary-400 hover:text-primary-300">View all →</Link>
          </div>
          {openIncidents.length === 0 && (
            <div className="text-center text-gray-500 py-12">✅ No open incidents</div>
          )}
          {openIncidents.map(inc => (
            <div key={inc.id} className="bg-surface-800 rounded-xl border border-surface-600 p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-white text-sm font-medium">{inc.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${SEV_COLOR[inc.severity]}`}>{inc.severity}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>👤 {inc.reported_by_name}</span>
                  {inc.location && <span>📍 {inc.location}</span>}
                  <span>📅 {new Date(inc.reported_at).toLocaleDateString()}</span>
                </div>
              </div>
              <button onClick={() => closeIncident(inc.id)}
                className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-gray-300 text-xs rounded-lg font-medium transition-colors shrink-0">
                Close
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Overdue Tasks */}
      {activeTab === 'tasks' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Overdue Tasks ({overdueTasks.length})</h2>
            <Link to="/admin/tasks" className="text-sm text-primary-400 hover:text-primary-300">Manage tasks →</Link>
          </div>
          {overdueTasks.length === 0 && (
            <div className="text-center text-gray-500 py-12">✅ No overdue tasks</div>
          )}
          {overdueTasks.map(task => (
            <div key={task.id} className="bg-surface-800 rounded-xl border border-red-600/30 p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-white text-sm font-medium">{task.title}</h3>
                  <span className={`text-xs font-medium ${PRIORITY_COLOR[task.priority]}`}>● {task.priority}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="text-red-400">📅 Due {task.due_date}</span>
                  {task.assigned_to_name && <span>👤 {task.assigned_to_name}</span>}
                  {task.assigned_role_name && <span>🎭 {task.assigned_role_name}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <h2 className="text-white font-semibold mb-4">Recent Checklist Completions</h2>
          {recentRuns.length === 0 && (
            <div className="text-center text-gray-500 py-12">No checklist runs yet.</div>
          )}
          {recentRuns.map(run => {
            const pct = run.total_items > 0 ? Math.round((run.checked_items / run.total_items) * 100) : 0;
            return (
              <div key={run.id} className="bg-surface-800 rounded-xl border border-surface-600 p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{run.checklist_title}</p>
                  <p className="text-xs text-gray-500">{run.completed_by_name} · {new Date(run.started_at).toLocaleString()}</p>
                  <div className="mt-1.5 bg-surface-700 rounded-full h-1.5 w-48 max-w-full">
                    <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-white">{pct}%</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${run.status === 'completed' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {run.status === 'completed' ? '✓ Done' : '⏳ In Progress'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
