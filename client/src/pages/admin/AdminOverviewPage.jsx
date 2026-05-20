import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const STATUS_CONFIG = {
  completed:   { label: 'Completed',   color: 'bg-green-900/40 text-green-400 border-green-700',  dot: 'bg-green-400' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-900/40 text-yellow-400 border-yellow-700', dot: 'bg-yellow-400' },
  not_started: { label: 'Not Started', color: 'bg-surface-700 text-gray-400 border-surface-500',    dot: 'bg-gray-500' }
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([axios.get('/api/admin/stats'), axios.get('/api/admin/users')])
      .then(([s, u]) => { setStats(s.data); setUsers(u.data.slice(0, 8)); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  const completionRate = stats?.totalUsers > 0 ? Math.round((stats.completed / stats.totalUsers) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Training stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: stats?.totalUsers,  icon: '👥', color: 'text-blue-400',   bg: 'bg-blue-900/20 border-blue-800' },
          { label: 'Training Complete', value: stats?.completed, icon: '✅', color: 'text-green-400',  bg: 'bg-green-900/20 border-green-800' },
          { label: 'In Progress',    value: stats?.inProgress,   icon: '📖', color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-800' },
          { label: 'Not Started',    value: stats?.notStarted,   icon: '⏳', color: 'text-gray-400',   bg: 'bg-surface-700 border-surface-500' }
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-5 ${s.bg}`}>
            <span className="text-2xl">{s.icon}</span>
            <p className={`text-3xl font-bold mt-2 ${s.color}`}>{s.value ?? '—'}</p>
            <p className="text-gray-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Compliance stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Checklists Done Today', value: stats?.checklistsToday, icon: '📋', color: stats?.checklistsToday > 0 ? 'text-green-400' : 'text-gray-400' },
          { label: 'Open Incidents',         value: stats?.openIncidents,   icon: '🚨', color: stats?.openIncidents > 0 ? 'text-red-400' : 'text-green-400' },
          { label: 'Overdue Tasks',          value: stats?.overdueTasks,    icon: '⚠️', color: stats?.overdueTasks > 0 ? 'text-red-400' : 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-surface-800 rounded-xl border border-surface-600 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{s.icon}</span>
              <span className={`text-2xl font-bold ${s.color}`}>{s.value ?? '—'}</span>
            </div>
            <p className="text-gray-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Completion rate + quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">Overall Training Completion Rate</h2>
          <div className="flex items-end gap-4 mb-4">
            <span className="text-5xl font-bold text-white">{completionRate}%</span>
            <span className="text-gray-500 text-sm mb-1">of employees have completed all assigned training</span>
          </div>
          <div className="w-full h-3 bg-surface-600 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary-700 to-primary-400 rounded-full transition-all duration-700" style={{ width: `${completionRate}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-2">
            <span>{stats?.completed} completed</span>
            <span>{stats?.totalUsers} total</span>
          </div>
        </div>

        <div className="card p-5 flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-400 mb-1">Quick Actions</h2>
          {[
            { to: '/admin/users',      icon: '➕', label: 'Add Employee',    sub: 'Create a new user account' },
            { to: '/admin/tasks',      icon: '📋', label: 'Create Task',     sub: 'Assign tasks to staff' },
            { to: '/admin/compliance', icon: '✅', label: 'Compliance',      sub: 'View checklist status' },
            { to: '/training-matrix',  icon: '📊', label: 'Training Matrix', sub: 'Role × course overview' },
            { to: '/admin/reports',    icon: '📥', label: 'Export Report',   sub: 'Download training CSV' },
          ].map(a => (
            <Link key={a.to} to={a.to} className="flex items-center gap-3 p-2.5 bg-surface-700 hover:bg-surface-600 rounded-lg transition-colors">
              <span className="text-lg">{a.icon}</span>
              <div>
                <p className="text-sm font-medium text-white leading-tight">{a.label}</p>
                <p className="text-xs text-gray-500">{a.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent users */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-600">
          <h2 className="font-semibold text-white">Recent Employees</h2>
          <Link to="/admin/users" className="text-sm text-primary-400 hover:text-primary-300">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-700/40 text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3">Employee</th>
                <th className="text-left px-5 py-3 hidden sm:table-cell">Department</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">Role</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3 hidden lg:table-cell">Progress</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.role !== 'admin').map(u => (
                <tr key={u.id} className="border-t border-surface-700 hover:bg-surface-700/20">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white">{u.name.charAt(0)}</div>
                      <div>
                        <p className="font-medium text-white">{u.name}</p>
                        <p className="text-gray-500 text-xs">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 hidden sm:table-cell">{u.department || '—'}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    {u.job_role_name ? (
                      <span className="inline-block text-xs px-2 py-1 rounded-full border font-medium" style={{ color: u.job_role_color, borderColor: u.job_role_color + '66', background: u.job_role_color + '22' }}>
                        {u.job_role_name}
                      </span>
                    ) : <span className="text-gray-600 text-xs">Unassigned</span>}
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={u.progress.status} /></td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-surface-600 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-600 rounded-full" style={{ width: `${u.progress.percent}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{u.progress.percent}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
