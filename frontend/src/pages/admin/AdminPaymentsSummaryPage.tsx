import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { ErrorBanner } from '../../components/ErrorBanner';

interface SummaryRow {
  id: string;
  memberCode: string;
  fullName: string;
  totalPayment: string;
  totalEarning: string;
  totalPaid: string;
  balance: string;
}

export const AdminPaymentsSummaryPage: React.FC = () => {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [minBalance, setMinBalance] = useState('');
  const [maxBalance, setMaxBalance] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 15;

  const load = () => {
    setLoading(true);
    setError(null);
    const params: Record<string, string | number> = { page, pageSize };
    if (search) params.search = search;
    if (minBalance) params.minBalance = minBalance;
    if (maxBalance) params.maxBalance = maxBalance;
    apiClient
      .get('/admin/members-summary', { params })
      .then((res) => {
        setRows(res.data.data);
        setTotal(res.data.total);
      })
      .catch(() => setError('Could not load the payments summary. Please try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  return (
    <div className="p-8">
      <h1 className="text-[19px] font-bold mb-1">Payments</h1>
      <p className="text-[12.5px] text-ink-soft mb-5">
        Per-member totals across payments, earnings, and payouts — click any amount to see that member&rsquo;s
        detail (the same views shown on their own Dashboard/Passbook).
      </p>

      <form onSubmit={handleFilter} className="card p-4.5 mb-4.5 flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search member…"
          className="input py-2.5 text-[12.5px] w-[200px]"
        />
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] text-ink-faint font-semibold">Payout Balance:</span>
          <input
            value={minBalance}
            onChange={(e) => setMinBalance(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="Min"
            className="input py-2.5 text-[12.5px] w-[90px]"
          />
          <span className="text-ink-faint">–</span>
          <input
            value={maxBalance}
            onChange={(e) => setMaxBalance(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="Max"
            className="input py-2.5 text-[12.5px] w-[90px]"
          />
        </div>
        <button type="submit" className="btn-secondary py-2.5 px-5 text-[12.5px]">
          Apply
        </button>
        {(minBalance || maxBalance || search) && (
          <button
            type="button"
            onClick={() => {
              setMinBalance('');
              setMaxBalance('');
              setSearch('');
              setPage(1);
              setTimeout(load, 0);
            }}
            className="text-xs font-bold text-brand-red"
          >
            Reset
          </button>
        )}
      </form>

      {error ? (
        <ErrorBanner message={error} onRetry={load} />
      ) : (
        <div className="card p-0 py-5.5">
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Member ID</th>
                <th>Username</th>
                <th>Total Payment</th>
                <th>Total Earning</th>
                <th>Total Paid</th>
                <th>Payout Balance</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-ink-faint py-6">
                    No members found.
                  </td>
                </tr>
              )}
              {rows.map((r, idx) => (
                <tr key={r.id}>
                  <td className="text-ink-faint">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="font-mono">{r.memberCode}</td>
                  <td>{r.fullName}</td>
                  <td>
                    <Link to={`/admin/members/${r.id}?focus=payments`} className="font-bold text-brand-red hover:underline">
                      ₹{Number(r.totalPayment).toLocaleString('en-IN')}
                    </Link>
                  </td>
                  <td>
                    <Link to={`/admin/members/${r.id}?focus=earnings`} className="font-bold text-brand-red hover:underline">
                      ₹{Number(r.totalEarning).toLocaleString('en-IN')}
                    </Link>
                  </td>
                  <td>
                    <Link to={`/admin/members/${r.id}?focus=payouts`} className="font-bold text-brand-red hover:underline">
                      ₹{Number(r.totalPaid).toLocaleString('en-IN')}
                    </Link>
                  </td>
                  <td className="font-bold text-gold">₹{Number(r.balance).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-6 pt-4 text-xs text-ink-soft">
            <span>{total} member{total === 1 ? '' : 's'} total</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-line disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-2 py-1.5">Page {page}</span>
              <button
                disabled={page * pageSize >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-line disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
