import { Link } from 'react-router-dom';
import ProgressBar from './ProgressBar';

const ICONS = {
  building: '🏗️',
  tool: '🔧',
  warehouse: '🏭',
  safety: '⛑️'
};

export default function CourseCard({ course }) {
  const percent = course.totalLessons > 0
    ? Math.round((course.completedLessons / course.totalLessons) * 100)
    : 0;

  const isComplete = percent === 100;

  return (
    <Link to={`/courses/${course.id}`} className="block group">
      <div className="card overflow-hidden hover:border-primary-600 transition-all duration-200 hover:shadow-lg hover:shadow-primary-900/20">
        <div
          className="h-44 flex items-center justify-center relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${course.color}cc, ${course.color}66)` }}
        >
          <span className="text-7xl opacity-80 group-hover:scale-110 transition-transform duration-300">
            {ICONS[course.icon] || '📚'}
          </span>
          {isComplete && (
            <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              ✓ COMPLETE
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-white text-lg leading-tight group-hover:text-primary-400 transition-colors">
              {course.title}
            </h3>
          </div>
          <p className="text-gray-400 text-sm mb-4 line-clamp-2">{course.description}</p>

          <ProgressBar percent={percent} />

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-500">
              {course.completedLessons} / {course.totalLessons} lessons
            </span>
            <span className="text-sm font-bold" style={{ color: isComplete ? '#22c55e' : '#9ca3af' }}>
              {percent}% complete
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
