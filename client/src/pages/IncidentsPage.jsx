import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

const SEV_COLOR = {
  low:      'bg-gray-500/20 text-gray-300',
  medium:   'bg-amber-500/20 text-amber-300',
  high:     'bg-orange-500/20 text-orange-300',
  critical: 'bg-red-500/20 text-red-300',
};
const STATUS_COLOR = {
  open:          'bg-red-500/20 text-red-300',
  investigating: 'bg-amber-500/20 text-amber-300',
  resolved:      'bg-blue-500/20 text-blue-300',
  closed:        'bg-green-500/20 text-green-300',
};
const TYPE_ICON = {
  near_miss: '⚠️', first_aid: '🏥', injury: '🩹', hazard: '🚧',
  emergency: '🚨', property_damage: '🏗️', environmental: '🌿', other: '📋'
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats]         = useState({});
  const [filter, setFilter]       = useState('all');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/incidents'),
      axios.get('/api/incidents/stats'),
    ]).then(([inc, st]) => {
      setIncidents(inc.data);
      setStats(st.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? incidents : incidents.filter(i => i.status === filter);

  if (loading) return (
    <div className="min-h-screen bg-surface-900"><Navbar />
      <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Safety Management</p>
            <h1 className="text-3xl font-bold text-white">Incidents & First Aid</h1>
            <p className="text-gray-400 mt-1">Report and track workplace incidents and injuries.</p>
          </div>
          <Link to="/incidents/new" className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors text-sm flex items-center gap-2">
            ＋ Report Incident
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, icon: '📋', color: 'text-white' },
            { label: 'Open', value: stats.open, icon: '🔴', color: 'text-red-400' },
            { label: 'This Month', value: stats.this_month, icon: '📅', color: 'text-amber-400' },
            { label: 'Critical Open', value: stats.critical, icon: '🚨', color: 'text-red-500' },
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

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'open', 'investigating', 'resolved', 'closed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${filter === f ? 'bg-primary-600 text-white' : 'bg-surface-700 text-gray-400 hover:text-white'}`}
            >
              {f === 'all' ? 'All Incidents' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center text-gray-500 py-16">
              <div className="text-4xl mb-3">⚠️</div>
              <p>No incidents found.</p>
            </div>
          )}
          {filtered.map(inc => (
            <div key={inc.id} className="bg-surface-800 rounded-xl border border-surface-600 hover:border-surface-500 p-5 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="text-2xl shrink-0 mt-0.5">{TYPE_ICON[inc.type] || '📋'}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white text-sm">{inc.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${SEV_COLOR[inc.severity]}`}>
                        {inc.severity}
                      </span>
                    </div>
                    {inc.description && <p className="text-gray-400 text-sm mb-2 line-clamp-2">{inc.description}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>👤 {inc.reported_by_name}</span>
                      {inc.location && <span>📍 {inc.location}</span>}
                      <span>📅 {new Date(inc.reported_at).toLocaleDateString()}</span>
                      <span className="capitalize">🏷️ {inc.type?.replace('_', ' ')}</span>
                      {inc.first_aid_given === 1 && <span className="text-pink-400">🏥 First aid given</span>}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLOR[inc.status]}`}>
                    {inc.status}
                  </span>
                </div>
              </div>
              {inc.action_taken && (
                <div className="mt-3 pt-3 border-t border-surface-600 text-xs text-gray-500">
                  <strong className="text-gray-400">Action taken:</strong> {inc.action_taken}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
