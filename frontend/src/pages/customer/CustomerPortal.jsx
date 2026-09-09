import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import DishDetailModal from '../../components/DishDetailModal';
import CustomerCartDrawer from '../../components/CustomerCartDrawer';
import CustomerOTPModal from '../../components/CustomerOTPModal';
import CustomerFeedbackModal from '../../components/CustomerFeedbackModal';
import {
  UtensilsCrossed,
  ShoppingBag,
  Search,
  CheckCircle2,
  Clock,
  Bell,
  Star,
  Receipt,
  Plus,
  ArrowRight,
  Sparkles,
  PhoneCall
} from 'lucide-react';

export default function CustomerPortal() {
  const { tableToken } = useParams();
  const { cartItems, cartCount, cartSubtotal, clearCart, customer } = useCart();
  const { cafeInfo } = useAuth();

  const [tableData, setTableData] = useState(null);
  const [activeSession, setActiveSession] = useState(null);  // track active_session separately
  const [catalog, setCatalog] = useState({ categories: [], global_addons: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [search, setSearch] = useState('');
  const [dietFilter, setDietFilter] = useState('ALL'); // 'ALL', 'VEG', 'NON_VEG'

  // Modals
  const [selectedDish, setSelectedDish] = useState(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  // Active Order tracking
  const [activeOrder, setActiveOrder] = useState(null);
  const [billRequested, setBillRequested] = useState(false);
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [prebookingLock, setPrebookingLock] = useState(null);

  const fetchTableAndMenu = async () => {
    try {
      const tRes = await api.getTableByToken(tableToken);
      const tbl = tRes.table || tRes;
      setTableData(tbl);
      if (tRes.active_session) {
        setActiveSession(tRes.active_session);
        setPrebookingLock(null);
        // Automatically restore verifiedGuest if active session has customer info
        if (tRes.active_session.customer_name) {
          setVerifiedGuest(prev => prev || {
            id: tRes.active_session.customer,
            name: tRes.active_session.customer_name,
            phone: tRes.active_session.customer_phone
          });
        }
      } else if (tRes.is_locked_for_prebooking) {
        setPrebookingLock(tRes.prebooking_locked_info || true);
      } else {
        setPrebookingLock(null);
      }

      const mRes = await api.getMenuCatalog(true);
      setCatalog(mRes);

      // Check if current table has an active order
      if (tRes.active_session) {
        const orders = await api.getOrders(`session_id=${tRes.active_session.id}&active_only=true`);
        if (orders.length > 0) {
          setActiveOrder(orders[0]);
          if (tRes.table?.status === 'BILL_REQUESTED' || tRes.active_session?.status === 'BILL_REQUESTED') {
            setBillRequested(true);
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Invalid or inactive table QR link');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableAndMenu();
    // Poll order & table status every 5s for live updates
    const interval = setInterval(fetchTableAndMenu, 5000);
    return () => clearInterval(interval);
  }, [tableToken]);

  // Final bill is only considered terminated when the bill has actually been settled or session closed
  const isSessionTerminated = Boolean(
    activeSession?.status === 'CLOSED' ||
    activeSession?.status === 'PAID' ||
    (activeSession?.is_bill_issued && (activeSession?.status === 'PAID' || activeSession?.status === 'CLOSED'))
  );

  // Session-based Customer Auto-Auth (OTP bypass during active dining session)
  const [verifiedGuest, setVerifiedGuest] = useState(() => {
    try {
      const saved = localStorage.getItem(`cafe_guest_${tableToken}`);
      if (saved) return JSON.parse(saved);
      const cust = localStorage.getItem('cafe_customer');
      if (cust) return JSON.parse(cust);
    } catch (e) {
      return null;
    }
    return null;
  });

  // Automatically terminate client session credentials ONLY when final bill is settled or session is closed
  useEffect(() => {
    if (isSessionTerminated) {
      try {
        localStorage.removeItem(`cafe_guest_${tableToken}`);
      } catch (e) {}
      setVerifiedGuest(null);
    }
  }, [isSessionTerminated, tableToken]);

  // Constant Table Essentials state
  const [needWater, setNeedWater] = useState(false);
  const [waterType, setWaterType] = useState('CHILLED'); // CHILLED | NORMAL
  const [needSalt, setNeedSalt] = useState(false);
  const [needTissue, setNeedTissue] = useState(false);
  const [essentialsSubmitting, setEssentialsSubmitting] = useState(false);
  const [essentialsSuccessMsg, setEssentialsSuccessMsg] = useState('');

  const handleProceedToCheckout = () => {
    setCartDrawerOpen(false);
    if (isSessionTerminated) {
      alert('The final bill has already been settled for this table. The dining session has concluded. Please rescan the table QR code to begin a new session.');
      return;
    }
    // If guest is already known (in verifiedGuest, CartContext customer, or active session), skip OTP directly!
    const effectiveGuest = verifiedGuest || customer || (activeSession?.customer_name ? {
      id: activeSession.customer,
      name: activeSession.customer_name,
      phone: activeSession.customer_phone
    } : null);

    if (effectiveGuest && !isSessionTerminated) {
      handleVerifiedAndPlaceOrder(effectiveGuest);
    } else {
      setOtpModalOpen(true);
    }
  };

  const handleVerifiedAndPlaceOrder = async (cust) => {
    setOtpModalOpen(false);
    setVerifiedGuest(cust);
    try {
      localStorage.setItem(`cafe_guest_${tableToken}`, JSON.stringify(cust));
      localStorage.setItem('cafe_customer', JSON.stringify(cust));
    } catch (e) {}

    try {
      const orderPayload = {
        table_token: tableToken,
        customer_id: cust.id,
        session_id: activeSession?.id,
        order_source: 'QR',
        items: cartItems.map(ci => ({
          menu_item_id: ci.item.id,
          variant_name: ci.variant?.name || '',
          quantity: ci.quantity,
          unit_price: ci.unitPrice,
          addons: ci.addons,
          special_instructions: ci.notes
        })),
        notes: `Ordered by ${cust.name || 'Guest'}`
      };

      const res = await api.createOrder(orderPayload);
      clearCart();
      setActiveOrder(res);
      setBillRequested(false); // Reset bill requested state since guest ordered more items

      // Celebratory Confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      fetchTableAndMenu();
    } catch (err) {
      alert('Error placing order: ' + err.message);
    }
  };

  const handleSwitchGuest = () => {
    localStorage.removeItem(`cafe_guest_${tableToken}`);
    localStorage.removeItem('cafe_customer');
    setVerifiedGuest(null);
    setCartDrawerOpen(false);
    setOtpModalOpen(true);
  };

  const handleRequestEssentials = async () => {
    if (isSessionTerminated) {
      alert('The final bill has been issued on your name for this session. Your dining session has concluded. To request items, please rescan the table QR code and start a new session.');
      return;
    }

    const items = [];
    if (needWater) {
      items.push(`Water Bottle (${waterType === 'CHILLED' ? 'Chilled ❄️' : 'Normal 🌡️'})`);
    }
    if (needSalt) {
      items.push('Salt & Pepper 🧂');
    }
    if (needTissue) {
      items.push('Paper Tissues / Napkins 🧻');
    }

    if (items.length === 0) {
      alert('Please select at least one item (Water, Salt, or Tissue) to request.');
      return;
    }

    setEssentialsSubmitting(true);
    try {
      const res = await api.requestEssentials(tableToken, items, verifiedGuest?.name || 'Guest');
      setEssentialsSuccessMsg(res.message);
      setNeedWater(false);
      setNeedSalt(false);
      setNeedTissue(false);
      setTimeout(() => setEssentialsSuccessMsg(''), 6000);
      fetchTableAndMenu();
    } catch (err) {
      alert('Failed to request essentials: ' + err.message);
    } finally {
      setEssentialsSubmitting(false);
    }
  };


  const handleRequestBill = async () => {
    // activeOrder.session is the FK integer id from the Order serializer
    const sessionId = activeOrder?.session || activeSession?.id;
    if (!sessionId) return;
    try {
      await api.requestBill(sessionId, customer?.name || 'Customer QR');
      setBillRequested(true);
      alert(`Bill requested for ${tableData?.number || 'your table'}! Cashier is preparing your tax invoice.`);
    } catch (err) {
      alert('Error requesting bill: ' + err.message);
    }
  };

  const handleCallWaiter = async () => {
    if (isSessionTerminated) {
      alert('The final bill has been issued on your name for this session. Your dining session has concluded. You cannot call the waiter. Please rescan the table QR code and register to begin a new session.');
      return;
    }

    try {
      setWaiterCalled(true);
      await api.callWaiter(tableToken, customer?.name || 'Guest');
      alert(`🔔 Waiter called for ${tableData?.number || 'your table'}! A staff member has been alerted and will arrive shortly.`);
    } catch (err) {
      console.error('Error calling waiter:', err);
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)' }}>
        Loading dining menu...
      </div>
    );
  }

  if (error || !tableData) {
    return (
      <div style={{ maxWidth: 440, margin: '80px auto', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>☕</div>
        <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>Table Unavailable</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 8 }}>
          {error || 'This QR link is inactive. Please ask our cafe staff for assistance or scan the table standee again.'}
        </p>
        <Link to="/book-table" className="btn btn-primary btn-sm" style={{ marginTop: 20 }}>
          Reserve a Table in Advance &rarr;
        </Link>
      </div>
    );
  }

  // Pre-Booking Priority Lock Screen (Blocks walk-in scans within 15 mins of advance booking)
  if (prebookingLock && !activeSession) {
    const lockMsg = typeof prebookingLock === 'object' && prebookingLock.message
      ? prebookingLock.message
      : `Table ${tableData?.number || ''} is reserved for an advance reservation starting within 15 minutes.`;

    return (
      <div style={{ maxWidth: 480, margin: '60px auto', padding: '24px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '36px 24px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            background: 'rgba(217,119,6,0.12)',
            color: '#d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            boxShadow: '0 4px 14px rgba(217,119,6,0.2)'
          }}>
            <Clock size={34} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            Table {tableData?.number} is Reserved
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 20px' }}>
            {lockMsg} Walk-in guest QR ordering is temporarily locked to allow staff to clean and prepare the table for the scheduled party.
          </p>

          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: '1.5px solid rgba(217,119,6,0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 18px',
            textAlign: 'left',
            fontSize: '0.84rem',
            color: 'var(--text-secondary)',
            marginBottom: 24,
            lineHeight: 1.6
          }}>
            <div style={{ fontWeight: 800, color: '#b45309', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🎟️</span> Are you the guest who booked this table?
            </div>
            Please provide your <strong>Unique Booking Arrival Code (e.g. VB-XXXX)</strong> to the cafe staff at the counter. Our team will verify your booking, escort you to your table, and start your table session.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to="/book-table" className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
              Book another table in advance &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Filter items
  const allDishes = [];
  catalog.categories?.forEach(cat => {
    cat.items?.forEach(item => {
      allDishes.push({ ...item, category_name: cat.name });
    });
  });

  const filteredDishes = allDishes.filter(dish => {
    const matchesCat = selectedCat === 'ALL' || dish.category_name === selectedCat;
    const matchesSearch = search === '' || dish.name.toLowerCase().includes(search.toLowerCase());
    const matchesDiet = dietFilter === 'ALL' || (dietFilter === 'VEG' ? dish.is_veg : !dish.is_veg);
    return matchesCat && matchesSearch && matchesDiet && dish.is_available;
  });

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: 100 }}>
      {/* Top Mobile Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(180,83,9,0.25)'
          }}>
            <UtensilsCrossed size={18} color="#ffffff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {cafeInfo?.name || 'The Velvet Bean'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', fontWeight: 700, letterSpacing: '0.03em' }}>
              {tableData.number} • {tableData.floor_section}
            </div>
          </div>
        </div>

        {/* Right action icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activeOrder && (
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px 10px', fontSize: '0.72rem' }}
            >
              <Clock size={13} color="var(--accent-gold)" />
              <span>Status</span>
            </button>
          )}

          <button
            onClick={() => setCartDrawerOpen(true)}
            style={{
              position: 'relative',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <ShoppingBag size={18} color="var(--accent-gold)" />
            {cartCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -6,
                right: -6,
                background: 'var(--status-occupied)',
                color: '#fff',
                fontSize: '0.68rem',
                fontWeight: 800,
                width: 18,
                height: 18,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Advance Table Booking Client Link Banner */}
      <div style={{
        padding: '8px 18px',
        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
        borderBottom: '1px solid #fde68a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.78rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#92400e', fontWeight: 600 }}>
          <span>📅 Planning your next visit?</span>
        </div>
        <Link
          to="/book-table"
          style={{ color: '#b45309', fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <span>Book Table in Advance</span>
          <ArrowRight size={12} />
        </Link>
      </div>

      {/* Session Terminated / Final Bill Settled Banner */}
      {isSessionTerminated && (
        <div style={{
          margin: '14px 18px',
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: '2px solid #ef4444',
          borderRadius: 'var(--radius-md)',
          padding: '18px',
          textAlign: 'center',
          boxShadow: '0 4px 16px rgba(239, 68, 68, 0.2)'
        }}>
          <div style={{ fontSize: '2.2rem', marginBottom: 6 }}>🧾</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#991b1b' }}>
            Final Bill Settled • Session Concluded
          </h3>
          <p style={{ fontSize: '0.84rem', color: '#b91c1c', marginTop: 6, lineHeight: 1.5 }}>
            The bill has been settled for Table {tableData.number}. This dining session has concluded.
          </p>
          <div style={{
            marginTop: 12,
            padding: '10px 14px',
            background: '#ffffff',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            color: '#7f1d1d',
            fontWeight: 600,
            border: '1px solid #fca5a5'
          }}>
            Thank you for dining with us! To start a new dining session, please re-scan the QR code.
          </div>
          <button
            onClick={() => {
              localStorage.removeItem(`cafe_guest_${tableToken}`);
              window.location.reload();
            }}
            className="btn btn-sm"
            style={{ background: '#dc2626', color: '#fff', border: 'none', fontWeight: 800, marginTop: 14, width: '100%', padding: '10px' }}
          >
            🔄 Re-scan / Refresh Table Session
          </button>
        </div>
      )}

      {/* Bill Requested Notice (Non-blocking: customer can still order more before settlement) */}
      {!isSessionTerminated && (billRequested || tableData?.status === 'BILL_REQUESTED') && (
        <div style={{
          margin: '14px 18px',
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '1.5px solid #f59e0b',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          boxShadow: '0 2px 8px rgba(245,158,11,0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: '1.4rem' }}>🧾</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#92400e' }}>
                Bill Requested • Cashier Preparing Invoice
              </div>
              <div style={{ fontSize: '0.74rem', color: '#b45309', marginTop: 2 }}>
                Want to add more dishes or drinks before paying? You can still add items below!
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              const menuEl = document.getElementById('menu-feed-section');
              if (menuEl) menuEl.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn btn-sm"
            style={{ background: '#d97706', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.74rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
          >
            + Add Dishes
          </button>
        </div>
      )}

      {/* Active Verified Diner Session Bar (No repeated OTP needed) */}
      {!isSessionTerminated && verifiedGuest && (
        <div style={{
          padding: '8px 18px',
          background: '#f8fafc',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.78rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#16a34a', fontWeight: 800 }}>● Active Diner:</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{verifiedGuest.name}</span>
            <span style={{ color: 'var(--text-muted)' }}>({verifiedGuest.phone})</span>
          </div>
          <button
            onClick={handleSwitchGuest}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-gold)',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.74rem'
            }}
          >
            Switch / Add Guest
          </button>
        </div>
      )}

      {/* Table Essentials Widget (Water Bottle [Chilled/Normal], Salt, Tissue) */}
      <div className="glass-panel" style={{ margin: '14px 18px', padding: '16px', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            <Sparkles size={16} color="var(--accent-gold)" />
            <span>Table Essentials ({tableData.floor_section || 'Window Lounge'})</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-surface-elevated)', padding: '2px 8px', borderRadius: 4 }}>
            Complimentary
          </span>
        </div>

        {essentialsSuccessMsg && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            marginBottom: 12,
            fontWeight: 600
          }}>
            {essentialsSuccessMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Water Bottle Option with Chilled or Normal choice */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            background: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={needWater}
                onChange={e => setNeedWater(e.target.checked)}
              />
              <span>💧 Water Bottle</span>
            </label>
            {needWater && (
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setWaterType('CHILLED')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    borderRadius: 4,
                    border: waterType === 'CHILLED' ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                    background: waterType === 'CHILLED' ? '#eff6ff' : 'transparent',
                    color: waterType === 'CHILLED' ? '#1d4ed8' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  ❄️ Chilled
                </button>
                <button
                  type="button"
                  onClick={() => setWaterType('NORMAL')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    borderRadius: 4,
                    border: waterType === 'NORMAL' ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
                    background: waterType === 'NORMAL' ? '#fffbeb' : 'transparent',
                    color: waterType === 'NORMAL' ? '#b45309' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  🌡️ Normal
                </button>
              </div>
            )}
          </div>

          {/* Salt Option */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            background: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={needSalt}
                onChange={e => setNeedSalt(e.target.checked)}
              />
              <span>🧂 Salt & Pepper / Extra Seasoning</span>
            </label>
          </div>

          {/* Tissue Option */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            background: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={needTissue}
                onChange={e => setNeedTissue(e.target.checked)}
              />
              <span>🧻 Paper Tissues & Napkins</span>
            </label>
          </div>
        </div>

        <button
          type="button"
          disabled={essentialsSubmitting || (!needWater && !needSalt && !needTissue)}
          onClick={handleRequestEssentials}
          className="btn btn-outline-gold btn-sm"
          style={{ width: '100%', marginTop: 12, padding: '8px', fontSize: '0.82rem', fontWeight: 700 }}
        >
          {essentialsSubmitting ? 'Sending Request...' : 'Request Selected to Table 🛎️'}
        </button>
      </div>


      {/* Live Order Tracker Banner (If customer has placed an active order) */}
      {activeOrder && (
        <div style={{
          margin: '14px 18px',
          background: 'var(--bg-surface)',
          border: '1.5px solid var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-preparing">
                {activeOrder.status}
              </span>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--accent-gold)' }}>
                Order #{activeOrder.order_number}
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Placed at {activeOrder.created_at_display}
            </span>
          </div>

          {/* Progress Steps */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', margin: '16px 0 20px' }}>
            <div style={{ position: 'absolute', left: 20, right: 20, top: 12, height: 2, background: 'var(--border-subtle)', zIndex: 0 }} />
            {[
              { label: 'Placed', isDone: true, isCurrent: activeOrder.status === 'PLACED' },
              { label: 'Kitchen', isDone: ['PREPARING', 'READY', 'SERVED', 'COMPLETED'].includes(activeOrder.status), isCurrent: activeOrder.status === 'PREPARING' },
              { label: 'Ready', isDone: ['READY', 'SERVED', 'COMPLETED'].includes(activeOrder.status), isCurrent: activeOrder.status === 'READY' },
              { label: 'Served', isDone: ['SERVED', 'COMPLETED'].includes(activeOrder.status), isCurrent: activeOrder.status === 'SERVED' },
            ].map((step, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1 }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: step.isDone ? 'var(--status-available)' : step.isCurrent ? 'var(--accent-gold)' : 'var(--bg-surface-elevated)',
                  border: '2px solid var(--bg-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.7rem'
                }}>
                  {step.isDone ? '✓' : idx + 1}
                </div>
                <span style={{ fontSize: '0.68rem', color: step.isCurrent ? 'var(--accent-gold)' : 'var(--text-muted)', fontWeight: step.isCurrent ? 700 : 500 }}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* Action Triggers: Call Waiter & Request Bill */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <button
              onClick={handleCallWaiter}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem', padding: '8px' }}
            >
              <PhoneCall size={14} color="var(--accent-gold)" />
              <span>{waiterCalled ? 'Staff Notified!' : 'Call Waiter'}</span>
            </button>

            <button
              onClick={handleRequestBill}
              disabled={billRequested}
              className="btn btn-outline-gold btn-sm"
              style={{ fontSize: '0.78rem', padding: '8px' }}
            >
              <Receipt size={14} />
              <span>{billRequested ? 'Bill Requested ✓' : 'Request Bill'}</span>
            </button>
          </div>

          {/* In-Session Add More Dishes (No OTP Needed) */}
          {!isSessionTerminated && (
            <button
              onClick={() => {
                const menuEl = document.getElementById('menu-feed-section');
                if (menuEl) menuEl.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn btn-outline-gold btn-sm"
              style={{ width: '100%', marginTop: 10, fontSize: '0.82rem', padding: '9px', fontWeight: 700 }}
            >
              <Plus size={14} />
              <span>+ Add More Dishes to Current Session (No OTP Needed)</span>
            </button>
          )}

          {/* Feedback Trigger */}
          {['SERVED', 'COMPLETED'].includes(activeOrder.status) && (
            <button
              onClick={() => setFeedbackModalOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ width: '100%', marginTop: 10, fontSize: '0.8rem' }}
            >
              <Star size={14} />
              <span>Rate Your Dining Experience</span>
            </button>
          )}
        </div>
      )}

      {/* Search & Dietary Toggle */}
      <div style={{ padding: '14px 18px 8px' }}>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search artisan coffee, gourmet pizza, pasta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              fontSize: '0.88rem'
            }}
          />
        </div>

        {/* Dietary Filters */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'ALL', label: 'All Dishes' },
            { key: 'VEG', label: '🟢 100% Pure Veg' },
            { key: 'NON_VEG', label: '🔴 Non-Veg' },
          ].map(d => (
            <button
              key={d.key}
              onClick={() => setDietFilter(d.key)}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.74rem',
                fontWeight: 700,
                border: dietFilter === d.key ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                background: dietFilter === d.key ? 'var(--accent-gold-dim)' : 'var(--bg-surface-elevated)',
                color: dietFilter === d.key ? 'var(--accent-gold)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sticky Category Pills */}
      <div style={{
        position: 'sticky',
        top: 63,
        zIndex: 90,
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(12px)',
        padding: '10px 18px',
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <button
          onClick={() => setSelectedCat('ALL')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.8rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            border: selectedCat === 'ALL' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
            background: selectedCat === 'ALL' ? 'var(--accent-gold)' : 'var(--bg-surface-elevated)',
            color: selectedCat === 'ALL' ? '#0e0a07' : 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          All Items
        </button>

        {catalog.categories?.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCat(cat.name)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              border: selectedCat === cat.name ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
              background: selectedCat === cat.name ? 'var(--accent-gold)' : 'var(--bg-surface-elevated)',
              color: selectedCat === cat.name ? '#0e0a07' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Dishes Feed */}
      <div id="menu-feed-section" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filteredDishes.length > 0 ? (
          filteredDishes.map(dish => (
            <div
              key={dish.id}
              onClick={() => setSelectedDish(dish)}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                display: 'flex',
                gap: 14,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Info */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: '0.72rem' }}>
                      {dish.is_veg ? '🟢' : '🔴'}
                    </span>
                    {dish.is_bestseller && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, background: 'rgba(212,163,115,0.15)', color: 'var(--accent-gold)', padding: '2px 6px', borderRadius: 4 }}>
                        BESTSELLER
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {dish.name}
                  </h4>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--accent-gold)', marginTop: 4 }}>
                    ₹{dish.price}
                  </div>
                  {dish.description && (
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {dish.description}
                    </p>
                  )}
                </div>

                <div style={{ marginTop: 10 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDish(dish);
                    }}
                    className="btn btn-outline-gold btn-sm"
                    style={{ padding: '4px 14px', fontSize: '0.78rem' }}
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Dish Image */}
              {dish.image_url && (
                <div style={{ width: 100, height: 100, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
                  <img
                    src={dish.image_url}
                    alt={dish.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </div>
          ))
        ) : (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            No dishes found matching your selection.
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cartCount > 0 && !isSessionTerminated && (
        <div style={{
          position: 'fixed',
          bottom: 16,
          left: 18,
          right: 18,
          maxWidth: 484,
          margin: '0 auto',
          zIndex: 1000
        }}>
          <button
            onClick={() => setCartDrawerOpen(true)}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-gold) 0%, #b88350 100%)',
              border: 'none',
              color: '#0e0a07',
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(212,163,115,0.45)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                background: '#0e0a07',
                color: 'var(--accent-gold)',
                borderRadius: '50%',
                width: 26,
                height: 26,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {cartCount}
              </div>
              <span>View Order Cart</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>₹{cartSubtotal}</span>
              <ArrowRight size={18} />
            </div>
          </button>
        </div>
      )}

      {/* Customizer Modal */}
      {selectedDish && (
        <DishDetailModal
          dish={selectedDish}
          onClose={() => setSelectedDish(null)}
        />
      )}

      {/* Cart Drawer */}
      <CustomerCartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        onProceedToCheckout={handleProceedToCheckout}
        table={tableData}
      />

      {/* OTP Verification Modal */}
      <CustomerOTPModal
        isOpen={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        onVerified={handleVerifiedAndPlaceOrder}
        tableSessionId={activeSession?.id || tableData?.active_session?.id}
      />

      {/* Feedback Modal */}
      <CustomerFeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        customerId={customer?.id || activeOrder?.customer}
        sessionId={activeOrder?.session || activeSession?.id}
        tableNumber={tableData?.number}
      />
    </div>
  );
}
