import { NavLink, Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const NAV = [
  { to: '/admin/overview',    icon: '📊', label: 'Overview' },
  { to: '/admin/users',       icon: '👥', label: 'Users' },
  { to: '/admin/roles',       icon: '🎭', label: 'Roles & Modules' },
  { to: '/admin/reports',     icon: '📈', label: 'Reports' },
  { to: '/admin/tasks',       icon: '📋', label: 'Tasks' },
  { to: '/admin/compliance',  icon: '✅', label: 'Compliance' },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Administration</p>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        </div>

        {/* Tab navigation */}
        <div className="flex flex-wrap gap-1 mb-6 bg-surface-800 rounded-xl p-1 border border-surface-600">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-surface-700'
                }`
              }
            >
              <span>{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </div>

        <Outlet />
      </div>
    </div>
  );
}
