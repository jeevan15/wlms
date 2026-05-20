import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-surface-800 border-b border-surface-600 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center text-lg">
              🏭
            </div>
            <div>
              <span className="font-bold text-white text-sm leading-none block">Warehouse</span>
              <span className="text-primary-400 text-xs font-medium">Training Portal</span>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/') ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white hover:bg-surface-700'
              }`}
            >
              My Courses
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/admin') ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white hover:bg-surface-700'
                }`}
              >
                Admin
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white leading-none">{user?.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{user?.department || user?.role}</p>
            </div>
            <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center font-bold text-sm text-white">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-surface-700 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
