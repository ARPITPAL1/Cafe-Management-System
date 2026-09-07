import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Grid2X2,
  UtensilsCrossed,
  ChefHat,
  Receipt,
  BookOpen,
  Users,
  TrendingUp,
  Settings,
  Bell,
  BellOff,
  QrCode,
  ShieldCheck,
  ChevronDown,
  Code,
  Calendar,
  LogIn,
  ExternalLink,
  Sparkles,
  Layers
} from 'lucide-react';
import ReservationsManagementModal from './ReservationsManagementModal';
import PreBookQRModal from './PreBookQRModal';
import { api } from '../services/api';

export default function Navbar() {
  const { user, cafeInfo, loginAs, waiterCallAlertsEnabled, toggleWaiterCallAlerts } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [reservationsModalOpen, setReservationsModalOpen] = useState(false);
  const [preBookQRModalOpen, setPreBookQRModalOpen] = useState(false);
  const [pendingReservationsCount, setPendingReservationsCount] = useState(0);

  useEffect(() => {
    const checkReservations = () => {
      api.getReservations().then(res => {
        setPendingReservationsCount(res.pending_alerts_count || 0);
      }).catch(() => {});
    };
    checkReservations();
    const interval = setInterval(checkReservations, 15000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/tables', label: 'Tables', icon: Grid2X2, roles: ['OWNER', 'MANAGER', 'CASHIER'] },
    { to: '/admin/orders', label: 'Live Orders', icon: UtensilsCrossed, roles: ['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN'] },
    { to: '/admin/kitchen', label: 'Kitchen', icon: ChefHat, roles: ['OWNER', 'MANAGER', 'KITCHEN'] },
    { to: '/admin/billing', label: 'Billing POS', icon: Receipt, roles: ['OWNER', 'MANAGER', 'CASHIER'] },
    { to: '/admin/menu', label: 'Menu', icon: BookOpen, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/reports', label: 'Sales', icon: TrendingUp, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/customers', label: 'Customers', icon: Users, roles: ['OWNER', 'MANAGER'] },
    { to: '/admin/settings', label: 'Owner & Settings', icon: Settings, roles: ['OWNER', 'MANAGER'] },
  ];

  const filteredLinks = navLinks.filter(l => l.roles.includes(user?.role || 'OWNER'));

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* FIXED TOP NAVIGATION BAR - ALL PAGES VISIBLE, NO SLIDING     */}
      {/* ------------------------------------------------------------- */}
      <header className="glass-nav" style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        borderBottom: '1.5px solid var(--border-medium)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)'
      }}>
        <div style={{
          maxWidth: 1680,
          margin: '0 auto',
          padding: '8px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          {/* Brand Logo & Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              {cafeInfo?.logo_url ? (
                <img
                  src={cafeInfo.logo_url}
                  alt={cafeInfo.name}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    objectFit: 'cover',
                    boxShadow: '0 3px 10px rgba(212,163,115,0.3)',
                    border: '1.5px solid var(--border-medium)'
                  }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #d4a373 0%, #8c5d33 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 3px 10px rgba(212,163,115,0.3)'
                }}>
                  <UtensilsCrossed size={20} color="#0e0a07" strokeWidth={2.5} />
                </div>
              )}
              <div>
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  fontSize: '1.12rem',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  whiteSpace: 'nowrap'
                }}>
                  {cafeInfo?.name || 'The Velvet Bean'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--accent-gold)', fontWeight: 700, letterSpacing: '0.04em' }}>
                  MANAGEMENT
                </div>
              </div>
            </Link>
          </div>

          {/* Fixed Page List: All pages displayed without sliding */}
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexWrap: 'nowrap',
            overflow: 'hidden'
          }}>
            {filteredLinks.map(link => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 11px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'var(--accent-gold-dim)' : 'transparent',
                    border: isActive ? '1px solid var(--border-medium)' : '1px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={15} color={isActive ? 'var(--accent-gold)' : 'var(--text-muted)'} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Top Right User Profile / Role Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Quick Advance Bookings Badge indicator in navbar */}
            {['OWNER', 'MANAGER'].includes(user?.role || 'OWNER') && (
              <button
                onClick={() => setReservationsModalOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.76rem',
                  padding: '5px 10px',
                  position: 'relative'
                }}
                title="Open Advance Reservations Management"
              >
                <Calendar size={13} color="var(--accent-gold)" />
                <span style={{ fontWeight: 700 }}>Bookings</span>
                {pendingReservationsCount > 0 && (
                  <span style={{
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    borderRadius: '50%',
                    width: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {pendingReservationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Role dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)'
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'rgba(212,163,115,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-gold)'
                }}>
                  <ShieldCheck size={14} />
                </div>
                <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    {user?.name || 'Staff'}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {user?.role_display || user?.role}
                  </div>
                </div>
                <ChevronDown size={12} color="var(--text-muted)" />
              </button>

              {roleMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '110%',
                    width: 220,
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '8px',
                    zIndex: 1100
                  }}
                >
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '6px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Switch Role
                  </div>
                  {[
                    { role: 'OWNER', label: 'Owner / Admin' },
                    { role: 'MANAGER', label: 'Manager' },
                    { role: 'CASHIER', label: 'Cashier (Billing)' },
                    { role: 'KITCHEN', label: 'Kitchen Chef' },
                  ].map(item => (
                    <button
                      key={item.role}
                      onClick={() => {
                        loginAs(item.role);
                        setRoleMenuOpen(false);
                        if (item.role === 'KITCHEN') navigate('/admin/kitchen');
                        else if (item.role === 'CASHIER') navigate('/admin/billing');
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '7px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: user?.role === item.role ? 'var(--accent-gold-dim)' : 'transparent',
                        color: user?.role === item.role ? 'var(--accent-gold)' : 'var(--text-primary)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: user?.role === item.role ? 700 : 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 2
                      }}
                    >
                      <span>{item.label}</span>
                      {user?.role === item.role && <span style={{ color: 'var(--accent-gold)' }}>✓</span>}
                    </button>
                  ))}

                  <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 6, paddingTop: 6 }}>
                    <Link
                      to="/login"
                      onClick={() => setRoleMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 8px',
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 600
                      }}
                    >
                      <LogIn size={13} color="var(--accent-gold)" />
                      <span>Login Portal</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* RIGHT SIDE VERTICAL OPTIONS DOCK (PREMIUM FLOATING PANEL)     */}
      {/* ------------------------------------------------------------- */}
      <aside
        aria-label="Manager Quick Actions"
        style={{
          position: 'fixed',
          right: 16,
          top: 74,
          zIndex: 990,
          background: 'rgba(24, 18, 14, 0.94)',
          backdropFilter: 'blur(18px)',
          border: '1.5px solid var(--border-medium)',
          borderRadius: '16px',
          padding: '10px 8px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          width: 58,
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Dock Header Icon */}
        <div
          title="Manager Quick Actions Dock"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--accent-gold-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-gold)',
            marginBottom: 2
          }}
        >
          <Sparkles size={16} />
        </div>

        {/* 1. Waiter Alert ON / OFF Vertical Toggle */}
        {['OWNER', 'MANAGER'].includes(user?.role || 'OWNER') && (
          <button
            onClick={() => toggleWaiterCallAlerts()}
            style={{
              width: 44,
              height: 48,
              borderRadius: 10,
              background: waiterCallAlertsEnabled ? 'rgba(245, 158, 11, 0.18)' : 'rgba(239, 68, 68, 0.2)',
              border: waiterCallAlertsEnabled ? '1.5px solid #f59e0b' : '1.5px solid #ef4444',
              color: waiterCallAlertsEnabled ? '#f59e0b' : '#f87171',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.15s ease'
            }}
            title={waiterCallAlertsEnabled ? "Waiter Call Alerts are ON (Click to turn OFF)" : "Waiter Call Alerts are OFF (Click to turn ON)"}
          >
            {waiterCallAlertsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
            <span style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase' }}>
              {waiterCallAlertsEnabled ? 'ALERTS ON' : 'OFF'}
            </span>
          </button>
        )}

        {/* 2. Advance Bookings Button & Pending Counter */}
        {['OWNER', 'MANAGER'].includes(user?.role || 'OWNER') && (
          <button
            onClick={() => setReservationsModalOpen(true)}
            style={{
              width: 44,
              height: 48,
              borderRadius: 10,
              background: 'rgba(217, 119, 6, 0.14)',
              border: '1.5px solid var(--border-medium)',
              color: 'var(--accent-gold)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              cursor: 'pointer',
              position: 'relative',
              padding: 0,
              transition: 'all 0.15s ease'
            }}
            title="Advance Table Bookings & Alert Controls"
          >
            <Calendar size={16} />
            <span style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase' }}>
              BOOKING
            </span>
            {pendingReservationsCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -4,
                right: -4,
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.62rem',
                fontWeight: 900,
                borderRadius: '50%',
                width: 17,
                height: 17,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.5)'
              }}>
                {pendingReservationsCount}
              </span>
            )}
          </button>
        )}

        {/* 3. Pre-Book Table QR Standee Modal Launcher */}
        <button
          onClick={() => setPreBookQRModalOpen(true)}
          style={{
            width: 44,
            height: 48,
            borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1.5px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.15s ease'
          }}
          title="Generate & Print Pre-Booking QR Standee for Diners"
        >
          <QrCode size={16} color="var(--accent-gold)" />
          <span style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase' }}>
            PRE-QR
          </span>
        </button>

        {/* 4. Client Advance Booking Webpage in new tab */}
        <Link
          to="/book-table"
          target="_blank"
          style={{
            width: 44,
            height: 48,
            borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1.5px solid var(--border-subtle)',
            color: '#d97706',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            textDecoration: 'none',
            transition: 'all 0.15s ease'
          }}
          title="Open Customer Advance Booking Page"
        >
          <ExternalLink size={15} />
          <span style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase' }}>
            PAGE
          </span>
        </Link>
      </aside>

      {/* Advance Reservations Modal */}
      <ReservationsManagementModal
        isOpen={reservationsModalOpen}
        onClose={() => setReservationsModalOpen(false)}
      />

      {/* Pre-Booking QR Standee Modal */}
      <PreBookQRModal
        isOpen={preBookQRModalOpen}
        onClose={() => setPreBookQRModalOpen(false)}
      />
    </>
  );
}
