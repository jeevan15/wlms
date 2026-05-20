import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Quiz from '../components/Quiz';

export default function LessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);

  const fetchLesson = () => {
    setLoading(true);
    axios.get(`/api/courses/${courseId}/lessons/${lessonId}`)
      .then(r => {
        setLesson(r.data);
        setCompleted(r.data.completed);
        setQuizPassed(r.data.lastAttempt?.passed === 1);
      })
      .catch(() => navigate(`/courses/${courseId}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLesson(); }, [courseId, lessonId]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await axios.post(`/api/courses/${courseId}/lessons/${lessonId}/complete`);
      setCompleted(true);
    } finally {
      setCompleting(false);
    }
  };

  const handleQuizPass = () => {
    setQuizPassed(true);
    setCompleted(true);
  };

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

  if (!lesson) return null;

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Top lesson nav bar */}
      <div className="bg-surface-800 border-b border-surface-600 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link
            to={`/courses/${courseId}`}
            className="text-gray-400 hover:text-white text-sm flex items-center gap-2 flex-shrink-0"
          >
            ← Back to Course
          </Link>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-sm font-medium text-gray-200 truncate">{lesson.title}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {lesson.prevLessonId && (
              <Link
                to={`/courses/${courseId}/lessons/${lesson.prevLessonId}`}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                ← Prev
              </Link>
            )}
            {lesson.nextLessonId && (
              <Link
                to={`/courses/${courseId}/lessons/${lesson.nextLessonId}`}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Lesson header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <span>⏱ {lesson.duration}</span>
            {lesson.has_quiz && (
              <>
                <span>·</span>
                <span className="text-primary-400">Includes assessment</span>
              </>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white">{lesson.title}</h1>
          {completed && (
            <div className="flex items-center gap-2 mt-3 text-green-400 text-sm font-medium">
              <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</span>
              Lesson complete
              {lesson.completed_at && (
                <span className="text-gray-500 font-normal">
                  · {new Date(lesson.completed_at).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Lesson content */}
        <div className="card p-8 mb-8">
          <div
            className="lesson-content"
            dangerouslySetInnerHTML={{ __html: lesson.content }}
          />
        </div>

        {/* Complete button (non-quiz lessons) */}
        {!lesson.has_quiz && (
          <div className="flex items-center justify-between card p-5 mb-8">
            <div>
              <p className="font-medium text-white">
                {completed ? '✅ You have completed this lesson' : 'Ready to mark this lesson as done?'}
              </p>
              {!completed && <p className="text-gray-400 text-sm mt-0.5">Click the button once you have read through the content above.</p>}
            </div>
            {!completed ? (
              <button onClick={handleComplete} disabled={completing} className="btn-primary whitespace-nowrap">
                {completing ? 'Saving...' : 'Mark Complete'}
              </button>
            ) : (
              lesson.nextLessonId && (
                <Link to={`/courses/${courseId}/lessons/${lesson.nextLessonId}`} className="btn-primary whitespace-nowrap">
                  Next Lesson →
                </Link>
              )
            )}
          </div>
        )}

        {/* Quiz */}
        {lesson.has_quiz && lesson.quiz && (
          <div className="card p-6 mb-8">
            {quizPassed && (
              <div className="flex items-center gap-3 bg-green-900/30 border border-green-600 rounded-xl p-4 mb-6">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="font-bold text-green-300">Assessment Passed</p>
                  {lesson.lastAttempt && (
                    <p className="text-sm text-green-400/70">
                      Score: {lesson.lastAttempt.score}/{lesson.lastAttempt.total}
                    </p>
                  )}
                </div>
                {lesson.nextLessonId && (
                  <Link to={`/courses/${courseId}/lessons/${lesson.nextLessonId}`} className="btn-primary ml-auto whitespace-nowrap text-sm">
                    Continue →
                  </Link>
                )}
              </div>
            )}
            <Quiz
              quiz={lesson.quiz}
              courseId={courseId}
              lessonId={lessonId}
              onPass={handleQuizPass}
            />
          </div>
        )}

        {/* Bottom navigation */}
        <div className="flex justify-between pt-4 border-t border-surface-700">
          {lesson.prevLessonId ? (
            <Link to={`/courses/${courseId}/lessons/${lesson.prevLessonId}`} className="btn-secondary">
              ← Previous Lesson
            </Link>
          ) : (
            <Link to={`/courses/${courseId}`} className="btn-secondary">← Course Overview</Link>
          )}
          {lesson.nextLessonId ? (
            <Link to={`/courses/${courseId}/lessons/${lesson.nextLessonId}`} className="btn-primary">
              Next Lesson →
            </Link>
          ) : (
            <Link to={`/courses/${courseId}`} className="btn-primary">Finish Course ✓</Link>
          )}
        </div>
      </div>
    </div>
  );
}
