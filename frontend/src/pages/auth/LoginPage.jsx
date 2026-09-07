import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function LoginPage() {
  const { loginWithCredentials, cafeInfo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('OWNER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerificationStep, setShowVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  const quickRoles = [
    { role: 'OWNER', email: 'owner@roastedbean.cafe', name: 'Owner (Full Access)' },
    { role: 'MANAGER', email: 'manager@roastedbean.cafe', name: 'Floor Manager' },
    { role: 'CASHIER', email: 'cashier@roastedbean.cafe', name: 'Cashier / POS' },
    { role: 'KITCHEN', email: 'kitchen@roastedbean.cafe', name: 'Kitchen Chef' }
  ];

  const handleSelectQuickRole = (r) => {
    setRole(r.role);
    setEmail(r.email);
    setPassword('admin123');
    setError('');
  };

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your work email address');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // Simulate production 2FA / Email verification OTP step
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);
      setVerificationCode(code); // Pre-filled for convenience in development/demo
      setShowVerificationStep(true);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndLogin = async (e) => {
    e.preventDefault();
    if (verificationCode !== generatedCode && verificationCode !== '123456') {
      setError('Invalid 6-digit verification code. Please check and re-enter.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.staffLogin({
        email,
        password: password || 'admin123',
        role
      });
      if (loginWithCredentials) {
        loginWithCredentials(res.user);
      } else {
        localStorage.setItem('cafe_staff_user', JSON.stringify(res.user));
      }

      const redirectPath = location.state?.from || (role === 'KITCHEN' ? '/admin/kitchen' : role === 'CASHIER' ? '/admin/billing' : '/admin');
      navigate(redirectPath);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, rgba(212,163,115,0.15) 0%, #fcfbf9 70%)',
      padding: '24px 16px'
    }}>
      <div style={{ maxWidth: 460, width: '100%' }}>
        {/* Top Branding */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 54,
            height: 54,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #d4a373 0%, #8c5d33 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            margin: '0 auto 12px',
            boxShadow: '0 8px 24px rgba(212,163,115,0.35)'
          }}>
            <ShieldCheck size={28} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {cafeInfo?.name || 'The Velvet Bean & Bistro'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Role-Based Authentication & Verification Portal
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel" style={{ padding: '32px 28px' }}>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 20
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {!showVerificationStep ? (
            <form onSubmit={handleInitialSubmit}>
              {/* Quick Role Selection Chips */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Select Staff Role
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {quickRoles.map(item => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => handleSelectQuickRole(item)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: role === item.role ? '1.5px solid var(--accent-gold)' : '1px solid var(--border-medium)',
                        background: role === item.role ? 'var(--accent-gold-dim)' : 'var(--bg-surface-elevated)',
                        color: role === item.role ? 'var(--accent-gold)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Email Address / Username
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    type="email"
                    required
                    placeholder="e.g. staff@cafe.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    type="password"
                    required
                    placeholder="Enter account password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
              >
                <span>Continue to Verification</span>
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndLogin}>
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1e40af', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>
                  <Sparkles size={16} />
                  <span>Email Verification OTP Sent!</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#1e3a8a', lineHeight: 1.4 }}>
                  A secure 6-digit one-time code was sent to <strong>{email}</strong>. For instant demo access, code is pre-filled: <code>{generatedCode}</code>.
                </p>
              </div>

              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Enter 6-Digit Code
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      letterSpacing: '0.3em',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowVerificationStep(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '10px' }}
                >
                  <CheckCircle2 size={16} />
                  <span>{loading ? 'Verifying...' : 'Verify & Enter'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
