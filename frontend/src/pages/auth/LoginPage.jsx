import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, getRoleHomePath } from '../../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  UtensilsCrossed,
  Receipt,
  ChefHat,
  LayoutDashboard,
} from 'lucide-react';

export default function LoginPage() {
  const { login, cafeInfo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRoleKey, setSelectedRoleKey] = useState(null);

  const roleCards = [
    {
      key: 'owner',
      title: 'Owner / Admin',
      icon: LayoutDashboard,
      color: '#d4af37',
      bg: 'rgba(212,175,55,0.12)',
      scope: 'Full Control: Settings, Menu BOM, Financials, Shifts & Reports'
    },
    {
      key: 'manager',
      title: 'Floor Manager',
      icon: ShieldCheck,
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.12)',
      scope: 'Operations: Tables, Live Orders, Menu & Staff Reports'
    },
    {
      key: 'cashier',
      title: 'Cashier (Billing)',
      icon: Receipt,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.12)',
      scope: 'Billing POS: Invoicing, Drawer Float, Z-Report & Orders'
    },
    {
      key: 'kitchen',
      title: 'Kitchen Chef',
      icon: ChefHat,
      color: '#f97316',
      bg: 'rgba(249,115,22,0.12)',
      scope: 'Kitchen KDS: Real-time Cooking Queue & Order Tickets'
    }
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your Staff ID');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(username.trim(), password.trim());
      const destination = location.state?.from || getRoleHomePath(loggedUser.role);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your ID and password.');
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
      background: 'radial-gradient(circle at 50% 10%, rgba(212,175,55,0.12) 0%, #0d0a08 75%)',
      padding: '32px 16px',
      color: 'var(--text-primary)'
    }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        {/* Top Cafe Branding */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #d4af37 0%, #8c5d33 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0e0a07',
            margin: '0 auto 14px',
            boxShadow: '0 8px 30px rgba(212,175,55,0.35)'
          }}>
            <UtensilsCrossed size={30} strokeWidth={2.3} />
          </div>

          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            fontFamily: 'var(--font-heading)',
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em'
          }}>
            {cafeInfo?.name || 'Musafirr Cafe & Bistro'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', marginTop: 4, fontWeight: 700, letterSpacing: '0.04em' }}>
            STAFF & TERMINAL ACCESS PORTAL
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Enter your designated Staff ID and Password to unlock role-specific terminal views.
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-panel" style={{
          padding: '32px 28px',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(16px)'
        }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 20
            }}>
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Role Cards */}
          <div style={{ marginBottom: 24 }}>
            <span style={{
              display: 'block',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 10
            }}>
              Select Your Role
            </span>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10
            }}>
              {roleCards.map(card => {
                const Icon = card.icon;
                const isSelected = selectedRoleKey === card.key;
                return (
                  <button
                    key={card.key}
                    type="button"
                    onClick={() => {
                      setSelectedRoleKey(card.key);
                      setError('');
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? `1.5px solid ${card.color}` : '1px solid var(--border-medium)',
                      background: isSelected ? card.bg : 'var(--bg-surface-elevated)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: card.bg,
                        color: card.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon size={13} />
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isSelected ? card.color : 'var(--text-primary)' }}>
                        {card.title}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {card.scope}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin}>
            {/* Staff ID */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: 6
              }}>
                Staff ID / Username
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="text"
                  required
                  placeholder="Enter Staff ID / Username"
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value);
                    setSelectedRoleKey(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '0.92rem'
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: 6
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 38px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '0.92rem'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 11,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Terminal'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Access Matrix Summary */}
          <div style={{
            marginTop: 24,
            paddingTop: 18,
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-gold)', fontWeight: 700, marginBottom: 4 }}>
              <Sparkles size={13} />
              <span>Strict Role-Based Access Control (RBAC):</span>
            </div>
            <div>• <strong>Cashier:</strong> Dedicated exclusively to POS Billing & Invoicing</div>
            <div>• <strong>Kitchen:</strong> Dedicated exclusively to Kitchen Display System (KDS)</div>
            <div>• <strong>Manager:</strong> Operational floor management & menu control</div>
            <div>• <strong>Owner:</strong> Full administrative privileges, financial audit & settings</div>
          </div>
        </div>
      </div>
    </div>
  );
}
