import React, { useState } from 'react';
import { ShieldCheck, Phone, User, Check, X, ArrowRight, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';

export default function CustomerOTPModal({ isOpen, onClose, onVerified, tableSessionId }) {
  const { customer, saveCustomer } = useCart();
  const [step, setStep] = useState(customer ? 'CONFIRM' : 'PHONE'); // 'PHONE' -> 'OTP' -> 'CONFIRM'
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulatedOTP, setSimulatedOTP] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!phone || phone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.sendOTP(phone, name);
      setSimulatedOTP(res.otp_code);
      setOtpCode(res.otp_code); // Auto-fill for instant test demo convenience
      setStep('OTP');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!otpCode || otpCode.length < 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.verifyOTP(phone, otpCode, name, tableSessionId);
      saveCustomer(res.customer);
      onVerified(res.customer);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmExisting = () => {
    onVerified(customer);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1300 }}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
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
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Guest Verification</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Fast OTP • Connects order to your WhatsApp
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

        {errorMsg && (
          <div style={{
            background: 'rgba(244,63,94,0.12)',
            border: '1px solid rgba(244,63,94,0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            fontSize: '0.8rem',
            color: 'var(--status-occupied)',
            marginBottom: 14
          }}>
            {errorMsg}
          </div>
        )}

        {/* Step 1: Confirm previously saved customer */}
        {step === 'CONFIRM' && customer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Welcome Back</div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-primary)', marginTop: 4 }}>
                {customer.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--accent-gold)', marginTop: 2 }}>
                {customer.phone}
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmExisting}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
            >
              <span>Confirm & Place Dine-In Order</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={() => setStep('PHONE')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              Use a different mobile number
            </button>
          </div>
        )}

        {/* Step 2: Name & Phone number */}
        {step === 'PHONE' && (
          <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                Your Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                10-Digit Mobile Number
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}>
                  +91
                </span>
                <input
                  type="tel"
                  required
                  placeholder="98200 11221"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    letterSpacing: '0.04em'
                  }}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              * We will send your digital receipt & WhatsApp invoice to this number when dining is completed.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: 6 }}
            >
              {loading ? 'Sending Code...' : 'Send Verification OTP'}
            </button>
          </form>
        )}

        {/* Step 3: Enter 6-digit OTP */}
        {step === 'OTP' && (
          <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: 'rgba(212,163,115,0.1)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Code sent to +91 {phone}
              </div>
              {simulatedOTP && (
                <div style={{ fontSize: '0.82rem', color: 'var(--accent-gold)', marginTop: 4 }}>
                  Demo SMS OTP: <strong style={{ letterSpacing: '0.1em' }}>{simulatedOTP}</strong>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 6, textAlign: 'center' }}>
                Enter 6-Digit OTP
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-elevated)',
                  border: '2px solid var(--accent-gold)',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontSize: '1.4rem',
                  letterSpacing: '0.35em',
                  textAlign: 'center',
                  fontWeight: 800
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: 4 }}
            >
              {loading ? 'Verifying...' : 'Verify & Place Order'}
            </button>

            <button
              type="button"
              onClick={() => setStep('PHONE')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              Change phone number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
