import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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
import DeveloperPortal from './pages/management/DeveloperPortal';

// Auth & Setup
import LoginPage from './pages/auth/LoginPage';

// Customer QR Portal
import CustomerPortal from './pages/customer/CustomerPortal';
import AdvanceBookingPage from './pages/customer/AdvanceBookingPage';

function ManagementLayout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, paddingBottom: 40 }}>
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            {/* Developer Superadmin Portal (Dynamic Cafe Provisioning) */}
            <Route path="/dev-setup" element={<DeveloperPortal />} />

            {/* Role Authentication & Verification */}
            <Route path="/login" element={<LoginPage />} />

            {/* Customer QR Route: Table-specific token e.g. /t/8fJ39Kd82L */}
            <Route path="/t/:tableToken" element={<CustomerPortal />} />

            {/* Advance Table Booking Client Webpage */}
            <Route path="/book-table" element={<AdvanceBookingPage />} />
            <Route path="/reservations" element={<AdvanceBookingPage />} />

            {/* Management Portal Routes */}
            <Route path="/admin" element={<ManagementLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="tables" element={<TableManagement />} />
              <Route path="orders" element={<OrdersManagement />} />
              <Route path="kitchen" element={<KitchenDisplay />} />
              <Route path="billing" element={<BillingPOS />} />
              <Route path="menu" element={<MenuManagement />} />
              <Route path="reports" element={<ReportsAnalytics />} />
              <Route path="customers" element={<CustomerDirectory />} />
              <Route path="settings" element={<CafeSettings />} />
              <Route path="dev-setup" element={<DeveloperPortal />} />
            </Route>

            {/* Fallback to Management Dashboard */}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

