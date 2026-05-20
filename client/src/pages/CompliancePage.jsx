import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

const FREQ_LABEL = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', 'one-time': 'One-time' };
const FREQ_COLOR = { daily: 'bg-blue-500/20 text-blue-300', weekly: 'bg-purple-500/20 text-purple-300', monthly: 'bg-amber-500/20 text-amber-300', 'one-time': 'bg-gray-500/20 text-gray-300' };

export default function CompliancePage() {
  const [categories, setCategories] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [history, setHistory]       = useState([]);
  const [stats, setStats]           = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [starting, setStarting]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('checklists');

  useEffect(() => {
    Promise.all([
      axios.get('/api/compliance/categories'),
      axios.get('/api/compliance/checklists'),
      axios.get('/api/compliance/history'),
      axios.get('/api/compliance/stats'),
    ]).then(([cat, cl, hist, st]) => {
      setCategories(cat.data);
      setChecklists(cl.data);
      setHistory(hist.data);
      setStats(st.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = activeCategory
    ? checklists.filter(c => c.category_id === activeCategory)
    : checklists;

  const startChecklist = async (checklistId) => {
    setStarting(checklistId);
    try {
      const res = await axios.post(`/api/compliance/checklists/${checklistId}/start`);
      window.location.href = `/compliance/run/${res.data.completion_id}`;
    } catch (e) {
      alert('Failed to start checklist');
      setStarting(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-surface-900"><Navbar />
      <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Compliance & Safety</p>
          <h1 className="text-3xl font-bold text-white">Compliance Hub</h1>
          <p className="text-gray-400 mt-1">Complete checklists, manage safety tasks, and stay compliant.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Checklists', value: stats.totalChecklists, icon: '📋', color: 'text-blue-400' },
            { label: 'Done Today', value: stats.completedToday, icon: '✅', color: 'text-green-400' },
            { label: 'In Progress', value: stats.pendingRuns, icon: '⏳', color: 'text-amber-400' },
            { label: 'Total Runs', value: stats.totalRuns, icon: '📊', color: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="bg-surface-800 rounded-xl p-4 border border-surface-600">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{s.icon}</span>
                <span className={`text-2xl font-bold ${s.color}`}>{s.value ?? '—'}</span>
              </div>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Categories filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${!activeCategory ? 'bg-primary-600 text-white' : 'bg-surface-700 text-gray-400 hover:text-white'}`}
          >All Categories</button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === cat.id ? 'text-white' : 'bg-surface-700 text-gray-400 hover:text-white'}`}
              style={activeCategory === cat.id ? { backgroundColor: cat.color } : {}}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-surface-800 rounded-xl p-1 border border-surface-600 w-fit">
          {['checklists', 'history'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >{t === 'checklists' ? '📋 Checklists' : '📜 History'}</button>
          ))}
        </div>

        {tab === 'checklists' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.length === 0 && (
              <div className="col-span-3 text-center text-gray-500 py-12">No checklists found.</div>
            )}
            {filtered.map(cl => (
              <div key={cl.id} className="bg-surface-800 rounded-xl border border-surface-600 p-5 flex flex-col gap-3 hover:border-surface-500 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" style={{ color: cl.category_color }}>{cl.category_icon}</span>
                    <div>
                      <h3 className="font-semibold text-white text-sm leading-tight">{cl.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{cl.category_name}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${FREQ_COLOR[cl.frequency] || 'bg-gray-500/20 text-gray-300'}`}>
                    {FREQ_LABEL[cl.frequency] || cl.frequency}
                  </span>
                </div>
                {cl.description && <p className="text-gray-400 text-xs">{cl.description}</p>}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-surface-600">
                  <span className="text-xs text-gray-500">{cl.item_count} items{cl.role_name ? ` · ${cl.role_name}` : ''}</span>
                  <button
                    onClick={() => startChecklist(cl.id)}
                    disabled={starting === cl.id}
                    className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-60"
                  >
                    {starting === cl.id ? 'Starting…' : '▶ Start'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-3">
            {history.length === 0 && (
              <div className="text-center text-gray-500 py-12">No checklist history yet.</div>
            )}
            {history.map(run => {
              const pct = run.total_items > 0 ? Math.round((run.checked_items / run.total_items) * 100) : 0;
              return (
                <div key={run.id} className="bg-surface-800 rounded-xl border border-surface-600 p-4 flex items-center gap-4">
                  <span className="text-2xl">{run.category_icon || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{run.checklist_title}</p>
                    <p className="text-xs text-gray-500">{run.completed_by_name} · {new Date(run.started_at).toLocaleDateString()}</p>
                    <div className="mt-1.5 bg-surface-700 rounded-full h-1.5 w-full">
                      <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-white">{pct}%</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${run.status === 'completed' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {run.status === 'completed' ? '✓ Done' : '⏳ In Progress'}
                    </span>
                  </div>
                  {run.status === 'in_progress' && (
                    <Link to={`/compliance/run/${run.id}`} className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-white text-xs rounded-lg font-medium transition-colors">Resume</Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
