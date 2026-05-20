import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function TrainingMatrixPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }
    axios.get('/api/admin/training-matrix')
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const cellColor = (percent) => {
    if (percent === 0) return 'bg-gray-700 text-gray-500';
    if (percent < 50)  return 'bg-red-500/20 text-red-300';
    if (percent < 100) return 'bg-amber-500/20 text-amber-300';
    return 'bg-green-500/20 text-green-300';
  };

  if (loading) return (
    <div className="min-h-screen bg-surface-900"><Navbar />
      <div className="flex items-center justify-center h-64 text-gray-400">Loading matrix...</div>
    </div>
  );

  const { roles, courses, matrix } = data || {};

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-8">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Admin · Training</p>
          <h1 className="text-3xl font-bold text-white">Training Matrix</h1>
          <p className="text-gray-400 mt-1">Role-based training completion overview.</p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-6">
          {[
            { label: 'Not Started', cls: 'bg-gray-700 text-gray-400' },
            { label: '< 50%',       cls: 'bg-red-500/20 text-red-300' },
            { label: '50–99%',      cls: 'bg-amber-500/20 text-amber-300' },
            { label: '100%',        cls: 'bg-green-500/20 text-green-300' },
            { label: 'Not Assigned', cls: 'bg-surface-700 text-gray-600' },
          ].map(l => (
            <div key={l.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${l.cls}`}>
              <span>{l.label}</span>
            </div>
          ))}
        </div>

        {/* Roles */}
        {matrix?.map(roleData => {
          const isOpen = expandedRole === roleData.roleId;
          const allUsers = roleData.userProgress;
          const avgOverall = allUsers.length
            ? Math.round(allUsers.reduce((s, u) => s + u.overallPercent, 0) / allUsers.length)
            : null;

          return (
            <div key={roleData.roleId} className="bg-surface-800 rounded-2xl border border-surface-600 mb-4 overflow-hidden">
              {/* Role header */}
              <button
                onClick={() => setExpandedRole(isOpen ? null : roleData.roleId)}
                className="w-full flex items-center justify-between p-5 hover:bg-surface-700 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: roleData.roleColor }} />
                  <h2 className="font-semibold text-white">{roleData.roleName}</h2>
                  <span className="text-xs text-gray-500 bg-surface-700 px-2 py-0.5 rounded-full">
                    {allUsers.length} {allUsers.length === 1 ? 'member' : 'members'}
                  </span>
                  {roleData.assignedCourseIds.length > 0 && (
                    <span className="text-xs text-gray-500">{roleData.assignedCourseIds.length} courses assigned</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {avgOverall !== null && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-surface-600 rounded-full">
                        <div className={`h-1.5 rounded-full ${avgOverall === 100 ? 'bg-green-500' : avgOverall > 0 ? 'bg-primary-500' : 'bg-gray-600'}`}
                             style={{ width: `${avgOverall}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-white w-10 text-right">{avgOverall}%</span>
                    </div>
                  )}
                  <span className="text-gray-400 text-lg">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Expanded user table */}
              {isOpen && (
                <div className="border-t border-surface-600 overflow-x-auto">
                  {allUsers.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">No members in this role.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-600 bg-surface-700/50">
                          <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider w-48">Employee</th>
                          {courses?.map(c => (
                            <th key={c.id} className="text-center px-3 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider min-w-[100px]">
                              {c.title}
                            </th>
                          ))}
                          <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider w-24">Overall</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-600">
                        {allUsers.map(up => (
                          <tr key={up.userId} className="hover:bg-surface-700/30 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                     style={{ backgroundColor: roleData.roleColor }}>
                                  {up.userName.charAt(0)}
                                </div>
                                <span className="text-white font-medium text-sm truncate">{up.userName}</span>
                              </div>
                            </td>
                            {up.courses.map(cd => (
                              <td key={cd.courseId} className="px-3 py-3 text-center">
                                {!cd.assigned ? (
                                  <span className="text-xs text-gray-600">—</span>
                                ) : (
                                  <div className={`inline-flex flex-col items-center px-2.5 py-1 rounded-lg text-xs font-medium ${cellColor(cd.percent)}`}>
                                    <span>{cd.percent}%</span>
                                    {cd.percent === 100 && cd.quizPassed && <span className="text-[10px] mt-0.5">✓ Quiz</span>}
                                  </div>
                                )}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-center">
                              <div className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${cellColor(up.overallPercent)}`}>
                                {up.overallPercent}%
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
