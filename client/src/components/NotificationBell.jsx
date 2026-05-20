import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unreadCount: 0 });
  const ref = useRef(null);

  const fetch = () => axios.get('/api/notifications').then(r => setData(r.data)).catch(() => {});

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    await axios.put('/api/notifications/read-all');
    setData(d => ({ ...d, unreadCount: 0, notifications: d.notifications.map(n => ({ ...n, read: 1 })) }));
  };

  const markRead = async (id) => {
    await axios.put(`/api/notifications/${id}/read`);
    setData(d => ({
      ...d,
      unreadCount: Math.max(0, d.unreadCount - 1),
      notifications: d.notifications.map(n => n.id === id ? { ...n, read: 1 } : n)
    }));
  };

  const typeIcon = (type) => ({ info: 'ℹ️', warning: '⚠️', success: '✅', error: '❌' }[type] || 'ℹ️');

  const timeAgo = (dt) => {
    const diff = (Date.now() - new Date(dt)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetch(); }}
        className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {data.unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
            {data.unreadCount > 9 ? '9+' : data.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-surface-800 border border-surface-600 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-600">
            <span className="font-semibold text-white text-sm">Notifications</span>
            {data.unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary-400 hover:text-primary-300">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {data.notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">No notifications yet</div>
            ) : (
              data.notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`px-4 py-3 border-b border-surface-700 last:border-0 cursor-pointer hover:bg-surface-700/50 transition-colors ${!n.read ? 'bg-primary-900/20' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">{typeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-tight ${n.read ? 'text-gray-400' : 'text-white'}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-xs text-gray-600 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
