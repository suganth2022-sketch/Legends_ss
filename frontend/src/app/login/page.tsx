'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useAuth, type UserType } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';

const LoginPage: React.FC = () => {
  const { loginMember, loginAdmin } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<UserType>('MEMBER');
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'MEMBER') {
        await loginMember(identifier, password);
        router.replace('/member/dashboard');
      } else {
        await loginAdmin(username, password);
        router.replace('/admin/dashboard');
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429) {
        setError('Too many attempts — please wait a minute and try again.');
      } else if (status === 401) {
        setError(err?.response?.data?.message || 'Invalid credentials.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div
        className="hidden lg:flex flex-[1.1] flex-col justify-between p-14 text-white"
        style={{ background: 'linear-gradient(160deg, #3A0812 0%, #8B0F24 45%, #E8203F 100%)' }}
      >
        <Logo size="md" variant="white" />
        <div className="max-w-md">
          <h1 className="text-[38px] font-bold leading-tight mb-4">
            Ten levels of network.
            <br />
            One savings plan.
          </h1>
          <p className="text-[15px] leading-relaxed text-white/80">
            Track your monthly jewellery savings, watch commission flow in from your downline, and
            request payouts — all from one member dashboard.
          </p>
        </div>
        <div className="text-xs text-white/50">&copy; Legends Jewellery Savings &amp; MLM Platform</div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-[400px]">
          <div className="inline-flex p-1 bg-paper rounded-xl mb-8">
            <button
              type="button"
              onClick={() => setTab('MEMBER')}
              className={`px-[22px] py-[9px] rounded-lg text-[13px] font-bold transition-all ${
                tab === 'MEMBER' ? 'bg-white text-brand-red shadow-sm' : 'text-ink-faint'
              }`}
            >
              Member
            </button>
            <button
              type="button"
              onClick={() => setTab('ADMIN')}
              className={`px-[22px] py-[9px] rounded-lg text-[13px] font-bold transition-all ${
                tab === 'ADMIN' ? 'bg-white text-brand-red shadow-sm' : 'text-ink-faint'
              }`}
            >
              Admin
            </button>
          </div>

          <h2 className="text-[26px] font-bold mb-2">Welcome back</h2>
          <p className="text-sm text-ink-soft mb-7">
            {tab === 'MEMBER'
              ? 'Sign in with your Member Code, email, or phone.'
              : 'Sign in with your admin username.'}
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-state-crimson-soft border border-state-crimson/30 text-state-crimson text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'MEMBER' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-soft">Member Code / Email / Phone</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="input font-mono text-sm"
                  placeholder="A000001"
                  required
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-soft">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input text-sm"
                  placeholder="admin"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input text-sm"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary py-3.5 text-sm disabled:opacity-60">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {tab === 'MEMBER' && (
            <div className="text-center text-sm text-ink-soft mt-6">
              New here?{' '}
              <Link href="/register" className="text-brand-red font-bold hover:underline">
                Register with a sponsor code
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
