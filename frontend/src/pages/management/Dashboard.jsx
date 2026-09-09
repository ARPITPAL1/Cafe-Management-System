import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ChefHat,
  ArrowUpRight,
  Sparkles,
  QrCode,
  Flame,
  Calendar
} from 'lucide-react';
import ReservationsManagementModal from '../../components/ReservationsManagementModal';
import LiveFloorPlanOrders from '../../components/LiveFloorPlanOrders';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reservationsModalOpen, setReservationsModalOpen] = useState(false);
  const [pendingReservationsCount, setPendingReservationsCount] = useState(0);


  const fetchDashboard = async () => {
    try {
      const res = await api.getDashboardAnalytics();
      setData(res);
      api.getReservations().then(r => {
        setPendingReservationsCount(r.pending_alerts_count || 0);
      }).catch(() => {});
    } catch (err) {
      console.error('Error fetching dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 4000); // Poll every 4s for live dashboard
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading live operations dashboard...
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const hourly = data?.hourly_sales || [];
  const topDishes = data?.top_dishes || [];

  // Max sales for bar chart scaling
  const maxSales = Math.max(...hourly.map(h => h.sales), 100);

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '28px 24px' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 28
      }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Operations & Financial Control Center
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Real-time table turnover, kitchen queue, margin analytics & customer volume
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/admin/tables" className="btn btn-secondary">
            Floor Map ({kpis.occupied_tables || 0} Occupied)
          </Link>
          <Link to="/t/8fJ39Kd82L" target="_blank" className="btn btn-primary">
            <QrCode size={16} />
            <span>Test Table 12 QR</span>
          </Link>
        </div>
      </div>

      {/* Kitchen 15-Minute Delay Alert Banner */}
      {kpis.delayed_orders > 0 && (
        <div style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: '2px solid #ef4444',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 4px 16px rgba(239, 68, 68, 0.25)',
          animation: 'pulse-danger 2s infinite'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#991b1b' }}>
                🚨 {kpis.delayed_orders} Food Order(s) Over 15-Minute Preparation SLA!
              </div>
              <div style={{ fontSize: '0.84rem', color: '#b91c1c' }}>
                Customers are waiting. Please expedite cooking and table delivery in the kitchen.
              </div>
            </div>
          </div>
          <Link to="/admin/kitchen" className="btn btn-sm" style={{ background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700 }}>
            Open Kitchen KDS →
          </Link>
        </div>
      )}

      {/* Advance Table Booking Alert Banner */}
      {pendingReservationsCount > 0 && (
        <div style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '2px solid #f59e0b',
          borderRadius: 'var(--radius-md)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Calendar size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#92400e' }}>
                📅 {pendingReservationsCount} New Advance Table Reservation(s) Waiting for Confirmation!
              </div>
              <div style={{ fontSize: '0.84rem', color: '#b45309' }}>
                Online diners have requested advance seats. Click below to review details & confirm.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={async () => {
                await api.dismissAllReservationAlerts();
                setPendingReservationsCount(0);
              }}
              className="btn btn-secondary btn-sm"
              style={{ background: '#ffffff', color: '#b45309', borderColor: '#fcd34d', fontWeight: 700 }}
              title="Dismiss notification alert"
            >
              ✕ Dismiss Alert
            </button>
            <button
              onClick={() => setReservationsModalOpen(true)}
              className="btn btn-sm"
              style={{ background: '#d97706', color: '#fff', border: 'none', fontWeight: 700 }}
            >
              Review Reservations ({pendingReservationsCount})
            </button>
          </div>
        </div>
      )}

      {/* Top 6 KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 28
      }}>
        {/* Today's Sales */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Today's Net Sales
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            ₹{kpis.today_sales?.toLocaleString() || '0'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--status-available)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowUpRight size={14} />
            <span>Active dine-in revenue</span>
          </div>
        </div>

        {/* Orders Volume */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Orders Placed
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-bill)' }}>
              <ShoppingBag size={16} />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {kpis.today_orders || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {kpis.pending_orders || 0} in prep • {kpis.ready_orders || 0} ready
          </div>
        </div>

        {/* Tables Occupancy */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Table Occupancy
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(244,63,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-occupied)' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {kpis.occupied_tables || 0} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {kpis.total_tables || 12}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--status-available)', marginTop: 4 }}>
            {kpis.available_tables || 0} tables free for walk-ins
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Avg Order Value
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(20,184,166,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-ready)' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            ₹{kpis.avg_order_value || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Per guest table ticket
          </div>
        </div>

        {/* Estimated Gross Profit */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Est. Gross Profit
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-available)' }}>
              <Sparkles size={16} />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--status-available)' }}>
            ₹{kpis.gross_profit?.toLocaleString() || '0'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', marginTop: 4 }}>
            {kpis.margin_percentage || 0}% overall gross margin
          </div>
        </div>

        {/* Kitchen Urgency */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Kitchen Status
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-preparing)' }}>
              <ChefHat size={16} />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--status-preparing)' }}>
            {kpis.pending_orders || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Active tickets on chef display
          </div>
        </div>
      </div>

      {/* Live Visual Floor Plan & Recent Orders Section */}
      <LiveFloorPlanOrders />

      {/* Middle Grid: Hourly Sales Chart + Today's Order State Pipeline */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 24,
        marginBottom: 28
      }}>
        {/* Hourly Volume Chart */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Hourly Sales Heatmap</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Revenue velocity across dining service hours</p>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 600 }}>Today</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
            height: 180,
            paddingTop: 20,
            borderBottom: '1px solid var(--border-subtle)'
          }}>
            {hourly.map((h, i) => {
              const heightPct = Math.max(10, Math.round((h.sales / maxSales) * 100));
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div
                    title={`${h.hour}: ₹${h.sales} (${h.orders} orders)`}
                    style={{
                      width: '100%',
                      height: `${heightPct}%`,
                      background: h.sales > 0 ? 'linear-gradient(180deg, var(--accent-gold) 0%, #8c5d33 100%)' : 'var(--bg-surface-elevated)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                    {h.hour.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Lifecycle Pipeline */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: 6 }}>Order Pipeline State</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 20 }}>
            Lifecycle breakdown of dining orders today
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Pending Acceptance / New', count: kpis.pending_orders || 0, color: 'var(--status-ordering)', bg: 'var(--status-ordering-bg)' },
              { label: 'Cooking in Kitchen', count: kpis.pending_orders || 0, color: 'var(--status-preparing)', bg: 'var(--status-preparing-bg)' },
              { label: 'Dishes Prepared & Ready', count: kpis.ready_orders || 0, color: 'var(--status-ready)', bg: 'var(--status-ready-bg)' },
              { label: 'Completed & Settled', count: kpis.completed_orders || 0, color: 'var(--status-available)', bg: 'var(--status-available-bg)' },
              { label: 'Cancelled Items', count: kpis.cancelled_orders || 0, color: 'var(--status-occupied)', bg: 'var(--status-occupied-bg)' },
            ].map((state, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: state.bg,
                  border: `1px solid ${state.color}30`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: state.color }} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {state.label}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 800, color: state.color }}>
                  {state.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Top Selling Dishes + Margin Intelligence Preview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 24
      }}>
        {/* Top Dishes */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Flame size={18} color="var(--accent-gold)" />
              <h3 style={{ fontSize: '1.15rem' }}>Top Popular Dishes Today</h3>
            </div>
            <Link to="/admin/reports" style={{ fontSize: '0.78rem', color: 'var(--accent-gold)', textDecoration: 'none' }}>
              Full Margins &rarr;
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topDishes.length > 0 ? (
              topDishes.map((dish, i) => (
                <div
                  key={dish.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--accent-gold)', fontSize: '1rem', width: 20 }}>
                      #{i + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {dish.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {dish.quantity} sold • Revenue ₹{dish.revenue}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--status-available)' }}>
                      +₹{dish.margin}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gross Profit</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Dishes will appear as guests place orders
              </div>
            )}
          </div>
        </div>

        {/* Operational Quick Guide */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: 12 }}>Dine-In Architecture Workflow</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 18 }}>
            End-to-end flow connects physical tables, guest QR scans, chef prep, and instant settlement:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 24, height: 24, borderRadius: '50%', background: 'var(--accent-gold-dim)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>1</div>
              <div><strong>Guest Scans Standee QR:</strong> Resolves permanent table token e.g. <code style={{ color: 'var(--accent-gold)' }}>/t/8fJ39Kd82L</code></div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 24, height: 24, borderRadius: '50%', background: 'var(--accent-gold-dim)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>2</div>
              <div><strong>Friction-free OTP Verification:</strong> Guest receives 6-digit OTP, creating verified guest record.</div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 24, height: 24, borderRadius: '50%', background: 'var(--accent-gold-dim)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>3</div>
              <div><strong>Unified Kitchen Display (KDS):</strong> Chefs track real-time preparation timers & dish notes.</div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 24, height: 24, borderRadius: '50%', background: 'var(--accent-gold-dim)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>4</div>
              <div><strong>Split Billing & Settlement:</strong> Cashier records multi-tender payments, sends WhatsApp invoice & resets table to AVAILABLE.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Advance Reservations Manager Modal */}
      <ReservationsManagementModal
        isOpen={reservationsModalOpen}
        onClose={() => {
          setReservationsModalOpen(false);
          fetchDashboard();
        }}
      />
    </div>
  );
}
