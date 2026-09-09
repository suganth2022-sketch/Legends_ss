import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';

interface GenealogyRow {
  id: string;
  memberCode: string;
  fullName: string;
  doj: string;
  status: string;
  level: number;
  sponsorCode: string | null;
  committedAmount: string | null;
  directReferralsCount: number;
  totalTeamCount: number;
}

const LEVEL_COLORS: Record<number, string> = {
  1: '#C8102E',
  2: '#8B0F24',
  3: '#8B0F24',
  4: '#8B0F24',
  5: '#8B0F24',
  6: '#A87C1F',
  7: '#A87C1F',
  8: '#A87C1F',
  9: '#A87C1F',
  10: '#C9BDBB',
};

export const GenealogyPage: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<GenealogyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | 'ALL'>('ALL');

  useEffect(() => {
    if (!user) return;
    apiClient.get<GenealogyRow[]>(`/referral/genealogy/${user.id}`).then((res) => {
      setRows(res.data);
      setLoading(false);
    });
  }, [user]);

  const levelCounts = useMemo(() => {
    const counts = Array.from({ length: 10 }, (_, i) => ({ n: i + 1, count: 0 }));
    rows.forEach((r) => {
      if (r.level >= 1 && r.level <= 10) counts[r.level - 1].count += 1;
    });
    return counts;
  }, [rows]);

  const maxCount = Math.max(1, ...levelCounts.map((l) => l.count));

  const filteredRows = rows.filter((r) => {
    if (levelFilter !== 'ALL' && r.level !== levelFilter) return false;
    if (search && !r.fullName.toLowerCase().includes(search.toLowerCase()) && !r.memberCode.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const directCount = rows.filter((r) => r.level === 1).length;

  if (loading) {
    return <div className="p-8 text-ink-soft text-sm">Loading network…</div>;
  }

  return (
    <div className="p-8 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-bold">My Network</h1>
          <p className="text-[12.5px] text-ink-soft">
            Unlimited direct referrals · commission-relevant depth capped at Level 10
          </p>
        </div>
        <div className="flex gap-2.5">
          <div className="card px-4 py-2 text-center">
            <div className="text-[17px] font-extrabold">{directCount}</div>
            <div className="text-[10.5px] text-ink-faint">DIRECT</div>
          </div>
          <div className="card px-4 py-2 text-center">
            <div className="text-[17px] font-extrabold">{rows.length}</div>
            <div className="text-[10.5px] text-ink-faint">TOTAL TEAM</div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15.5px] font-bold">Network Depth · Level 1&ndash;10</h3>
          <span className="text-[11.5px] text-ink-faint">Level 1 = your direct referrals</span>
        </div>
        <div className="grid grid-cols-10 gap-2">
          {levelCounts.map((lv) => (
            <div key={lv.n} className="text-center">
              <div
                className="rounded-t-lg flex items-start justify-center pt-1.5"
                style={{ height: `${14 + (lv.count / maxCount) * 60}px`, background: LEVEL_COLORS[lv.n] }}
              >
                <span className="text-xs font-extrabold text-white">{lv.count}</span>
              </div>
              <div className="py-2 bg-paper rounded-b-lg">
                <div className="text-[11px] font-bold">L{lv.n}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-0 py-5.5">
        <div className="px-5.5 pb-4 flex items-center justify-between gap-3">
          <h3 className="text-[15.5px] font-bold">Downline Detail</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search member…"
                className="pl-8 pr-3 py-2 rounded-lg border-2 border-line text-[12.5px] w-[200px]"
              />
            </div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="px-3 py-2 rounded-lg border-2 border-line text-[12.5px] text-ink-soft"
            >
              <option value="ALL">All Levels</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Level {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>DOJ</th>
              <th>Plan</th>
              <th>Sponsor</th>
              <th>Level</th>
              <th>Direct</th>
              <th>Team</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-ink-faint py-6">
                  No members found.
                </td>
              </tr>
            )}
            {filteredRows.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.memberCode}</strong> &nbsp;{r.fullName}
                </td>
                <td className="font-mono text-ink-soft">{new Date(r.doj).toLocaleDateString('en-IN')}</td>
                <td className="font-bold">{r.committedAmount ? `₹${Number(r.committedAmount).toLocaleString('en-IN')}` : '—'}</td>
                <td className="font-mono text-ink-soft">{r.sponsorCode ?? '—'}</td>
                <td>{r.level}</td>
                <td>{r.directReferralsCount}</td>
                <td>{r.totalTeamCount}</td>
                <td>
                  <span className={r.status === 'ACTIVE' ? 'badge-green' : 'badge-amber'}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
