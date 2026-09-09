import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, ShieldCheck, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { Logo } from '../components/Logo';

interface RegisterResult {
  memberCode: string;
  fullName: string;
  sponsorCode: string;
  initialPassword: string;
}

export const RegisterPage: React.FC = () => {
  const [sponsorCodeInput, setSponsorCodeInput] = useState('A000001');
  const [sponsorValidated, setSponsorValidated] = useState(false);
  const [sponsorName, setSponsorName] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<RegisterResult | null>(null);

  const handleValidateSponsor = async () => {
    setErrorMsg(null);
    setSponsorValidated(false);
    setSponsorName(null);
    setValidating(true);
    try {
      const { data } = await apiClient.get(`/referral/validate/${sponsorCodeInput.toUpperCase()}`);
      setSponsorValidated(true);
      setSponsorName(data.fullName);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Invalid or inactive sponsor code');
    } finally {
      setValidating(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!sponsorValidated) {
      setErrorMsg('Validate a sponsor code before registering');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await apiClient.post<RegisterResult>('/members/register', {
        fullName,
        email,
        phone,
        sponsorCode: sponsorCodeInput.toUpperCase(),
      });
      setResult(data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        setErrorMsg('A member with this email or phone already exists.');
      } else {
        setErrorMsg(err?.response?.data?.message || 'Registration failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white border border-line rounded-[20px] p-11 shadow-card-hover">
        <div className="text-center space-y-1 mb-7">
          <Logo size="sm" className="justify-center" />
          <h1 className="text-[26px] font-bold pt-2">Join the network</h1>
          <p className="text-[13.5px] text-ink-soft">
            Every member registers under an active sponsor&rsquo;s referral code.
          </p>
        </div>

        {result ? (
          <div className="p-6 rounded-2xl bg-state-green-soft border border-state-green/30 text-center space-y-3 animate-fade-in">
            <CheckCircle className="w-12 h-12 text-state-green mx-auto" />
            <h3 className="text-lg font-bold text-state-green">Registration Successful!</h3>
            <div className="bg-white rounded-xl p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Member Code</span>
                <strong className="font-mono">{result.memberCode}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">One-time password</span>
                <strong className="font-mono">{result.initialPassword}</strong>
              </div>
            </div>
            <p className="text-[11px] text-ink-soft">
              Save this now — there is no SMS/email delivery yet, so this is the only place it appears.
            </p>
            <Link to="/login" className="btn-primary inline-block mt-2 px-8 py-3 text-sm">
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-state-crimson-soft border border-state-crimson/30 text-state-crimson text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="p-4 rounded-xl bg-paper border border-line space-y-3">
              <label className="text-xs font-bold text-ink block">1 &middot; Sponsor Code</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. A000001"
                  value={sponsorCodeInput}
                  onChange={(e) => {
                    setSponsorCodeInput(e.target.value.toUpperCase());
                    setSponsorValidated(false);
                    setSponsorName(null);
                  }}
                  className="input text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleValidateSponsor}
                  disabled={validating}
                  className="btn-secondary py-3 px-4 text-xs shrink-0 disabled:opacity-60"
                >
                  {validating ? 'Checking…' : 'Validate'}
                </button>
              </div>

              {sponsorValidated && sponsorName && (
                <div className="flex items-center gap-2 text-xs text-state-green pt-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    Valid Active Sponsor: <strong>{sponsorName}</strong>
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-soft">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-soft">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink-soft">Mobile Phone</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="w-full btn-primary py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              <UserPlus className="w-4 h-4" />
              <span>{submitting ? 'Registering…' : 'Complete Registration'}</span>
            </button>
          </form>
        )}

        {!result && (
          <div className="pt-5 mt-5 border-t border-line text-center text-xs text-ink-soft">
            Already have a Member ID?{' '}
            <Link to="/login" className="text-brand-red font-bold hover:underline">
              Sign In Here
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
