import React, { useState } from 'react';
import { X, Plus, Minus, Check, Flame } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function DishDetailModal({ dish, onClose }) {
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState(dish.variants?.[0] || null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);

  if (!dish) return null;

  const basePrice = selectedVariant ? parseFloat(selectedVariant.price) : parseFloat(dish.price);
  const addonsTotal = selectedAddons.reduce((acc, a) => acc + parseFloat(a.price), 0);
  const unitPrice = basePrice + addonsTotal;
  const totalPrice = unitPrice * quantity;

  const handleToggleAddon = (addon) => {
    if (selectedAddons.some(a => a.name === addon.name)) {
      setSelectedAddons(selectedAddons.filter(a => a.name !== addon.name));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const handleAddToCart = () => {
    addItem(dish, quantity, selectedVariant, selectedAddons, notes);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 420,
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Dish Image Banner */}
        {dish.image_url && (
          <div style={{ height: 180, position: 'relative' }}>
            <img
              src={dish.image_url}
              alt={dish.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
            <div style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
              padding: '3px 10px',
              borderRadius: 6,
              fontSize: '0.74rem',
              fontWeight: 700,
              color: dish.is_veg ? 'var(--status-available)' : 'var(--status-occupied)'
            }}>
              {dish.is_veg ? '🟢 100% PURE VEG' : '🔴 NON-VEG'}
            </div>
          </div>
        )}

        {/* Content Details */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{dish.name}</h3>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                ₹{dish.price}
              </span>
            </div>
            {dish.description && (
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>
                {dish.description}
              </p>
            )}
          </div>

          {/* Size Variant Selector if any */}
          {dish.variants?.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Select Portion / Size
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {dish.variants.map((v, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedVariant(v)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: selectedVariant?.name === v.name ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                      background: selectedVariant?.name === v.name ? 'var(--accent-gold-dim)' : 'var(--bg-surface-elevated)',
                      color: selectedVariant?.name === v.name ? 'var(--accent-gold)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 600
                    }}
                  >
                    {v.name} (₹{v.price})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add-ons & Extra Toppings */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Custom Add-ons & Extras
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { name: 'Extra Mozzarella Cheese', price: 40 },
                { name: 'Jalapeños & Black Olives', price: 30 },
                { name: 'Peri Peri Seasoning Dip', price: 25 },
              ].map((addon, idx) => {
                const isSelected = selectedAddons.some(a => a.name === addon.name);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleToggleAddon(addon)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'var(--accent-gold-dim)' : 'var(--bg-surface-elevated)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.82rem',
                      color: isSelected ? 'var(--accent-gold)' : 'var(--text-primary)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: isSelected ? '1px solid var(--accent-gold)' : '1px solid var(--border-medium)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isSelected ? 'var(--accent-gold)' : 'transparent',
                        color: '#0e0a07'
                      }}>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span>{addon.name}</span>
                    </div>
                    <span style={{ fontWeight: 700 }}>+₹{addon.price}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Special Cooking Instructions */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Special Cooking Instructions
            </label>
            <input
              type="text"
              placeholder="e.g. No onions please, extra crispy, less sugar"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.82rem'
              }}
            />
          </div>

          {/* Quantity & Add to Cart button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface-elevated)'
            }}>
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{ padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                <Minus size={16} />
              </button>
              <span style={{ padding: '0 8px', fontWeight: 800, fontSize: '1rem', minWidth: 24, textAlign: 'center' }}>
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                style={{ padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              className="btn btn-primary"
              style={{ flex: 1, padding: '12px 18px', fontSize: '0.95rem' }}
            >
              <span>Add to Order</span>
              <span>•</span>
              <span>₹{totalPrice}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
