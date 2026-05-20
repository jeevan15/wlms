import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';

const USER_NAV = [
  { to: '/',           label: 'My Training',  icon: '📚', exact: true },
  { to: '/compliance', label: 'Compliance',   icon: '✅' },
  { to: '/tasks',      label: 'My Tasks',     icon: '📋' },
  { to: '/incidents',  label: 'Incidents',    icon: '⚠️' },
  { to: '/sops',       label: 'SOPs',         icon: '📄' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (to, exact) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <nav className="bg-surface-800 border-b border-surface-600 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center text-lg">🏭</div>
            <div className="hidden sm:block">
              <span className="font-bold text-white text-sm leading-none block">Warehouse</span>
              <span className="text-primary-400 text-xs font-medium">Compliance & Training</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-0.5">
            {USER_NAV.map(({ to, label, icon, exact }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isActive(to, exact)
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-surface-700'
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            ))}
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-400 hover:text-white hover:bg-surface-700'
                }`}
              >
                <span>⚙️</span>Admin
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-white leading-none">{user?.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{user?.department || user?.role}</p>
            </div>
            <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-surface-700 transition-colors hidden sm:block">
              Sign out
            </button>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-gray-400 hover:text-white p-2 rounded-lg hover:bg-surface-700"
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden pb-3 border-t border-surface-600 mt-2 pt-3 space-y-1">
            {USER_NAV.map(({ to, label, icon, exact }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(to, exact)
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-surface-700'
                }`}
              >
                <span>{icon}</span>{label}
              </Link>
            ))}
            {user?.role === 'admin' && (
              <Link to="/admin" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-amber-400 hover:text-white hover:bg-surface-700">
                <span>⚙️</span>Admin Panel
              </Link>
            )}
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-surface-700 w-full">
              <span>🚪</span>Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
