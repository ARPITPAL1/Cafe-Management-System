import React from 'react';
import { X, Plus, Minus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CustomerCartDrawer({ isOpen, onClose, onProceedToCheckout, table }) {
  const { cartItems, updateQuantity, removeItem, cartSubtotal, cartCount } = useCart();

  if (!isOpen) return null;

  const cgst = Math.round((cartSubtotal * 0.025) * 100) / 100;
  const sgst = Math.round((cartSubtotal * 0.025) * 100) / 100;
  const estimatedTotal = Math.round(cartSubtotal + cgst + sgst);

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100, alignItems: 'flex-end', padding: 0 }}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 480,
          borderRadius: '24px 24px 0 0',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.6)'
        }}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'var(--accent-gold-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-gold)'
            }}>
              <ShoppingBag size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Your Dine-In Cart</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {table?.number || 'Current Table'} • {cartCount} Item(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Cart Items List */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {cartItems.length > 0 ? (
            cartItems.map((ci, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {ci.item.is_veg ? '🟢 ' : '🔴 '}
                    {ci.item.name}
                  </div>
                  {ci.variant && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Size: {ci.variant.name}
                    </div>
                  )}
                  {ci.addons?.map((a, aidx) => (
                    <div key={aidx} style={{ fontSize: '0.74rem', color: 'var(--accent-gold)' }}>
                      + {a.name} (₹{a.price})
                    </div>
                  ))}
                  {ci.notes && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--status-ordering)', fontStyle: 'italic', marginTop: 2 }}>
                      Note: "{ci.notes}"
                    </div>
                  )}
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: 4 }}>
                    ₹{ci.totalPrice}
                  </div>
                </div>

                {/* Quantity Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => updateQuantity(idx, ci.quantity - 1)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', minWidth: 20, textAlign: 'center' }}>
                    {ci.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(idx, ci.quantity + 1)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Your cart is empty. Add delicious bites from the menu!
            </div>
          )}
        </div>

        {/* Footer Totals & Place Order Trigger */}
        {cartItems.length > 0 && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Subtotal</span>
                <span>₹{cartSubtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Taxes (CGST 2.5% + SGST 2.5%)</span>
                <span>₹{(cgst + sgst).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', color: 'var(--accent-gold)', marginTop: 4 }}>
                <span>Estimated Total</span>
                <span>₹{estimatedTotal}</span>
              </div>
            </div>

            <button
              onClick={onProceedToCheckout}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: 'var(--radius-sm)' }}
            >
              <span>Verify & Place Dine-In Order</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
