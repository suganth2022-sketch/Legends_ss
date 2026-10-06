'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';

interface Payment {
  id: string;
  paidAt: string;
  transactionId: string;
  amount: string;
  mode: string;
  status: string;
}

interface PaymentsMeResponse {
  committedAmount: string | null;
  payments: Payment[];
}

const PaymentsPage: React.FC = () => {
  const [data, setData] = useState<PaymentsMeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<PaymentsMeResponse>('/payments/me').then((res) => {
      setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-ink-soft text-sm">Loading…</div>;
  }

  const monthsPaid = data?.payments.length ?? 0;
  const committed = data?.committedAmount ? Number(data.committedAmount) : null;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-[19px] font-bold">Payments</h1>
        <p className="text-[12.5px] text-ink-soft">
          {committed ? `Monthly savings installment · locked at ₹${committed.toLocaleString('en-IN')}/month` : 'No payment plan yet — your first payment will lock in your monthly amount.'}
        </p>
      </div>

      <div className="grid grid-cols-[1fr_1.5fr] gap-5">
        <div className="card p-6 h-fit">
          <h3 className="text-[15.5px] font-bold mb-1">Pay This Month&rsquo;s Installment</h3>
          <p className="text-xs text-ink-soft mb-5 leading-relaxed">
            Due by the 20th (or 30th if you joined after the 20th) — missing it flushes this month&rsquo;s
            downline overrides, with no carry-forward.
          </p>

          <div className="bg-paper rounded-xl p-4.5 text-center mb-5">
            <div className="text-[11.5px] text-ink-faint font-semibold">AMOUNT DUE</div>
            <div className="font-display text-[34px] font-extrabold mt-1">
              {committed ? `₹${committed.toLocaleString('en-IN')}` : '—'}
            </div>
          </div>

          <div className="text-xs font-bold text-ink-soft mb-2.5">Pay via</div>
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <div className="p-3 border-[1.5px] border-brand-red bg-[#FDF1F1] rounded-lg text-center text-xs font-bold text-brand-red">
              UPI
            </div>
            <div className="p-3 border-[1.5px] border-line rounded-lg text-center text-xs font-semibold text-ink-soft">
              Card / Netbanking
            </div>
          </div>

          <button disabled className="w-full btn-primary py-3.5 text-sm opacity-60 cursor-not-allowed">
            Pay {committed ? `₹${committed.toLocaleString('en-IN')}` : ''} Now
          </button>
          <div className="mt-4 p-3 bg-state-amber-soft rounded-lg text-[11px] text-[#7A5308] leading-relaxed">
            Online payment gateway isn&rsquo;t live yet — for now, ask an admin to record your payment.
          </div>
        </div>

        <div className="card p-0 py-5.5">
          <div className="px-6 pb-4 flex justify-between items-center">
            <h3 className="text-[15.5px] font-bold">Payment History</h3>
            <span className="text-[11.5px] text-ink-faint">{monthsPaid} payment{monthsPaid === 1 ? '' : 's'} recorded</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction ID</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-ink-faint py-6">
                    No payments yet.
                  </td>
                </tr>
              )}
              {data?.payments.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-ink-soft">{new Date(p.paidAt).toLocaleDateString('en-IN')}</td>
                  <td className="font-mono text-[11.5px] text-ink-faint">{p.transactionId}</td>
                  <td className="font-bold">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                  <td>{p.mode === 'MANUAL_ADMIN' ? 'Admin Entry' : p.mode}</td>
                  <td>
                    <span className="badge-green">{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentsPage;
