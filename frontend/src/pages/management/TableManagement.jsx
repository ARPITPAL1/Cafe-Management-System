import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import TableCard from '../../components/TableCard';
import QRModal from '../../components/QRModal';
import ThermalReceiptModal from '../../components/ThermalReceiptModal';
import { useAuth } from '../../context/AuthContext';
import {
  Plus,
  Filter,
  RefreshCw,
  Search,
  Grid2X2,
  Check,
  X,
  ShoppingBag,
  PlusCircle,
  Clock,
  Sparkles,
  Bell,
  BellOff,
  Calendar,
  Users
} from 'lucide-react';
import ReservationsManagementModal from '../../components/ReservationsManagementModal';

export default function TableManagement() {
  const { cafeInfo, waiterCallAlertsEnabled, toggleWaiterCallAlerts, requireAdminAuth } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [reservationsModalOpen, setReservationsModalOpen] = useState(false);
  const [pendingReservationsCount, setPendingReservationsCount] = useState(0);
  const [upcomingAlerts, setUpcomingAlerts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('ALL');
  const [selectedQRTable, setSelectedQRTable] = useState(null);

  // Modals
  const [addTableOpen, setAddTableOpen] = useState(false);
  const [newTableData, setNewTableData] = useState({
    number: '',
    capacity: 4,
    shape: 'SQUARE',
    floor_section: 'Indoor Main Hall'
  });

  // Add dish to table modal state
  const [addDishTable, setAddDishTable] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedDishId, setSelectedDishId] = useState('');
  const [dishQty, setDishQty] = useState(1);
  const [dishNotes, setDishNotes] = useState('');
  const [submittingDish, setSubmittingDish] = useState(false);

  // View order dishes modal state
  const [viewOrderTable, setViewOrderTable] = useState(null);
  const [tableOrders, setTableOrders] = useState([]);

  // Bill & receipt modal state
  const [receiptBill, setReceiptBill] = useState(null);

  // Open table session modal state
  const [openSessionModalTable, setOpenSessionModalTable] = useState(null);
  const [sessionGuestCount, setSessionGuestCount] = useState(2);
  const [sessionSubmitting, setSessionSubmitting] = useState(false);

  const fetchTables = async () => {
    try {
      const data = await api.getTables();
      setTables(data);
      api.getReservations().then(res => {
        setPendingReservationsCount(res.pending_alerts_count || 0);
        setUpcomingAlerts(res.upcoming_15m_alerts || []);
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to load tables', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    api.getMenuCatalog(false).then(res => {
      const allDishes = [];
      res.categories?.forEach(cat => {
        cat.items?.forEach(item => {
          if (item.is_available) allDishes.push(item);
        });
      });
      setMenuItems(allDishes);
    }).catch(console.error);

    const interval = setInterval(fetchTables, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!newTableData.number) return;
    requireAdminAuth(async () => {
      try {
        await api.addTable(newTableData);
        setAddTableOpen(false);
        setNewTableData({ number: '', capacity: 4, shape: 'SQUARE', floor_section: 'Indoor Main Hall' });
        fetchTables();
      } catch (err) {
        alert('Error creating table: ' + err.message);
      }
    }, 'add new table');
  };

  const handleOpenSession = (table) => {
    setOpenSessionModalTable(table);
    setSessionGuestCount(Math.min(table.capacity || 4, 2));
  };

  const handleConfirmOpenSession = async (e) => {
    if (e) e.preventDefault();
    if (!openSessionModalTable) return;
    requireAdminAuth(async () => {
      setSessionSubmitting(true);
      try {
        await api.openTableSession(openSessionModalTable.id, sessionGuestCount);
        setOpenSessionModalTable(null);
        await fetchTables();
      } catch (err) {
        alert('Failed to open session: ' + err.message);
      } finally {
        setSessionSubmitting(false);
      }
    }, 'open table dining session');
  };

  const handleCloseSession = async (table) => {
    requireAdminAuth(async () => {
      if (!window.confirm(`Are you sure you want to close the session on ${table.number} and reset the table to AVAILABLE?`)) {
        return;
      }
      try {
        await api.closeTableSession(table.id);
        fetchTables();
      } catch (err) {
        alert('Failed to close session: ' + err.message);
      }
    }, 'close table session');
  };

  const handleDismissWaiter = async (table) => {
    try {
      await api.dismissWaiter(table.id, cafeInfo?.owner_name || 'Staff');
      fetchTables();
    } catch (err) {
      console.error('Failed to dismiss waiter call:', err);
      alert('Failed to dismiss waiter call: ' + err.message);
    }
  };

  const handleDismissAllWaiters = async () => {
    try {
      await api.dismissAllWaiters(cafeInfo?.owner_name || 'Manager');
      fetchTables();
    } catch (err) {
      console.error('Failed to dismiss all waiter calls:', err);
      alert('Failed to dismiss all waiter calls: ' + err.message);
    }
  };

  const handleAddDishSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDishId || !addDishTable) return;
    requireAdminAuth(async () => {
      setSubmittingDish(true);

      try {
        const session = addDishTable.active_session;
        if (!session) {
          alert('No active session on this table. Opening session first...');
          await api.openTableSession(addDishTable.id);
        }

        // Check if there is an existing active order to append to, or create one
        const ordersRes = await api.getOrders(`session_id=${session ? session.id : ''}&active_only=true`);
        const existingOrder = ordersRes.length > 0 ? ordersRes[0] : null;

        const mItem = menuItems.find(m => m.id === parseInt(selectedDishId));
        if (!mItem) return;

        if (existingOrder) {
          await api.addItemsToOrder(existingOrder.id, [{
            menu_item_id: mItem.id,
            quantity: dishQty,
            unit_price: mItem.price,
            special_instructions: dishNotes
          }], 'Staff POS');
        } else {
          await api.createOrder({
            table_id: addDishTable.id,
            order_source: 'WAITER_MANUAL',
            items: [{
              menu_item_id: mItem.id,
              quantity: dishQty,
              unit_price: mItem.price,
              special_instructions: dishNotes
            }],
            notes: 'Added manually by waiter POS'
          });
        }

        setAddDishTable(null);
        setSelectedDishId('');
        setDishQty(1);
        setDishNotes('');
        fetchTables();
      } catch (err) {
        alert('Failed to add dish: ' + err.message);
      } finally {
        setSubmittingDish(false);
      }
    }, 'add dish to table order');
  };

  const handleViewOrder = async (table) => {
    setViewOrderTable(table);
    if (table.active_session) {
      try {
        const orders = await api.getOrders(`session_id=${table.active_session.id}`);
        setTableOrders(orders);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleOpenBilling = (table) => {
    if (table.active_session) {
      navigate(`/admin/billing?session_id=${table.active_session.id}`);
    } else {
      alert('Table has no active order session to bill.');
    }
  };

  // Filter tables by floor section
  const sections = ['ALL', ...new Set(tables.map(t => t.floor_section).filter(Boolean))];
  const filteredTables = activeSection === 'ALL'
    ? tables
    : tables.filter(t => t.floor_section === activeSection);

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '28px 24px' }}>
      {/* Top Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24
      }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>Table Management & Floor Layout</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 4 }}>
            Visual floor shape map, live table sessions, permanent QR standees & POS actions
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Waiter Alert Toggle Button */}
          <button
            onClick={() => toggleWaiterCallAlerts()}
            className="btn btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.8rem',
              background: waiterCallAlertsEnabled ? 'var(--bg-surface-elevated)' : '#fee2e2',
              borderColor: waiterCallAlertsEnabled ? 'var(--border-medium)' : '#fca5a5',
              color: waiterCallAlertsEnabled ? 'var(--text-primary)' : '#991b1b',
              padding: '7px 12px',
              cursor: 'pointer'
            }}
            title={waiterCallAlertsEnabled ? "Waiter Call Alert is ACTIVE (Click to Turn OFF)" : "Waiter Call Alert is OFF (Click to Turn ON)"}
          >
            {waiterCallAlertsEnabled ? (
              <>
                <Bell size={14} color="#b45309" />
                <span style={{ fontWeight: 700 }}>Waiter Alerts: ON</span>
              </>
            ) : (
              <>
                <BellOff size={14} color="#dc2626" />
                <span style={{ fontWeight: 700 }}>Waiter Alerts: OFF</span>
              </>
            )}
          </button>

          {/* Advance Bookings Manager Button */}
          <button
            onClick={() => setReservationsModalOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px' }}
          >
            <Calendar size={14} color="var(--accent-gold)" />
            <span style={{ fontWeight: 700 }}>Advance Bookings</span>
            {pendingReservationsCount > 0 && (
              <span style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 800,
                borderRadius: '50%',
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {pendingReservationsCount}
              </span>
            )}
          </button>

          <button onClick={fetchTables} className="btn btn-secondary btn-sm" title="Refresh floor status">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button onClick={() => setAddTableOpen(true)} className="btn btn-primary btn-sm">
            <Plus size={16} />
            <span>+ Add Table</span>
          </button>
        </div>
      </div>

      {/* 15-Minute Pre-Booking Alert Banner (Exclusive Table Lock & Preparation) */}
      {upcomingAlerts.length > 0 && (
        <div style={{
          marginBottom: 16,
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '2px solid #3b82f6',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 4px 14px rgba(59,130,246,0.18)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.6rem' }}>⏰</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Pre-Booking Approaching within 15 Minutes!</span>
                <span style={{ background: '#2563eb', color: '#fff', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 12 }}>
                  Table QR Locked for Walk-ins
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#1d4ed8', marginTop: 4 }}>
                {upcomingAlerts.map(a => (
                  <span key={a.reservation_id} style={{ marginRight: 16 }}>
                    <strong>{a.table_number}</strong>: {a.customer_name} ({a.guest_count} guests) at <strong>{a.time}</strong> (in {a.mins_until}m) • Code: <code style={{ background: '#fff', padding: '1px 6px', borderRadius: 4, fontWeight: 800, color: '#1e40af' }}>{a.booking_code}</code>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => setReservationsModalOpen(true)}
            className="btn btn-sm"
            style={{ background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, padding: '8px 16px' }}
          >
            Check-In Arrival &rarr;
          </button>
        </div>
      )}

      {/* Advance Reservations Alert Banner */}
      {pendingReservationsCount > 0 && (
        <div style={{
          marginBottom: 20,
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '2px solid #f59e0b',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 2px 10px rgba(245,158,11,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={20} color="#b45309" />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#92400e' }}>
                📅 {pendingReservationsCount} New Advance Table Booking(s) Waiting for Confirmation!
              </div>
              <div style={{ fontSize: '0.78rem', color: '#b45309' }}>
                Review party sizes, assigned tables, and special customer requests.
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
              Review & Confirm Bookings ({pendingReservationsCount})
            </button>
          </div>
        </div>
      )}

      {/* Waiter Calling Tables Alert Banner */}
      {tables.filter(t => t.waiter_called).length > 0 && waiterCallAlertsEnabled && (
        <div style={{
          marginBottom: 20,
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '2px solid #f59e0b',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 2px 10px rgba(245,158,11,0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={20} color="#b45309" />
            <div>
              <span style={{ fontWeight: 800, color: '#92400e', fontSize: '0.92rem' }}>
                🔔 {tables.filter(t => t.waiter_called).length} Table(s) Calling Waiter:
              </span>
              <span style={{ fontWeight: 700, color: '#b45309', marginLeft: 6 }}>
                {tables.filter(t => t.waiter_called).map(t => t.number).join(', ')}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDismissAllWaiters}
              className="btn btn-sm"
              style={{ background: '#b45309', color: '#fff', border: 'none', fontWeight: 700 }}
            >
              Dismiss All Waiter Calls
            </button>
            <button
              onClick={() => toggleWaiterCallAlerts(false)}
              className="btn btn-secondary btn-sm"
              style={{ borderColor: '#fca5a5', color: '#991b1b', fontWeight: 700 }}
              title="Turn off waiter call alerts"
            >
              Turn Off Alerts
            </button>
          </div>
        </div>
      )}

      {/* Section Filters & Status Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        {/* Section Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', padding: '4px 0' }}>
          {sections.map(sec => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.84rem',
                fontWeight: 600,
                border: activeSection === sec ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                background: activeSection === sec ? 'var(--accent-gold-dim)' : 'var(--bg-surface-elevated)',
                color: activeSection === sec ? 'var(--accent-gold)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* Status Legend Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: '0.75rem' }}>
          <span className="badge badge-available">● Available</span>
          <span className="badge badge-occupied">● Occupied</span>
          <span className="badge badge-preparing">● Cooking</span>
          <span className="badge badge-served">● Served</span>
          <span className="badge badge-bill">● Bill Requested</span>
        </div>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading visual floor plan...
        </div>
      ) : filteredTables.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20
        }}>
          {filteredTables.map(table => (
            <TableCard
              key={table.id}
              table={table}
              onOpenQR={setSelectedQRTable}
              onOpenSession={handleOpenSession}
              onCloseSession={handleCloseSession}
              onAddDish={(tbl) => setAddDishTable(tbl)}
              onOpenBilling={handleOpenBilling}
              onViewOrder={handleViewOrder}
              onDismissWaiter={handleDismissWaiter}
            />
          ))}
        </div>
      ) : (
        <div style={{
          padding: '60px 0',
          textAlign: 'center',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border-medium)'
        }}>
          <Grid2X2 size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem' }}>No tables found in this section</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            Click "+ Add Table" to add dining tables to this section
          </p>
        </div>
      )}

      {/* Open Table Session Modal */}
      {openSessionModalTable && (
        <div className="modal-backdrop" onClick={() => setOpenSessionModalTable(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, padding: 24, borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(217,119,6,0.3)'
                }}>
                  <Users size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Open {openSessionModalTable.number}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    {openSessionModalTable.floor_section} • Capacity {openSessionModalTable.capacity} Seats
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpenSessionModalTable(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmOpenSession} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Guest / Party Size
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {[1, 2, 3, 4, 5, 6, 8].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setSessionGuestCount(cnt)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: sessionGuestCount === cnt ? '2px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                        background: sessionGuestCount === cnt ? 'rgba(217,119,6,0.15)' : 'var(--bg-surface-elevated)',
                        color: sessionGuestCount === cnt ? 'var(--accent-gold)' : 'var(--text-secondary)'
                      }}
                    >
                      {cnt} {cnt === 1 ? 'Guest' : 'Guests'}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setSessionGuestCount(Math.max(1, sessionGuestCount - 1))}
                    className="btn btn-secondary btn-sm"
                    style={{ width: 38, height: 38, fontSize: '1.2rem', fontWeight: 800, padding: 0 }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={sessionGuestCount}
                    onChange={e => setSessionGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      width: 80,
                      textAlign: 'center',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1.5px solid var(--border-medium)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setSessionGuestCount(sessionGuestCount + 1)}
                    className="btn btn-secondary btn-sm"
                    style={{ width: 38, height: 38, fontSize: '1.2rem', fontWeight: 800, padding: 0 }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{
                background: 'rgba(16,185,129,0.06)',
                border: '1px dashed rgba(16,185,129,0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5
              }}>
                ✓ Starting this session activates <strong>{openSessionModalTable.number}</strong> for dining. Customers can scan table QR to order, or staff can manually add items.
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setOpenSessionModalTable(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sessionSubmitting}
                  className="btn btn-primary"
                  style={{ flex: 1.6, fontWeight: 800 }}
                >
                  {sessionSubmitting ? 'Starting...' : '⚡ Start Table Session Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Standee Modal */}
      {selectedQRTable && (
        <QRModal
          table={selectedQRTable}
          onClose={() => setSelectedQRTable(null)}
          onTokenRegenerated={(newToken) => {
            setSelectedQRTable({ ...selectedQRTable, public_token: newToken });
            fetchTables();
          }}
        />
      )}

      {/* Add New Table Modal */}
      {addTableOpen && (
        <div className="modal-backdrop" onClick={() => setAddTableOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.2rem' }}>Add Dining Table</h3>
              <button onClick={() => setAddTableOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTable} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Table Identifier (e.g. Table 13, T-21, Patio 04)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Table 13"
                  value={newTableData.number}
                  onChange={e => setNewTableData({ ...newTableData, number: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={newTableData.capacity}
                    onChange={e => setNewTableData({ ...newTableData, capacity: parseInt(e.target.value) || 2 })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Physical Shape
                  </label>
                  <select
                    value={newTableData.shape}
                    onChange={e => setNewTableData({ ...newTableData, shape: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit'
                    }}
                  >
                    <option value="SQUARE">Square (4-Seats)</option>
                    <option value="ROUND">Round (2-Seats)</option>
                    <option value="RECTANGLE">Rectangle (6+ Seats)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Floor Section
                </label>
                <input
                  type="text"
                  placeholder="e.g. Indoor Main Hall, Balcony, Terrace"
                  value={newTableData.floor_section}
                  onChange={e => setNewTableData({ ...newTableData, floor_section: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{
                background: 'rgba(212,163,115,0.08)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.78rem',
                color: 'var(--accent-gold)'
              }}>
                ✨ A unique, unpredictable public token & permanent QR standee URL will be automatically generated.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setAddTableOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Create Table & Generate QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Dish To Table Modal (Waiter POS) */}
      {addDishTable && (
        <div className="modal-backdrop" onClick={() => setAddDishTable(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: '1.2rem' }}>Add Dish to {addDishTable.number}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Waiter POS order entry (automatically routed to Kitchen KDS)
                </p>
              </div>
              <button onClick={() => setAddDishTable(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddDishSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Select Dish from Menu
                </label>
                <select
                  required
                  value={selectedDishId}
                  onChange={e => setSelectedDishId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="">-- Choose item --</option>
                  {menuItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.is_veg ? '🟢' : '🔴'} {item.name} — ₹{item.price} ({item.category_name})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={dishQty}
                    onChange={e => setDishQty(parseInt(e.target.value) || 1)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Chef Notes / Instructions
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Extra spicy, no onions, gluten free"
                    value={dishNotes}
                    onChange={e => setDishNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setAddDishTable(null)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submittingDish || !selectedDishId} className="btn btn-primary btn-sm">
                  {submittingDish ? 'Adding...' : 'Add to Kitchen Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Table Active Orders Modal */}
      {viewOrderTable && (
        <div className="modal-backdrop" onClick={() => setViewOrderTable(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 540, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: '1.2rem' }}>Active Dishes on {viewOrderTable.number}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Customer: {viewOrderTable.active_session?.customer_name || 'Guest'} • Total: ₹{viewOrderTable.current_amount}
                </p>
              </div>
              <button onClick={() => setViewOrderTable(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 380, overflowY: 'auto' }}>
              {tableOrders.length > 0 ? (
                tableOrders.map(order => (
                  <div
                    key={order.id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-gold)' }}>
                        Order #{order.order_number} ({order.order_source})
                      </span>
                      <span className="badge badge-preparing">
                        {order.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {order.items?.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>{item.quantity}x {item.item_name}</span>
                            {item.special_instructions && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--status-ordering)' }}>
                                Note: {item.special_instructions}
                              </div>
                            )}
                          </div>
                          <span style={{ fontWeight: 600 }}>₹{item.total_price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading order details...
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button
                onClick={() => {
                  const tbl = viewOrderTable;
                  setViewOrderTable(null);
                  setAddDishTable(tbl);
                }}
                className="btn btn-secondary btn-sm"
              >
                + Add Another Dish
              </button>
              <button
                onClick={() => {
                  const tbl = viewOrderTable;
                  setViewOrderTable(null);
                  handleOpenBilling(tbl);
                }}
                className="btn btn-primary btn-sm"
              >
                Go to Billing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptBill && (
        <ThermalReceiptModal
          bill={receiptBill}
          cafeInfo={cafeInfo}
          onClose={() => setReceiptBill(null)}
          onCloseSession={() => {
            setReceiptBill(null);
            fetchTables();
          }}
        />
      )}

      {/* Advance Reservations Modal */}
      <ReservationsManagementModal
        isOpen={reservationsModalOpen}
        onClose={() => {
          setReservationsModalOpen(false);
          fetchTables();
        }}
      />
    </div>
  );
}
