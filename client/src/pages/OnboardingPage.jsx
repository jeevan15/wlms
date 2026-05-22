import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const BLANK = {
  tfn: '',
  bank_name: '',
  bsb: '',
  account_number: '',
  account_name: '',
  super_fund: '',
  super_member: '',
  employment_contract_agreed: false,
};

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

function Section({ icon, title, children }) {
  return (
    <div className="bg-surface-800 border border-surface-600 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <span className="text-lg">{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

export default function OnboardingPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.employment_contract_agreed) {
      setError('You must read and acknowledge the Employment Contract before proceeding.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await axios.post('/api/profile/onboarding', {
        tfn: form.tfn,
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
        employment_contract_agreed: form.employment_contract_agreed,
      });
      // Update local auth state so the gate is lifted immediately
      updateUser({ onboarding_completed: 1 });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col">
      {/* Header bar */}
      <div className="bg-surface-800 border-b border-surface-600 px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center text-lg">🏭</div>
        <div>
          <span className="font-bold text-white text-sm leading-none block">Warehouse</span>
          <span className="text-primary-400 text-xs font-medium">Training & Compliance</span>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-2xl space-y-6 py-4">
          {/* Welcome banner */}
          <div className="text-center space-y-1">
            <div className="text-4xl mb-3">👋</div>
            <h1 className="text-2xl font-bold text-white">
              Welcome, {user?.name}!
            </h1>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Before you begin your induction training, please complete this onboarding form.
              All fields marked <span className="text-red-400">*</span> are required.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* Tax File Number */}
            <Section icon="🔢" title="Tax File Number (TFN)">
              <FieldRow label="Tax File Number" hint="(optional — you can provide later)">
                <input
                  className="input"
                  value={form.tfn}
                  onChange={e => set('tfn', e.target.value)}
                  placeholder="123 456 789"
                  maxLength={11}
                />
              </FieldRow>
              <p className="text-xs text-gray-600">
                Your TFN is kept confidential and used only for payroll purposes.
              </p>
            </Section>

            {/* Bank Details */}
            <Section icon="🏦" title="Bank Account Details">
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
            </Section>

            {/* Superannuation */}
            <Section icon="🏛️" title="Superannuation">
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
            </Section>

            {/* Employment Contract */}
            <Section icon="📄" title="Employment Contract">
              <div className="bg-surface-700/50 border border-surface-500 rounded-lg p-4">
                <p className="text-sm font-medium text-white mb-1">
                  {user?.employment_contract || 'Employment Agreement'}
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  By acknowledging below, you confirm that you have read and understood your
                  employment contract, including the terms and conditions of your employment,
                  your role and responsibilities, remuneration, leave entitlements, and the
                  company's workplace policies. Your electronic acknowledgement is legally
                  binding and will be recorded with the date and time of acceptance.
                </p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.employment_contract_agreed}
                    onChange={e => set('employment_contract_agreed', e.target.checked)}
                  />
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    form.employment_contract_agreed
                      ? 'bg-primary-600 border-primary-600'
                      : 'border-surface-500 group-hover:border-surface-400'
                  }`}>
                    {form.employment_contract_agreed && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-300">
                  I confirm that I have read and agree to the terms of my Employment Contract.{' '}
                  <span className="text-red-400">*</span>
                </span>
              </label>
            </Section>

            <button
              type="submit"
              disabled={saving || !form.employment_contract_agreed}
              className="w-full btn-primary py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Submitting…' : '✅ Submit & Begin Training'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
