import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);

  useEffect(() => {
    Promise.all([
      axios.get('/api/admin/users'),
      axios.get('/api/admin/stats')
    ]).then(([usersRes, statsRes]) => {
      setUsers(usersRes.data);
      setStats(statsRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const nonAdmins = filtered.filter(u => u.role !== 'admin');

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-900">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400 mt-1">Monitor employee training completion and progress.</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Employees', value: stats.totalUsers, icon: '👥', color: 'text-blue-400' },
              { label: 'Training Courses', value: stats.totalCourses, icon: '📚', color: 'text-primary-400' },
              { label: 'Lessons Completed', value: stats.totalCompletions, icon: '✅', color: 'text-green-400' },
              { label: 'Assessments Passed', value: stats.totalQuizPasses, icon: '🏆', color: 'text-yellow-400' }
            ].map(s => (
              <div key={s.label} className="card p-5">
                <span className="text-2xl">{s.icon}</span>
                <p className={`text-3xl font-bold mt-2 ${s.color}`}>{s.value}</p>
                <p className="text-gray-500 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <input
            className="input max-w-sm"
            placeholder="Search by name, email or department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Users table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-600 bg-surface-700/50">
                  <th className="text-left px-5 py-3.5 text-gray-400 font-medium">Employee</th>
                  <th className="text-left px-5 py-3.5 text-gray-400 font-medium hidden sm:table-cell">Department</th>
                  {users.find(u => u.courseProgress?.length > 0)?.courseProgress.map(cp => (
                    <th key={cp.courseId} className="text-center px-4 py-3.5 text-gray-400 font-medium whitespace-nowrap">
                      {cp.title}
                    </th>
                  ))}
                  <th className="text-left px-5 py-3.5 text-gray-400 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {nonAdmins.map(user => {
                  const isExpanded = expandedUser === user.id;
                  return (
                    <>
                      <tr
                        key={user.id}
                        className="border-b border-surface-700 hover:bg-surface-700/30 cursor-pointer transition-colors"
                        onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-white">{user.name}</p>
                              <p className="text-gray-500 text-xs">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-400 hidden sm:table-cell">
                          {user.department || '—'}
                        </td>
                        {user.courseProgress.map(cp => (
                          <td key={cp.courseId} className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                                cp.percent === 100
                                  ? 'bg-green-900/50 text-green-400 border border-green-700'
                                  : cp.percent > 0
                                  ? 'bg-primary-900/50 text-primary-400 border border-primary-800'
                                  : 'bg-surface-600 text-gray-500 border border-surface-500'
                              }`}>
                                {cp.percent === 100 ? '✓ Done' : `${cp.percent}%`}
                              </div>
                              {cp.quizScore && (
                                <span className={`text-xs ${cp.quizPassed ? 'text-green-400' : 'text-red-400'}`}>
                                  Quiz: {cp.quizScore} {cp.quizPassed ? '✓' : '✗'}
                                </span>
                              )}
                            </div>
                          </td>
                        ))}
                        <td className="px-5 py-4 text-gray-500 text-xs">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${user.id}-detail`} className="bg-surface-700/20 border-b border-surface-700">
                          <td colSpan={3 + user.courseProgress.length} className="px-5 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {user.courseProgress.map(cp => (
                                <div key={cp.courseId} className="bg-surface-800 rounded-lg p-4 border border-surface-600">
                                  <p className="font-semibold text-white mb-2">{cp.title}</p>
                                  <div className="w-full h-1.5 bg-surface-600 rounded-full mb-2">
                                    <div
                                      className="h-full bg-primary-600 rounded-full"
                                      style={{ width: `${cp.percent}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-xs text-gray-400">
                                    <span>{cp.completed}/{cp.total} lessons</span>
                                    <span>{cp.percent}% complete</span>
                                  </div>
                                  {cp.quizScore && (
                                    <p className={`text-xs mt-1 ${cp.quizPassed ? 'text-green-400' : 'text-red-400'}`}>
                                      Assessment: {cp.quizScore} — {cp.quizPassed ? 'Passed ✓' : 'Not yet passed ✗'}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {nonAdmins.length === 0 && (
                  <tr>
                    <td colSpan="10" className="text-center text-gray-500 py-10">No employees found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
