import { useState, useEffect } from 'react';
import axios from 'axios';

const STATUS_CONFIG = {
  completed:   { label: 'Completed',   color: 'bg-green-900/40 text-green-400 border-green-700',   dot: 'bg-green-400' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-900/40 text-yellow-400 border-yellow-700', dot: 'bg-yellow-400' },
  not_started: { label: 'Not Started', color: 'bg-surface-700 text-gray-400 border-surface-500',    dot: 'bg-gray-500' }
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
    </span>
  );
}

export default function AdminReportsPage() {
  const [data, setData] = useState({ users: [], summary: {}, departments: [] });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', job_role_id: '', department: '' });
  const [expanded, setExpanded] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const load = () => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    Promise.all([
      axios.get('/api/admin/reports', { params }),
      axios.get('/api/admin/roles')
    ]).then(([r, rl]) => { setData(r.data); setRoles(rl.data.roles); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filters]);

  const handleExport = async () => {
    setDownloading(true);
    try {
      const res = await axios.get('/api/admin/reports/csv', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `training-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const { users, summary, departments } = data;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Shown', value: summary.total, icon: '👥', color: 'text-white' },
          { label: 'Completed',   value: summary.completed,  icon: '✅', color: 'text-green-400' },
          { label: 'In Progress', value: summary.inProgress, icon: '📖', color: 'text-yellow-400' },
          { label: 'Not Started', value: summary.notStarted, icon: '⏳', color: 'text-gray-400' }
        ].map(s => (
          <div key={s.label} className="card p-4">
            <span className="text-xl">{s.icon}</span>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value ?? '—'}</p>
            <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + export */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <select className="input w-40" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Status</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select className="input w-40" value={filters.job_role_id} onChange={e => setFilters(f => ({ ...f, job_role_id: e.target.value }))}>
            <option value="">All Roles</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select className="input w-40" value={filters.department} onChange={e => setFilters(f => ({ ...f, department: e.target.value }))}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {(filters.status || filters.job_role_id || filters.department) && (
            <button onClick={() => setFilters({ status: '', job_role_id: '', department: '' })} className="text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-surface-700 transition-colors">
              Clear filters
            </button>
          )}
        </div>
        <button onClick={handleExport} disabled={downloading} className="btn-primary whitespace-nowrap flex items-center gap-2">
          <span>📥</span>
          {downloading ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {/* Report table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-600">
          <span className="text-sm text-gray-400">{users.length} employee{users.length !== 1 ? 's' : ''} shown</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-700/40 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Employee</th>
                  <th className="text-left px-5 py-3 hidden sm:table-cell">Dept.</th>
                  <th className="text-left px-5 py-3">Role</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Progress</th>
                  <th className="text-left px-5 py-3 hidden lg:table-cell">Joined</th>
                  <th className="text-right px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isOpen = expanded === u.id;
                  return (
                    <>
                      <tr key={u.id} className="border-t border-surface-700 hover:bg-surface-700/20 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{u.name.charAt(0)}</div>
                            <div>
                              <p className="font-medium text-white">{u.name}</p>
                              <p className="text-gray-500 text-xs">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-400 text-xs hidden sm:table-cell">{u.department || '—'}</td>
                        <td className="px-5 py-4">
                          {u.job_role_name ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full border" style={{ color: u.job_role_color, borderColor: u.job_role_color + '55', background: u.job_role_color + '22' }}>
                              {u.job_role_name}
                            </span>
                          ) : <span className="text-xs text-gray-600">Unassigned</span>}
                        </td>
                        <td className="px-5 py-4"><StatusBadge status={u.status} /></td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-surface-600 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${u.percent}%`, background: u.percent === 100 ? '#22c55e' : '#7c3aed' }} />
                            </div>
                            <span className="text-xs text-gray-400 font-medium">{u.percent}%</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">{u.completedLessons}/{u.totalLessons} lessons</p>
                        </td>
                        <td className="px-5 py-4 text-gray-500 text-xs hidden lg:table-cell">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => setExpanded(isOpen ? null : u.id)} className="text-xs text-primary-400 hover:text-primary-300 px-2 py-1 rounded hover:bg-surface-700 transition-colors">
                            {isOpen ? 'Hide ▲' : 'View ▼'}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${u.id}-detail`}>
                          <td colSpan="7" className="px-5 pb-4 pt-0">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                              {u.courseProgress.length === 0
                                ? <p className="text-gray-500 text-xs col-span-2">No courses assigned to this role.</p>
                                : u.courseProgress.map(cp => (
                                  <div key={cp.courseId} className="bg-surface-700 rounded-lg p-4 border border-surface-600">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="font-medium text-white text-sm">{cp.title}</p>
                                      <span className={`text-xs font-bold ${cp.percent === 100 ? 'text-green-400' : 'text-gray-400'}`}>{cp.percent}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-surface-500 rounded-full mb-2">
                                      <div className="h-full rounded-full transition-all" style={{ width: `${cp.percent}%`, background: cp.percent === 100 ? '#22c55e' : '#7c3aed' }} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-500">{cp.completed}/{cp.total} lessons</span>
                                      {cp.quizScore && (
                                        <span className={`text-xs ${cp.quizPassed ? 'text-green-400' : 'text-red-400'}`}>
                                          Assessment: {cp.quizScore} {cp.quizPassed ? '✓' : '✗'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))
                              }
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {users.length === 0 && (
                  <tr><td colSpan="7" className="px-5 py-12 text-center text-gray-500">No employees match the current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
