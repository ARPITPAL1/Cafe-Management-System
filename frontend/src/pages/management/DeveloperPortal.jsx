import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Code,
  ShieldAlert,
  Building,
  Key,
  User,
  Mail,
  Lock,
  Percent,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Coffee,
  Globe,
  Phone,
  Receipt
} from 'lucide-react';

export default function DeveloperPortal() {
  const { cafeInfo, refreshCafeProfile } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [devKey, setDevKey] = useState('');
  const [keyError, setKeyError] = useState('');

  // Provisioning form state
  const [cafeName, setCafeName] = useState('The Roasted Bean & Co.');
  const [tagline, setTagline] = useState('Artisan Coffee, Gourmet Bakes & Bistro');
  const [logoUrl, setLogoUrl] = useState('');
  const [ownerName, setOwnerName] = useState('Arpit Sharma');
  const [ownerEmail, setOwnerEmail] = useState('owner@roastedbean.cafe');
  const [ownerPassword, setOwnerPassword] = useState('admin123');
  const [managerPassword, setManagerPassword] = useState('manager123');
  const [cashierPassword, setCashierPassword] = useState('cashier123');
  const [kitchenPassword, setKitchenPassword] = useState('chef123');

  // Cafe Metadata
  const [address, setAddress] = useState('42 Heritage Boulevard, Bandra West, Mumbai 400050');
  const [phone, setPhone] = useState('+91 98201 55667');
  const [email, setEmail] = useState('contact@roastedbean.cafe');
  const [gstin, setGstin] = useState('27AABCU9603R1ZN');
  const [cgst, setCgst] = useState(2.5);
  const [sgst, setSgst] = useState(2.5);
  const [serviceCharge, setServiceCharge] = useState(0.0);

  // Result state
  const [submitting, setSubmitting] = useState(false);
  const [provisionResult, setProvisionResult] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);

  useEffect(() => {
    if (cafeInfo) {
      setCafeName(cafeInfo.name || '');
      setTagline(cafeInfo.tagline || '');
      setLogoUrl(cafeInfo.logo_url || '');
      setAddress(cafeInfo.address || '');
      setPhone(cafeInfo.phone || '');
      setEmail(cafeInfo.email || '');
      setGstin(cafeInfo.gstin || '');
      setCgst(cafeInfo.tax_rate_cgst || 2.5);
      setSgst(cafeInfo.tax_rate_sgst || 2.5);
      setServiceCharge(cafeInfo.service_charge_rate || 0.0);
    }
  }, [cafeInfo]);

  const handleUnlock = (e) => {
    e.preventDefault();
    if (devKey === 'dev2026' || devKey === 'admin' || devKey === 'developer') {
      setUnlocked(true);
      setKeyError('');
    } else {
      setKeyError('Invalid Developer Access Key. Hint: default dev key is dev2026');
    }
  };

  const handleProvision = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.provisionCafe({
        cafe_name: cafeName,
        tagline,
        logo_url: logoUrl,
        address,
        phone,
        email,
        gstin,
        currency: '₹',
        cgst: parseFloat(cgst) || 2.5,
        sgst: parseFloat(sgst) || 2.5,
        service_charge: parseFloat(serviceCharge) || 0.0,
        owner_name: ownerName,
        owner_email: ownerEmail,
        owner_password: ownerPassword,
        manager_password: managerPassword,
        cashier_password: cashierPassword,
        kitchen_password: kitchenPassword
      });

      setProvisionResult(res);
      if (refreshCafeProfile) {
        await refreshCafeProfile();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert('Error provisioning cafe: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2500);
  };

  if (!unlocked) {
    return (
      <div style={{ maxWidth: 460, margin: '80px auto', padding: '0 20px' }}>
        <div className="glass-panel" style={{ padding: '36px 28px', textAlign: 'center' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            margin: '0 auto 16px',
            boxShadow: '0 6px 20px rgba(180,83,9,0.3)'
          }}>
            <Code size={28} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Developer Onboarding Portal</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 6, lineHeight: 1.4 }}>
            Secure configuration link for developers to provision new cafe clients, set branding, logos, and role credentials dynamically.
          </p>

          <form onSubmit={handleUnlock} style={{ marginTop: 24 }}>
            <div style={{ textAlign: 'left', marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Developer Secret Key
              </label>
              <input
                type="password"
                placeholder="Enter key (e.g. dev2026)"
                value={devKey}
                onChange={e => setDevKey(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-elevated)',
                  border: keyError ? '1.5px solid #ef4444' : '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem'
                }}
              />
              {keyError && (
                <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 6 }}>
                  {keyError}
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
              <Key size={16} />
              <span>Unlock Developer Console</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: 999, fontWeight: 800 }}>
              DEVELOPER SUPERADMIN
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Route: /dev-setup</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: 4 }}>
            Cafe Onboarding & Client Provisioning
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 4 }}>
            Deploy this application for any cafe in seconds without modifying source code files.
          </p>
        </div>

        <button
          onClick={() => setUnlocked(false)}
          className="btn btn-secondary btn-sm"
        >
          Lock Console
        </button>
      </div>

      {/* Success Output Card */}
      {provisionResult && (
        <div style={{
          marginBottom: 28,
          background: '#f0fdf4',
          border: '2px solid #22c55e',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          boxShadow: '0 6px 24px rgba(34,197,94,0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <CheckCircle2 size={28} color="#16a34a" />
            <div>
              <h3 style={{ fontSize: '1.25rem', color: '#14532d', fontWeight: 800 }}>
                {provisionResult.message}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#166534' }}>
                All cafe settings, owner account, and staff credentials have been updated live!
              </p>
            </div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0', padding: '16px', marginTop: 12 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#14532d', marginBottom: 8, textTransform: 'uppercase' }}>
              Generated Client Login Credentials (Share with Cafe Owner):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {provisionResult.staff_accounts?.map((acc, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#f8fafc',
                  borderRadius: 6,
                  fontSize: '0.84rem'
                }}>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginRight: 8 }}>
                      [{acc.role}] {acc.name}:
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>Email: <code>{acc.email}</code></span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 12 }}>Password: <code>{acc.password}</code></span>
                  </div>
                  <button
                    onClick={() => handleCopy(`Role: ${acc.role}\nEmail: ${acc.email}\nPassword: ${acc.password}`, idx)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                  >
                    {copiedIdx === idx ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                    <span>{copiedIdx === idx ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Provisioning Form */}
      <form onSubmit={handleProvision} className="glass-panel" style={{ padding: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 28 }}>
          {/* Cafe Identity */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Building size={18} color="var(--accent-gold)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Cafe Branding</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Cafe Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Velvet Bean & Bistro"
                  value={cafeName}
                  onChange={e => setCafeName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Artisan Coffee, Gourmet Bakes & Bistro"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Logo Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.9rem' }}
                />
              </div>
            </div>
          </div>

          {/* Owner Account */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <User size={18} color="var(--accent-gold)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Cafe Owner Credentials</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Owner Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arpit Sharma"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Owner Email (Login ID) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="owner@cafe.com"
                  value={ownerEmail}
                  onChange={e => setOwnerEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Owner Password *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. admin123"
                  value={ownerPassword}
                  onChange={e => setOwnerPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.9rem' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Key size={18} color="var(--accent-gold)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Staff Role Passwords</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                Manager Password
              </label>
              <input
                type="text"
                value={managerPassword}
                onChange={e => setManagerPassword(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                Cashier Password
              </label>
              <input
                type="text"
                value={cashierPassword}
                onChange={e => setCashierPassword(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                Kitchen Display Password
              </label>
              <input
                type="text"
                value={kitchenPassword}
                onChange={e => setKitchenPassword(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 24, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Percent size={18} color="var(--accent-gold)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Invoice & Location Settings</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Phone</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>GSTIN Number</label>
              <input type="text" value={gstin} onChange={e => setGstin(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>CGST Rate (%)</label>
              <input type="number" step="0.1" value={cgst} onChange={e => setCgst(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>SGST Rate (%)</label>
              <input type="number" step="0.1" value={sgst} onChange={e => setSgst(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', padding: '16px', fontSize: '1.1rem', borderRadius: 'var(--radius-sm)' }}
        >
          {submitting ? 'Provisioning & Deploying Cafe...' : 'Deploy & Provision Cafe Instance 🚀'}
        </button>
      </form>
    </div>
  );
}
