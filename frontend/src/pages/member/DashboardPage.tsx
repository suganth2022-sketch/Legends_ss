import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, CreditCard, Copy, Clock, CheckCircle } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';

interface PaymentsMeResponse {
  committedAmount: string | null;
  payments: Array<{ amount: string; status: string }>;
}

interface EarningRow {
  sNo: number;
  date: string;
  sourceMemberCode: string;
  sourceMemberName: string;
  level: number;
  earnedAmount: string;
}

interface GenealogyRow {
  level: number;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentsMeResponse | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<EarningRow[]>([]);
  const [genealogy, setGenealogy] = useState<GenealogyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [paymentsRes, balanceRes, earningsRes, genealogyRes] = await Promise.all([
        apiClient.get<PaymentsMeResponse>('/payments/me'),
        apiClient.get<{ availableBalance: string }>('/payouts/balance'),
        apiClient.get<EarningRow[]>('/passbook/earnings'),
        apiClient.get<GenealogyRow[]>(`/referral/genealogy/${user.id}`),
      ]);
      setPayments(paymentsRes.data);
      setBalance(balanceRes.data.availableBalance);
      setEarnings(earningsRes.data.slice(0, 4));
      setGenealogy(genealogyRes.data);
      setLoading(false);
    })();
  }, [user]);

  const totalPaid = payments?.payments.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  const monthsPaid = payments?.payments.length ?? 0;
  const directCount = genealogy.filter((r) => r.level === 1).length;
  const totalTeam = genealogy.length;
  const referralLink = `${window.location.origin}/register?ref=${user?.memberCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return <div className="p-8 text-ink-soft text-sm">Loading dashboard…</div>;
  }

  return (
    <div className="p-8 flex flex-col gap-5">
      {/* Stat tiles */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-xs font-semibold text-ink-soft">Total Savings Paid</div>
          <div className="font-display text-[26px] font-bold mt-1.5">₹{totalPaid.toLocaleString('en-IN')}</div>
          <div className="text-[11.5px] text-state-green mt-1">{monthsPaid} month{monthsPaid === 1 ? '' : 's'} paid</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold text-ink-soft">Committed Monthly Plan</div>
          <div className="font-display text-[26px] font-bold mt-1.5 text-gold">
            {payments?.committedAmount ? `₹${Number(payments.committedAmount).toLocaleString('en-IN')}` : '—'}
          </div>
          <div className="text-[11.5px] text-ink-faint mt-1">locked at first payment</div>
        </div>
        <div className="card p-5 border-[1.5px] border-gold-soft bg-gradient-to-b from-white to-[#FCF7EC]">
          <div className="text-xs font-semibold text-ink-soft">Available Balance</div>
          <div className="font-display text-[26px] font-bold mt-1.5 text-gold">
            ₹{Number(balance ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11.5px] text-ink-faint mt-1">SUM(commission) − SUM(payouts)</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold text-ink-soft">Network</div>
          <div className="font-display text-[26px] font-bold mt-1.5">
            {directCount} <span className="text-sm font-sans font-semibold text-ink-faint">direct</span>
          </div>
          <div className="text-[11.5px] text-ink-faint mt-1">{totalTeam} total team members</div>
        </div>
      </div>

      <div className="grid grid-cols-[1.15fr_0.85fr_0.85fr] gap-5">
        {/* Recent activity */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[15.5px] font-bold">Recent Commission Activity</h3>
            <Link to="/member/passbook" className="text-[12.5px] font-bold text-brand-red">
              View Passbook
            </Link>
          </div>
          <div className="flex flex-col">
            {earnings.length === 0 && <div className="text-sm text-ink-faint py-4">No earnings yet.</div>}
            {earnings.map((r) => (
              <div key={r.sNo} className="flex items-center justify-between py-3 border-b border-line last:border-none">
                <div className="flex items-center gap-3">
                  <div className="w-[34px] h-[34px] rounded-lg bg-state-green-soft flex items-center justify-center text-state-green">
                    <ArrowUp className="w-[15px] h-[15px]" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-[13.5px] font-semibold">
                      {r.sourceMemberName} ({r.sourceMemberCode})
                    </div>
                    <div className="text-[11.5px] text-ink-faint">
                      Level {r.level} &middot; {new Date(r.date).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                </div>
                <div className="font-bold text-gold text-sm">+₹{Number(r.earnedAmount).toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications (no backend endpoint yet — illustrative only) */}
        <div className="card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15.5px] font-bold">Notifications</h3>
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="flex gap-2.5 p-3 rounded-xl bg-state-green-soft border border-state-green/20">
              <CheckCircle className="w-[18px] h-[18px] text-state-green shrink-0 mt-0.5" />
              <div>
                <div className="text-[12.5px] font-bold">Commission Credited</div>
                <div className="text-[11.5px] text-ink-soft mt-0.5">Check Passbook for your latest earnings</div>
              </div>
            </div>
            <div className="flex gap-2.5 p-3 rounded-xl bg-state-amber-soft border border-state-amber/20">
              <Clock className="w-[18px] h-[18px] text-state-amber shrink-0 mt-0.5" />
              <div>
                <div className="text-[12.5px] font-bold">Payment Reminder</div>
                <div className="text-[11.5px] text-ink-soft mt-0.5">Pay by the 20th to keep this month&rsquo;s overrides</div>
              </div>
            </div>
          </div>
          <div className="mt-auto pt-3 text-[10.5px] text-ink-faint">Live notifications feed coming soon.</div>
        </div>

        {/* Referral + Pay */}
        <div className="card p-6">
          <h3 className="text-[15.5px] font-bold mb-4">Your Referral Link</h3>
          <div className="bg-paper border border-dashed border-line rounded-lg px-3.5 py-3 font-mono text-xs text-ink-soft break-all mb-3">
            {referralLink}
          </div>
          <button onClick={handleCopy} className="btn-secondary w-full py-2.5 text-[13px] flex items-center justify-center gap-2 mb-5">
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copied!' : 'Copy Link'}
          </button>

          <h3 className="text-[15.5px] font-bold mb-3">Make a Payment</h3>
          <Link
            to="/member/payments"
            className="btn-primary w-full py-3 text-[13px] flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Go to Payments
          </Link>
        </div>
      </div>
    </div>
  );
};
