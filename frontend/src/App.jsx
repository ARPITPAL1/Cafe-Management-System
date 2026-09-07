import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, canRoleAccessRoute, getRoleHomePath } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';

// Management Pages
import Dashboard from './pages/management/Dashboard';
import TableManagement from './pages/management/TableManagement';
import OrdersManagement from './pages/management/OrdersManagement';
import KitchenDisplay from './pages/management/KitchenDisplay';
import BillingPOS from './pages/management/BillingPOS';
import MenuManagement from './pages/management/MenuManagement';
import ReportsAnalytics from './pages/management/ReportsAnalytics';
import CustomerDirectory from './pages/management/CustomerDirectory';
import CafeSettings from './pages/management/CafeSettings';

// Auth & Setup
import LoginPage from './pages/auth/LoginPage';

// Customer QR Portal
import CustomerPortal from './pages/customer/CustomerPortal';
import AdvanceBookingPage from './pages/customer/AdvanceBookingPage';

function ProtectedManagementLayout() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Check RBAC permission for current route
  if (!canRoleAccessRoute(user.role, location.pathname)) {
    const fallbackPath = getRoleHomePath(user.role);
    return <Navigate to={fallbackPath} replace />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, paddingBottom: 40 }}>
        <Outlet />
      </main>
    </div>
  );
}

function DashboardRoute() {
  const { user } = useAuth();
  if (user?.role === 'CASHIER') return <Navigate to="/admin/billing" replace />;
  if (user?.role === 'KITCHEN') return <Navigate to="/admin/kitchen" replace />;
  return <Dashboard />;
}

function RootRedirect() {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={getRoleHomePath(user.role)} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            {/* Direct entry point: if logged in goes to role home, else login */}
            <Route path="/" element={<RootRedirect />} />

            {/* Role Authentication Portal */}
            <Route path="/login" element={<LoginPage />} />

            {/* Customer QR Route: Table-specific token e.g. /t/8fJ39Kd82L */}
            <Route path="/t/:tableToken" element={<CustomerPortal />} />

            {/* Advance Table Booking Client Webpage */}
            <Route path="/book-table" element={<AdvanceBookingPage />} />
            <Route path="/reservations" element={<AdvanceBookingPage />} />

            {/* Management Portal Routes - Protected with RBAC */}
            <Route path="/admin" element={<ProtectedManagementLayout />}>
              <Route index element={<DashboardRoute />} />
              <Route path="tables" element={<TableManagement />} />
              <Route path="orders" element={<OrdersManagement />} />
              <Route path="kitchen" element={<KitchenDisplay />} />
              <Route path="billing" element={<BillingPOS />} />
              <Route path="menu" element={<MenuManagement />} />
              <Route path="reports" element={<ReportsAnalytics />} />
              <Route path="customers" element={<CustomerDirectory />} />
              <Route path="settings" element={<CafeSettings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
