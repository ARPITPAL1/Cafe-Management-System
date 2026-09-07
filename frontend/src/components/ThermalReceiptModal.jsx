import React, { useState } from 'react';
import { Printer, MessageCircle, X, Check, CheckCircle2, Share2 } from 'lucide-react';
import { api } from '../services/api';

export default function ThermalReceiptModal({ bill, cafeInfo, onClose, onCloseSession }) {
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);
  const [phone, setPhone] = useState(() => bill?.customer_phone || '');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [phoneError, setPhoneError] = useState('');

  if (!bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = async () => {
    const cleanNum = (phone || '').trim();
    if (!cleanNum) {
      setPhoneError('Please enter a customer mobile number');
      return;
    }
    setPhoneError('');
    setLoadingWhatsapp(true);
    try {
      const res = await api.sendWhatsAppInvoice(bill.id, cleanNum);
      setWhatsappSent(true);
      if (res.whatsapp_url) {
        setWhatsappUrl(res.whatsapp_url);
        window.open(res.whatsapp_url, '_blank');
      }
      setTimeout(() => setWhatsappSent(false), 5000);
    } catch (err) {
      alert('Failed to send WhatsApp message: ' + err.message);
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <h3 style={{ fontSize: '1.1rem' }}>Tax Invoice & Thermal Receipt</h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Receipt Container */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            className="printable-area"
            style={{
              width: '100%',
              maxWidth: 340,
              background: '#fffdfa',
              borderRadius: 8,
              padding: '24px 18px',
              color: '#1a1410',
              fontFamily: 'Courier New, monospace',
              fontSize: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              border: '1px solid #dfd3c3'
            }}
          >
            {/* Cafe Info Header */}
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                {cafeInfo?.name || 'The Velvet Bean & Bistro'}
              </div>
              <div style={{ fontSize: '10px', color: '#555', marginTop: 2 }}>
                {cafeInfo?.address || '42 Heritage Blvd, Mumbai'}
              </div>
              <div style={{ fontSize: '10px', color: '#555' }}>
                Phone: {cafeInfo?.phone || '+91 98201 55667'}
              </div>
              <div style={{ fontSize: '10px', color: '#555' }}>
                GSTIN: {cafeInfo?.gstin || '27AABCU9603R1ZN'}
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #777', margin: '8px 0' }} />

            {/* Invoice Meta */}
            <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Invoice: {bill.bill_number}</span>
              <span>Table: {bill.table_number}</span>
            </div>
            <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span>Date: {bill.created_display || new Date().toLocaleDateString()}</span>
              <span>Status: {bill.status}</span>
            </div>

            <div style={{ borderTop: '1px dashed #777', margin: '8px 0' }} />

            {/* Table Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 48px 56px', fontWeight: 'bold', fontSize: '11px', marginBottom: 4 }}>
              <span>ITEM</span>
              <span style={{ textAlign: 'center' }}>QTY</span>
              <span style={{ textAlign: 'right' }}>RATE</span>
              <span style={{ textAlign: 'right' }}>AMT</span>
            </div>

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {bill.items_breakdown?.map((item, idx) => (
                <div key={idx}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 48px 56px', fontSize: '11px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.item_name} {item.variant ? `(${item.variant})` : ''}
                    </span>
                    <span style={{ textAlign: 'center' }}>{item.quantity}</span>
                    <span style={{ textAlign: 'right' }}>{item.unit_price}</span>
                    <span style={{ textAlign: 'right' }}>₹{item.total_price}</span>
                  </div>
                  {item.addons?.map((a, aidx) => (
                    <div key={aidx} style={{ fontSize: '9px', color: '#666', paddingLeft: 6 }}>
                      + {a.name} (₹{a.price})
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px dashed #777', margin: '8px 0' }} />

            {/* Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>₹{parseFloat(bill.subtotal).toFixed(2)}</span>
              </div>
              {parseFloat(bill.discount_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c00' }}>
                  <span>Discount ({bill.discount_reason || 'Offer'}):</span>
                  <span>-₹{parseFloat(bill.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>CGST (2.5%):</span>
                <span>₹{parseFloat(bill.cgst_amount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>SGST (2.5%):</span>
                <span>₹{parseFloat(bill.sgst_amount).toFixed(2)}</span>
              </div>
              {parseFloat(bill.service_charge) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Service Charge:</span>
                  <span>₹{parseFloat(bill.service_charge).toFixed(2)}</span>
                </div>
              )}
              {bill.coupon_code && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontSize: '10px' }}>
                  <span>Coupon Applied:</span>
                  <strong>{bill.coupon_code}</strong>
                </div>
              )}
              {parseFloat(bill.round_off) !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#777' }}>
                  <span>Round Off:</span>
                  <span>₹{parseFloat(bill.round_off).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #222', borderBottom: '1px solid #222', padding: '6px 0', margin: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
                <span>GRAND TOTAL:</span>
                <span>₹{parseFloat(bill.grand_total).toFixed(2)}</span>
              </div>
            </div>

            {/* Payments breakdown (Split Payment) */}
            {bill.payments?.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', marginBottom: 2 }}>
                  Tender Breakdown:
                </div>
                {bill.payments.map((p, pidx) => (
                  <div key={pidx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#444' }}>
                    <span>{p.method_display || p.method} {p.reference_id ? `(${p.reference_id})` : ''}:</span>
                    <span>₹{parseFloat(p.amount).toFixed(2)} [PAID]</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
                Thank You For Dining With Us!
              </div>
              <div style={{ fontSize: '9px', color: '#777', marginTop: 2 }}>
                Please share your review & visit again.
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          {/* WhatsApp Mobile Input Bar */}
          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: phoneError ? '1.5px solid #ef4444' : '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <MessageCircle size={18} color="#25D366" />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Customer WhatsApp Mobile
                </span>
                {phoneError && (
                  <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>
                    {phoneError}
                  </span>
                )}
              </div>
              <input
                type="tel"
                placeholder="Enter 10-digit mobile (e.g. 98201 55667)..."
                value={phone}
                onChange={e => { setPhone(e.target.value); setPhoneError(''); }}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  outline: 'none',
                  padding: 0
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={handlePrint} className="btn btn-secondary">
              <Printer size={16} />
              <span>Print Bill</span>
            </button>

            <button
              onClick={handleSendWhatsApp}
              disabled={loadingWhatsapp}
              className="btn btn-secondary"
              style={{
                background: whatsappSent ? 'rgba(37,211,102,0.12)' : 'var(--bg-surface-elevated)',
                borderColor: '#25D366',
                color: '#128C7E',
                fontWeight: 700
              }}
            >
              {whatsappSent ? (
                <>
                  <Check size={16} color="#25D366" />
                  <span>Sent via WhatsApp!</span>
                </>
              ) : (
                <>
                  <MessageCircle size={16} color="#25D366" />
                  <span>{loadingWhatsapp ? 'Dispatching...' : 'Send WhatsApp'}</span>
                </>
              )}
            </button>
          </div>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                textAlign: 'center',
                fontSize: '0.78rem',
                color: '#128C7E',
                textDecoration: 'underline',
                fontWeight: 600,
                marginTop: -4
              }}
            >
              ↗ Click here if WhatsApp Web didn't open automatically
            </a>
          )}

          {onCloseSession && (
            <button
              onClick={() => onCloseSession(bill)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            >
              <CheckCircle2 size={18} />
              <span>Complete Payment & Close Table</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
