import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import { ErrorBanner } from '../../components/ErrorBanner';

interface GenealogyRow {
  id: string;
  memberCode: string;
  fullName: string;
  doj: string;
  status: string;
  level: number; // backend: 1 = direct referral
  sponsorCode: string | null;
  committedAmount: string | null;
  directReferralsCount: number;
  totalTeamCount: number;
}

// Display convention matches the rest of the app (Commission Rules,
// business-rules.md): Level 1 = yourself, Level 2 = your direct referral,
// ... Level 10 = the deepest tier. The backend numbers hops-from-you
// starting at 1 for a direct referral, so we shift by one for display,
// folding the rare 9th/10th backend hop into one "Level 10" bucket so the
// visible range stays a clean 2–10 instead of introducing an off-model 11.
const toDisplayLevel = (backendLevel: number) => Math.min(backendLevel + 1, 10);

const LEVEL_COLORS: Record<number, string> = {
  2: '#C8102E',
  3: '#8B0F24',
  4: '#8B0F24',
  5: '#8B0F24',
  6: '#8B0F24',
  7: '#A87C1F',
  8: '#A87C1F',
  9: '#A87C1F',
  10: '#C9BDBB',
};

const DISPLAY_LEVELS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

export const GenealogyPage: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<GenealogyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | 'ALL'>('ALL');

  const load = () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    apiClient
      .get<GenealogyRow[]>(`/referral/genealogy/${user.id}`)
      .then((res) => setRows(res.data))
      .catch(() => setError('Could not load your network. Please try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [user]);

  const levelCounts = useMemo(() => {
    const counts = new Map(DISPLAY_LEVELS.map((n) => [n, 0]));
    rows.forEach((r) => {
      const lv = toDisplayLevel(r.level);
      counts.set(lv, (counts.get(lv) ?? 0) + 1);
    });
    return DISPLAY_LEVELS.map((n) => ({ n, count: counts.get(n) ?? 0 }));
  }, [rows]);

  const maxCount = Math.max(1, ...levelCounts.map((l) => l.count));

  const filteredRows = rows.filter((r) => {
    if (levelFilter !== 'ALL' && toDisplayLevel(r.level) !== levelFilter) return false;
    if (search && !r.fullName.toLowerCase().includes(search.toLowerCase()) && !r.memberCode.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const directCount = rows.filter((r) => r.level === 1).length;

  if (loading) {
    return <div className="p-8 text-ink-soft text-sm">Loading network…</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorBanner message={error} onRetry={load} />
      </div>
    );
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
          <h3 className="text-[15.5px] font-bold">Network Depth · Level 2&ndash;10</h3>
          <span className="text-[11.5px] text-ink-faint">Level 1 is you · Level 2 = your direct referrals</span>
        </div>
        <div className="grid grid-cols-9 gap-2">
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
              {DISPLAY_LEVELS.map((n) => (
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
                <td>{toDisplayLevel(r.level)}</td>
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
