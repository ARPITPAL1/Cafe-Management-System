import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  MessageSquare,
  Power,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  BellOff
} from 'lucide-react';

export default function ReservationsManagementModal({ isOpen, onClose }) {
  const { cafeInfo, refreshCafeProfile, toggleAdvanceBooking } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [checkInCode, setCheckInCode] = useState('');
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState(null);

  const fetchReservations = async () => {
    try {
      const res = await api.getReservations();
      setReservations(res.reservations || []);
    } catch (err) {
      console.error('Failed to load reservations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReservations();
      setCheckInMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckIn = async (codeToUse) => {
    const code = (codeToUse || checkInCode).trim().toUpperCase();
    if (!code) {
      alert('Please enter a valid guest booking code (e.g. VB-XXXX).');
      return;
    }
    setCheckInLoading(true);
    setCheckInMessage(null);
    try {
      const res = await api.checkInReservation({ booking_code: code });
      setCheckInMessage({
        type: 'success',
        text: `✓ Check-In Verified! Escorting ${res.reservation?.customer_name} to Table ${res.table?.number}. Dining session activated!`
      });
      setCheckInCode('');
      fetchReservations();
    } catch (err) {
      setCheckInMessage({
        type: 'error',
        text: `✕ Check-In failed: ${err.message}`
      });
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    setActionLoading(true);
    try {
      await api.updateReservation(id, { status, is_alert_dismissed: true });
      fetchReservations();
    } catch (err) {
      alert('Failed to update reservation: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismissAlert = async (id) => {
    try {
      await api.updateReservation(id, { is_alert_dismissed: true });
      fetchReservations();
    } catch (err) {
      alert('Failed to dismiss alert: ' + err.message);
    }
  };

  const handleDismissAllAlerts = async () => {
    try {
      await api.dismissAllReservationAlerts();
      fetchReservations();
    } catch (err) {
      alert('Failed to dismiss alerts: ' + err.message);
    }
  };

  const handleToggleOnlineOffline = async () => {
    try {
      const res = await toggleAdvanceBooking();
      alert(res.message);
    } catch (err) {
      alert('Error updating booking status: ' + err.message);
    }
  };

  const isOnline = cafeInfo?.advance_booking_enabled !== false;

  const filteredReservations = reservations.filter(r => {
    const matchesFilter = filter === 'ALL' || r.status === filter;
    const matchesSearch = search === '' ||
      r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      r.customer_phone.includes(search) ||
      (r.table_number && r.table_number.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const pendingCount = reservations.filter(r => r.status === 'PENDING').length;
  const confirmedCount = reservations.filter(r => r.status === 'CONFIRMED').length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 960,
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          background: 'var(--bg-surface-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(217,119,6,0.25)'
            }}>
              <Calendar size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Advance Table Reservations & Alerts
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Manager floor control • Confirm advance seats, manage guest arrivals & booking toggle
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Online / Offline Switch for Owner & Manager */}
            <button
              onClick={handleToggleOnlineOffline}
              className="btn btn-sm"
              style={{
                background: isOnline ? '#ecfdf5' : '#fef2f2',
                border: isOnline ? '1.5px solid #10b981' : '1.5px solid #ef4444',
                color: isOnline ? '#065f46' : '#991b1b',
                fontWeight: 700,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
              title={isOnline ? "Click to take Advance Booking OFFLINE" : "Click to put Advance Booking ONLINE"}
            >
              <Power size={14} color={isOnline ? '#059669' : '#dc2626'} />
              <span>Advance Booking: <strong>{isOnline ? 'ONLINE' : 'OFFLINE'}</strong></span>
            </button>

            <button
              onClick={handleDismissAllAlerts}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '0.78rem',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
              title="Dismiss all active notification alerts"
            >
              <BellOff size={14} />
              <span>Dismiss All Alerts</span>
            </button>

            <button onClick={fetchReservations} className="btn btn-secondary btn-sm" title="Refresh">
              <RefreshCw size={14} />
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 4
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Physical Guest Arrival Check-In Bar */}
        <div style={{
          padding: '12px 24px',
          background: 'linear-gradient(135deg, rgba(217,119,6,0.08) 0%, rgba(245,158,11,0.04) 100%)',
          borderBottom: '1px solid rgba(217,119,6,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.2rem' }}>🎟️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#92400e' }}>
                Physical Guest Arrival Check-In
              </div>
              <div style={{ fontSize: '0.75rem', color: '#b45309' }}>
                Enter the unique code provided by the customer to guide them and start their booked table session.
              </div>
            </div>
          </div>

          <form
            onSubmit={e => { e.preventDefault(); handleCheckIn(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 300px', maxWidth: 460 }}
          >
            <input
              type="text"
              placeholder="Enter Booking Code (e.g. VB-XXXX)..."
              value={checkInCode}
              onChange={e => setCheckInCode(e.target.value.toUpperCase())}
              style={{
                flex: 1,
                fontFamily: 'monospace',
                fontSize: '0.92rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                padding: '7px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid rgba(217,119,6,0.4)',
                background: '#fff',
                color: '#92400e',
                textTransform: 'uppercase'
              }}
            />
            <button
              type="submit"
              disabled={checkInLoading || !checkInCode.trim()}
              className="btn btn-sm"
              style={{
                background: '#d97706',
                color: '#fff',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.8rem',
                padding: '8px 14px',
                whiteSpace: 'nowrap'
              }}
            >
              {checkInLoading ? 'Verifying...' : '⚡ Guide to Table & Start'}
            </button>
          </form>
        </div>

        {/* Check-in Message Feedback Banner */}
        {checkInMessage && (
          <div style={{
            padding: '10px 24px',
            fontSize: '0.84rem',
            fontWeight: 700,
            background: checkInMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: checkInMessage.type === 'success' ? '#065f46' : '#991b1b',
            borderBottom: checkInMessage.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{checkInMessage.text}</span>
            <button
              onClick={() => setCheckInMessage(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 800 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div style={{
          padding: '14px 24px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { key: 'ALL', label: `All Bookings (${reservations.length})` },
              { key: 'PENDING', label: `Pending Alert (${pendingCount})`, isAlert: pendingCount > 0 },
              { key: 'CONFIRMED', label: `Confirmed (${confirmedCount})` },
              { key: 'SEATED', label: 'Seated' },
              { key: 'CANCELLED', label: 'Cancelled' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: filter === tab.key ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                  background: filter === tab.key
                    ? tab.isAlert ? '#fee2e2' : 'var(--accent-gold-dim)'
                    : tab.isAlert ? '#fff1f2' : 'var(--bg-surface-elevated)',
                  color: tab.isAlert
                    ? '#dc2626'
                    : filter === tab.key ? 'var(--accent-gold)' : 'var(--text-secondary)'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div style={{ position: 'relative', minWidth: 220 }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search guest or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 32px',
                fontSize: '0.82rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
        </div>

        {/* Reservations List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              Loading advance table reservations...
            </div>
          ) : filteredReservations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredReservations.map(res => {
                const isPending = res.status === 'PENDING';
                const isConfirmed = res.status === 'CONFIRMED';
                const isSeated = res.status === 'SEATED';
                const isCancelled = res.status === 'CANCELLED';

                return (
                  <div
                    key={res.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: isPending ? '2px solid #f59e0b' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 16,
                      boxShadow: isPending ? '0 2px 10px rgba(245,158,11,0.2)' : 'none'
                    }}
                  >
                    {/* Guest info & Table details */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: isPending ? 'rgba(245,158,11,0.15)' : 'rgba(212,163,115,0.12)',
                        border: isPending ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>SEAT</span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                          {res.table_number ? res.table_number.replace('Table ', 'T') : 'Any'}
                        </span>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                            {res.customer_name}
                          </span>
                          <span className={`badge ${
                            isPending ? 'badge-ordering' : isConfirmed ? 'badge-available' : isSeated ? 'badge-ready' : 'badge-occupied'
                          }`}>
                            {res.status}
                          </span>
                          {res.booking_code && (
                            <span style={{
                              fontFamily: 'monospace',
                              fontWeight: 900,
                              background: 'rgba(217,119,6,0.12)',
                              color: '#b45309',
                              border: '1.5px solid rgba(217,119,6,0.3)',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: '0.82rem',
                              letterSpacing: '0.05em'
                            }}>
                              CODE: {res.booking_code}
                            </span>
                          )}
                          {res.table_number && (
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', background: 'var(--bg-surface-elevated)', padding: '2px 6px', borderRadius: 4 }}>
                              {res.table_number} ({res.floor_section || 'Indoor'})
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6, fontSize: '0.78rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={13} color="var(--accent-gold)" />
                            <strong>{res.reservation_date}</strong>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={13} color="var(--accent-gold)" />
                            <strong>{res.reservation_time}</strong>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Users size={13} />
                            {res.guest_count} Guests
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>⏱️</span>
                            {res.duration_minutes || 120} Mins
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={13} />
                            {res.customer_phone}
                          </span>
                        </div>

                        {res.notes && (
                          <div style={{
                            marginTop: 8,
                            fontSize: '0.78rem',
                            color: '#92400e',
                            background: '#fef3c7',
                            padding: '4px 8px',
                            borderRadius: 4,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                          }}>
                            <MessageSquare size={12} />
                            <span>Note: "{res.notes}"</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {!res.is_alert_dismissed && (
                        <button
                          onClick={() => handleDismissAlert(res.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', color: '#b45309', borderColor: '#fed7aa' }}
                          title="Dismiss notification alert badge for this booking"
                        >
                          Dismiss Alert
                        </button>
                      )}

                      {!isSeated && !isCancelled && res.booking_code && (
                        <button
                          disabled={actionLoading || checkInLoading}
                          onClick={() => handleCheckIn(res.booking_code)}
                          className="btn btn-sm"
                          style={{
                            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                            color: '#fff',
                            fontSize: '0.78rem',
                            padding: '6px 12px',
                            fontWeight: 800,
                            border: 'none',
                            boxShadow: '0 2px 8px rgba(217,119,6,0.3)'
                          }}
                          title="Guest has arrived physically! Verify & guide to table."
                        >
                          ⚡ Guest Arrived (Start)
                        </button>
                      )}

                      {isPending && (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(res.id, 'CONFIRMED')}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                        >
                          <Check size={14} />
                          <span>Confirm Booking</span>
                        </button>
                      )}

                      {isConfirmed && (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(res.id, 'SEATED')}
                          className="btn btn-sm"
                          style={{ background: '#10b981', color: '#fff', fontSize: '0.78rem', padding: '6px 12px', fontWeight: 700 }}
                        >
                          <CheckCircle size={14} />
                          <span>Mark Seated</span>
                        </button>
                      )}

                      {!isCancelled && !isSeated && (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(res.id, 'CANCELLED')}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.76rem', color: '#dc2626', borderColor: '#fca5a5' }}
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 0',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-subtle)'
            }}>
              <Calendar size={40} color="var(--accent-gold)" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>No Reservations Found</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Advance bookings made by customers on the website will appear here in real-time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
