'use client';

import React, { useEffect, useState } from 'react';
import { Wallet, ArrowUpRight, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { ErrorBanner } from '@/components/ErrorBanner';

interface PayoutRow {
  sNo: number;
  date: string;
  referenceNo: string;
  amount: string;
  paymentMode: string;
  status: string;
}

const PayoutPage: React.FC = () => {
  const [balance, setBalance] = useState<string>('0');
  const [history, setHistory] = useState<PayoutRow[]>([]);
  // String-typed so the field can be genuinely empty while typing — a
  // number state forces Number('') === 0 the moment the field is cleared,
  // so the next digit typed appends after a stray "0" (e.g. "5" -> "05").
  const [amountInput, setAmountInput] = useState('1000');
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'BANK_TRANSFER'>('UPI');
  const [accountDetails, setAccountDetails] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const amount = Number(amountInput) || 0;

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [balanceRes, historyRes] = await Promise.all([
        apiClient.get<{ availableBalance: string }>('/payouts/balance'),
        apiClient.get<PayoutRow[]>('/passbook/payouts'),
      ]);
      setBalance(balanceRes.data.availableBalance);
      setHistory(historyRes.data);
    } catch {
      setLoadError('Could not load your payout details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!accountDetails.trim()) {
      setErrorMsg('Enter your UPI ID or bank account details.');
      return;
    }
    if (amount < 1000) {
      setErrorMsg('Minimum payout amount is ₹1,000.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/payouts/request', { amount, paymentMode, accountDetails });
      setSuccessMsg(`Payout request submitted for ₹${amount.toLocaleString('en-IN')}.`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Payout request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-ink-soft text-sm">Loading…</div>;
  }

  if (loadError) {
    return (
      <div className="p-8">
        <ErrorBanner message={loadError} onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-6 border-brand-red/20 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-5 h-5 text-brand-red" />
            <h1 className="text-2xl font-bold">Payout Requests</h1>
          </div>
          <p className="text-xs text-ink-soft">Ledger-based withdrawal · SUM(commission) − SUM(payouts)</p>
        </div>
        <div className="px-5 py-3 rounded-2xl bg-gold-soft border border-gold/30 text-right">
          <span className="text-xs text-ink-soft block">Available Balance</span>
          <span className="text-2xl font-bold text-gold">₹{Number(balance).toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="grid grid-cols-[1.7fr_1fr] gap-8">
        <div className="card space-y-5 p-6">
          <h3 className="text-lg font-bold flex items-center gap-2 pb-3 border-b border-line">
            <Wallet className="w-5 h-5 text-brand-red" />
            Request New Withdrawal
          </h3>

          {successMsg && (
            <div className="p-4 rounded-xl bg-state-green-soft border border-state-green/30 text-state-green text-xs flex items-center gap-3">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-state-crimson-soft border border-state-crimson/30 text-state-crimson text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink-soft flex justify-between">
                <span>Amount to Withdraw (₹)</span>
                <span className="text-ink-faint">Min ₹1,000 · Max ₹{Number(balance).toLocaleString('en-IN')}</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/[^\d]/g, '');
                  setAmountInput(digitsOnly);
                }}
                className="input font-mono text-lg font-bold text-gold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink-soft">Payout Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMode('UPI')}
                  className={`p-4 rounded-xl border-2 text-left text-xs font-bold ${
                    paymentMode === 'UPI' ? 'bg-[#FDF1F1] border-brand-red text-brand-red' : 'border-line text-ink-soft'
                  }`}
                >
                  UPI Transfer
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('BANK_TRANSFER')}
                  className={`p-4 rounded-xl border-2 text-left text-xs font-bold ${
                    paymentMode === 'BANK_TRANSFER' ? 'bg-[#FDF1F1] border-brand-red text-brand-red' : 'border-line text-ink-soft'
                  }`}
                >
                  Bank NEFT/IMPS
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink-soft">
                {paymentMode === 'UPI' ? 'VPA / UPI ID' : 'Bank Account Details'}
              </label>
              <input
                value={accountDetails}
                onChange={(e) => setAccountDetails(e.target.value)}
                placeholder={paymentMode === 'UPI' ? 'you@upi' : 'Bank, account no., IFSC'}
                className="input text-xs font-mono"
              />
            </div>

            <button type="submit" disabled={submitting} className="w-full btn-gold py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              <ArrowUpRight className="w-4 h-4" />
              <span>{submitting ? 'Submitting…' : `Submit Withdrawal Request for ₹${amount.toLocaleString('en-IN')}`}</span>
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="card space-y-4 p-6">
            <h3 className="text-md font-bold">Payout Workflow Stages</h3>
            <div className="space-y-3">
              {['Pending', 'Approved', 'Processing', 'Paid'].map((stage, idx) => (
                <div key={stage} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-brand-red text-white">
                    {idx + 1}
                  </div>
                  <div className="text-xs font-bold pt-1">{stage}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-paper border border-line flex items-start gap-3">
            <Info className="w-5 h-5 text-ink-faint shrink-0 mt-0.5" />
            <p className="text-xs text-ink-soft">
              Balance is calculated live from the ledger — every request is audit-logged.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-0 py-5.5 mt-6">
        <div className="px-6 pb-4 text-[15.5px] font-bold">Recent Payouts</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Reference</th>
              <th>Amount</th>
              <th>Mode</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-ink-faint py-6">
                  No payouts yet.
                </td>
              </tr>
            )}
            {history.map((p) => (
              <tr key={p.sNo}>
                <td className="font-mono text-ink-soft">{new Date(p.date).toLocaleDateString('en-IN')}</td>
                <td className="font-mono text-[11.5px]">{p.referenceNo}</td>
                <td className="font-bold">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                <td>{p.paymentMode}</td>
                <td>
                  <span className={p.status === 'PAID' ? 'badge-green' : p.status === 'REJECTED' ? 'badge-red' : 'badge-amber'}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PayoutPage;
