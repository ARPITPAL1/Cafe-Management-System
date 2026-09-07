import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Clock,
  Receipt,
  QrCode,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShoppingBag
} from 'lucide-react';

export default function TableCard({
  table,
  onOpenQR,
  onOpenSession,
  onCloseSession,
  onAddDish,
  onOpenBilling,
  onViewOrder,
  onDismissWaiter
}) {
  const { waiterCallAlertsEnabled } = useAuth();
  const session = table.active_session;
  const isAvailable = table.status === 'AVAILABLE';
  const isBillRequested = table.status === 'BILL_REQUESTED';
  const isPaid = session?.status === 'PAID';
  const isPreparing = table.status === 'PREPARING';
  const isServed = table.status === 'SERVED';
  const isOccupied = table.status === 'OCCUPIED' || table.status === 'ORDERING';
  const hasDelay = table.has_delayed_order;
  const waiterCalled = waiterCallAlertsEnabled && table.waiter_called;

  // Status mapping
  const statusConfig = {
    AVAILABLE: { label: 'Available', badgeClass: 'badge-available', borderColor: 'var(--status-available)' },
    OCCUPIED: { label: isPaid ? 'Paid (Ready to Close)' : 'Occupied', badgeClass: isPaid ? 'badge-available' : 'badge-occupied', borderColor: isPaid ? 'var(--status-available)' : 'var(--status-occupied)' },
    ORDERING: { label: 'Ordering', badgeClass: 'badge-ordering', borderColor: 'var(--status-ordering)' },
    PREPARING: { label: 'In Kitchen', badgeClass: 'badge-preparing', borderColor: 'var(--status-preparing)' },
    READY: { label: 'Ready', badgeClass: 'badge-ready', borderColor: 'var(--status-ready)' },
    SERVED: { label: 'Served', badgeClass: 'badge-served', borderColor: 'var(--status-served)' },
    BILL_REQUESTED: { label: isPaid ? 'Paid (Ready to Close)' : 'Bill Requested', badgeClass: isPaid ? 'badge-available' : 'badge-bill', borderColor: isPaid ? 'var(--status-available)' : 'var(--status-bill)' },
    CLEANING: { label: 'Cleaning', badgeClass: 'badge-cleaning', borderColor: 'var(--status-cleaning)' },
  }[table.status] || { label: table.status, badgeClass: 'badge-available', borderColor: 'var(--status-available)' };

  // Visual Shape styling
  const shapeStyles = {
    ROUND: {
      borderRadius: '40px',
      shapeTag: 'Round Table'
    },
    SQUARE: {
      borderRadius: 'var(--radius-md)',
      shapeTag: 'Square Table'
    },
    RECTANGLE: {
      borderRadius: 'var(--radius-md)',
      shapeTag: 'Rectangle Table'
    }
  }[table.shape] || { borderRadius: 'var(--radius-md)', shapeTag: 'Table' };

  return (
    <div
      className={`glass-panel ${hasDelay || waiterCalled ? 'card-delayed-pulse' : ''}`}
      style={{
        position: 'relative',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 280,
        border: waiterCalled
          ? '2px solid #f59e0b'
          : hasDelay
          ? '2px solid #ef4444'
          : `1.5px solid ${statusConfig.borderColor}`,
        borderRadius: shapeStyles.borderRadius,
        boxShadow: waiterCalled
          ? '0 0 20px rgba(245, 158, 11, 0.4)'
          : hasDelay
          ? '0 0 20px rgba(239, 68, 68, 0.4)'
          : isBillRequested
          ? '0 0 24px rgba(59, 130, 246, 0.25)'
          : isPreparing
          ? '0 0 20px rgba(139, 92, 246, 0.2)'
          : 'var(--shadow-md)',
        transition: 'all 0.25s ease'
      }}
    >
      {/* Top Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'nowrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em'
            }}>
              {table.number}
            </span>
            <span style={{
              fontSize: '0.72rem',
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-muted)',
              padding: '2px 8px',
              borderRadius: 6,
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <Users size={12} />
              {table.capacity}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {hasDelay && (
              <span className="badge badge-delay-alert" title="Food order waiting > 15 minutes!">
                🚨 &gt;15m
              </span>
            )}
            <span className={`badge ${statusConfig.badgeClass}`}>
              {isBillRequested && !isPaid && <span className="animate-pulse">🔔</span>}
              {statusConfig.label}
            </span>
            <button
              onClick={() => onOpenQR(table)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 6px', borderRadius: 8 }}
              title="View Table QR Code"
            >
              <QrCode size={14} color="var(--accent-gold)" />
            </button>
          </div>
        </div>

        {/* Waiter Call Alert Banner */}
        {waiterCalled && (
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '1.5px solid #f59e0b',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 800, color: '#92400e' }}>
              <span className="animate-pulse" style={{ fontSize: '0.9rem' }}>🔔</span>
              <span>Waiter Requested!</span>
            </div>
            <button
              onClick={() => onDismissWaiter && onDismissWaiter(table)}
              className="btn btn-sm"
              style={{
                background: '#b45309',
                color: '#ffffff',
                border: 'none',
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Floor Section & Shape Info */}
        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          {table.floor_section} • {shapeStyles.shapeTag}
        </div>


        {/* Session Content */}
        {session ? (
          <div style={{
            background: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            border: '1px solid var(--border-subtle)',
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {session.customer_name || 'Walk-in Guest'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <Clock size={12} />
                <span>{session.duration_minutes || 1}m</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Session #{session.session_code}</span>
                <div style={{ fontSize: '0.8rem', color: isPaid ? 'var(--status-available)' : 'var(--accent-gold)', fontWeight: 600 }}>
                  {isPaid ? 'Payment Settled ✓' : `${table.orders_summary?.length || 0} Order(s)`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Running Total</span>
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)'
                }}>
                  ₹{table.current_amount || 0}
                </div>
              </div>
            </div>
          </div>
        ) : !isAvailable ? (
          <div style={{
            padding: '18px 12px',
            textAlign: 'center',
            background: 'rgba(239, 68, 68, 0.05)',
            borderRadius: 'var(--radius-sm)',
            border: '1px dashed rgba(239, 68, 68, 0.3)',
            marginBottom: 16
          }}>
            <AlertCircle size={22} color="#ef4444" style={{ margin: '0 auto 4px' }} />
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Session Closed / Stale Status
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Click Reset below to make Available
            </div>
          </div>
        ) : (
          <div style={{
            padding: '24px 12px',
            textAlign: 'center',
            background: 'rgba(16, 185, 129, 0.04)',
            borderRadius: 'var(--radius-sm)',
            border: '1px dashed rgba(16, 185, 129, 0.25)',
            marginBottom: 16
          }}>
            <CheckCircle2 size={24} color="var(--status-available)" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Table Ready for Guests
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Scan QR to begin or open manual session
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {session ? (
          <>
            {isPaid ? (
              <button
                onClick={() => onCloseSession(table)}
                className="btn btn-primary btn-sm"
                style={{ width: '100%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff' }}
              >
                <CheckCircle2 size={16} />
                <span>Complete & Close Table</span>
              </button>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  onClick={() => onAddDish(table)}
                  className="btn btn-secondary btn-sm"
                  title="Add manual items to this order"
                >
                  <PlusCircle size={14} color="var(--accent-gold)" />
                  <span>+ Add Dish</span>
                </button>

                <button
                  onClick={() => onOpenBilling(table)}
                  className={`btn btn-sm ${isBillRequested ? 'btn-primary' : 'btn-secondary'}`}
                >
                  <Receipt size={14} />
                  <span>{isBillRequested ? 'Process Bill' : 'Bill'}</span>
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              {table.orders_summary?.length > 0 && (
                <button
                  onClick={() => onViewOrder(table)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem' }}
                >
                  <ShoppingBag size={14} />
                  <span>View Dishes</span>
                </button>
              )}
              <button
                onClick={() => onCloseSession(table)}
                className="btn btn-sm"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem'
                }}
                title="End current session and reset table to AVAILABLE"
              >
                Reset
              </button>
            </div>
          </>
        ) : !isAvailable ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
            <button
              onClick={() => onOpenSession(table)}
              className="btn btn-primary btn-sm"
              style={{ width: '100%' }}
            >
              <Users size={14} />
              <span>Open Session</span>
            </button>
            <button
              onClick={() => onCloseSession(table)}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%' }}
            >
              <CheckCircle2 size={14} />
              <span>Reset</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => onOpenSession(table)}
            className="btn btn-primary btn-sm"
            style={{ width: '100%', fontWeight: 700 }}
          >
            <Users size={14} />
            <span>Open Table Session</span>
          </button>
        )}
      </div>
    </div>
  );
}
