import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, X } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { ErrorBanner } from '../../components/ErrorBanner';

interface PendingPayout {
  id: string;
  referenceNo: string;
  amount: string;
  paymentMode: string;
  accountDetailsMasked: string;
  createdAt: string;
  member: { memberCode: string; fullName: string };
}

interface ReportPayout {
  id: string;
  referenceNo: string;
  amount: string;
  paymentMode: string;
  status: string;
  createdAt: string;
  member: { memberCode: string; fullName: string };
}

const TABS = ['PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED'] as const;
type Tab = (typeof TABS)[number];

export const AdminPayoutQueuePage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('PENDING');
  const [pending, setPending] = useState<PendingPayout[]>([]);
  const [history, setHistory] = useState<ReportPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const loadPending = () => {
    setLoading(true);
    setError(null);
    apiClient
      .get<PendingPayout[]>('/payouts/pending')
      .then((res) => setPending(res.data))
      .catch(() => setError('Could not load pending payouts. Please try again.'))
      .finally(() => setLoading(false));
  };

  const loadHistory = (status: Tab) => {
    setLoading(true);
    setError(null);
    apiClient
      .get('/admin/reports/payouts', { params: { status, pageSize: 25 } })
      .then((res) => setHistory(res.data.data))
      .catch(() => setError('Could not load payouts. Please try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'PENDING') loadPending();
    else loadHistory(tab);
  }, [tab]);

  const handleApprove = async (id: string) => {
    await apiClient.post(`/payouts/${id}/approve`);
    loadPending();
  };

  const handleReject = async (id: string) => {
    if (!rejectNote.trim()) return;
    await apiClient.post(`/payouts/${id}/reject`, { adminNote: rejectNote });
    setRejectingId(null);
    setRejectNote('');
    loadPending();
  };

  const handleAdvance = async (id: string, action: 'process' | 'mark-paid') => {
    await apiClient.post(`/payouts/${id}/${action}`);
    loadHistory(tab);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[19px] font-bold">Payout Queue</h1>
        <Link to="/admin/payout-entry" className="btn-primary py-2.5 px-5 text-[12.5px]">
          + Manual Cash Payout
        </Link>
      </div>

      <div className="inline-flex gap-1.5 bg-white border border-line rounded-xl p-1.5 mb-5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-lg text-[12.5px] font-bold capitalize ${
              tab === t ? 'bg-state-amber-soft text-state-amber' : 'text-ink-soft'
            }`}
          >
            {t.toLowerCase()} {t === 'PENDING' ? `(${pending.length})` : ''}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorBanner message={error} onRetry={() => (tab === 'PENDING' ? loadPending() : loadHistory(tab))} />
      ) : tab === 'PENDING' ? (
        <div className="flex flex-col gap-3.5">
          {!loading && pending.length === 0 && (
            <div className="card p-8 text-center text-ink-faint text-sm">No pending payout requests.</div>
          )}
          {pending.map((p) => (
            <div key={p.id} className="card p-5.5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex gap-4 items-center">
                  <div className="w-11 h-11 rounded-xl bg-state-amber-soft flex items-center justify-center text-state-amber">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[14.5px] font-bold">{p.referenceNo}</div>
                    <div className="text-xs text-ink-soft">
                      {p.member.memberCode} · {p.member.fullName} · {new Date(p.createdAt).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-7">
                  <div className="text-right">
                    <div className="text-[11px] text-ink-faint">AMOUNT</div>
                    <div className="font-display text-[19px] font-bold text-gold">₹{Number(p.amount).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-ink-faint">MODE</div>
                    <div className="text-[13px] font-bold">
                      {p.paymentMode} · {p.accountDetailsMasked}
                    </div>
                  </div>
                  {rejectingId === p.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Reason…"
                        className="input py-2 text-xs w-[180px]"
                      />
                      <button onClick={() => handleReject(p.id)} className="btn-danger py-2 px-3 text-xs">
                        Confirm
                      </button>
                      <button onClick={() => setRejectingId(null)} className="text-ink-faint">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(p.id)} className="px-4.5 py-2.5 rounded-lg bg-state-green text-white text-xs font-bold">
                        Approve
                      </button>
                      <button onClick={() => setRejectingId(p.id)} className="btn-danger py-2.5 px-4.5 text-xs">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-0 py-5.5">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Member</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!loading && history.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-ink-faint py-6">
                    No {tab.toLowerCase()} payouts.
                  </td>
                </tr>
              )}
              {history.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.referenceNo}</td>
                  <td>
                    {p.member.memberCode} · {p.member.fullName}
                  </td>
                  <td className="font-bold">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                  <td>{p.paymentMode}</td>
                  <td>
                    <span className={p.status === 'PAID' ? 'badge-green' : p.status === 'REJECTED' ? 'badge-red' : 'badge-amber'}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    {tab === 'APPROVED' && (
                      <button onClick={() => handleAdvance(p.id, 'process')} className="text-xs font-bold text-brand-red">
                        Mark Processing
                      </button>
                    )}
                    {tab === 'PROCESSING' && (
                      <button onClick={() => handleAdvance(p.id, 'mark-paid')} className="text-xs font-bold text-brand-red">
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
