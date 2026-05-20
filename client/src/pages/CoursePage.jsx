import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import ProgressBar from '../components/ProgressBar';

const ICONS = { building: '🏗️', tool: '🔧', warehouse: '🏭', safety: '⛑️' };

export default function CoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/courses/${courseId}`)
      .then(r => setCourse(r.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [courseId]);

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

  if (!course) return null;

  const completed = course.lessons.filter(l => l.completed).length;
  const total = course.lessons.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const firstIncomplete = course.lessons.find(l => !l.completed);
  const resumeLesson = firstIncomplete || course.lessons[0];

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />

      {/* Course header */}
      <div
        className="relative py-12 px-4"
        style={{ background: `linear-gradient(135deg, ${course.color}33, transparent)` }}
      >
        <div className="max-w-5xl mx-auto">
          <Link to="/" className="text-gray-400 hover:text-white text-sm flex items-center gap-2 mb-6 w-fit">
            ← Back to My Courses
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
              style={{ background: `${course.color}44`, border: `1px solid ${course.color}66` }}
            >
              {ICONS[course.icon] || '📚'}
            </div>
            <div className="flex-1">
              <span className="text-xs font-medium text-primary-400 uppercase tracking-wider">{course.category}</span>
              <h1 className="text-3xl font-bold text-white mt-1 mb-2">{course.title}</h1>
              <p className="text-gray-400 mb-4 max-w-2xl">{course.description}</p>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 max-w-sm">
                  <ProgressBar percent={percent} showLabel />
                </div>
                <span className="text-sm text-gray-400">{completed}/{total} lessons complete</span>
              </div>
            </div>
            {resumeLesson && (
              <Link
                to={`/courses/${courseId}/lessons/${resumeLesson.id}`}
                className="btn-primary whitespace-nowrap"
              >
                {completed === 0 ? '▶ Start Course' : completed === total ? '✓ Review' : '▶ Continue'}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Lessons list */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Course Content</h2>
          <span className="text-sm text-gray-400">{total} lessons</span>
        </div>

        <div className="space-y-2">
          {course.lessons.map((lesson, idx) => (
            <Link
              key={lesson.id}
              to={`/courses/${courseId}/lessons/${lesson.id}`}
              className="flex items-center gap-4 card px-5 py-4 hover:border-primary-600/60 transition-all group"
            >
              {/* Completion indicator */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-colors ${
                lesson.completed
                  ? 'bg-green-500 text-white'
                  : 'bg-surface-600 text-gray-400 group-hover:bg-primary-600/30 group-hover:text-primary-300'
              }`}>
                {lesson.completed ? '✓' : idx + 1}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${lesson.completed ? 'text-gray-300' : 'text-white'}`}>
                  {lesson.title}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-500">⏱ {lesson.duration}</span>
                  {lesson.has_quiz && (
                    <span className="text-xs bg-primary-900/60 text-primary-300 px-2 py-0.5 rounded-full border border-primary-800">
                      Includes assessment
                    </span>
                  )}
                </div>
              </div>

              <span className="text-gray-600 group-hover:text-primary-400 transition-colors">›</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
