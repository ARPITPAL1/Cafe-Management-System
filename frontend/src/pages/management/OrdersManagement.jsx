import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  UtensilsCrossed,
  Clock,
  Printer,
  Plus,
  X,
  Search,
  CheckCircle,
  Play,
  AlertTriangle,
  RotateCcw,
  Ban
} from 'lucide-react';

export default function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Waiter Order Modal
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [manualTableId, setManualTableId] = useState('');
  const [orderItemsSelection, setOrderItemsSelection] = useState([]);
  const [manualNotes, setManualNotes] = useState('');

  // Add Item to Active Order Modal
  const [addItemOrder, setAddItemOrder] = useState(null);
  const [addDishId, setAddDishId] = useState('');
  const [addDishQty, setAddDishQty] = useState(1);
  const [addDishNotes, setAddDishNotes] = useState('');
  const [addingDish, setAddingDish] = useState(false);


  const fetchOrders = async () => {
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    api.getTables().then(setTables).catch(console.error);
    api.getMenuCatalog(false).then(res => {
      const allDishes = [];
      res.categories?.forEach(cat => {
        cat.items?.forEach(item => {
          if (item.is_available) allDishes.push(item);
        });
      });
      setMenuItems(allDishes);
    }).catch(console.error);

    const interval = setInterval(fetchOrders, 3000); // Polling every 3s for live orders
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.updateOrderStatus(orderId, newStatus, 'Staff Manager');
      fetchOrders();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleCancelItem = async (itemId, dishName) => {
    const reason = prompt(`Enter cancellation reason for ${dishName}:`, 'Customer changed mind');
    if (!reason) return;
    try {
      await api.cancelOrderItem(itemId, reason, 'Cashier');
      fetchOrders();
    } catch (err) {
      alert('Error cancelling item: ' + err.message);
    }
  };

  const handleAddManualItemRow = () => {
    if (menuItems.length > 0) {
      setOrderItemsSelection([...orderItemsSelection, { id: menuItems[0].id, quantity: 1, instructions: '' }]);
    }
  };

  const handleManualOrderSubmit = async (e) => {
    e.preventDefault();
    if (!manualTableId || orderItemsSelection.length === 0) {
      alert('Select a table and at least one dish.');
      return;
    }

    try {
      await api.createOrder({
        table_id: parseInt(manualTableId),
        order_source: 'WAITER_MANUAL',
        items: orderItemsSelection.map(sel => {
          const item = menuItems.find(m => m.id === parseInt(sel.id));
          return {
            menu_item_id: item.id,
            quantity: parseInt(sel.quantity) || 1,
            unit_price: item.price,
            special_instructions: sel.instructions
          };
        }),
        notes: manualNotes
      });

      setCreateOrderOpen(false);
      setOrderItemsSelection([]);
      setManualNotes('');
      fetchOrders();
    } catch (err) {
      alert('Failed to place manual order: ' + err.message);
    }
  };

  const handleAddDishToOrder = async (e) => {
    e.preventDefault();
    if (!addItemOrder || !addDishId) return;
    const mItem = menuItems.find(m => m.id === parseInt(addDishId));
    if (!mItem) return;

    setAddingDish(true);
    try {
      await api.addItemsToOrder(addItemOrder.id, [{
        menu_item_id: mItem.id,
        quantity: addDishQty,
        unit_price: mItem.price,
        special_instructions: addDishNotes
      }], 'Staff Orders POS');
      setAddItemOrder(null);
      setAddDishId('');
      setAddDishQty(1);
      setAddDishNotes('');
      fetchOrders();
    } catch (err) {
      alert('Failed to add dish to order: ' + err.message);
    } finally {
      setAddingDish(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesSearch = searchQuery === '' ||
      o.order_number.toString().includes(searchQuery) ||
      o.table_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '24px' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Dine-In Orders Control</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            Unified order engine for customer QR orders and staff manual POS entries
          </p>
        </div>

        <button
          onClick={() => {
            setOrderItemsSelection([{ id: menuItems[0]?.id, quantity: 1, instructions: '' }]);
            setCreateOrderOpen(true);
          }}
          className="btn btn-primary btn-sm"
        >
          <Plus size={16} />
          <span>+ New Waiter Order</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
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
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0' }}>
          {['ALL', 'PLACED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: statusFilter === st ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                background: statusFilter === st ? 'var(--accent-gold-dim)' : 'var(--bg-surface-elevated)',
                color: statusFilter === st ? 'var(--accent-gold)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {st}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search #1048, Table 12, Rahul..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              fontSize: '0.85rem'
            }}
          />
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading orders feed...
        </div>
      ) : filteredOrders.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 20
        }}>
          {filteredOrders.map(order => (
            <div
              key={order.id}
              className="glass-panel"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      fontSize: '1.2rem',
                      color: 'var(--accent-gold)'
                    }}>
                      ORDER #{order.order_number}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      background: 'var(--bg-surface-elevated)',
                      color: 'var(--text-muted)',
                      padding: '2px 6px',
                      borderRadius: 4
                    }}>
                      {order.order_source}
                    </span>
                  </div>

                  <span className={`badge ${
                    order.status === 'READY'
                      ? 'badge-ready'
                      : order.status === 'PREPARING'
                      ? 'badge-preparing'
                      : order.status === 'SERVED'
                      ? 'badge-served'
                      : order.status === 'COMPLETED'
                      ? 'badge-available'
                      : 'badge-ordering'
                  }`}>
                    {order.status}
                  </span>
                </div>

                {/* Table & Customer */}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>
                  {order.table_number} • {order.customer_name}
                  {order.customer_phone && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>({order.customer_phone})</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  <span>Placed at {order.created_at_display} ({order.elapsed_minutes || 1}m ago)</span>
                  {(order.elapsed_minutes >= 15 || order.is_delayed) && !['SERVED', 'COMPLETED', 'CANCELLED'].includes(order.status) && (
                    <span className="badge badge-delay-alert" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                      🚨 &gt;15m Delayed
                    </span>
                  )}
                </div>

                {/* Notes */}
                {order.notes && (
                  <div style={{
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 10px',
                    fontSize: '0.78rem',
                    color: 'var(--status-ordering)',
                    marginBottom: 12
                  }}>
                    Note: {order.notes}
                  </div>
                )}

                {/* Items */}
                <div style={{
                  borderTop: '1px dashed var(--border-subtle)',
                  borderBottom: '1px dashed var(--border-subtle)',
                  padding: '10px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginBottom: 14
                }}>
                  {order.items?.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{item.quantity}x {item.item_name}</span>
                        {item.variant_name && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> ({item.variant_name})</span>}
                        {item.addons_json?.map((a, aidx) => (
                          <div key={aidx} style={{ fontSize: '0.72rem', color: 'var(--accent-gold)' }}>+ {a.name}</div>
                        ))}
                        {item.status === 'CANCELLED' && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--status-occupied)' }}>
                            Cancelled: {item.cancelled_reason}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 700 }}>₹{item.total_price}</span>
                        {item.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleCancelItem(item.id, item.item_name)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            title="Cancel Item"
                          >
                            <Ban size={13} color="var(--status-occupied)" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Order Total:</span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    ₹{order.subtotal}
                  </span>
                </div>
              </div>

              {/* Status Actions & Add Dishes */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {!['COMPLETED', 'CANCELLED'].includes(order.status) && (
                  <button
                    onClick={() => {
                      setAddItemOrder(order);
                      setAddDishId(menuItems[0]?.id ? String(menuItems[0].id) : '');
                      setAddDishQty(1);
                      setAddDishNotes('');
                    }}
                    className="btn btn-secondary btn-sm"
                    title="Add items to this active session without re-registering"
                  >
                    <Plus size={14} color="var(--accent-gold)" />
                    <span>+ Add Dish</span>
                  </button>
                )}

                {order.status === 'PLACED' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                  >
                    Accept Order
                  </button>
                )}
                {order.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                  >
                    Send to Kitchen
                  </button>
                )}
                {order.status === 'PREPARING' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'READY')}
                    className="btn btn-sm"
                    style={{ flex: 1, background: 'var(--status-ready)', color: '#fff' }}
                  >
                    Mark Ready
                  </button>
                )}
                {order.status === 'READY' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'SERVED')}
                    className="btn btn-sm"
                    style={{ flex: 1, background: 'var(--status-served)', color: '#fff' }}
                  >
                    Mark Served
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          No orders match your filter criteria.
        </div>
      )}

      {/* Manual Waiter Order Modal */}
      {createOrderOpen && (
        <div className="modal-backdrop" onClick={() => setCreateOrderOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: '1.2rem' }}>New Waiter Manual Order</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Take order directly at table and send immediately to Kitchen KDS
                </p>
              </div>
              <button onClick={() => setCreateOrderOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleManualOrderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Select Table
                </label>
                <select
                  required
                  value={manualTableId}
                  onChange={e => setManualTableId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="">-- Choose Dining Table --</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.number} ({t.capacity} seats, {t.floor_section}) — Status: {t.status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dishes list */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Dishes</label>
                  <button type="button" onClick={handleAddManualItemRow} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                    + Add Dish
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                  {orderItemsSelection.map((row, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 70px auto', gap: 8, alignItems: 'center' }}>
                      <select
                        value={row.id}
                        onChange={e => {
                          const updated = [...orderItemsSelection];
                          updated[idx].id = e.target.value;
                          setOrderItemsSelection(updated);
                        }}
                        style={{
                          padding: '8px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                          fontFamily: 'inherit',
                          fontSize: '0.82rem'
                        }}
                      >
                        {menuItems.map(m => (
                          <option key={m.id} value={m.id}>{m.name} (₹{m.price})</option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={row.quantity}
                        onChange={e => {
                          const updated = [...orderItemsSelection];
                          updated[idx].quantity = e.target.value;
                          setOrderItemsSelection(updated);
                        }}
                        style={{
                          padding: '8px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                          fontFamily: 'inherit',
                          fontSize: '0.82rem',
                          textAlign: 'center'
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => setOrderItemsSelection(orderItemsSelection.filter((_, i) => i !== idx))}
                        style={{ background: 'transparent', border: 'none', color: 'var(--status-occupied)', cursor: 'pointer' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Table Special Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Serve hot, no salt on fries"
                  value={manualNotes}
                  onChange={e => setManualNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setCreateOrderOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Create & Send to Kitchen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item to Active Order Modal */}
      {addItemOrder && (
        <div className="modal-backdrop" onClick={() => setAddItemOrder(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                  Add Dish to #{addItemOrder.order_number}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {addItemOrder.table_number} • {addItemOrder.customer_name}
                </p>
              </div>
              <button
                onClick={() => setAddItemOrder(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddDishToOrder} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>
                  Select Menu Dish
                </label>
                <select
                  required
                  value={addDishId}
                  onChange={e => setAddDishId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit'
                  }}
                >
                  {menuItems.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} (₹{m.price})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={addDishQty}
                  onChange={e => setAddDishQty(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontWeight: 700
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>
                  Special Cooking Instructions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra spicy, less oil, served hot"
                  value={addDishNotes}
                  onChange={e => setAddDishNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setAddItemOrder(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingDish}
                  className="btn btn-primary btn-sm"
                >
                  {addingDish ? 'Adding...' : 'Confirm & Add to Kitchen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
