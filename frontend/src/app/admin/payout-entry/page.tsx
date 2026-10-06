'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const AdminPayoutEntryPage: React.FC = () => {
  const router = useRouter();
  const [memberCode, setMemberCode] = useState('');
  // String-typed so the field can be genuinely empty while typing — a
  // number state forces Number('') === 0 the moment the field is cleared,
  // so the next digit typed appends after a stray "0" (e.g. "5" -> "05").
  const [amountInput, setAmountInput] = useState('1000');
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'BANK_TRANSFER'>('BANK_TRANSFER');
  const [accountDetails, setAccountDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const amount = Number(amountInput) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (amount < 1000) {
      setError('Minimum payout amount is ₹1,000.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await apiClient.post('/payouts/manual', {
        memberCode: memberCode.trim().toUpperCase(),
        amount,
        paymentMode,
        accountDetails,
      });
      setSuccess(`Recorded payout ${data.referenceNo} for ₹${amount.toLocaleString('en-IN')} — status PAID.`);
      setMemberCode('');
      setAccountDetails('');
      setAmountInput('1000');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not record payout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 flex flex-col items-center">
      <div className="flex items-center gap-2.5 self-start mb-6">
        <button onClick={() => router.push('/admin/payouts')} className="text-ink-faint text-[13px]">
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
            <label className="text-xs font-bold text-ink-soft block mb-1.5">Member Code</label>
            <input
              value={memberCode}
              onChange={(e) => setMemberCode(e.target.value)}
              placeholder="e.g. A000002"
              className="input text-[13px] font-mono"
              required
            />
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

export default AdminPayoutEntryPage;
