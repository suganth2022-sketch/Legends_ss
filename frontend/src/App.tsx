import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RequireAuth } from './routes/RequireAuth';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

import { MemberLayout } from './layouts/MemberLayout';
import { DashboardPage } from './pages/member/DashboardPage';
import { PaymentsPage } from './pages/member/PaymentsPage';
import { GenealogyPage } from './pages/member/GenealogyPage';
import { PassbookPage } from './pages/member/PassbookPage';
import { PayoutPage } from './pages/member/PayoutPage';
import { ProfilePage } from './pages/member/ProfilePage';

import { AdminLayout } from './layouts/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminMembersPage } from './pages/admin/AdminMembersPage';
import { AdminMemberDetailPage } from './pages/admin/AdminMemberDetailPage';
import { AdminPayoutQueuePage } from './pages/admin/AdminPayoutQueuePage';
import { AdminPayoutEntryPage } from './pages/admin/AdminPayoutEntryPage';
import { AdminPaymentEntryPage } from './pages/admin/AdminPaymentEntryPage';
import { AdminCommissionRulesPage } from './pages/admin/AdminCommissionRulesPage';
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';

function HomeRedirect() {
  const { isAuthenticated, userType, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={userType === 'ADMIN' ? '/admin/dashboard' : '/member/dashboard'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<RequireAuth userType="MEMBER" />}>
        <Route element={<MemberLayout />}>
          <Route path="/member/dashboard" element={<DashboardPage />} />
          <Route path="/member/payments" element={<PaymentsPage />} />
          <Route path="/member/genealogy" element={<GenealogyPage />} />
          <Route path="/member/passbook" element={<PassbookPage />} />
          <Route path="/member/payouts" element={<PayoutPage />} />
          <Route path="/member/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<RequireAuth userType="ADMIN" />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/members" element={<AdminMembersPage />} />
          <Route path="/admin/members/:id" element={<AdminMemberDetailPage />} />
          <Route path="/admin/payouts" element={<AdminPayoutQueuePage />} />
          <Route path="/admin/payout-entry" element={<AdminPayoutEntryPage />} />
          <Route path="/admin/payment-entry" element={<AdminPaymentEntryPage />} />
          <Route path="/admin/commission-rules" element={<AdminCommissionRulesPage />} />
          <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
