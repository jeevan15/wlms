import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';

const INCIDENT_TYPES = [
  { value: 'near_miss', label: 'Near Miss' },
  { value: 'first_aid', label: 'First Aid' },
  { value: 'injury', label: 'Injury' },
  { value: 'hazard', label: 'Hazard Identification' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'other', label: 'Other' },
];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

export default function IncidentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [form, setForm] = useState({
    type: 'near_miss', title: '', description: '', location: '',
    severity: 'low', injured_party: '', first_aid_given: false,
    first_aider: '', action_taken: '', follow_up_required: false,
    follow_up_notes: '', occurred_at: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      axios.get(`/api/incidents/${id}`).then(res => {
        const d = res.data;
        setForm({
          type: d.type, title: d.title, description: d.description || '',
          location: d.location || '', severity: d.severity,
          injured_party: d.injured_party || '',
          first_aid_given: !!d.first_aid_given, first_aider: d.first_aider || '',
          action_taken: d.action_taken || '', follow_up_required: !!d.follow_up_required,
          follow_up_notes: d.follow_up_notes || '', occurred_at: d.occurred_at || '',
        });
      }).catch(() => navigate('/incidents'));
    }
  }, [id]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return alert('Title is required');
    setSaving(true);
    try {
      if (isEdit) {
        await axios.put(`/api/incidents/${id}`, form);
      } else {
        await axios.post('/api/incidents', form);
      }
      navigate('/incidents');
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to save incident');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/incidents" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-6 w-fit">
          ← Back to Incidents
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit Incident' : 'Report an Incident'}</h1>
          <p className="text-gray-400 text-sm mt-1">Complete all relevant fields. Critical incidents should be reported immediately.</p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="bg-surface-800 rounded-xl border border-surface-600 p-5 space-y-4">
            <h2 className="font-semibold text-white text-sm uppercase tracking-wider">Incident Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Type *</label>
                <select value={form.type} onChange={e => set('type', e.target.value)} className="input w-full">
                  {INCIDENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Severity *</label>
                <select value={form.severity} onChange={e => set('severity', e.target.value)} className="input w-full capitalize">
                  {SEVERITIES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Title *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Brief incident title…" required className="input w-full" />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe what happened…" rows={3} className="input w-full resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Location</label>
                <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Bay 3, Cold Room" className="input w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Time / Date Occurred</label>
                <input type="datetime-local" value={form.occurred_at} onChange={e => set('occurred_at', e.target.value)} className="input w-full" />
              </div>
            </div>
          </div>

          <div className="bg-surface-800 rounded-xl border border-surface-600 p-5 space-y-4">
            <h2 className="font-semibold text-white text-sm uppercase tracking-wider">Injuries & First Aid</h2>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Injured Party (if any)</label>
              <input value={form.injured_party} onChange={e => set('injured_party', e.target.value)} placeholder="Name of injured person" className="input w-full" />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.first_aid_given} onChange={e => set('first_aid_given', e.target.checked)}
                className="w-4 h-4 rounded text-primary-500 bg-surface-700 border-surface-500" />
              <span className="text-sm text-white">First aid was provided</span>
            </label>

            {form.first_aid_given && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">First Aider Name</label>
                <input value={form.first_aider} onChange={e => set('first_aider', e.target.value)} placeholder="Name of first aider" className="input w-full" />
              </div>
            )}
          </div>

          <div className="bg-surface-800 rounded-xl border border-surface-600 p-5 space-y-4">
            <h2 className="font-semibold text-white text-sm uppercase tracking-wider">Actions & Follow-up</h2>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Immediate Action Taken</label>
              <textarea value={form.action_taken} onChange={e => set('action_taken', e.target.value)} placeholder="Describe immediate corrective actions…" rows={2} className="input w-full resize-none" />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.follow_up_required} onChange={e => set('follow_up_required', e.target.checked)}
                className="w-4 h-4 rounded text-primary-500 bg-surface-700 border-surface-500" />
              <span className="text-sm text-white">Follow-up investigation required</span>
            </label>

            {form.follow_up_required && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Follow-up Notes</label>
                <textarea value={form.follow_up_notes} onChange={e => set('follow_up_notes', e.target.value)} placeholder="Describe required follow-up actions…" rows={2} className="input w-full resize-none" />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Link to="/incidents" className="flex-1 py-3 bg-surface-700 hover:bg-surface-600 text-gray-300 rounded-xl font-medium text-center transition-colors">
              Cancel
            </Link>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
              {saving ? 'Saving…' : isEdit ? 'Update Incident' : '⚠️ Report Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
