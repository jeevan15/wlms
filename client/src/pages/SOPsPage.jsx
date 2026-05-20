import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

const CAT_ICON = {
  'Operations': '⚙️', 'Safety': '⛑️', 'Equipment': '🏗️',
  'Compliance': '📋', 'Emergency': '🚨', 'General': '📄',
};

export default function SOPsPage() {
  const [sops, setSops]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch]       = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [loading, setLoading]     = useState(true);

  const fetchSops = () => {
    const params = {};
    if (search) params.search = search;
    if (activeCategory) params.category = activeCategory;
    axios.get('/api/sops', { params }).then(res => {
      setSops(res.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    axios.get('/api/sops/categories').then(res => setCategories(res.data));
  }, []);

  useEffect(() => { fetchSops(); }, [search, activeCategory]);

  if (loading) return (
    <div className="min-h-screen bg-surface-900"><Navbar />
      <div className="flex items-center justify-center h-64 text-gray-400">Loading SOPs...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-8">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Documentation</p>
          <h1 className="text-3xl font-bold text-white">Standard Operating Procedures</h1>
          <p className="text-gray-400 mt-1">All workplace SOPs, safety procedures, and operational guides.</p>
        </div>

        {/* Search + Category filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
            <input
              type="text"
              placeholder="Search SOPs…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input w-full pl-9"
            />
          </div>
          <select
            value={activeCategory}
            onChange={e => setActiveCategory(e.target.value)}
            className="input sm:w-48"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {sops.length === 0 && (
          <div className="text-center text-gray-500 py-16">
            <div className="text-4xl mb-3">📄</div>
            <p>No SOPs found.</p>
          </div>
        )}

        {/* Group by category */}
        {(() => {
          const grouped = {};
          sops.forEach(s => {
            const cat = s.category || 'General';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(s);
          });
          return Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">{CAT_ICON[cat] || '📄'}</span>
                <h2 className="text-lg font-semibold text-white">{cat}</h2>
                <span className="text-xs text-gray-500 bg-surface-700 px-2 py-0.5 rounded-full">{items.length}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(sop => (
                  <Link
                    key={sop.id}
                    to={`/sops/${sop.id}`}
                    className="bg-surface-800 rounded-xl border border-surface-600 hover:border-primary-600 p-5 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-white text-sm group-hover:text-primary-300 transition-colors leading-snug">
                        {sop.title}
                      </h3>
                      <span className="text-xs text-gray-500 bg-surface-700 px-2 py-0.5 rounded-full shrink-0">v{sop.version}</span>
                    </div>
                    {sop.summary && (
                      <p className="text-gray-400 text-xs mb-3 line-clamp-2">{sop.summary}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      {sop.applies_to && <span>👥 {sop.applies_to}</span>}
                      {sop.reviewed_at && <span>✅ Reviewed {sop.reviewed_at}</span>}
                    </div>
                    <div className="mt-3 pt-3 border-t border-surface-600 flex items-center justify-between">
                      <span className="text-xs text-gray-500">{sop.created_by_name}</span>
                      <span className="text-xs text-primary-400 group-hover:text-primary-300">Read →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
