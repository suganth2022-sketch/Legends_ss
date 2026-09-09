import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';

interface MemberDetail {
  id: string;
  memberCode: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  doj: string;
  sponsor: { memberCode: string; fullName: string } | null;
}

interface EarningRow {
  sNo: number;
  date: string;
  sourceMemberCode: string;
  level: number;
  earnedAmount: string;
  status: string;
}

interface PayoutRow {
  sNo: number;
  date: string;
  referenceNo: string;
  amount: string;
  status: string;
}

const Field: React.FC<{ label: string; value: React.ReactNode; last?: boolean }> = ({ label, value, last }) => (
  <div className={`flex justify-between items-center py-3 ${last ? '' : 'border-b border-line'}`}>
    <span className="text-ink-soft text-xs">{label}</span>
    <strong className="text-xs">{value}</strong>
  </div>
);

export const AdminMemberDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [earnings, setEarnings] = useState<EarningRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiClient.get<MemberDetail>(`/members/${id}`),
      apiClient.get<EarningRow[]>(`/admin/members/${id}/earnings`),
      apiClient.get<PayoutRow[]>(`/admin/members/${id}/payouts`),
    ]).then(([m, e, p]) => {
      setMember(m.data);
      setEarnings(e.data);
      setPayouts(p.data);
    });
  }, [id]);

  if (!member) {
    return <div className="p-8 text-ink-soft text-sm">Loading…</div>;
  }

  const initials = member.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="p-8">
      <div className="flex items-center gap-2.5 mb-6">
        <Link to="/admin/members" className="text-ink-faint text-[13px]">
          ← Members
        </Link>
        <span className="text-line">/</span>
        <div className="text-[17px] font-bold">
          {member.memberCode} · {member.fullName}
        </div>
      </div>

      <div className="grid grid-cols-[0.8fr_1.5fr] gap-5">
        <div className="flex flex-col gap-4.5 h-fit">
          <div className="card p-6 text-center">
            <div className="w-[76px] h-[76px] rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 bg-gradient-brand">
              {initials}
            </div>
            <div className="text-base font-bold">{member.fullName}</div>
            <div className="text-xs text-ink-faint font-mono mb-2.5">{member.memberCode}</div>
            <span className={member.status === 'ACTIVE' ? 'badge-green' : 'badge-amber'}>{member.status}</span>

            <div className="mt-4.5 pt-4 border-t border-line text-left">
              <Field label="Sponsor Name" value={member.sponsor?.fullName ?? '—'} />
              <Field label="Sponsor ID" value={<span className="font-mono">{member.sponsor?.memberCode ?? '—'}</span>} last />
            </div>
          </div>

          <div className="card p-5.5">
            <h3 className="text-xs font-bold mb-2.5">Bank Details</h3>
            <p className="text-[10.5px] text-ink-faint leading-relaxed">
              Needs the Member Profile/KYC/Bank module — not built yet.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4.5">
          <div className="card p-6">
            <h3 className="text-sm font-bold mb-2.5">Personal Details</h3>
            <div className="grid grid-cols-2 gap-x-6">
              <Field label="Email" value={member.email} />
              <Field label="Mobile" value={<span className="font-mono">{member.phone}</span>} />
              <Field label="Date of Joining" value={<span className="font-mono">{new Date(member.doj).toLocaleDateString('en-IN')}</span>} last />
              <Field label="Aadhaar / PAN" value="— pending KYC module" last />
            </div>
          </div>

          <div className="card p-0 py-5.5">
            <div className="px-6 pb-3 text-sm font-bold">Earnings (Admin Drill-Down)</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Level</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {earnings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-ink-faint py-5">
                      No earnings yet.
                    </td>
                  </tr>
                )}
                {earnings.slice(0, 8).map((r) => (
                  <tr key={r.sNo}>
                    <td className="font-mono text-ink-soft text-xs">{new Date(r.date).toLocaleDateString('en-IN')}</td>
                    <td className="font-mono text-xs">{r.sourceMemberCode}</td>
                    <td>{r.level}</td>
                    <td className="font-bold text-gold">+₹{Number(r.earnedAmount).toLocaleString('en-IN')}</td>
                    <td>
                      <span className="badge-green">{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card p-0 py-5.5">
            <div className="px-6 pb-3 text-sm font-bold">Payouts (Admin Drill-Down)</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-ink-faint py-5">
                      No payouts yet.
                    </td>
                  </tr>
                )}
                {payouts.map((p) => (
                  <tr key={p.sNo}>
                    <td className="font-mono text-ink-soft text-xs">{new Date(p.date).toLocaleDateString('en-IN')}</td>
                    <td className="font-mono text-xs">{p.referenceNo}</td>
                    <td className="font-bold">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                    <td>
                      <span className={p.status === 'PAID' ? 'badge-green' : 'badge-amber'}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
