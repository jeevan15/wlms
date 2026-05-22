import { useState } from 'react';
import axios from 'axios';

function fmtTime(seconds) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function Quiz({ quiz, courseId, lessonId, onPass, lessonStartTime }) {
  const [answers,    setAnswers]    = useState({});
  const [result,     setResult]     = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const allAnswered = quiz.length > 0 && quiz.every(q => answers[q.id] !== undefined);

  const handleSelect = (questionId, optionId) => {
    if (result) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (!allAnswered) return;
    setSubmitting(true);
    setError('');
    try {
      const time_spent_seconds = Math.round((Date.now() - (lessonStartTime || Date.now())) / 1000);
      const { data } = await axios.post(
        `/api/courses/${courseId}/lessons/${lessonId}/quiz`,
        { answers, time_spent_seconds }
      );
      setResult({ ...data, time_spent_seconds });
      if (data.passed) onPass?.();
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => { setAnswers({}); setResult(null); setError(''); };

  const passMark = Math.ceil(quiz.length * 0.7);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Knowledge Check</h3>
        <span className="text-sm text-gray-400">
          Pass mark: {passMark}/{quiz.length} ({Math.round(passMark / quiz.length * 100)}%)
        </span>
      </div>

      {/* Result banner */}
      {result && (
        <div className={`rounded-xl p-5 border ${
          result.passed
            ? 'bg-green-900/30 border-green-600 text-green-300'
            : 'bg-red-900/30 border-red-600 text-red-300'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">{result.passed ? '🏆' : '📝'}</span>
            <div className="flex-1">
              <p className="font-bold text-lg">
                {result.passed ? 'Assessment Passed!' : 'Not Quite — Try Again'}
              </p>
              <p className="text-sm opacity-80 mt-0.5">
                Score: {result.score}/{result.total} ({Math.round(result.score / result.total * 100)}%)
              </p>
              {result.time_spent_seconds > 0 && (
                <p className="text-sm opacity-70 mt-0.5 flex items-center gap-1.5">
                  <span>⏱</span>
                  Total time for this lesson: <strong>{fmtTime(result.time_spent_seconds)}</strong>
                </p>
              )}
            </div>
          </div>
          {!result.passed && (
            <button onClick={handleRetake} className="mt-3 btn-secondary text-sm">
              Retake Assessment
            </button>
          )}
        </div>
      )}

      {/* Questions */}
      {quiz.map((question, qi) => {
        const qr = result?.results?.[question.id];
        return (
          <div key={question.id} className="card overflow-hidden">
            {/* Question image */}
            {question.image_url && (
              <img
                src={question.image_url}
                alt={`Illustration for question ${qi + 1}`}
                className="w-full h-52 object-cover"
                onError={e => { e.target.style.display = 'none'; }}
              />
            )}
            <div className="p-5">
            <p className="font-semibold text-white mb-4">
              <span className="text-primary-400 mr-2">{qi + 1}.</span>
              {question.question}
            </p>
            <div className="space-y-2.5">
              {question.options.map(option => {
                const isSelected      = answers[question.id] === option.id;
                const isCorrectOption = result && qr?.correctId === option.id;
                const isWrongSel      = result && isSelected && !qr?.correct;

                let cls = 'border-surface-500 bg-surface-700 hover:border-primary-500 hover:bg-surface-600 cursor-pointer';
                if (!result && isSelected)  cls = 'border-primary-500 bg-primary-900/40 cursor-pointer';
                else if (result && isCorrectOption) cls = 'border-green-500 bg-green-900/30 cursor-default';
                else if (result && isWrongSel)      cls = 'border-red-500 bg-red-900/30 cursor-default';
                else if (result)                    cls = 'border-surface-600 bg-surface-700/50 cursor-default opacity-60';

                return (
                  <div key={option.id} onClick={() => handleSelect(question.id, option.id)}
                       className={`flex items-center gap-3 p-3.5 rounded-lg border transition-all duration-150 ${cls}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      !result && isSelected       ? 'border-primary-400 bg-primary-500' :
                      result && isCorrectOption   ? 'border-green-400 bg-green-500' :
                      result && isWrongSel        ? 'border-red-400 bg-red-500' :
                      'border-surface-400'
                    }`}>
                      {!result && isSelected      && <div className="w-2 h-2 rounded-full bg-white" />}
                      {result && isCorrectOption  && <span className="text-white text-xs font-bold">✓</span>}
                      {result && isWrongSel       && <span className="text-white text-xs font-bold">✗</span>}
                    </div>
                    <span className={`text-sm ${
                      result && isCorrectOption ? 'text-green-300 font-medium' :
                      result && isWrongSel      ? 'text-red-300' : 'text-gray-200'
                    }`}>
                      {option.option_text}
                    </span>
                  </div>
                );
              })}
            </div>
            </div>{/* end p-5 */}
          </div>
        );
      })}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!result && (
        <button onClick={handleSubmit} disabled={!allAnswered || submitting}
                className="btn-primary w-full text-center">
          {submitting
            ? 'Submitting…'
            : `Submit Assessment (${Object.keys(answers).length}/${quiz.length} answered)`}
        </button>
      )}
    </div>
  );
}
