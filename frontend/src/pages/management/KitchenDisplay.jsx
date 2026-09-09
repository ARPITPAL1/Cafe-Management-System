import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ChefHat,
  Clock,
  Printer,
  CheckCircle,
  Play,
  Volume2,
  VolumeX,
  RefreshCw,
  AlertTriangle,
  Utensils,
  Check
} from 'lucide-react';

export default function KitchenDisplay() {
  const { soundAlertsEnabled, toggleSoundAlerts } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [printingOrder, setPrintingOrder] = useState(null);


  const playAlertChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.log('Audio chime error:', e);
    }
  };

  const fetchKitchenOrders = async () => {
    try {
      const data = await api.getKitchenOrders();
      setOrders(data);
      const hasDelayed = data.some(o => (o.elapsed_minutes >= 15 || o.is_delayed) && o.status !== 'READY');
      if (hasDelayed && soundAlertsEnabled) {
        playAlertChime();
      }
    } catch (err) {

      console.error('Failed to load kitchen queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 3000); // Polling every 3s for live kitchen orders
    return () => clearInterval(interval);
  }, [soundAlertsEnabled]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.updateOrderStatus(orderId, newStatus, 'Chef Vikram (Kitchen)');
      fetchKitchenOrders();
    } catch (err) {
      alert('Error updating order status: ' + err.message);
    }
  };

  const delayedOrders = orders.filter(o => (o.elapsed_minutes >= 15 || o.is_delayed) && !['READY', 'SERVED', 'COMPLETED'].includes(o.status));

  const filteredOrders = orders.filter(o => {
    if (filter === 'ALL') return true;
    if (filter === 'OVERDUE') return (o.elapsed_minutes >= 15 || o.is_delayed) && !['READY', 'SERVED', 'COMPLETED'].includes(o.status);
    if (filter === 'NEW') return o.status === 'PLACED' || o.status === 'CONFIRMED';
    if (filter === 'PREPARING') return o.status === 'PREPARING';
    if (filter === 'READY') return o.status === 'READY';
    return true;
  });

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '24px' }}>
      {/* Top Alert Banner for >15m Overdue Orders */}
      {delayedOrders.length > 0 && (
        <div style={{
          marginBottom: 20,
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: '2px solid #ef4444',
          borderRadius: 'var(--radius-md)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 16px rgba(239, 68, 68, 0.25)',
          animation: 'pulse-danger 2s infinite'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#991b1b' }}>
                🚨 KITCHEN DELAY ALERT: {delayedOrders.length} Order(s) Waiting &gt; 15 Minutes!
              </div>
              <div style={{ fontSize: '0.8rem', color: '#b91c1c' }}>
                Tables: {delayedOrders.map(o => o.table_number).join(', ')} — Please expedite food preparation and serving immediately.
              </div>
            </div>
          </div>
          <button
            onClick={() => setFilter('OVERDUE')}
            className="btn btn-sm"
            style={{ background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700 }}
          >
            View Overdue Tickets ({delayedOrders.length})
          </button>
        </div>
      )}

      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(139,92,246,0.35)'
          }}>
            <ChefHat size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Kitchen Display System (KDS)</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Live chef workstation • Preparation timers, 15m delay alerts & ticket routing
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Sound alert toggle */}
          <button
            onClick={toggleSoundAlerts}
            className="btn btn-secondary btn-sm"
            title="Toggle kitchen audio chime"
          >
            {soundAlertsEnabled ? <Volume2 size={16} color="var(--accent-gold)" /> : <VolumeX size={16} />}
            <span>Chime {soundAlertsEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button onClick={fetchKitchenOrders} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12, flexWrap: 'wrap' }}>
        {[
          { key: 'ALL', label: `All Active (${orders.length})` },
          { key: 'OVERDUE', label: `🚨 Overdue >15m (${delayedOrders.length})`, isAlert: delayedOrders.length > 0 },
          { key: 'NEW', label: `New Tickets (${orders.filter(o => o.status === 'PLACED' || o.status === 'CONFIRMED').length})` },
          { key: 'PREPARING', label: `Cooking (${orders.filter(o => o.status === 'PREPARING').length})` },
          { key: 'READY', label: `Ready for Serving (${orders.filter(o => o.status === 'READY').length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: tab.isAlert
                ? '1px solid #ef4444'
                : filter === tab.key ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
              background: filter === tab.key
                ? tab.isAlert ? '#fee2e2' : 'var(--accent-gold-dim)'
                : tab.isAlert ? '#fef2f2' : 'var(--bg-surface-elevated)',
              color: tab.isAlert
                ? '#dc2626'
                : filter === tab.key ? 'var(--accent-gold)' : 'var(--text-secondary)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Kanban Order Cards Grid */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading kitchen tickets...
        </div>
      ) : filteredOrders.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 20
        }}>
          {filteredOrders.map(order => {
            const isNew = order.status === 'PLACED' || order.status === 'CONFIRMED';
            const isPreparing = order.status === 'PREPARING';
            const isReady = order.status === 'READY';
            const isDelayed = (order.elapsed_minutes >= 15 || order.is_delayed) && !isReady;

            return (
              <div
                key={order.id}
                className="glass-panel"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  border: isReady
                    ? '2px solid var(--status-ready)'
                    : isPreparing
                    ? '2px solid var(--status-preparing)'
                    : '2px solid var(--status-ordering)',
                  boxShadow: isDelayed ? '0 0 20px rgba(244,63,94,0.3)' : 'var(--shadow-md)',
                  background: 'var(--bg-surface)'
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <span style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: 'var(--accent-gold)'
                      }}>
                        ORDER #{order.order_number}
                      </span>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                        {order.table_number} • {order.customer_name}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${
                        isReady ? 'badge-ready' : isPreparing ? 'badge-preparing' : 'badge-ordering'
                      }`}>
                        {order.status}
                      </span>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 4,
                        fontSize: '0.75rem',
                        marginTop: 4,
                        color: isDelayed ? 'var(--status-occupied)' : 'var(--text-muted)',
                        fontWeight: isDelayed ? 700 : 500
                      }}>
                        <Clock size={12} />
                        <span>{order.elapsed_minutes || 1}m ago</span>
                        {isDelayed && <span className="animate-pulse">⚠️</span>}
                      </div>
                    </div>
                  </div>

                  {/* Order Notes Banner */}
                  {order.notes && (
                    <div style={{
                      background: 'rgba(245,158,11,0.12)',
                      border: '1px solid rgba(245,158,11,0.3)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      color: 'var(--status-ordering)',
                      fontWeight: 600,
                      marginBottom: 14
                    }}>
                      ⚡ Note: {order.notes}
                    </div>
                  )}

                  {/* Dishes Itemized List */}
                  <div style={{
                    borderTop: '1px dashed var(--border-subtle)',
                    borderBottom: '1px dashed var(--border-subtle)',
                    padding: '12px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    marginBottom: 16
                  }}>
                    {order.items?.map((item) => (
                      <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <span style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)'
                          }}>
                            <span style={{ color: 'var(--accent-gold)', marginRight: 6 }}>
                              {item.quantity} ×
                            </span>
                            {item.item_name} {item.variant_name ? `(${item.variant_name})` : ''}
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: item.status === 'READY' ? 'var(--status-ready-bg)' : 'var(--bg-surface-elevated)',
                            color: item.status === 'READY' ? 'var(--status-ready)' : 'var(--text-muted)'
                          }}>
                            {item.status}
                          </span>
                        </div>

                        {/* Addons */}
                        {item.addons_json?.map((a, aidx) => (
                          <div key={aidx} style={{ fontSize: '0.78rem', color: 'var(--accent-gold)', paddingLeft: 18 }}>
                            + {a.name}
                          </div>
                        ))}

                        {/* Item cooking notes */}
                        {item.special_instructions && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--status-ordering)', paddingLeft: 18, fontStyle: 'italic' }}>
                            "{item.special_instructions}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Triggers */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setPrintingOrder(order)}
                    className="btn btn-secondary btn-sm"
                    title="Print Kitchen Ticket (KOT)"
                  >
                    <Printer size={14} />
                    <span>KOT</span>
                  </button>

                  {isNew && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                      className="btn btn-sm"
                      style={{ flex: 1, background: 'var(--status-preparing)', color: '#fff', fontWeight: 700 }}
                    >
                      <Play size={14} />
                      <span>Start Preparing</span>
                    </button>
                  )}

                  {isPreparing && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'READY')}
                      className="btn btn-sm"
                      style={{ flex: 1, background: 'var(--status-ready)', color: '#fff', fontWeight: 700 }}
                    >
                      <CheckCircle size={14} />
                      <span>Mark Ready</span>
                    </button>
                  )}

                  {isReady && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'SERVED')}
                      className="btn btn-sm"
                      style={{ flex: 1, background: 'var(--status-served)', color: '#fff', fontWeight: 700 }}
                    >
                      <Check size={14} />
                      <span>Serve to Table</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          padding: '80px 0',
          textAlign: 'center',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border-medium)'
        }}>
          <CheckCircle size={44} color="var(--status-available)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.2rem' }}>Kitchen Queue is All Clear!</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            New customer QR orders and waiter POS orders will pop up here in real time.
          </p>
        </div>
      )}

      {/* Printable Kitchen Order Ticket (KOT) Modal */}
      {printingOrder && (
        <div className="modal-backdrop" onClick={() => setPrintingOrder(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 360, padding: 20 }}>
            <div
              className="printable-area"
              style={{
                fontFamily: 'Courier New, monospace',
                fontSize: '12px',
                color: '#000',
                background: '#fff',
                padding: '16px',
                borderRadius: 4
              }}
            >
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>
                KITCHEN ORDER TICKET (KOT)
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
              <div><strong>ORDER #{printingOrder.order_number}</strong></div>
              <div>TABLE: {printingOrder.table_number}</div>
              <div>TIME: {printingOrder.created_at_display}</div>
              <div>SERVER: {printingOrder.order_source}</div>
              {printingOrder.notes && (
                <div style={{ marginTop: 4, fontWeight: 'bold' }}>
                  NOTES: {printingOrder.notes}
                </div>
              )}
              <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {printingOrder.items?.map((item, idx) => (
                  <div key={idx}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                      {item.quantity} x {item.item_name} {item.variant_name ? `(${item.variant_name})` : ''}
                    </div>
                    {item.addons_json?.map((a, aidx) => (
                      <div key={aidx} style={{ fontSize: '11px', paddingLeft: 12 }}>+ {a.name}</div>
                    ))}
                    {item.special_instructions && (
                      <div style={{ fontSize: '11px', fontStyle: 'italic', paddingLeft: 12 }}>
                        * {item.special_instructions}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button onClick={() => setPrintingOrder(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
              <button onClick={() => window.print()} className="btn btn-primary btn-sm">
                <Printer size={14} />
                <span>Print Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
