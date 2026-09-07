import React, { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, X, KeyRound, AlertCircle, Sparkles } from 'lucide-react';

export default function AdminPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  actionDescription = 'make changes'
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the Admin/Owner password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Allow standard master passwords or check via backend
      const trimmed = password.trim();
      let isValid = false;

      if (['admin123', 'cafe1234', 'owner123'].includes(trimmed)) {
        isValid = true;
      } else {
        try {
          const res = await fetch('/api/core/verify-admin/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: trimmed })
          });
          const data = await res.json();
          if (res.ok && data.valid) {
            isValid = true;
          }
        } catch {
          // If offline or network error, rely on accepted defaults
        }
      }

      if (isValid) {
        sessionStorage.setItem('cafe_admin_edit_password', trimmed);
        setPassword('');
        setError('');
        if (typeof onSuccess === 'function') {
          onSuccess(trimmed);
        }
        onClose();
      } else {
        setError('Incorrect password. Editing is restricted on this live demo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.72)',
      backdropFilter: 'blur(8px)',
      padding: 16
    }}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--bg-surface-elevated, #1c1511)',
          border: '1.5px solid var(--border-medium, rgba(212,163,115,0.3))',
          borderRadius: '18px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          padding: '28px 24px',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            color: 'var(--text-muted, #888)',
            cursor: 'pointer',
            padding: 4
          }}
        >
          <X size={20} />
        </button>

        {/* Header Icon */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #d4a373 0%, #8c5d33 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            margin: '0 auto 12px',
            boxShadow: '0 6px 20px rgba(212,163,115,0.4)'
          }}>
            <Lock size={24} />
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary, #fff)', margin: 0 }}>
            Admin Password Required
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #a89f91)', marginTop: 6, lineHeight: 1.4 }}>
            This live deployment is in protected <strong>View-Only</strong> mode. Enter the Admin/Owner password to authorize changes:
          </p>
        </div>

        {/* Action Badge */}
        {actionDescription && (
          <div style={{
            background: 'rgba(212,163,115,0.1)',
            border: '1px solid rgba(212,163,115,0.25)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '0.78rem',
            color: 'var(--accent-gold, #d4a373)',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 600
          }}>
            <Sparkles size={15} />
            <span>Target Action: {actionDescription}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '0.8rem',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-secondary, #ddd)',
              marginBottom: 6
            }}>
              Owner / Admin Password
            </label>
            <div style={{ position: 'relative' }}>
              <KeyRound
                size={16}
                color="var(--text-muted, #888)"
                style={{ position: 'absolute', left: 12, top: 12 }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                placeholder="Enter password (e.g. admin123)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 38px',
                  borderRadius: '8px',
                  background: 'var(--bg-surface, #120d0a)',
                  border: '1px solid var(--border-medium, rgba(212,163,115,0.3))',
                  color: 'var(--text-primary, #fff)',
                  fontSize: '0.9rem'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 10,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #888)',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #888)', marginTop: 6 }}>
              💡 Hint for demo reviewers: password is <code>admin123</code>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '10px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                flex: 2,
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <ShieldCheck size={16} />
              <span>{loading ? 'Verifying...' : 'Unlock & Proceed'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
