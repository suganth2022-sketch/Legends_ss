import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

export const AdminPayoutEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState(1000);
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'BANK_TRANSFER'>('BANK_TRANSFER');
  const [accountDetails, setAccountDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const { data } = await apiClient.post('/payouts/manual', { memberId, amount, paymentMode, accountDetails });
      setSuccess(`Recorded payout ${data.referenceNo} for ₹${amount.toLocaleString('en-IN')} — status PAID.`);
      setMemberId('');
      setAccountDetails('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not record payout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 flex flex-col items-center">
      <div className="flex items-center gap-2.5 self-start mb-6">
        <button onClick={() => navigate('/admin/payouts')} className="text-ink-faint text-[13px]">
          ← Payout Queue
        </button>
        <span className="text-line">/</span>
        <div className="text-[19px] font-bold">Manual Cash Payout</div>
      </div>

      <div className="card p-7.5 w-[520px]">
        <h3 className="text-[15.5px] font-bold mb-1">Record an Earnings Payout</h3>
        <p className="text-xs text-ink-soft mb-5.5 leading-relaxed">
          For commission already handed to a member outside the digital flow. Recorded as{' '}
          <strong>PAID</strong> immediately — nothing left to approve.
        </p>

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
            <label className="text-xs font-bold text-ink-soft block mb-1.5">Member ID</label>
            <input
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder="e.g. A000002"
              className="input text-[13px] font-mono"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-ink-soft block mb-1.5">Amount (₹)</label>
            <input
              type="number"
              min={1000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="input text-[15px] font-bold font-mono"
              required
            />
            <div className="text-[11px] text-ink-faint mt-1.5">Minimum ₹1,000 · capped at their live available balance</div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setPaymentMode('BANK_TRANSFER')}
              className={`p-3 rounded-lg border-2 text-xs font-bold ${
                paymentMode === 'BANK_TRANSFER' ? 'bg-[#FDF1F1] border-brand-red text-brand-red' : 'border-line text-ink-soft'
              }`}
            >
              Cash / Bank Transfer
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('UPI')}
              className={`p-3 rounded-lg border-2 text-xs font-bold ${
                paymentMode === 'UPI' ? 'bg-[#FDF1F1] border-brand-red text-brand-red' : 'border-line text-ink-soft'
              }`}
            >
              UPI
            </button>
          </div>
          <div>
            <label className="text-xs font-bold text-ink-soft block mb-1.5">Account Details / Note</label>
            <input
              value={accountDetails}
              onChange={(e) => setAccountDetails(e.target.value)}
              placeholder="e.g. Cash handed over in person"
              className="input text-xs"
              required
            />
          </div>

          <button type="submit" disabled={submitting} className="w-full btn-primary py-3.5 text-sm disabled:opacity-60">
            {submitting ? 'Recording…' : 'Record Payout · Mark as Paid'}
          </button>
        </form>
      </div>
    </div>
  );
};
