'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { ErrorBanner } from '@/components/ErrorBanner';

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

interface PaymentRow {
  id: string;
  paidAt: string;
  transactionId: string;
  amount: string;
  mode: string;
  status: string;
}

interface FullProfile {
  profile: {
    firstName: string;
    lastName: string;
    dob: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
  };
  kyc: { aadhaarMasked: string | null; panMasked: string | null; status: string };
  bank: {
    bankName: string | null;
    branch: string | null;
    accountNumberMasked: string | null;
    ifscCode: string | null;
    upiId: string | null;
  };
  nominee: { fullName: string | null; relationship: string | null; phone: string | null; email: string | null };
}

const Field: React.FC<{ label: string; value: React.ReactNode; last?: boolean }> = ({ label, value, last }) => (
  <div className={`flex justify-between items-center py-3 ${last ? '' : 'border-b border-line'}`}>
    <span className="text-ink-soft text-xs">{label}</span>
    <strong className="text-xs">{value}</strong>
  </div>
);

const AdminMemberDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const focus = searchParams.get('focus');

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [earnings, setEarnings] = useState<EarningRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [fullProfile, setFullProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const paymentsRef = useRef<HTMLDivElement>(null);
  const earningsRef = useRef<HTMLDivElement>(null);
  const payoutsRef = useRef<HTMLDivElement>(null);

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      apiClient.get<MemberDetail>(`/members/${id}`),
      apiClient.get<EarningRow[]>(`/admin/members/${id}/earnings`),
      apiClient.get<PayoutRow[]>(`/admin/members/${id}/payouts`),
      apiClient.get<{ payments: PaymentRow[] }>(`/admin/members/${id}/payments`),
      apiClient.get<FullProfile>(`/admin/members/${id}/full-profile`),
    ])
      .then(([m, e, p, pay, fp]) => {
        setMember(m.data);
        setEarnings(e.data);
        setPayouts(p.data);
        setPayments(pay.data.payments);
        setFullProfile(fp.data);
      })
      .catch(() => setError('Could not load this member. Please try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  useEffect(() => {
    if (loading || !focus) return;
    const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
      payments: paymentsRef,
      earnings: earningsRef,
      payouts: payoutsRef,
    };
    const ref = refMap[focus];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setHighlighted(focus);
      const t = setTimeout(() => setHighlighted(null), 2000);
      return () => clearTimeout(t);
    }
  }, [loading, focus]);

  if (loading) {
    return <div className="p-8 text-ink-soft text-sm">Loading…</div>;
  }

  if (error || !member) {
    return (
      <div className="p-8">
        <ErrorBanner message={error ?? 'Member not found.'} onRetry={load} />
      </div>
    );
  }

  const initials = member.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const highlightClass = (key: string) => (highlighted === key ? 'ring-2 ring-brand-red' : '');

  return (
    <div className="p-8">
      <div className="flex items-center gap-2.5 mb-6">
        <Link href="/admin/members" className="text-ink-faint text-[13px]">
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
            <h3 className="text-xs font-bold mb-2.5">KYC Status</h3>
            <div className="text-left">
              <Field label="Status" value={<span className={fullProfile?.kyc.status === 'VERIFIED' ? 'badge-green' : 'badge-amber'}>{fullProfile?.kyc.status ?? '—'}</span>} />
              <Field label="Aadhaar" value={<span className="font-mono">{fullProfile?.kyc.aadhaarMasked ?? '—'}</span>} />
              <Field label="PAN" value={<span className="font-mono">{fullProfile?.kyc.panMasked ?? '—'}</span>} last />
            </div>
            <p className="text-[10.5px] text-ink-faint leading-relaxed mt-2.5">
              Masked — decrypting is self-service only for the member themselves (audit-logged each reveal).
            </p>
          </div>

          <div className="card p-5.5">
            <h3 className="text-xs font-bold mb-2.5">Bank Details</h3>
            <div className="text-left">
              <Field label="Bank" value={fullProfile?.bank.bankName || '—'} />
              <Field label="Branch" value={fullProfile?.bank.branch || '—'} />
              <Field label="Account No." value={<span className="font-mono">{fullProfile?.bank.accountNumberMasked ?? '—'}</span>} />
              <Field label="IFSC" value={<span className="font-mono">{fullProfile?.bank.ifscCode || '—'}</span>} />
              <Field label="UPI ID" value={fullProfile?.bank.upiId || '—'} last />
            </div>
            <p className="text-[10.5px] text-ink-faint leading-relaxed mt-2.5">
              Masked — decrypting is self-service only for the member themselves (audit-logged each reveal).
            </p>
          </div>

          <div className="card p-5.5">
            <h3 className="text-xs font-bold mb-2.5">Nominee</h3>
            <div className="text-left">
              <Field label="Name" value={fullProfile?.nominee.fullName || '—'} />
              <Field label="Relationship" value={fullProfile?.nominee.relationship || '—'} />
              <Field label="Phone" value={<span className="font-mono">{fullProfile?.nominee.phone || '—'}</span>} />
              <Field label="Email" value={fullProfile?.nominee.email || '—'} last />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4.5">
          <div className="card p-6">
            <h3 className="text-sm font-bold mb-2.5">Personal Details</h3>
            <div className="grid grid-cols-2 gap-x-6">
              <Field label="Email" value={member.email} />
              <Field label="Mobile" value={<span className="font-mono">{member.phone}</span>} />
              <Field label="Date of Joining" value={<span className="font-mono">{new Date(member.doj).toLocaleDateString('en-IN')}</span>} />
              <Field label="Date of Birth" value={<span className="font-mono">{fullProfile?.profile.dob ? new Date(fullProfile.profile.dob).toLocaleDateString('en-IN') : '—'}</span>} />
              <Field label="Address" value={fullProfile?.profile.address || '—'} />
              <Field label="City" value={fullProfile?.profile.city || '—'} />
              <Field label="State" value={fullProfile?.profile.state || '—'} />
              <Field label="Pincode" value={<span className="font-mono">{fullProfile?.profile.pincode || '—'}</span>} last />
            </div>
          </div>

          <div ref={paymentsRef} className={`card p-0 py-5.5 transition-shadow ${highlightClass('payments')}`}>
            <div className="px-6 pb-3 text-sm font-bold">Payment History (Admin Drill-Down)</div>
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
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-ink-faint py-5">
                      No payments yet.
                    </td>
                  </tr>
                )}
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-ink-soft text-xs">{new Date(p.paidAt).toLocaleDateString('en-IN')}</td>
                    <td className="font-mono text-[11px]">{p.transactionId}</td>
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

          <div ref={earningsRef} className={`card p-0 py-5.5 transition-shadow ${highlightClass('earnings')}`}>
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

          <div ref={payoutsRef} className={`card p-0 py-5.5 transition-shadow ${highlightClass('payouts')}`}>
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

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminMemberDetailPage />
    </Suspense>
  );
}
