import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Users,
  Search,
  Star,
  Phone,
  Calendar,
  ShoppingBag,
  MessageSquare,
  Award,
  ChevronRight
} from 'lucide-react';

export default function CustomerDirectory() {
  const [customers, setCustomers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCust, setSelectedCust] = useState(null);
  const [custDetail, setCustDetail] = useState(null);

  const fetchCustomers = async () => {
    try {
      const [custList, fbList] = await Promise.all([
        api.getCustomers(search),
        api.getFeedback()
      ]);
      setCustomers(custList);
      setFeedbacks(fbList);

      if (!selectedCust && custList.length > 0) {
        handleSelectCustomer(custList[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handleSelectCustomer = async (cust) => {
    setSelectedCust(cust);
    try {
      const detail = await api.getCustomerDetail(cust.id);
      setCustDetail(detail);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Customer CRM & Guest Feedback</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
          Profiles, repeat visit frequencies, lifetime spending & verified dining survey reviews
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '380px 1fr',
        gap: 24,
        alignItems: 'start'
      }}>
        {/* Left Column: Customer Directory List with Search */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 600, overflowY: 'auto' }}>
            {customers.map(c => {
              const isSelected = selectedCust?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectCustomer(c)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'var(--accent-gold-dim)' : 'var(--bg-surface-elevated)',
                    border: isSelected ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: isSelected ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {c.phone}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      ₹{c.total_spend}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--accent-gold)' }}>
                      {c.total_orders} Orders
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Customer Deep Profile & Feedback Reviews */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {custDetail ? (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>{custDetail.customer.name}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={14} /> {custDetail.customer.phone}
                    </span>
                    <span>•</span>
                    <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                      Verified Guest ✓
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Lifetime Spend</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-available)' }}>
                    ₹{custDetail.customer.total_spend}
                  </div>
                </div>
              </div>

              {/* Stat Pills */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Visits</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                    {custDetail.customer.total_orders}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Avg Order Value</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                    ₹{custDetail.customer.total_orders > 0 ? (custDetail.customer.total_spend / custDetail.customer.total_orders).toFixed(0) : 0}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Loyalty Tier</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-gold)', marginTop: 4 }}>
                    {custDetail.customer.total_orders >= 10 ? 'VIP Gold' : 'Regular Member'}
                  </div>
                </div>
              </div>

              {/* Recent Orders History */}
              <h4 style={{ fontSize: '1rem', marginBottom: 12 }}>Past Dining Orders</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {custDetail.recent_orders?.length > 0 ? (
                  custDetail.recent_orders.map(o => (
                    <div
                      key={o.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface-elevated)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>Order #{o.order_number}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>({o.table})</span>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{o.date}</div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 800 }}>₹{o.subtotal}</span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--status-available)' }}>{o.status}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    No previous order history.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Guest Reviews & Star Feedback Section */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Star size={18} color="var(--accent-gold)" fill="var(--accent-gold)" />
              <h3 style={{ fontSize: '1.15rem' }}>Customer Feedback & Reviews ({feedbacks.length})</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {feedbacks.map(fb => (
                <div
                  key={fb.id}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {fb.customer_name}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                        {fb.created_display}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 2 }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          size={14}
                          color="var(--accent-gold)"
                          fill={star <= fb.rating_overall ? 'var(--accent-gold)' : 'transparent'}
                        />
                      ))}
                    </div>
                  </div>

                  {fb.comments && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 4 }}>
                      "{fb.comments}"
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 14, fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
                    <span>Food: <strong>{fb.rating_food}★</strong></span>
                    <span>Service: <strong>{fb.rating_service}★</strong></span>
                    <span>Ambience: <strong>{fb.rating_ambience}★</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
