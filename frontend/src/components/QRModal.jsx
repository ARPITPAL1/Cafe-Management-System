import React, { useState } from 'react';
import { QrCode, Copy, Check, Printer, RefreshCw, X, ExternalLink, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function QRModal({ table, onClose, onTokenRegenerated }) {
  const { cafeInfo } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!table) return null;

  const currentOrigin = window.location.origin;
  const fullUrl = `${currentOrigin}/t/${table.public_token}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&color=120d09&bgcolor=ffffff&data=${encodeURIComponent(fullUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!window.confirm(`Are you sure you want to regenerate the QR token for ${table.number}? Any existing printed standee will stop working.`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await api.regenerateToken(table.id);
      if (onTokenRegenerated) onTokenRegenerated(res.public_token);
    } catch (err) {
      alert('Failed to regenerate token: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, maxHeight: '92vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--accent-gold-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-gold)'
            }}>
              <QrCode size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{table.number} QR Standee</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {table.capacity} Seats • {table.floor_section}
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
              padding: 4
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Printable Standee Card */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            className="printable-area"
            style={{
              width: '100%',
              maxWidth: 320,
              background: '#ffffff',
              borderRadius: 18,
              padding: '24px 20px',
              color: '#1a1410',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              border: '2px solid #e8dbcc',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              boxSizing: 'border-box'
            }}
          >
            <div style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.76rem', fontWeight: 800, color: '#8c5d33' }}>
              {cafeInfo?.name || 'The Velvet Bean & Bistro'}
            </div>

            <div style={{
              background: '#f8f4ed',
              padding: '4px 18px',
              borderRadius: 20,
              fontWeight: 800,
              fontSize: '1.25rem',
              color: '#2a1a0f',
              letterSpacing: '-0.01em',
              border: '1.5px solid #d4a373',
              boxShadow: '0 2px 6px rgba(212,163,115,0.2)'
            }}>
              {table.number}
            </div>

            {/* QR Image */}
            <div style={{
              background: '#ffffff',
              padding: 10,
              borderRadius: 14,
              border: '1px solid #e0d5c5',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
            }}>
              <img
                src={qrImageUrl}
                alt={`QR code for ${table.number}`}
                style={{ width: 170, height: 170, display: 'block', margin: '0 auto' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div style={{
                display: 'none',
                width: 170,
                height: 170,
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f3ede4',
                color: '#8c5d33',
                fontSize: '0.78rem',
                flexDirection: 'column',
                gap: 6
              }}>
                <QrCode size={44} />
                <span>Scan Token: {table.public_token}</span>
              </div>
            </div>

            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1a1410', lineHeight: 1.2, marginTop: 2 }}>
              Scan to View Menu & Order
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6d5a4d' }}>
              No app download required • Instant live ordering
            </div>
            <div style={{ fontSize: '0.65rem', color: '#998675', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {fullUrl}
            </div>
          </div>

          {/* URL Bar */}
          <div style={{
            width: '100%',
            maxWidth: 320,
            marginTop: 16,
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10
          }}>
            <span style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              fontFamily: 'monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {fullUrl}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={handleCopy}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px' }}
                title="Copy URL"
              >
                {copied ? <Check size={14} color="var(--status-available)" /> : <Copy size={14} />}
              </button>
              <a
                href={fullUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px' }}
                title="Open in new tab"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <button
            onClick={handleRegenerate}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            style={{ color: 'var(--status-occupied)' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Regenerate QR</span>
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handlePrint} className="btn btn-secondary btn-sm">
              <Printer size={14} />
              <span>Print Standee</span>
            </button>
            <button onClick={onClose} className="btn btn-primary btn-sm">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

