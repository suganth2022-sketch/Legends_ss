import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

interface MemberMe {
  id: string;
  memberCode: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  doj: string;
  sponsor: { memberCode: string; fullName: string } | null;
}

const Field: React.FC<{ label: string; value: React.ReactNode; last?: boolean; span2?: boolean }> = ({
  label,
  value,
  last,
  span2,
}) => (
  <div
    className={`flex justify-between items-center py-3 ${last ? '' : 'border-b border-line'} ${span2 ? 'col-span-2' : ''}`}
  >
    <span className="text-ink-soft text-[13px]">{label}</span>
    <strong className="text-[13px] text-right max-w-[340px]">{value}</strong>
  </div>
);

export const ProfilePage: React.FC = () => {
  const [member, setMember] = useState<MemberMe | null>(null);

  useEffect(() => {
    apiClient.get<MemberMe>('/members/me').then((res) => setMember(res.data));
  }, []);

  if (!member) {
    return <div className="p-8 text-ink-soft text-sm">Loading profile…</div>;
  }

  const [firstName, ...rest] = member.fullName.split(' ');
  const lastName = rest.join(' ');
  const initials = (firstName?.[0] ?? '') + (rest[rest.length - 1]?.[0] ?? '');

  return (
    <div className="p-8">
      <h1 className="text-[19px] font-bold mb-6">My Profile</h1>

      <div className="grid grid-cols-[0.85fr_1.5fr] gap-5">
        <div className="flex flex-col gap-4.5 h-fit">
          <div className="card p-6 text-center">
            <div className="w-[88px] h-[88px] rounded-full flex items-center justify-center text-white text-[28px] font-bold mx-auto mb-3.5 bg-gradient-brand">
              {initials.toUpperCase()}
            </div>
            <div className="text-[17px] font-bold">{member.fullName}</div>
            <div className="text-xs text-ink-faint font-mono mb-3">{member.memberCode}</div>
            <span className={member.status === 'ACTIVE' ? 'badge-green' : 'badge-amber'}>{member.status}</span>
            <button className="w-full btn-secondary py-3 text-xs mt-5">Change Password</button>
          </div>

          <div className="card p-5.5">
            <h3 className="text-[13.5px] font-bold mb-2.5">Nominee Info</h3>
            <Field label="Nominee Name" value="—" />
            <Field label="Relationship" value="—" />
            <Field label="Nominee Email" value="—" />
            <Field label="Nominee Mobile" value="—" last />
            <div className="mt-3 text-[10.5px] text-ink-faint">
              Nominee details need the Profile/KYC module (not built yet).
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4.5">
          <div className="card p-6 col-span-2">
            <div className="flex justify-between items-center mb-1.5">
              <h3 className="text-[14.5px] font-bold">Personal Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-x-6">
              <Field label="First Name" value={firstName} />
              <Field label="Last Name" value={lastName || '—'} />
              <Field label="Date of Birth" value={<span className="font-mono">—</span>} />
              <Field label="Date of Joining" value={<span className="font-mono">{new Date(member.doj).toLocaleDateString('en-IN')}</span>} />
              <Field label="Address" value="—" span2 />
              <Field label="Email" value={member.email} />
              <Field label="Mobile" value={<span className="font-mono">{member.phone}</span>} />
              <Field
                label="Sponsor"
                value={member.sponsor ? `${member.sponsor.memberCode} · ${member.sponsor.fullName}` : '—'}
                last
                span2
              />
            </div>
          </div>

          <div className="card p-5.5">
            <div className="flex justify-between items-center mb-1.5">
              <h3 className="text-[13.5px] font-bold">Identity (KYC)</h3>
              <span className="text-[10.5px] text-ink-faint">masked by default</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-line">
              <span className="text-ink-soft text-xs">Aadhaar Number</span>
              <div className="flex items-center gap-2">
                <strong className="text-xs font-mono">— pending</strong>
              </div>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-ink-soft text-xs">PAN</span>
              <strong className="text-xs font-mono">— pending</strong>
            </div>
            <div className="mt-3 p-2.5 bg-paper rounded-lg text-[10.5px] text-ink-faint leading-relaxed">
              KYC capture &amp; masked reveal need the Profile/KYC module (not built yet).
            </div>
          </div>

          <div className="card p-5.5">
            <h3 className="text-[13.5px] font-bold mb-2.5">Bank Details</h3>
            <Field label="Bank" value="—" />
            <Field label="Branch" value="—" />
            <Field label="Account No." value="—" />
            <Field label="IFSC Code" value="—" last />
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 rounded-xl bg-paper border border-line flex items-center gap-2.5 text-xs text-ink-soft">
        <Check className="w-4 h-4 text-state-green shrink-0" />
        Identity, DOB, address, KYC, bank, and nominee fields are wired up in this layout and will populate once
        the Member Profile/KYC/Bank module is built on the backend.
      </div>
    </div>
  );
};
