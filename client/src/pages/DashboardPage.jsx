import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import CourseCard from '../components/CourseCard';

const QUICK_LINKS = [
  { to: '/compliance', icon: '✅', label: 'Compliance',        sub: 'Checklists & safety',   color: 'from-cyan-600/20 to-cyan-600/5 border-cyan-600/30' },
  { to: '/tasks',      icon: '📋', label: 'My Tasks',          sub: 'Assigned work',         color: 'from-blue-600/20 to-blue-600/5 border-blue-600/30' },
  { to: '/incidents',  icon: '⚠️', label: 'Report Incident',   sub: 'Safety incidents',      color: 'from-red-600/20 to-red-600/5 border-red-600/30' },
  { to: '/sops',       icon: '📄', label: 'SOPs',              sub: 'Procedures & guides',   color: 'from-purple-600/20 to-purple-600/5 border-purple-600/30' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [courses, setCourses]   = useState([]);
  const [taskStats, setTaskStats] = useState(null);
  const [compStats, setCompStats] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/courses'),
      axios.get('/api/tasks/stats'),
      axios.get('/api/compliance/stats'),
    ]).then(([c, t, comp]) => {
      setCourses(c.data);
      setTaskStats(t.data);
      setCompStats(comp.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const totalLessons     = courses.reduce((s, c) => s + c.totalLessons, 0);
  const completedLessons = courses.reduce((s, c) => s + c.completedLessons, 0);
  const completedCourses = courses.filter(c => c.completedLessons === c.totalLessons && c.totalLessons > 0).length;
  const overallPercent   = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-400 mt-1">
            {user?.department ? `${user.department} · ` : ''}Your compliance & training hub.
          </p>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {QUICK_LINKS.map(l => (
            <Link key={l.to} to={l.to}
              className={`bg-gradient-to-br ${l.color} border rounded-xl p-4 hover:scale-[1.02] transition-transform`}>
              <span className="text-2xl block mb-1.5">{l.icon}</span>
              <p className="text-white font-semibold text-sm">{l.label}</p>
              <p className="text-gray-400 text-xs mt-0.5">{l.sub}</p>
            </Link>
          ))}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Overall Training', value: `${overallPercent}%`,              icon: '📊', color: 'text-primary-400' },
            { label: 'Lessons Done',     value: `${completedLessons}/${totalLessons}`, icon: '✅', color: 'text-green-400' },
            { label: 'Tasks Pending',    value: taskStats?.pending ?? '—',          icon: '📋', color: taskStats?.overdue > 0 ? 'text-red-400' : 'text-blue-400' },
            { label: 'Checklists Today', value: compStats?.completedToday ?? '—',  icon: '🗂️', color: 'text-cyan-400' },
          ].map(stat => (
            <div key={stat.label} className="card p-5">
              <span className="text-xl">{stat.icon}</span>
              <p className={`text-2xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
              <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Overall progress bar */}
        {totalLessons > 0 && (
          <div className="card p-5 mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-300">Overall Training Completion</span>
              <span className="text-sm font-bold text-primary-400">{overallPercent}%</span>
            </div>
            <div className="w-full h-3 bg-surface-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-700"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
            {overallPercent === 100 && (
              <p className="text-green-400 text-sm font-medium mt-3 flex items-center gap-2">
                🎉 Congratulations! You have completed all required training.
              </p>
            )}
            {taskStats?.overdue > 0 && (
              <p className="text-red-400 text-sm mt-3 flex items-center gap-2">
                ⚠️ You have <Link to="/tasks" className="underline font-semibold">{taskStats.overdue} overdue task{taskStats.overdue !== 1 ? 's' : ''}</Link>
              </p>
            )}
          </div>
        )}

        {/* Courses */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Your Training Modules</h2>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : courses.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-gray-400">No training modules assigned yet.</p>
              <p className="text-gray-500 text-sm mt-1">Contact your administrator to get training assigned.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(course => <CourseCard key={course.id} course={course} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
