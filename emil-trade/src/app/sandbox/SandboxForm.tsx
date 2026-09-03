'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, CheckCircle } from 'lucide-react';

export default function SandboxForm() {
  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    launch_date: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!form.name || !form.email || !form.company) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: dbError } = await supabase.from('support_tickets').insert({
        subject: `Sandbox Request: ${form.company}`,
        category: 'broker_inquiry',
        priority: 'medium',
        status: 'open',
        message: `Name: ${form.name}\nCompany: ${form.company}\nEmail: ${form.email}\nExpected Launch: ${form.launch_date || 'Not specified'}\n\n${form.message}`,
      });

      if (dbError) throw dbError;
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <CheckCircle size={48} style={{ color: 'var(--accent-green)' }} />
        <h3 className="mt-4 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Request Submitted
        </h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Our team will provision your sandbox environment and email your access credentials within 24 hours.
        </p>
      </div>
    );
  }

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Full Name <span style={{ color: 'var(--loss)' }}>*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2"
          style={inputStyle}
          placeholder="John Smith"
          required
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Company Name <span style={{ color: 'var(--loss)' }}>*</span>
        </label>
        <input
          type="text"
          value={form.company}
          onChange={e => setForm({ ...form, company: e.target.value })}
          className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2"
          style={inputStyle}
          placeholder="Acme Brokerage Ltd"
          required
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Email Address <span style={{ color: 'var(--loss)' }}>*</span>
        </label>
        <input
          type="email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2"
          style={inputStyle}
          placeholder="john@acmebrokerage.com"
          required
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Expected Launch Date
        </label>
        <input
          type="date"
          value={form.launch_date}
          onChange={e => setForm({ ...form, launch_date: e.target.value })}
          className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2"
          style={inputStyle}
        />
      </div>
      <div className="md:col-span-2">
        <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Message
        </label>
        <textarea
          value={form.message}
          onChange={e => setForm({ ...form, message: e.target.value })}
          rows={4}
          className="w-full resize-none rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2"
          style={inputStyle}
          placeholder="Tell us about your brokerage plans, target markets, or specific features you want to evaluate..."
        />
      </div>

      {error && (
        <div className="md:col-span-2">
          <p className="text-sm" style={{ color: 'var(--loss)' }}>{error}</p>
        </div>
      )}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--accent-green)' }}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Request Sandbox Access
        </button>
      </div>
    </form>
  );
}
