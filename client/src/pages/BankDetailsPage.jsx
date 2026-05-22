import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

function FieldRow({ label, required, hint, children }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
        {hint && <span className="text-gray-600 font-normal ml-1">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const BLANK = {
  bank_name: '',
  bsb: '',
  account_number: '',
  account_name: '',
  super_fund: '',
  super_member: '',
};

export default function BankDetailsPage() {
  const [form, setForm] = useState(BLANK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/profile/bank-details')
      .then(({ data }) => {
        const b = data.bank || {};
        const s = data.super || {};
        setForm({
          bank_name:      b.bank_name      || '',
          bsb:            b.bsb            || '',
          account_number: b.account_number || '',
          account_name:   b.account_name   || '',
          super_fund:     s.fund_name      || '',
          super_member:   s.member_number  || '',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    setSuccess(false);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await axios.put('/api/profile/bank-details', {
        bank: {
          bank_name:      form.bank_name,
          bsb:            form.bsb,
          account_number: form.account_number,
          account_name:   form.account_name,
        },
        super: {
          fund_name:     form.super_fund,
          member_number: form.super_member,
        },
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🏦 Bank &amp; Super Details
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Update your bank account and superannuation details for payroll.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-900/30 border border-green-700 text-green-300 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                ✅ Details updated successfully.
              </div>
            )}

            {/* Bank Account */}
            <div className="bg-surface-800 border border-surface-600 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="text-lg">🏦</span> Bank Account Details
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Bank Name" required>
                  <input
                    className="input"
                    value={form.bank_name}
                    onChange={e => set('bank_name', e.target.value)}
                    required
                    placeholder="e.g. Commonwealth Bank"
                  />
                </FieldRow>
                <FieldRow label="BSB" required>
                  <input
                    className="input"
                    value={form.bsb}
                    onChange={e => set('bsb', e.target.value)}
                    required
                    placeholder="062-000"
                    maxLength={7}
                  />
                </FieldRow>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Account Number" required>
                  <input
                    className="input"
                    value={form.account_number}
                    onChange={e => set('account_number', e.target.value)}
                    required
                    placeholder="12345678"
                    maxLength={10}
                  />
                </FieldRow>
                <FieldRow label="Account Name" required>
                  <input
                    className="input"
                    value={form.account_name}
                    onChange={e => set('account_name', e.target.value)}
                    required
                    placeholder="Jane Smith"
                  />
                </FieldRow>
              </div>
            </div>

            {/* Superannuation */}
            <div className="bg-surface-800 border border-surface-600 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="text-lg">🏛️</span> Superannuation
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Super Fund Name" required>
                  <input
                    className="input"
                    value={form.super_fund}
                    onChange={e => set('super_fund', e.target.value)}
                    required
                    placeholder="e.g. Australian Super"
                  />
                </FieldRow>
                <FieldRow label="Member Number" required>
                  <input
                    className="input"
                    value={form.super_member}
                    onChange={e => set('super_member', e.target.value)}
                    required
                    placeholder="123456789"
                  />
                </FieldRow>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary px-8 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
