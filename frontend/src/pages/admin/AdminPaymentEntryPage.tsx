import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { ErrorBanner } from '../../components/ErrorBanner';

interface ManualPaymentResult {
  payment: { transactionId: string };
}

export const AdminPaymentEntryPage: React.FC = () => {
  const [memberCode, setMemberCode] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  // String-typed so the field can be genuinely empty while typing — a
  // number state forces Number('') === 0 the moment the field is cleared,
  // so the next digit typed appends after a stray "0" (e.g. "5" -> "05").
  const [amountInput, setAmountInput] = useState('2000');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [recent, setRecent] = useState<
    Array<{ id: string; memberId: string; amount: string; paidAt: string; transactionId: string }>
  >([]);

  const amount = Number(amountInput) || 0;

  const loadRecent = () => {
    setRecentLoading(true);
    setRecentError(null);
    apiClient
      .get('/admin/reports/payments', { params: { pageSize: 8 } })
      .then((res) => setRecent(res.data.data.map((p: any) => ({ ...p, memberId: p.member?.memberCode ?? p.memberId }))))
      .catch(() => setRecentError('Could not load recent entries.'))
      .finally(() => setRecentLoading(false));
  };

  useEffect(loadRecent, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (amount < 1000) {
      setError('Amount must be at least ₹1,000.');
      return;
    }
    setSubmitting(true);
    try {
      // Note: `remarks` is intentionally NOT sent — the backend's ManualPaymentDto
      // doesn't accept it yet, and the global ValidationPipe rejects unknown fields.
      const { data } = await apiClient.post<ManualPaymentResult>('/payments/manual', {
        memberCode: memberCode.trim().toUpperCase(),
        amount,
        paidAt: new Date(date).toISOString(),
      });
      setSuccess(`Recorded payment ${data.payment.transactionId} for ₹${amount.toLocaleString('en-IN')}.`);
      setMemberCode('');
      setRemarks('');
      loadRecent();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-[19px] font-bold">Add Payment</h1>
        <p className="text-[12.5px] text-ink-soft">Record a payment made by cash or any other offline mode</p>
      </div>

      <div className="grid grid-cols-[1fr_1.3fr] gap-5">
        <div className="card p-6.5 h-fit">
          <h3 className="text-[15.5px] font-bold mb-5">Payment Details</h3>

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-state-green-soft border border-state-green/30 text-state-green text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-state-crimson-soft border border-state-crimson/30 text-state-crimson text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-ink-soft block mb-1.5">Member Code</label>
              <input
                value={memberCode}
                onChange={(e) => setMemberCode(e.target.value)}
                placeholder="e.g. A000004"
                className="input text-[13px] font-mono"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-ink-soft block mb-1.5">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input text-[13px] font-mono" required />
            </div>
            <div>
              <label className="text-xs font-bold text-ink-soft block mb-1.5">Amount (₹)</label>
              <input
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value.replace(/[^\d]/g, ''))}
                className="input text-[15px] font-bold font-mono"
                required
              />
              <div className="text-[11px] text-ink-faint mt-1.5">
                First payment: multiple of ₹1,000. Later payments must match the locked plan amount exactly.
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-ink-soft block mb-1.5">Remarks</label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Cash collected at Jubilee Hills branch"
                className="input text-[13px] resize-none"
              />
              <div className="text-[11px] text-ink-faint mt-1.5">
                Not persisted yet — the backend needs a small addition to store this alongside the payment.
              </div>
            </div>

            <button type="submit" disabled={submitting} className="w-full btn-primary py-3.5 text-sm disabled:opacity-60">
              {submitting ? 'Recording…' : 'Record Payment'}
            </button>
          </form>
        </div>

        <div className="card p-0 py-5.5">
          <div className="px-6 pb-3 text-[15.5px] font-bold">Recent Manual Entries</div>
          {recentError ? (
            <div className="px-6">
              <ErrorBanner message={recentError} onRetry={loadRecent} />
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Member</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {!recentLoading && recent.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-ink-faint py-6">
                      No manual entries yet.
                    </td>
                  </tr>
                )}
                {recent.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-ink-soft text-xs">{new Date(p.paidAt).toLocaleDateString('en-IN')}</td>
                    <td className="font-mono text-xs">{p.memberId}</td>
                    <td className="font-bold">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
