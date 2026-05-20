import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import CourseCard from '../components/CourseCard';

export default function DashboardPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/courses')
      .then(r => setCourses(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalLessons = courses.reduce((s, c) => s + c.totalLessons, 0);
  const completedLessons = courses.reduce((s, c) => s + c.completedLessons, 0);
  const completedCourses = courses.filter(c => c.completedLessons === c.totalLessons && c.totalLessons > 0).length;
  const overallPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

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
            {user?.department ? `${user.department} · ` : ''}Continue your training below.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Overall Progress', value: `${overallPercent}%`, icon: '📊', color: 'text-primary-400' },
            { label: 'Lessons Completed', value: `${completedLessons}/${totalLessons}`, icon: '✅', color: 'text-green-400' },
            { label: 'Courses Completed', value: `${completedCourses}/${courses.length}`, icon: '🎓', color: 'text-yellow-400' },
            { label: 'Courses Enrolled', value: courses.length, icon: '📚', color: 'text-blue-400' }
          ].map(stat => (
            <div key={stat.label} className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{stat.icon}</span>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
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
          </div>
        )}

        {/* Courses */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Your Training Modules</h2>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
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
