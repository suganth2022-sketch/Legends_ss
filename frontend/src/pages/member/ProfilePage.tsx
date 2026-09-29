import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Pencil } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { ErrorBanner } from '../../components/ErrorBanner';

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

interface ProfileData {
  firstName: string;
  lastName: string;
  dob: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
}

interface KycData {
  aadhaarMasked: string | null;
  panMasked: string | null;
  status: string;
}

interface BankData {
  bankName: string | null;
  branch: string | null;
  accountNumberMasked: string | null;
  ifscCode: string | null;
  upiId: string | null;
}

interface NomineeData {
  fullName: string | null;
  relationship: string | null;
  phone: string | null;
  email: string | null;
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

const SectionHeader: React.FC<{
  title: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  extra?: React.ReactNode;
}> = ({ title, editing, onEdit, onCancel, onSave, saving, extra }) => (
  <div className="flex justify-between items-center mb-2.5">
    <h3 className="text-sm font-bold">{title}</h3>
    <div className="flex items-center gap-3">
      {extra}
      {editing ? (
        <div className="flex gap-2">
          <button onClick={onCancel} className="text-xs font-bold text-ink-faint">
            Cancel
          </button>
          <button onClick={onSave} disabled={saving} className="text-xs font-bold text-state-green disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      ) : (
        <button onClick={onEdit} className="flex items-center gap-1 text-xs font-bold text-brand-red">
          <Pencil className="w-3 h-3" /> Edit
        </button>
      )}
    </div>
  </div>
);

export const ProfilePage: React.FC = () => {
  const [member, setMember] = useState<MemberMe | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [kyc, setKyc] = useState<KycData | null>(null);
  const [bank, setBank] = useState<BankData | null>(null);
  const [nominee, setNominee] = useState<NomineeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiClient.get<MemberMe>('/members/me'),
      apiClient.get<ProfileData>('/members/me/profile'),
      apiClient.get<KycData>('/members/me/kyc'),
      apiClient.get<BankData>('/members/me/bank'),
      apiClient.get<NomineeData>('/members/me/nominee'),
    ])
      .then(([m, p, k, b, n]) => {
        setMember(m.data);
        setProfile(p.data);
        setKyc(k.data);
        setBank(b.data);
        setNominee(n.data);
      })
      .catch(() => setError('Could not load your profile. Please try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadAll, []);

  // ---- Personal section ----
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState<ProfileData | null>(null);
  const [savingPersonal, setSavingPersonal] = useState(false);

  const startEditPersonal = () => {
    setPersonalForm(profile);
    setEditingPersonal(true);
  };
  const savePersonal = async () => {
    if (!personalForm) return;
    setSavingPersonal(true);
    try {
      const { data } = await apiClient.patch<ProfileData>('/members/me/profile', {
        firstName: personalForm.firstName,
        lastName: personalForm.lastName,
        dob: personalForm.dob ? new Date(personalForm.dob).toISOString() : undefined,
        address: personalForm.address ?? undefined,
        city: personalForm.city ?? undefined,
        state: personalForm.state ?? undefined,
        pincode: personalForm.pincode ?? undefined,
      });
      setProfile(data);
      setMember((m) => (m ? { ...m, fullName: `${data.firstName} ${data.lastName}`.trim() } : m));
      setEditingPersonal(false);
    } finally {
      setSavingPersonal(false);
    }
  };

  // ---- KYC section ----
  const [editingKyc, setEditingKyc] = useState(false);
  const [kycForm, setKycForm] = useState({ aadhaarNumber: '', pan: '' });
  const [savingKyc, setSavingKyc] = useState(false);
  const [revealedKyc, setRevealedKyc] = useState<{ aadhaarNumber: string | null; pan: string | null } | null>(null);
  const [revealingKyc, setRevealingKyc] = useState(false);

  const saveKyc = async () => {
    setSavingKyc(true);
    try {
      const body: Record<string, string> = {};
      if (kycForm.aadhaarNumber) body.aadhaarNumber = kycForm.aadhaarNumber;
      if (kycForm.pan) body.pan = kycForm.pan.toUpperCase();
      const { data } = await apiClient.patch<KycData>('/members/me/kyc', body);
      setKyc(data);
      setRevealedKyc(null);
      setEditingKyc(false);
      setKycForm({ aadhaarNumber: '', pan: '' });
    } finally {
      setSavingKyc(false);
    }
  };

  const toggleRevealKyc = async () => {
    if (revealedKyc) {
      setRevealedKyc(null);
      return;
    }
    setRevealingKyc(true);
    try {
      const { data } = await apiClient.post('/members/me/kyc/reveal');
      setRevealedKyc(data);
    } finally {
      setRevealingKyc(false);
    }
  };

  // ---- Bank section ----
  const [editingBank, setEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState<{ bankName: string; branch: string; accountNumber: string; ifscCode: string; upiId: string }>({
    bankName: '',
    branch: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
  });
  const [savingBank, setSavingBank] = useState(false);
  const [revealedAccount, setRevealedAccount] = useState<string | null>(null);
  const [revealingBank, setRevealingBank] = useState(false);

  const startEditBank = () => {
    setBankForm({
      bankName: bank?.bankName ?? '',
      branch: bank?.branch ?? '',
      accountNumber: '',
      ifscCode: bank?.ifscCode ?? '',
      upiId: bank?.upiId ?? '',
    });
    setEditingBank(true);
  };
  const saveBank = async () => {
    setSavingBank(true);
    try {
      const body: Record<string, string> = {
        bankName: bankForm.bankName,
        branch: bankForm.branch,
        ifscCode: bankForm.ifscCode,
        upiId: bankForm.upiId,
      };
      if (bankForm.accountNumber) body.accountNumber = bankForm.accountNumber;
      const { data } = await apiClient.patch<BankData>('/members/me/bank', body);
      setBank(data);
      setRevealedAccount(null);
      setEditingBank(false);
    } finally {
      setSavingBank(false);
    }
  };
  const toggleRevealBank = async () => {
    if (revealedAccount) {
      setRevealedAccount(null);
      return;
    }
    setRevealingBank(true);
    try {
      const { data } = await apiClient.post('/members/me/bank/reveal');
      setRevealedAccount(data.accountNumber);
    } finally {
      setRevealingBank(false);
    }
  };

  // ---- Nominee section ----
  const [editingNominee, setEditingNominee] = useState(false);
  const [nomineeForm, setNomineeForm] = useState<NomineeData | null>(null);
  const [savingNominee, setSavingNominee] = useState(false);

  const startEditNominee = () => {
    setNomineeForm(nominee);
    setEditingNominee(true);
  };
  const saveNominee = async () => {
    if (!nomineeForm) return;
    setSavingNominee(true);
    try {
      const { data } = await apiClient.patch<NomineeData>('/members/me/nominee', {
        fullName: nomineeForm.fullName ?? undefined,
        relationship: nomineeForm.relationship ?? undefined,
        phone: nomineeForm.phone ?? undefined,
        email: nomineeForm.email ?? undefined,
      });
      setNominee(data);
      setEditingNominee(false);
    } finally {
      setSavingNominee(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-ink-soft text-sm">Loading profile…</div>;
  }

  if (error || !member) {
    return (
      <div className="p-8">
        <ErrorBanner message={error ?? 'Something went wrong.'} onRetry={loadAll} />
      </div>
    );
  }

  const initials = member.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="p-8">
      <h1 className="text-[19px] font-bold mb-6">My Profile</h1>

      <div className="grid grid-cols-[0.85fr_1.5fr] gap-5">
        <div className="flex flex-col gap-4.5 h-fit">
          <div className="card p-6 text-center">
            <div className="w-[88px] h-[88px] rounded-full flex items-center justify-center text-white text-[28px] font-bold mx-auto mb-3.5 bg-gradient-brand">
              {initials}
            </div>
            <div className="text-[17px] font-bold">{member.fullName}</div>
            <div className="text-xs text-ink-faint font-mono mb-3">{member.memberCode}</div>
            <span className={member.status === 'ACTIVE' ? 'badge-green' : 'badge-amber'}>{member.status}</span>
            <button className="w-full btn-secondary py-3 text-xs mt-5">Change Password</button>
          </div>

          <div className="card p-5.5">
            <SectionHeader
              title="Nominee Info"
              editing={editingNominee}
              onEdit={startEditNominee}
              onCancel={() => setEditingNominee(false)}
              onSave={saveNominee}
              saving={savingNominee}
            />
            {editingNominee && nomineeForm ? (
              <div className="flex flex-col gap-2.5">
                <input
                  value={nomineeForm.fullName ?? ''}
                  onChange={(e) => setNomineeForm({ ...nomineeForm, fullName: e.target.value })}
                  placeholder="Nominee name"
                  className="input py-2 text-xs"
                />
                <input
                  value={nomineeForm.relationship ?? ''}
                  onChange={(e) => setNomineeForm({ ...nomineeForm, relationship: e.target.value })}
                  placeholder="Relationship"
                  className="input py-2 text-xs"
                />
                <input
                  value={nomineeForm.phone ?? ''}
                  onChange={(e) => setNomineeForm({ ...nomineeForm, phone: e.target.value })}
                  placeholder="Phone"
                  className="input py-2 text-xs font-mono"
                />
                <input
                  value={nomineeForm.email ?? ''}
                  onChange={(e) => setNomineeForm({ ...nomineeForm, email: e.target.value })}
                  placeholder="Email"
                  className="input py-2 text-xs"
                />
              </div>
            ) : (
              <>
                <Field label="Nominee Name" value={nominee?.fullName ?? '—'} />
                <Field label="Relationship" value={nominee?.relationship ?? '—'} />
                <Field label="Nominee Email" value={nominee?.email ?? '—'} />
                <Field label="Nominee Mobile" value={nominee?.phone ?? '—'} last />
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4.5">
          <div className="card p-6 col-span-2">
            <SectionHeader
              title="Personal Details"
              editing={editingPersonal}
              onEdit={startEditPersonal}
              onCancel={() => setEditingPersonal(false)}
              onSave={savePersonal}
              saving={savingPersonal}
            />

            {editingPersonal && personalForm ? (
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={personalForm.firstName}
                  onChange={(e) => setPersonalForm({ ...personalForm, firstName: e.target.value })}
                  placeholder="First Name"
                  className="input py-2 text-xs"
                />
                <input
                  value={personalForm.lastName}
                  onChange={(e) => setPersonalForm({ ...personalForm, lastName: e.target.value })}
                  placeholder="Last Name"
                  className="input py-2 text-xs"
                />
                <input
                  type="date"
                  value={personalForm.dob ? personalForm.dob.slice(0, 10) : ''}
                  onChange={(e) => setPersonalForm({ ...personalForm, dob: e.target.value })}
                  className="input py-2 text-xs font-mono"
                />
                <input
                  value={personalForm.pincode ?? ''}
                  onChange={(e) => setPersonalForm({ ...personalForm, pincode: e.target.value })}
                  placeholder="Pincode"
                  className="input py-2 text-xs font-mono"
                />
                <input
                  value={personalForm.address ?? ''}
                  onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })}
                  placeholder="Address"
                  className="input py-2 text-xs col-span-2"
                />
                <input
                  value={personalForm.city ?? ''}
                  onChange={(e) => setPersonalForm({ ...personalForm, city: e.target.value })}
                  placeholder="City"
                  className="input py-2 text-xs"
                />
                <input
                  value={personalForm.state ?? ''}
                  onChange={(e) => setPersonalForm({ ...personalForm, state: e.target.value })}
                  placeholder="State"
                  className="input py-2 text-xs"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-6">
                <Field label="First Name" value={profile?.firstName || '—'} />
                <Field label="Last Name" value={profile?.lastName || '—'} />
                <Field label="Date of Birth" value={<span className="font-mono">{profile?.dob ? new Date(profile.dob).toLocaleDateString('en-IN') : '—'}</span>} />
                <Field label="Date of Joining" value={<span className="font-mono">{new Date(member.doj).toLocaleDateString('en-IN')}</span>} />
                <Field label="Address" value={profile?.address || '—'} span2 />
                <Field label="City / State / Pincode" value={[profile?.city, profile?.state, profile?.pincode].filter(Boolean).join(', ') || '—'} span2 />
                <Field label="Email" value={member.email} />
                <Field label="Mobile" value={<span className="font-mono">{member.phone}</span>} />
                <Field
                  label="Sponsor"
                  value={member.sponsor ? `${member.sponsor.memberCode} · ${member.sponsor.fullName}` : '—'}
                  last
                  span2
                />
              </div>
            )}
          </div>

          <div className="card p-5.5">
            <SectionHeader
              title="Identity (KYC)"
              editing={editingKyc}
              onEdit={() => {
                setKycForm({ aadhaarNumber: '', pan: '' });
                setEditingKyc(true);
              }}
              onCancel={() => setEditingKyc(false)}
              onSave={saveKyc}
              saving={savingKyc}
              extra={
                !editingKyc && (
                  <button onClick={toggleRevealKyc} disabled={revealingKyc} className="flex items-center gap-1 text-[11px] text-ink-faint">
                    {revealedKyc ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {revealedKyc ? 'Hide' : 'Reveal'}
                  </button>
                )
              }
            />
            {editingKyc ? (
              <div className="flex flex-col gap-2.5">
                <input
                  value={kycForm.aadhaarNumber}
                  onChange={(e) => setKycForm({ ...kycForm, aadhaarNumber: e.target.value.replace(/\D/g, '') })}
                  placeholder="12-digit Aadhaar"
                  maxLength={12}
                  className="input py-2 text-xs font-mono"
                />
                <input
                  value={kycForm.pan}
                  onChange={(e) => setKycForm({ ...kycForm, pan: e.target.value.toUpperCase() })}
                  placeholder="PAN (AAAAA9999A)"
                  maxLength={10}
                  className="input py-2 text-xs font-mono"
                />
                <div className="text-[10.5px] text-ink-faint">Leave blank to keep the existing value unchanged.</div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center py-3 border-b border-line">
                  <span className="text-ink-soft text-xs">Aadhaar Number</span>
                  <strong className="text-xs font-mono">
                    {revealedKyc?.aadhaarNumber ?? kyc?.aadhaarMasked ?? '— not submitted'}
                  </strong>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-ink-soft text-xs">PAN</span>
                  <strong className="text-xs font-mono">{revealedKyc?.pan ?? kyc?.panMasked ?? '— not submitted'}</strong>
                </div>
                <div className="mt-3 p-2.5 bg-paper rounded-lg text-[10.5px] text-ink-faint leading-relaxed">
                  Status: <strong>{kyc?.status ?? 'NOT_SUBMITTED'}</strong> · every Reveal is audit-logged.
                </div>
              </>
            )}
          </div>

          <div className="card p-5.5">
            <SectionHeader
              title="Bank Details"
              editing={editingBank}
              onEdit={startEditBank}
              onCancel={() => setEditingBank(false)}
              onSave={saveBank}
              saving={savingBank}
              extra={
                !editingBank && (
                  <button onClick={toggleRevealBank} disabled={revealingBank} className="flex items-center gap-1 text-[11px] text-ink-faint">
                    {revealedAccount ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {revealedAccount ? 'Hide' : 'Reveal'}
                  </button>
                )
              }
            />
            {editingBank ? (
              <div className="flex flex-col gap-2.5">
                <input
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  placeholder="Bank Name"
                  className="input py-2 text-xs"
                />
                <input
                  value={bankForm.branch}
                  onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                  placeholder="Branch"
                  className="input py-2 text-xs"
                />
                <input
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value.replace(/\D/g, '') })}
                  placeholder="Account Number (leave blank to keep current)"
                  className="input py-2 text-xs font-mono"
                />
                <input
                  value={bankForm.ifscCode}
                  onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })}
                  placeholder="IFSC Code"
                  className="input py-2 text-xs font-mono"
                />
                <input
                  value={bankForm.upiId}
                  onChange={(e) => setBankForm({ ...bankForm, upiId: e.target.value })}
                  placeholder="UPI ID"
                  className="input py-2 text-xs font-mono"
                />
              </div>
            ) : (
              <>
                <Field label="Bank" value={bank?.bankName || '—'} />
                <Field label="Branch" value={bank?.branch || '—'} />
                <Field label="Account No." value={<span className="font-mono">{revealedAccount ?? bank?.accountNumberMasked ?? '—'}</span>} />
                <Field label="IFSC Code" value={<span className="font-mono">{bank?.ifscCode || '—'}</span>} last />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
