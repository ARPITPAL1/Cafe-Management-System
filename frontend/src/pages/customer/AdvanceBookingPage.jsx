import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PreBookQRModal from '../../components/PreBookQRModal';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Phone,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  UtensilsCrossed,
  MapPin,
  Check,
  QrCode,
  X,
  Hourglass,
  CalendarDays,
  ShieldCheck,
  Ban
} from 'lucide-react';

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 720;
  const clean = String(timeStr).trim().toUpperCase();
  const match = clean.match(/(\d+)(?::(\d+))?\s*(AM|PM)?/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2] || '0', 10);
    const meridiem = (match[3] || '').toUpperCase();
    if (meridiem === 'PM' && h < 12) h += 12;
    else if (meridiem === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  return 720;
}

function formatMinutesToTime(mins) {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const meridiem = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${m < 10 ? '0' + m : m} ${meridiem}`;
}

export default function AdvanceBookingPage() {
  const { cafeInfo } = useAuth();

  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [tables, setTables] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [cancellingSuccess, setCancellingSuccess] = useState(false);

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [timeSlot, setTimeSlot] = useState('07:30 PM');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [guestCount, setGuestCount] = useState(2);
  const [selectedTable, setSelectedTable] = useState(null);
  const [sectionFilter, setSectionFilter] = useState('ALL');

  // Customer contact info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');

  const timeSlots = [
    '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM',
    '05:00 PM', '06:00 PM', '07:00 PM', '07:30 PM',
    '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM'
  ];

  const durationOptions = [
    { label: '1 Hour', minutes: 60 },
    { label: '1.5 Hours', minutes: 90 },
    { label: '2 Hours (Std)', minutes: 120 },
    { label: '3 Hours', minutes: 180 },
    { label: '4 Hours (Party)', minutes: 240 }
  ];

  const fetchData = async () => {
    try {
      const [resData, tablesData] = await Promise.all([
        api.getReservations().catch(() => ({ advance_booking_enabled: true, reservations: [] })),
        api.getTables().catch(() => [])
      ]);

      setBookingEnabled(resData.advance_booking_enabled !== false);
      setReservations(resData.reservations || []);
      setTables(tablesData || []);

      if (tablesData && tablesData.length > 0) {
        const defaultTable = tablesData.find(t => t.capacity >= 2) || tablesData[0];
        setSelectedTable(defaultTable);
      }
    } catch (err) {
      console.error('Failed to load reservation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter sections
  const sections = ['ALL', ...new Set(tables.map(t => t.floor_section || 'Indoor Main Floor'))];

  const filteredTables = tables.filter(t => {
    if (sectionFilter === 'ALL') return true;
    return (t.floor_section || 'Indoor Main Floor') === sectionFilter;
  });

  // Calculate table booking conflict for the selected date & time window
  const tableConflicts = useMemo(() => {
    const conflicts = {};
    const reqStart = parseTimeToMinutes(timeSlot);
    const reqEnd = reqStart + durationMinutes;

    reservations.forEach(res => {
      if (res.reservation_date === date && ['PENDING', 'CONFIRMED', 'SEATED'].includes(res.status)) {
        const resStart = parseTimeToMinutes(res.reservation_time);
        const resEnd = resStart + (res.duration_minutes || 120);

        // Check if overlaps with requested window
        const isOverlap = Math.max(reqStart, resStart) < Math.min(reqEnd, resEnd);

        if (!conflicts[res.table]) {
          conflicts[res.table] = [];
        }
        conflicts[res.table].push({
          ...res,
          startMins: resStart,
          endMins: resEnd,
          isOverlap,
          formattedSchedule: `${res.reservation_time} - ${formatMinutesToTime(resEnd)}`
        });
      }
    });

    return conflicts;
  }, [reservations, date, timeSlot, durationMinutes]);

  // Check if currently selected table has conflict
  const isSelectedTableBooked = selectedTable && tableConflicts[selectedTable.id]?.some(b => b.isOverlap);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Please enter your full name and mobile phone number.');
      return;
    }

    if (!selectedTable) {
      alert('Please click on an available table from the 2D floor layout to select your seat.');
      return;
    }

    if (isSelectedTableBooked) {
      alert(`Table ${selectedTable.number} is already pre-booked for the chosen time slot. Please pick another table or different time.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        table_id: selectedTable.id,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim(),
        guest_count: guestCount,
        reservation_date: date,
        reservation_time: timeSlot,
        duration_minutes: durationMinutes,
        notes: notes.trim()
      };

      const res = await api.createReservation(payload);
      setBookingSuccess(res);
      fetchData(); // Refresh active reservations

      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    } catch (err) {
      alert('Booking notice: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this advance reservation request?')) {
      return;
    }
    try {
      await api.updateReservation(bookingId, { status: 'CANCELLED', is_alert_dismissed: true });
      setCancellingSuccess(true);
      fetchData();
    } catch (err) {
      alert('Failed to cancel reservation: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '3px solid var(--border-medium)',
          borderTopColor: 'var(--accent-gold)',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: '0.95rem' }}>
          Loading 2D floor map & reservation system...
        </span>
      </div>
    );
  }

  // -------------------------------------------------------------
  // OFFLINE STATE VIEW
  // -------------------------------------------------------------
  if (!bookingEnabled) {
    return (
      <div style={{ maxWidth: 640, margin: '60px auto', padding: '24px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '40px 24px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.1)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <Ban size={32} />
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            Advance Bookings Currently Paused
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.6, maxWidth: 460, margin: '0 auto 24px' }}>
            Our online table reservation service is temporarily offline as set by cafe management.
            Walk-ins are warmly welcome! Please visit or call our cafe reception directly for immediate dine-in availability.
          </p>

          <div style={{
            background: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            border: '1px solid var(--border-subtle)',
            maxWidth: 400,
            margin: '0 auto 24px',
            textAlign: 'left',
            fontSize: '0.86rem'
          }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {cafeInfo?.name || 'The Velvet Bean & Bistro'}
            </div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>
              {cafeInfo?.address || '42 Heritage Boulevard, Mumbai'}
            </div>
            <div style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
              📞 Reception Phone: {cafeInfo?.phone || '+91 98201 23456'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // CONFIRMATION SUCCESS VIEW
  // -------------------------------------------------------------
  if (bookingSuccess) {
    const isCancelledNow = cancellingSuccess || bookingSuccess.status === 'CANCELLED';
    const bookingCode = bookingSuccess.booking_code || `VB-${String(bookingSuccess.id).padStart(4, '0')}`;

    return (
      <div style={{ maxWidth: 620, margin: '40px auto', padding: '24px' }}>
        <div className="glass-panel" style={{ padding: '36px 28px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: isCancelledNow ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            boxShadow: isCancelledNow ? '0 6px 20px rgba(239,68,68,0.35)' : '0 6px 20px rgba(16,185,129,0.35)'
          }}>
            {isCancelledNow ? <X size={38} /> : <CheckCircle2 size={38} />}
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
            {isCancelledNow ? 'Reservation Cancelled' : 'Table Reserved Successfully!'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            {isCancelledNow
              ? `Booking reference has been cancelled.`
              : `Your table reservation has been recorded in the cafe system.`}
          </p>

          {!isCancelledNow && (
            <div style={{
              marginTop: 24,
              background: 'linear-gradient(135deg, rgba(217,119,6,0.12) 0%, rgba(180,83,9,0.06) 100%)',
              border: '2px solid rgba(217,119,6,0.45)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              textAlign: 'center',
              boxShadow: '0 4px 18px rgba(217,119,6,0.12)'
            }}>
              <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#d97706', fontWeight: 800, marginBottom: 6 }}>
                Your Unique Physical Arrival Code
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '2.3rem',
                fontWeight: 900,
                color: '#b45309',
                letterSpacing: '0.18em',
                margin: '6px 0 10px',
                userSelect: 'all'
              }}>
                {bookingCode}
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                ✨ <strong>Show this code to our restaurant staff when you arrive physically.</strong> Our team will verify your booking, escort your party to Table {bookingSuccess.table_number || selectedTable?.number}, and activate your dining session for the reserved duration.
              </p>
            </div>
          )}

          {/* Detailed Guest & Booking Information */}
          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: '1.5px solid var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            padding: '22px',
            marginTop: 20,
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
              Reservation & Guest Details
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Reserved Table</span>
              <strong style={{ color: 'var(--accent-gold)', fontSize: '1rem' }}>
                Table {bookingSuccess.table_number || selectedTable?.number} ({selectedTable?.floor_section || bookingSuccess.floor_section || 'Indoor Main Floor'})
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Date & Time</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                {bookingSuccess.reservation_date} at {bookingSuccess.reservation_time}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Booked Duration</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                {bookingSuccess.duration_minutes || durationMinutes} Minutes ({Math.round((bookingSuccess.duration_minutes || durationMinutes) / 60 * 10) / 10} Hours)
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Booked By (Client)</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                {bookingSuccess.customer_name}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Contact Mobile</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                {bookingSuccess.customer_phone}
              </strong>
            </div>

            {bookingSuccess.customer_email && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Email</span>
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                  {bookingSuccess.customer_email}
                </strong>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Party Size</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                {bookingSuccess.guest_count} Guests
              </strong>
            </div>

            {bookingSuccess.notes && (
              <div style={{ fontSize: '0.84rem', color: '#92400e', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', padding: '10px 14px', borderRadius: 6 }}>
                <strong>Guest Note:</strong> "{bookingSuccess.notes}"
              </div>
            )}
          </div>

          {!isCancelledNow && (
            <div style={{
              background: 'rgba(59,130,246,0.06)',
              border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              marginTop: 16,
              textAlign: 'left',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: '1rem' }}>📱</span>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>3-Hour Pre-Booking Reminder:</strong> An automated reminder alert message will be sent to your mobile phone (<strong>{bookingSuccess.customer_phone}</strong>) 3 hours before your scheduled reservation.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: '1rem' }}>🔒</span>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>15-Minute Priority Table Lock:</strong> Starting 15 minutes prior to your reservation, Table {bookingSuccess.table_number || selectedTable?.number} will be locked against walk-in QR scans to ensure your table is freshly cleaned and ready.
                </div>
              </div>
            </div>
          )}

          {/* Action buttons including Cancel Option */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
            {!isCancelledNow && (
              <button
                onClick={() => handleCancelBooking(bookingSuccess.id)}
                className="btn btn-secondary btn-sm"
                style={{
                  color: '#dc2626',
                  borderColor: '#fca5a5',
                  padding: '10px 16px',
                  fontWeight: 700
                }}
              >
                ✕ Cancel This Reservation Request
              </button>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setBookingSuccess(null); setCancellingSuccess(false); }}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Book Another Table
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE BOOKING PAGE WITH 2D TABLE SEAT SELECTOR
  // -------------------------------------------------------------
  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* Top Banner Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 28,
        paddingBottom: 18,
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 6px 20px rgba(217,119,6,0.35)'
          }}>
            <Calendar size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                Advance Table Reservation
              </h1>
              <span style={{
                background: 'rgba(217,119,6,0.12)',
                color: '#d97706',
                border: '1px solid rgba(217,119,6,0.3)',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                Interactive 2D Map
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: '4px 0 0 0' }}>
              Choose your date, duration & select your table directly on the 2D floor plan
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <form onSubmit={handleSubmit} style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.45fr) minmax(340px, 0.9fr)',
        gap: 24,
        alignItems: 'start'
      }}>
        {/* Left Column: Booking Options & 2D Floor Plan */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Step 1: Date, Duration, Time Slot & Guests */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="var(--accent-gold)" />
              <span>1. Choose Date, Duration & Time Slot</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              {/* Date Picker */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600 }}>
                  Booking Date
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Guest Count */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600 }}>
                  Party Size
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={guestCount}
                    onChange={e => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-surface-elevated)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Guests</span>
                </div>
              </div>

              {/* Booking Duration */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600 }}>
                  Duration (Hours)
                </label>
                <select
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(parseInt(e.target.value, 10))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                >
                  {durationOptions.map(opt => (
                    <option key={opt.minutes} value={opt.minutes}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Time Slot Chips */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Select Arrival Time Slot
                </label>
                <span style={{ fontSize: '0.74rem', color: 'var(--accent-gold)' }}>
                  Reservation Window: {timeSlot} – {formatMinutesToTime(parseTimeToMinutes(timeSlot) + durationMinutes)}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 6 }}>
                {timeSlots.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTimeSlot(slot)}
                    style={{
                      padding: '7px 6px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: timeSlot === slot ? '1.5px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                      background: timeSlot === slot ? 'var(--accent-gold)' : 'var(--bg-surface-elevated)',
                      color: timeSlot === slot ? '#0e0a07' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 2: Interactive 2D Floor Layout */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
              flexWrap: 'wrap',
              gap: 10
            }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                  <Sparkles size={18} color="var(--accent-gold)" />
                  <span>2. Select Table on 2D Floor Plan</span>
                </h3>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Pre-booked tables for {date} during {timeSlot} ({durationMinutes}m) are locked
                </p>
              </div>

              {/* Section selector */}
              <div style={{ display: 'flex', gap: 4 }}>
                {sections.map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSectionFilter(sec)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      borderRadius: 6,
                      border: sectionFilter === sec ? '1.5px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                      background: sectionFilter === sec ? 'var(--accent-gold-dim)' : 'transparent',
                      color: sectionFilter === sec ? 'var(--accent-gold)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontWeight: 700
                    }}
                  >
                    {sec === 'ALL' ? 'All Areas' : sec.replace('Indoor ', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Map Legend */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: '0.74rem',
              color: 'var(--text-muted)',
              marginBottom: 14,
              padding: '6px 12px',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 6,
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                <span>Available</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
                <span>Selected</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                <span>Pre-Booked (Locked)</span>
              </div>
            </div>

            {/* 2D Floor Layout Grid */}
            <div style={{
              background: '#f8fafc',
              border: '2px dashed #cbd5e1',
              borderRadius: 'var(--radius-md)',
              padding: '22px 16px',
              minHeight: 340,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: 16,
              alignItems: 'center'
            }}>
              {filteredTables.map(t => {
                const isSelected = selectedTable?.id === t.id;
                const isRound = t.shape === 'ROUND';
                const isRect = t.shape === 'RECTANGLE';
                const capacityFits = t.capacity >= guestCount;

                // Check conflicts for this table
                const tableBookings = tableConflicts[t.id] || [];
                const overlappingBooking = tableBookings.find(b => b.isOverlap);
                const isPreBooked = !!overlappingBooking;

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (!isPreBooked) {
                        setSelectedTable(t);
                      }
                    }}
                    style={{
                      cursor: isPreBooked ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      padding: '12px 8px',
                      borderRadius: isRound ? '32px' : '12px',
                      background: isPreBooked
                        ? '#fef2f2'
                        : isSelected
                        ? '#fffbeb'
                        : '#ffffff',
                      border: isPreBooked
                        ? '2px solid #ef4444'
                        : isSelected
                        ? '2.5px solid #d97706'
                        : capacityFits
                        ? '1.5px solid #cbd5e1'
                        : '1.5px dashed #e2e8f0',
                      boxShadow: isSelected
                        ? '0 0 16px rgba(217,119,6,0.35)'
                        : isPreBooked
                        ? 'none'
                        : '0 2px 6px rgba(0,0,0,0.04)',
                      opacity: isPreBooked ? 0.78 : 1,
                      transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    title={
                      isPreBooked
                        ? `${t.number} is Pre-Booked from ${overlappingBooking.reservation_time} (${overlappingBooking.duration_minutes || 120} mins). Click blocked.`
                        : `Click to select ${t.number} (${t.capacity} seats)`
                    }
                  >
                    {/* Visual 2D Table Graphic with Chairs */}
                    <div style={{
                      position: 'relative',
                      width: isRect ? 80 : 54,
                      height: 54,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {/* Top chair */}
                      <div style={{
                        position: 'absolute',
                        top: -4,
                        width: 20,
                        height: 6,
                        borderRadius: 3,
                        background: isPreBooked ? '#ef4444' : isSelected ? '#d97706' : '#94a3b8'
                      }} />

                      {/* Bottom chair */}
                      <div style={{
                        position: 'absolute',
                        bottom: -4,
                        width: 20,
                        height: 6,
                        borderRadius: 3,
                        background: isPreBooked ? '#ef4444' : isSelected ? '#d97706' : '#94a3b8'
                      }} />

                      {/* Side chairs */}
                      {!isRound && (
                        <>
                          <div style={{
                            position: 'absolute',
                            left: -4,
                            width: 6,
                            height: 20,
                            borderRadius: 3,
                            background: isPreBooked ? '#ef4444' : isSelected ? '#d97706' : '#94a3b8'
                          }} />
                          <div style={{
                            position: 'absolute',
                            right: -4,
                            width: 6,
                            height: 20,
                            borderRadius: 3,
                            background: isPreBooked ? '#ef4444' : isSelected ? '#d97706' : '#94a3b8'
                          }} />
                        </>
                      )}

                      {/* Table Surface */}
                      <div style={{
                        width: isRect ? 70 : 44,
                        height: 44,
                        borderRadius: isRound ? '50%' : '8px',
                        background: isPreBooked
                          ? 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)'
                          : isSelected
                          ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                          : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isPreBooked || isSelected ? '#ffffff' : '#334155',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6)'
                      }}>
                        <UtensilsCrossed size={12} style={{ marginBottom: 1, opacity: 0.9 }} />
                        <span>{t.number.replace('Table ', 'T-')}</span>
                      </div>
                    </div>

                    {/* Table Info Badge */}
                    <div style={{ textAlign: 'center', width: '100%' }}>
                      <div style={{
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: isPreBooked ? '#b91c1c' : isSelected ? '#b45309' : '#1e293b'
                      }}>
                        {t.number}
                      </div>

                      {isPreBooked ? (
                        <div style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          color: '#dc2626',
                          background: '#fee2e2',
                          padding: '2px 4px',
                          borderRadius: 4,
                          marginTop: 2,
                          lineHeight: 1.2
                        }}>
                          ⛔ {overlappingBooking.formattedSchedule}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          {t.capacity} Seats • {t.shape.charAt(0) + t.shape.slice(1).toLowerCase()}
                        </div>
                      )}
                    </div>

                    {isSelected && !isPreBooked && (
                      <div style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        background: '#d97706',
                        color: '#fff',
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem'
                      }}>
                        ✓
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Table or Pre-booked conflict warning */}
            {selectedTable && (
              <div style={{
                marginTop: 14,
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: isSelectedTableBooked ? '#fee2e2' : 'var(--accent-gold-dim)',
                border: isSelectedTableBooked ? '1.5px solid #ef4444' : '1px solid var(--border-medium)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                fontSize: '0.82rem'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Selected Seat: </span>
                  <strong style={{ color: isSelectedTableBooked ? '#dc2626' : 'var(--accent-gold)' }}>
                    {selectedTable.number}
                  </strong>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {' '}• {selectedTable.capacity} Seats ({selectedTable.floor_section || 'Indoor'})
                  </span>
                </div>

                {isSelectedTableBooked ? (
                  <span style={{ color: '#dc2626', fontWeight: 700 }}>
                    ⛔ Already Pre-Booked for this time slot! Please choose another table.
                  </span>
                ) : (
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>
                    ✓ Available for {date} ({timeSlot}, {durationMinutes}m)
                  </span>
                )}
              </div>
            )}

            {/* All Pre-Booked Schedule for Selected Date */}
            <div style={{
              marginTop: 16,
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                <CalendarDays size={14} color="var(--accent-gold)" />
                <span>Pre-Booked Schedule for {date}</span>
              </div>

              {Object.keys(tableConflicts).length === 0 ? (
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  ✨ All tables are currently free and available for advance booking on {date}!
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(tableConflicts).map(([tblId, list]) => {
                    const tbl = tables.find(t => String(t.id) === String(tblId));
                    return list.map(b => (
                      <span
                        key={b.id}
                        style={{
                          fontSize: '0.72rem',
                          background: '#fee2e2',
                          color: '#991b1b',
                          border: '1px solid #fecaca',
                          borderRadius: 4,
                          padding: '2px 8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <strong>{tbl ? tbl.number : `Table ${tblId}`}</strong>: {b.reservation_time} ({b.duration_minutes || 120}m)
                      </span>
                    ));
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Reservation Details & Contact Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-panel" style={{ padding: '24px', position: 'sticky', top: 90 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} color="var(--accent-gold)" />
              <span>3. Guest Details & Notes</span>
            </h3>

            {/* Selected Booking Summary Preview Box */}
            <div style={{
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              border: '1px solid var(--border-subtle)',
              marginBottom: 18,
              fontSize: '0.82rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Table:</span>
                <strong style={{ color: 'var(--accent-gold)' }}>
                  {selectedTable ? `${selectedTable.number} (${selectedTable.capacity} Seats)` : 'None Selected'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Date & Time:</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {date} at {timeSlot}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Duration:</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {durationMinutes} mins ({Math.round(durationMinutes / 60 * 10) / 10} hrs)
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Party Size:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{guestCount} Guests</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '0.86rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>
                  Mobile Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '0.86rem',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                  Used for booking confirmation and arrival check-in
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '0.86rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Note Section */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>
                  Special Note / Requests for Manager
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Birthday candles, quiet window corner, baby chair requested..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '0.84rem',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Submit Reservation Button */}
            <button
              type="submit"
              disabled={submitting || !selectedTable || isSelectedTableBooked}
              className="btn btn-primary"
              style={{
                width: '100%',
                marginTop: 20,
                padding: '13px',
                fontSize: '0.98rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(217,119,6,0.35)',
                opacity: isSelectedTableBooked ? 0.6 : 1,
                cursor: isSelectedTableBooked ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? (
                <span>Confirming Table...</span>
              ) : isSelectedTableBooked ? (
                <span>Table Pre-Booked (Choose Another)</span>
              ) : (
                <>
                  <span>Pre-Book {selectedTable ? selectedTable.number : 'Table'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginTop: 12,
              fontSize: '0.72rem',
              color: 'var(--text-muted)'
            }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Instant Confirmation • Cancel Anytime Online</span>
            </div>
          </div>
        </div>
      </form>

      {/* Pre-Booking QR Standee Modal */}
      <PreBookQRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
      />
    </div>
  );
}
