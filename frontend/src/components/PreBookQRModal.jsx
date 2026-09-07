import React, { useState } from 'react';
import { QrCode, Copy, Check, Printer, ExternalLink, X, Calendar, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PreBookQRModal({ isOpen, onClose }) {
  const { cafeInfo } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = window.location.origin;
  const bookingUrl = `${currentOrigin}/book-table`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&color=120d09&bgcolor=ffffff&data=${encodeURIComponent(bookingUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 480,
          width: '92%',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: 'var(--bg-surface-elevated)',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(217,119,6,0.3)'
            }}>
              <Calendar size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Advance Booking QR Standee
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0 }}>
                Print or display for diners to pre-book tables
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Printable Standee Card */}
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div
            id="printable-prebook-standee"
            style={{
              background: '#ffffff',
              color: '#120d09',
              borderRadius: '16px',
              padding: '24px 20px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              border: '2px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12
            }}
          >
            {/* Cafe Logo & Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #d4a373 0%, #8c5d33 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <Sparkles size={18} />
              </div>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#120d09', letterSpacing: '-0.02em' }}>
                {cafeInfo?.name || 'The Velvet Bean & Bistro'}
              </span>
            </div>

            <div style={{
              background: '#fef3c7',
              color: '#92400e',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '4px 12px',
              borderRadius: '20px'
            }}>
              ★ SCAN TO PRE-BOOK TABLE ★
            </div>

            {/* QR Code Container */}
            <div style={{
              background: '#ffffff',
              padding: '12px',
              borderRadius: '12px',
              border: '1.5px solid #cbd5e1',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <img
                src={qrImageUrl}
                alt="Advance Booking QR Code"
                style={{ width: 200, height: 200, display: 'block' }}
              />
            </div>

            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155', maxWidth: 280, lineHeight: 1.4 }}>
              Scan with your phone camera to pick your preferred table, date, time & duration on our interactive 2D map.
            </div>

            <div style={{
              fontSize: '0.72rem',
              color: '#64748b',
              borderTop: '1px dashed #cbd5e1',
              paddingTop: 8,
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Direct Link: {bookingUrl}</span>
              <span>Instant Confirmation</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
            <button
              onClick={handleCopy}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.82rem' }}
            >
              {copied ? <Check size={15} color="#16a34a" /> : <Copy size={15} />}
              <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.82rem' }}
            >
              <Printer size={15} />
              <span>Print Standee</span>
            </button>
          </div>

          <div style={{ marginTop: 10 }}>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: '0.84rem',
                textDecoration: 'none'
              }}
            >
              <ExternalLink size={15} />
              <span>Open Pre-Booking Page in New Tab</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
