'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CreditCard,
  GitBranch,
  BookOpen,
  ArrowUpRight,
  User,
  Bell,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { RequireAuth } from '@/components/RequireAuth';

const NAV_ITEMS = [
  { to: '/member/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/member/payments', label: 'Payments', icon: CreditCard },
  { to: '/member/genealogy', label: 'Genealogy', icon: GitBranch },
  { to: '/member/passbook', label: 'Passbook', icon: BookOpen },
  { to: '/member/payouts', label: 'Payouts', icon: ArrowUpRight },
  { to: '/member/profile', label: 'Profile', icon: User },
];

function MemberShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const initials = (user?.fullName ?? '??').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen flex bg-paper">
      {/* Sidebar */}
      <aside className="w-[236px] bg-white border-r border-line p-4 flex flex-col gap-1">
        <div className="flex items-center gap-2.5 px-2.5 pb-6 pt-1.5">
          <Logo size="sm" />
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link key={to} href={to} className={`nav-item ${pathname.startsWith(to) ? 'active' : ''}`}>
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.9} />
              <span className="text-[13.5px]">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto p-3 bg-paper rounded-xl text-xs text-ink-soft">
          Signed in as
          <br />
          <strong className="text-ink">
            {user?.memberCode} &middot; {user?.fullName}
          </strong>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[76px] border-b border-line bg-white flex items-center justify-between px-8">
          <div>
            <div className="text-[19px] font-bold">Welcome, {user?.fullName?.split(' ')[0]}</div>
            <div className="text-[12.5px] text-ink-soft">{user?.memberCode}</div>
          </div>

          <div className="flex items-center gap-3.5">
            <button className="w-[38px] h-[38px] rounded-xl bg-paper border border-line flex items-center justify-center text-ink-soft hover:text-ink">
              <Bell className="w-[17px] h-[17px]" strokeWidth={1.9} />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((s) => !s)}
                className="flex items-center gap-2 p-1.5 pl-3 rounded-xl bg-paper border border-line hover:border-ink-faint transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center font-bold text-white text-xs">
                  {initials}
                </div>
                <ChevronDown className="w-4 h-4 text-ink-faint" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-56 rounded-2xl bg-white border border-line shadow-card-hover p-3 z-50">
                  <div className="px-2 pb-2 mb-2 border-b border-line">
                    <p className="text-sm font-bold text-ink">{user?.fullName}</p>
                    <p className="text-xs text-ink-soft">{user?.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-state-crimson hover:bg-state-crimson-soft flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth userType="MEMBER">
      <MemberShell>{children}</MemberShell>
    </RequireAuth>
  );
}
