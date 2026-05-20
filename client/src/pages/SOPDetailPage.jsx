import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

export default function SOPDetailPage() {
  const { id } = useParams();
  const [sop, setSop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/sops/${id}`)
      .then(res => { setSop(res.data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-surface-900"><Navbar />
      <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
    </div>
  );

  if (!sop) return (
    <div className="min-h-screen bg-surface-900"><Navbar />
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-400 mb-4">SOP not found</p>
          <Link to="/sops" className="text-primary-400 hover:text-primary-300">← Back to SOPs</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/sops" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-6 w-fit">
          ← Back to SOPs
        </Link>

        {/* Header card */}
        <div className="bg-surface-800 rounded-2xl border border-surface-600 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{sop.category} SOP</p>
              <h1 className="text-2xl font-bold text-white">{sop.title}</h1>
            </div>
            <span className="text-sm bg-primary-600/20 text-primary-300 px-3 py-1 rounded-full border border-primary-600/30 shrink-0">
              v{sop.version}
            </span>
          </div>
          {sop.summary && <p className="text-gray-400 mb-4">{sop.summary}</p>}
          <div className="flex flex-wrap gap-4 text-sm text-gray-400 pt-4 border-t border-surface-600">
            {sop.applies_to && (
              <div className="flex items-center gap-1.5">
                <span>👥</span>
                <span>Applies to: <strong className="text-white">{sop.applies_to}</strong></span>
              </div>
            )}
            {sop.reviewed_at && (
              <div className="flex items-center gap-1.5">
                <span>✅</span>
                <span>Reviewed: <strong className="text-white">{sop.reviewed_at}</strong></span>
              </div>
            )}
            {sop.created_by_name && (
              <div className="flex items-center gap-1.5">
                <span>👤</span>
                <span>Created by: <strong className="text-white">{sop.created_by_name}</strong></span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span>📅</span>
              <span>Created: <strong className="text-white">{new Date(sop.created_at).toLocaleDateString()}</strong></span>
            </div>
          </div>
        </div>

        {/* Content */}
        {sop.content ? (
          <div className="bg-surface-800 rounded-2xl border border-surface-600 p-6">
            <div className="lesson-content" dangerouslySetInnerHTML={{ __html: sop.content }} />
          </div>
        ) : (
          <div className="bg-surface-800 rounded-2xl border border-surface-600 p-6 text-center text-gray-500">
            No detailed content available for this SOP.
          </div>
        )}

        {/* Print button */}
        <div className="mt-6 flex gap-3">
          <button onClick={() => window.print()} className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            🖨️ Print
          </button>
          <Link to="/sops" className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors">
            ← All SOPs
          </Link>
        </div>
      </div>
    </div>
  );
}
