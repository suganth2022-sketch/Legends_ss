import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowUpDown } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

interface MemberRow {
  id: string;
  memberCode: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  doj: string;
  sponsor: { memberCode: string; fullName: string } | null;
}

export const AdminMembersPage: React.FC = () => {
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [sortDojAsc, setSortDojAsc] = useState(false);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const load = () => {
    setLoading(true);
    const params: Record<string, string | number> = { page, pageSize };
    if (search) params.search = search;
    if (status) params.status = status;
    apiClient.get('/admin/members', { params }).then((res) => {
      setRows(res.data.data);
      setTotal(res.data.total);
      setLoading(false);
    });
  };

  useEffect(load, [page, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await apiClient.patch(`/admin/members/${id}/status`, { status: newStatus });
    load();
  };

  const sortedRows = [...rows].sort((a, b) => {
    const cmp = new Date(a.doj).getTime() - new Date(b.doj).getTime();
    return sortDojAsc ? cmp : -cmp;
  });

  return (
    <div className="p-8">
      <h1 className="text-[19px] font-bold mb-5">Member Management</h1>

      <form onSubmit={handleSearchSubmit} className="card p-4.5 mb-4.5 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 border-2 border-line rounded-lg">
          <Search className="w-4 h-4 text-ink-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or member code…"
            className="flex-1 text-[13px] outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 border-2 border-line rounded-lg text-[12.5px] text-ink-soft"
        >
          <option value="">Status: All</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <button
          type="button"
          onClick={() => setSortDojAsc((s) => !s)}
          className="flex items-center gap-1.5 px-4 py-2.5 border-2 border-line rounded-lg text-[12.5px] text-ink-soft"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          Sort: DOJ {sortDojAsc ? '↑' : '↓'}
        </button>
        <button type="submit" className="btn-secondary py-2.5 px-5 text-[12.5px]">
          Search
        </button>
      </form>

      <div className="card p-0 py-5.5">
        <table className="data-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Sponsor</th>
              <th>DOJ</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!loading && sortedRows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-ink-faint py-6">
                  No members found.
                </td>
              </tr>
            )}
            {sortedRows.map((m) => (
              <tr key={m.id}>
                <td>
                  <strong>{m.memberCode}</strong> &nbsp;{m.fullName}
                </td>
                <td className="text-ink-soft">{m.email}</td>
                <td className="font-mono text-ink-soft">{m.phone}</td>
                <td className="font-mono text-ink-soft">{m.sponsor?.memberCode ?? '—'}</td>
                <td className="font-mono text-ink-soft">{new Date(m.doj).toLocaleDateString('en-IN')}</td>
                <td>
                  <select
                    value={m.status}
                    onChange={(e) => handleStatusChange(m.id, e.target.value)}
                    className={`text-[11px] font-bold rounded-full px-2.5 py-1 border-0 ${
                      m.status === 'ACTIVE' ? 'bg-state-green-soft text-state-green' : 'bg-state-amber-soft text-state-amber'
                    }`}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING">PENDING</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </td>
                <td>
                  <Link to={`/admin/members/${m.id}`} className="text-xs font-bold text-brand-red">
                    View Profile →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-6 pt-4 text-xs text-ink-soft">
          <span>
            {total} member{total === 1 ? '' : 's'} total
          </span>
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
    </div>
  );
};
