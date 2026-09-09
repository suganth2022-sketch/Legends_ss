import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Wallet, Receipt, ArrowRight } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

interface AuditLog {
  id: string;
  actorType: string;
  actorId: string;
  action: string;
  entityName: string;
  entityId: string;
  createdAt: string;
}

export const AdminDashboardPage: React.FC = () => {
  const [memberCount, setMemberCount] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState(0);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [membersRes, pendingRes, logsRes] = await Promise.all([
        apiClient.get('/admin/members', { params: { pageSize: 1 } }),
        apiClient.get('/payouts/pending'),
        apiClient.get('/admin/audit-logs', { params: { pageSize: 8 } }),
      ]);
      setMemberCount(membersRes.data.total);
      setPendingPayouts(pendingRes.data.length);
      setLogs(logsRes.data.data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="p-8 text-ink-soft text-sm">Loading…</div>;
  }

  return (
    <div className="p-8 flex flex-col gap-5">
      <h1 className="text-[19px] font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <Link to="/admin/members" className="card p-5 flex items-center gap-4 hover:border-brand-red/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-state-green-soft flex items-center justify-center text-state-green">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="font-display text-2xl font-bold">{memberCount}</div>
            <div className="text-xs text-ink-soft">Total Members</div>
          </div>
          <ArrowRight className="w-4 h-4 text-ink-faint ml-auto" />
        </Link>

        <Link to="/admin/payouts" className="card p-5 flex items-center gap-4 hover:border-brand-red/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-state-amber-soft flex items-center justify-center text-state-amber">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="font-display text-2xl font-bold">{pendingPayouts}</div>
            <div className="text-xs text-ink-soft">Pending Payouts</div>
          </div>
          <ArrowRight className="w-4 h-4 text-ink-faint ml-auto" />
        </Link>

        <Link to="/admin/payment-entry" className="card p-5 flex items-center gap-4 hover:border-brand-red/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-gold-soft flex items-center justify-center text-gold">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="font-display text-lg font-bold">Add Payment</div>
            <div className="text-xs text-ink-soft">Manual entry</div>
          </div>
          <ArrowRight className="w-4 h-4 text-ink-faint ml-auto" />
        </Link>
      </div>

      <div className="card p-0 py-5.5">
        <div className="px-6 pb-4 text-[15.5px] font-bold">Recent Activity</div>
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
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-ink-faint py-6">
                  No activity yet.
                </td>
              </tr>
            )}
            {logs.map((log) => (
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
      </div>
    </div>
  );
};
