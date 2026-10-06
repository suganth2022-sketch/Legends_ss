'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { ErrorBanner } from '@/components/ErrorBanner';

interface EarningRow {
  sNo: number;
  date: string;
  sourceMemberCode: string;
  sourceMemberName: string;
  level: number;
  baseAmount: string;
  earnedAmount: string;
  status: string;
}

interface PayoutRow {
  sNo: number;
  date: string;
  referenceNo: string;
  amount: string;
  paymentMode: string;
  status: string;
}

const PassbookPage: React.FC = () => {
  const [tab, setTab] = useState<'EARNED' | 'PAID'>('EARNED');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sourceMemberCode, setSourceMemberCode] = useState('');
  const [level, setLevel] = useState('');
  const [mode, setMode] = useState('');
  const [status, setStatus] = useState('');

  const [earnings, setEarnings] = useState<EarningRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEarnings = () => {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = new Date(fromDate).toISOString();
    if (toDate) params.toDate = new Date(toDate).toISOString();
    if (sourceMemberCode) params.sourceMemberCode = sourceMemberCode;
    if (level) params.level = level;
    setLoading(true);
    setError(null);
    apiClient
      .get<EarningRow[]>('/passbook/earnings', { params })
      .then((res) => setEarnings(res.data))
      .catch(() => setError('Could not load your earnings. Please try again.'))
      .finally(() => setLoading(false));
  };

  const loadPayouts = () => {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = new Date(fromDate).toISOString();
    if (toDate) params.toDate = new Date(toDate).toISOString();
    if (mode) params.mode = mode;
    if (status) params.status = status;
    setLoading(true);
    setError(null);
    apiClient
      .get<PayoutRow[]>('/passbook/payouts', { params })
      .then((res) => setPayouts(res.data))
      .catch(() => setError('Could not load your payouts. Please try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'EARNED') loadEarnings();
    else loadPayouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'EARNED') loadEarnings();
    else loadPayouts();
  };

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setSourceMemberCode('');
    setLevel('');
    setMode('');
    setStatus('');
    setTimeout(() => (tab === 'EARNED' ? loadEarnings() : loadPayouts()), 0);
  };

  return (
    <div className="p-8">
      <div className="mb-5">
        <h1 className="text-[19px] font-bold">Passbook</h1>
        <p className="text-[12.5px] text-ink-soft">Commission rate is never shown here — only source, level, and amount</p>
      </div>

      <div className="inline-flex gap-1.5 bg-white border border-line rounded-xl p-1.5 mb-5">
        <button
          onClick={() => setTab('EARNED')}
          className={`px-6 py-2.5 rounded-lg text-[13px] font-bold ${tab === 'EARNED' ? 'text-white' : 'text-ink-soft'}`}
          style={tab === 'EARNED' ? { background: 'linear-gradient(135deg, #E8203F, #8B0F24)' } : undefined}
        >
          Earned
        </button>
        <button
          onClick={() => setTab('PAID')}
          className={`px-6 py-2.5 rounded-lg text-[13px] font-bold ${tab === 'PAID' ? 'text-white' : 'text-ink-soft'}`}
          style={tab === 'PAID' ? { background: 'linear-gradient(135deg, #E8203F, #8B0F24)' } : undefined}
        >
          Paid
        </button>
      </div>

      <form onSubmit={handleFilter} className="card p-5 mb-4.5 flex items-center gap-3.5 flex-wrap">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input py-2 text-xs w-[150px]" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input py-2 text-xs w-[150px]" />
        {tab === 'EARNED' ? (
          <>
            <input
              placeholder="Source member code…"
              value={sourceMemberCode}
              onChange={(e) => setSourceMemberCode(e.target.value)}
              className="input py-2 text-xs w-[160px]"
            />
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="input py-2 text-xs w-[130px]">
              <option value="">All Levels</option>
              {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
                <option key={n} value={n}>
                  Level {n}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="input py-2 text-xs w-[140px]">
              <option value="">All Modes</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input py-2 text-xs w-[150px]">
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="PROCESSING">Processing</option>
              <option value="PAID">Paid</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </>
        )}
        <button type="submit" className="btn-secondary py-2 px-4 text-xs">
          Apply
        </button>
        <button type="button" onClick={resetFilters} className="text-xs font-bold text-brand-red ml-auto">
          Reset Filters
        </button>
      </form>

      {error ? (
        <ErrorBanner message={error} onRetry={tab === 'EARNED' ? loadEarnings : loadPayouts} />
      ) : (
      <div className="card p-0 py-5.5">
        {tab === 'EARNED' ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Date</th>
                <th>Source Member</th>
                <th>Level</th>
                <th>Base Amount</th>
                <th>Earned</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {!loading && earnings.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-ink-faint py-6">
                    No earnings found.
                  </td>
                </tr>
              )}
              {earnings.map((r) => (
                <tr key={r.sNo}>
                  <td className="text-ink-faint">{r.sNo}</td>
                  <td className="font-mono text-ink-soft">{new Date(r.date).toLocaleDateString('en-IN')}</td>
                  <td>
                    <strong>{r.sourceMemberCode}</strong> &nbsp;{r.sourceMemberName}
                  </td>
                  <td>{r.level}</td>
                  <td className="text-ink-soft">₹{Number(r.baseAmount).toLocaleString('en-IN')}</td>
                  <td className="font-bold text-gold">+₹{Number(r.earnedAmount).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={r.status === 'CREDITED' ? 'badge-green' : 'badge-gray'}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Date</th>
                <th>Reference No</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {!loading && payouts.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-ink-faint py-6">
                    No payouts found.
                  </td>
                </tr>
              )}
              {payouts.map((r) => (
                <tr key={r.sNo}>
                  <td className="text-ink-faint">{r.sNo}</td>
                  <td className="font-mono text-ink-soft">{new Date(r.date).toLocaleDateString('en-IN')}</td>
                  <td className="font-mono text-[11.5px]">{r.referenceNo}</td>
                  <td className="font-bold">₹{Number(r.amount).toLocaleString('en-IN')}</td>
                  <td>{r.paymentMode}</td>
                  <td>
                    <span className={r.status === 'PAID' ? 'badge-green' : r.status === 'REJECTED' ? 'badge-red' : 'badge-amber'}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      )}
    </div>
  );
};

export default PassbookPage;
