import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [form, setForm]     = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const { login }    = useAuth();
  const navigate     = useNavigate();

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 via-primary-800 to-surface-800 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-xl">🏭</div>
          <div>
            <p className="font-bold text-white">Warehouse</p>
            <p className="text-primary-300 text-xs">Training & Compliance Portal</p>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Your safety is<br />our priority.
          </h1>
          <p className="text-primary-200 text-lg leading-relaxed">
            Complete your mandatory induction and toolbox training to get started on site.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-10">
            {[
              { icon: '🎓', label: 'Structured Modules' },
              { icon: '✅', label: 'Progress Tracking' },
              { icon: '📋', label: 'Compliance Tasks' },
              { icon: '🔒', label: 'Secure & Private' },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
                <span className="text-2xl">{f.icon}</span>
                <span className="text-white text-sm font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-primary-400 text-sm">© 2026 Warehouse Training Portal</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface-900">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-xl">🏭</div>
            <p className="font-bold text-white">Warehouse Training Portal</p>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-gray-400 mb-8">Sign in to access your training and compliance tasks.</p>

          {error && (
            <div className="bg-red-900/40 border border-red-600 text-red-300 rounded-lg px-4 py-3 mb-5 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email or Employee ID</label>
              <input
                name="email"
                type="text"
                className="input"
                placeholder="you@warehouse.com or EMP001"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-sm select-none"
                  tabIndex={-1}
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Don't have an account?{' '}
            <span className="text-gray-400">Contact your administrator to create one.</span>
          </p>

        </div>
      </div>
    </div>
  );
}
