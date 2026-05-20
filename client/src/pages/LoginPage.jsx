import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.name.trim()) { setError('Name is required'); setLoading(false); return; }
        await register(form.name, form.email, form.password, form.department);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
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
            <p className="text-primary-300 text-xs">Training Portal</p>
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
              { icon: '📋', label: 'Instant Assessments' },
              { icon: '🔒', label: 'Secure & Private' }
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
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-xl">🏭</div>
            <div>
              <p className="font-bold text-white">Warehouse Training Portal</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-gray-400 mb-8">
            {mode === 'login' ? 'Sign in to access your training.' : 'Register to begin your training.'}
          </p>

          {error && (
            <div className="bg-red-900/40 border border-red-600 text-red-300 rounded-lg px-4 py-3 mb-5 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Full Name</label>
                  <input name="name" className="input" placeholder="Jane Smith" value={form.name} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Department</label>
                  <select name="department" className="input" value={form.department} onChange={handleChange}>
                    <option value="">Select department</option>
                    {['Receiving', 'Dispatch', 'Inventory', 'Forklift Operations', 'Management', 'Administration'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email address</label>
              <input name="email" type="email" className="input" placeholder="you@warehouse.com" value={form.email} onChange={handleChange} required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <input name="password" type="password" className="input" placeholder="••••••••" value={form.password} onChange={handleChange} required minLength={6} />
            </div>

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
            <button
              onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-primary-400 hover:text-primary-300 font-medium"
            >
              {mode === 'login' ? 'Register here' : 'Sign in'}
            </button>
          </p>

          {mode === 'login' && (
            <div className="mt-6 p-4 bg-surface-800 rounded-lg border border-surface-600 text-xs text-gray-500 space-y-1">
              <p className="text-gray-400 font-medium mb-2">Demo accounts</p>
              <p>Admin: admin@warehouse.com / admin123</p>
              <p>User: john.smith@warehouse.com / user123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
