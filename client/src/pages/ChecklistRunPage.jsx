import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

export default function ChecklistRunPage() {
  const { completionId } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState({});
  const [overallNotes, setOverallNotes] = useState('');
  const [saving, setSaving] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/compliance/runs/${completionId}`)
      .then(res => {
        setRun(res.data);
        setItems(res.data.items || []);
        setLoading(false);
      })
      .catch(() => { alert('Not found'); navigate('/compliance'); });
  }, [completionId]);

  const toggle = async (item) => {
    const newVal = !item.checked;
    setItems(prev => prev.map(i => i.item_id === item.item_id ? { ...i, checked: newVal ? 1 : 0 } : i));
    setSaving(item.item_id);
    try {
      await axios.put(`/api/compliance/runs/${completionId}/items/${item.item_id}`, {
        checked: newVal, notes: notes[item.item_id] || null
      });
    } catch (e) {
      setItems(prev => prev.map(i => i.item_id === item.item_id ? { ...i, checked: item.checked } : i));
    }
    setSaving(null);
  };

  const saveNote = async (item) => {
    await axios.put(`/api/compliance/runs/${completionId}/items/${item.item_id}`, {
      checked: item.checked, notes: notes[item.item_id] || null
    });
  };

  const complete = async () => {
    setCompleting(true);
    try {
      await axios.post(`/api/compliance/runs/${completionId}/complete`, { overall_notes: overallNotes });
      navigate('/compliance');
    } catch (e) {
      alert('Failed to complete checklist');
      setCompleting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-surface-900"><Navbar />
      <div className="flex items-center justify-center h-64 text-gray-400">Loading checklist...</div>
    </div>
  );

  const checked = items.filter(i => i.checked).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
  const allCriticalDone = items.filter(i => i.is_critical).every(i => i.checked);
  const isDone = run?.status === 'completed';

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Back */}
        <Link to="/compliance" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-6 w-fit">
          ← Back to Compliance
        </Link>

        {/* Header */}
        <div className="bg-surface-800 rounded-2xl border border-surface-600 p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{run?.frequency} Checklist</p>
              <h1 className="text-2xl font-bold text-white">{run?.checklist_title}</h1>
              <p className="text-sm text-gray-400 mt-1">By {run?.completed_by_name} · Started {new Date(run?.started_at).toLocaleString()}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium shrink-0 ${isDone ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
              {isDone ? '✓ Completed' : '⏳ In Progress'}
            </span>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-400">{checked} of {total} items</span>
              <span className={`font-bold ${pct === 100 ? 'text-green-400' : 'text-primary-400'}`}>{pct}%</span>
            </div>
            <div className="bg-surface-700 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-3 mb-6">
          {items.map(item => (
            <div
              key={item.item_id}
              className={`bg-surface-800 rounded-xl border p-4 transition-colors ${item.checked ? 'border-green-600/40' : item.is_critical ? 'border-red-600/40' : 'border-surface-600'}`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => !isDone && toggle(item)}
                  disabled={isDone || saving === item.item_id}
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    item.checked
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-surface-400 hover:border-primary-400'
                  } ${isDone ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {item.checked && '✓'}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium text-sm ${item.checked ? 'line-through text-gray-500' : 'text-white'}`}>
                      {item.title}
                    </p>
                    {item.is_critical === 1 && (
                      <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded font-medium">Critical</span>
                    )}
                  </div>
                  {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}

                  {/* Note input */}
                  {!isDone && (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Add note… (optional)"
                        value={notes[item.item_id] || ''}
                        onChange={e => setNotes(prev => ({ ...prev, [item.item_id]: e.target.value }))}
                        onBlur={() => saveNote(item)}
                        className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-1.5 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-primary-500"
                      />
                    </div>
                  )}
                  {isDone && item.notes && <p className="text-xs text-gray-500 mt-1 italic">Note: {item.notes}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Complete button */}
        {!isDone && (
          <div className="bg-surface-800 rounded-xl border border-surface-600 p-4">
            <textarea
              value={overallNotes}
              onChange={e => setOverallNotes(e.target.value)}
              placeholder="Overall notes for this checklist (optional)…"
              rows={2}
              className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-primary-500 resize-none mb-3"
            />
            {!allCriticalDone && (
              <p className="text-xs text-red-400 mb-3 flex items-center gap-1">
                ⚠️ Some <strong>critical</strong> items are not yet checked. Please complete them before finalising.
              </p>
            )}
            <button
              onClick={complete}
              disabled={completing || !allCriticalDone}
              className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
            >
              {completing ? 'Submitting…' : `✓ Complete Checklist (${checked}/${total})`}
            </button>
          </div>
        )}

        {isDone && (
          <div className="bg-green-500/10 border border-green-600/30 rounded-xl p-4 text-center">
            <p className="text-green-400 font-semibold text-lg">✓ Checklist Completed</p>
            <p className="text-gray-400 text-sm mt-1">Completed on {new Date(run.completed_at).toLocaleString()}</p>
            {run.overall_notes && <p className="text-gray-300 text-sm mt-2 italic">"{run.overall_notes}"</p>}
            <Link to="/compliance" className="mt-4 inline-block px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors">
              Back to Compliance
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
