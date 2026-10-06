'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { ErrorBanner } from '@/components/ErrorBanner';

type ReportTab = 'payments' | 'commissions' | 'payouts' | 'audit';

const TABS: { id: ReportTab; label: string; endpoint: string }[] = [
  { id: 'payments', label: 'Payments', endpoint: '/admin/reports/payments' },
  { id: 'commissions', label: 'Commissions', endpoint: '/admin/reports/commissions' },
  { id: 'payouts', label: 'Payouts', endpoint: '/admin/reports/payouts' },
  { id: 'audit', label: 'Audit Log', endpoint: '/admin/audit-logs' },
];

const AdminReportsPage: React.FC = () => {
  const [tab, setTab] = useState<ReportTab>('payments');
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    const endpoint = TABS.find((t) => t.id === tab)!.endpoint;
    apiClient
      .get(endpoint, { params: { pageSize: 25 } })
      .then((res) => {
        setRows(res.data.data);
        setTotal(res.data.total);
      })
      .catch(() => setError('Could not load this report. Please try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [tab]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[19px] font-bold">Reports &amp; Audit</h1>
        <button disabled className="btn-secondary py-2.5 px-5 text-xs opacity-50 cursor-not-allowed">
          Export CSV · coming soon
        </button>
      </div>

      <div className="inline-flex gap-1.5 bg-white border border-line rounded-xl p-1.5 mb-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 rounded-lg text-[12.5px] font-bold ${
              tab === t.id ? 'text-white' : 'text-ink-soft'
            }`}
            style={tab === t.id ? { background: 'linear-gradient(135deg, #E8203F, #8B0F24)' } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4.5">
          <ErrorBanner message={error} onRetry={load} />
        </div>
      )}

      {!error && (
      <div className="card p-0 py-5.5">
        {loading ? (
          <div className="text-center text-ink-faint py-8 text-sm">Loading…</div>
        ) : (
          <>
            {tab === 'payments' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Member</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td className="font-mono text-ink-soft text-xs">{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        {p.member?.memberCode} · {p.member?.fullName}
                      </td>
                      <td className="font-bold">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                      <td>{p.mode}</td>
                      <td>
                        <span className="badge-green">{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'commissions' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Beneficiary</th>
                    <th>Source</th>
                    <th>Level</th>
                    <th>Rate</th>
                    <th>Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td className="font-mono text-ink-soft text-xs">{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="font-mono text-xs">{c.beneficiary?.memberCode}</td>
                      <td className="font-mono text-xs">{c.sourceMember?.memberCode}</td>
                      <td>{c.level}</td>
                      <td className="font-mono">{Number(c.appliedRate)}%</td>
                      <td className="font-bold text-gold">₹{Number(c.earnedAmount).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'payouts' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Member</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td className="font-mono text-xs">{p.referenceNo}</td>
                      <td>
                        {p.member?.memberCode} · {p.member?.fullName}
                      </td>
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
            )}

            {tab === 'audit' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Entity</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((log) => (
                    <tr key={log.id}>
                      <td className="font-mono text-ink-soft text-xs">{new Date(log.createdAt).toLocaleString('en-IN')}</td>
                      <td>{log.actorType}</td>
                      <td className="font-mono text-xs">{log.action}</td>
                      <td className="text-ink-soft">
                        {log.entityName} #{log.entityId.slice(0, 8)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {rows.length === 0 && <div className="text-center text-ink-faint py-8 text-sm">No records found.</div>}

            <div className="px-6 pt-4 text-xs text-ink-soft">{total} total record{total === 1 ? '' : 's'}</div>
          </>
        )}
      </div>
      )}
    </div>
  );
};

export default AdminReportsPage;
