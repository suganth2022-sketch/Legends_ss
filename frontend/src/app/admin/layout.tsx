'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  Users,
  Wallet,
  SlidersHorizontal,
  Megaphone,
  FileText,
  LogOut,
  IndianRupee,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { RequireAuth } from '@/components/RequireAuth';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/members', label: 'Members', icon: Users },
  { to: '/admin/payments', label: 'Payments', icon: IndianRupee },
  { to: '/admin/payment-entry', label: 'Payment Entry', icon: Receipt },
  { to: '/admin/payouts', label: 'Payout Queue', icon: Wallet },
  { to: '/admin/commission-rules', label: 'Commission Rules', icon: SlidersHorizontal },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/admin/reports', label: 'Reports & Audit', icon: FileText },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex bg-[#F5F4F2]">
      {/* Sidebar */}
      <aside className="w-[236px] bg-admin-bg p-4 flex flex-col gap-1">
        <div className="flex items-center gap-2.5 px-2.5 pb-2.5 pt-1.5">
          <Logo size="sm" variant="gold" />
        </div>
        <div className="px-2.5 pb-5">
          <span className="px-2.5 py-1 rounded-md bg-brand-red text-white text-[10.5px] font-extrabold tracking-wider">
            ADMIN PORTAL
          </span>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link key={to} href={to} className={`admin-nav-item ${pathname.startsWith(to) ? 'active' : ''}`}>
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.9} />
              <span className="text-[13.5px]">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto p-3 bg-white/5 rounded-xl text-xs text-admin-soft">
          Signed in as
          <br />
          <strong className="text-white">
            {user?.username} &middot; {user?.roleName}
          </strong>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[76px] border-b border-line bg-white flex items-center justify-between px-8">
          <div className="text-[19px] font-bold">Admin Portal</div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-state-crimson hover:bg-state-crimson-soft"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth userType="ADMIN">
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  );
}
