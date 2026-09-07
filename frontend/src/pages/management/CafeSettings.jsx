import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Crown,
  Settings,
  Building,
  FileText,
  MessageSquare,
  Shield,
  Save,
  Check,
  Clock,
  Send,
  Users,
  Key,
  RefreshCw,
  AlertTriangle,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Receipt,
  Phone,
  Mail,
  Sliders,
  Sparkles,
  Smartphone,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Hash
} from 'lucide-react';

export default function CafeSettings() {
  const { cafeInfo, setCafeInfo, user } = useAuth();

  // Active Navigation Tab: 'master' (Owner Master Suite), 'business' (General & Tax), 'whatsapp' (WhatsApp Gateway), 'audit' (Audit Trail)
  const [activeTab, setActiveTab] = useState('master');

  // Master Configuration Form State
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    logo_url: '',
    phone: '',
    sender_mobile: '',
    email: '',
    address: '',
    gstin: '',
    fssai_license: '',
    currency: '₹',
    tax_rate_cgst: 2.5,
    tax_rate_sgst: 2.5,
    service_charge_rate: 0.0,
    receipt_header: '',
    receipt_footer: '',
    whatsapp_enabled: true,
    advance_booking_enabled: true,
    waiter_call_alerts_enabled: true
  });

  // Staff accounts list and inline modifications
  const [staffList, setStaffList] = useState([]);
  const [staffEdits, setStaffEdits] = useState({});
  const [showPasswordMap, setShowPasswordMap] = useState({});

  // New Staff Modal State
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
    name: '',
    email: '',
    username: '',
    role: 'CASHIER',
    phone: '',
    password: ''
  });

  // System Reset Confirmation Modal
  const [resetModal, setResetModal] = useState({
    isOpen: false,
    action: '',
    title: '',
    warning: '',
    confirmText: ''
  });

  const [auditLogs, setAuditLogs] = useState([]);
  const [whatsappLogs, setWhatsappLogs] = useState([]);
  const [savedSuccess, setSavedSuccess] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewReceiptOpen, setPreviewReceiptOpen] = useState(false);

  // Load initial data
  const loadData = async () => {
    try {
      const cafe = await api.getCafeProfile();
      if (cafe) {
        setFormData({
          name: cafe.name || '',
          tagline: cafe.tagline || '',
          logo_url: cafe.logo_url || '',
          phone: cafe.phone || '',
          sender_mobile: cafe.sender_mobile || '+91 98201 55667',
          email: cafe.email || '',
          address: cafe.address || '',
          gstin: cafe.gstin || '',
          fssai_license: cafe.fssai_license || '',
          currency: cafe.currency || '₹',
          tax_rate_cgst: cafe.tax_rate_cgst ?? 2.5,
          tax_rate_sgst: cafe.tax_rate_sgst ?? 2.5,
          service_charge_rate: cafe.service_charge_rate ?? 0.0,
          receipt_header: cafe.receipt_header || '',
          receipt_footer: cafe.receipt_footer || '',
          whatsapp_enabled: cafe.whatsapp_enabled ?? true,
          advance_booking_enabled: cafe.advance_booking_enabled ?? true,
          waiter_call_alerts_enabled: cafe.waiter_call_alerts_enabled ?? true
        });
        setCafeInfo(cafe);
      }

      const staff = await api.getStaffList();
      if (Array.isArray(staff)) {
        setStaffList(staff);
        // Initialize staffEdits
        const initialEdits = {};
        staff.forEach(s => {
          initialEdits[s.id] = {
            id: s.id,
            name: s.first_name || s.username || '',
            email: s.email || '',
            role: s.role || 'CASHIER',
            phone: s.phone || '',
            password: '',
            is_active: s.is_active ?? true
          };
        });
        setStaffEdits(initialEdits);
      }

      api.getAuditLogs().then(setAuditLogs).catch(console.error);
      api.getWhatsAppLogs().then(setWhatsappLogs).catch(console.error);
    } catch (err) {
      console.error('Failed to load settings data', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStaffChange = (staffId, field, value) => {
    setStaffEdits(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [field]: value
      }
    }));
  };

  const togglePasswordVisibility = (staffId) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [staffId]: !prev[staffId]
    }));
  };

  // Submit Master Form (Cafe Identity, Sender Mobile, Receipts, Staff Credentials)
  const handleMasterSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSavedSuccess('');

    try {
      // Pack staff edits
      const staffAccountsPayload = Object.values(staffEdits).map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        role: s.role,
        phone: s.phone,
        password: s.password || undefined, // only send if non-empty
        is_active: s.is_active
      }));

      const payload = {
        ...formData,
        operator_name: user?.name || 'Owner',
        staff_accounts: staffAccountsPayload
      };

      const res = await api.ownerMasterUpdate(payload);

      if (res.cafe) {
        setCafeInfo(res.cafe);
        setFormData(prev => ({
          ...prev,
          ...res.cafe
        }));
      }

      setSavedSuccess(res.message || 'All master configurations & credentials saved live! 🚀');
      setTimeout(() => setSavedSuccess(''), 4500);

      // Refresh staff and logs
      const updatedStaff = await api.getStaffList();
      setStaffList(updatedStaff);
      // Clear entered passwords in state for security
      const cleanEdits = {};
      updatedStaff.forEach(s => {
        cleanEdits[s.id] = {
          id: s.id,
          name: s.first_name || s.username || '',
          email: s.email || '',
          role: s.role || 'CASHIER',
          phone: s.phone || '',
          password: '',
          is_active: s.is_active ?? true
        };
      });
      setStaffEdits(cleanEdits);

      api.getAuditLogs().then(setAuditLogs);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save master configurations');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick single-staff credential update
  const handleSingleStaffUpdate = async (staffId) => {
    const edit = staffEdits[staffId];
    if (!edit) return;
    setIsSubmitting(true);
    try {
      const res = await api.manageStaff({
        action: 'update',
        staff_id: staffId,
        name: edit.name,
        email: edit.email,
        role: edit.role,
        phone: edit.phone,
        is_active: edit.is_active,
        password: edit.password || undefined,
        operator_name: user?.name || 'Owner'
      });
      setSavedSuccess(res.message || 'Staff updated successfully!');
      setTimeout(() => setSavedSuccess(''), 3500);
      handleStaffChange(staffId, 'password', '');
      const updatedStaff = await api.getStaffList();
      setStaffList(updatedStaff);
      api.getAuditLogs().then(setAuditLogs);
    } catch (err) {
      alert('Error updating staff: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add new staff member
  const handleAddNewStaff = async (e) => {
    e.preventDefault();
    if (!newStaffData.name || !newStaffData.email) {
      alert('Please provide staff name and email address.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.manageStaff({
        action: 'create',
        ...newStaffData,
        operator_name: user?.name || 'Owner'
      });
      setSavedSuccess(res.message || 'New staff member added!');
      setTimeout(() => setSavedSuccess(''), 3500);
      setShowAddStaffModal(false);
      setNewStaffData({
        name: '',
        email: '',
        username: '',
        role: 'CASHIER',
        phone: '',
        password: ''
      });
      const updatedStaff = await api.getStaffList();
      setStaffList(updatedStaff);
      loadData();
    } catch (err) {
      alert('Error adding staff: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete staff member
  const handleDeleteStaff = async (staffId, staffName) => {
    if (!window.confirm(`Are you sure you want to permanently remove staff account "${staffName}"?`)) {
      return;
    }
    try {
      await api.manageStaff({
        action: 'delete',
        staff_id: staffId,
        operator_name: user?.name || 'Owner'
      });
      setSavedSuccess(`Staff account "${staffName}" deleted.`);
      setTimeout(() => setSavedSuccess(''), 3500);
      loadData();
    } catch (err) {
      alert('Error removing staff: ' + err.message);
    }
  };

  // Open reset dialog
  const promptDataReset = (action, title, warning) => {
    setResetModal({
      isOpen: true,
      action,
      title,
      warning,
      confirmText: action === 'factory_reset' ? 'CONFIRM FACTORY RESET' : 'RESET'
    });
  };

  // Execute operational reset
  const executeDataReset = async () => {
    const { action } = resetModal;
    setResetModal({ ...resetModal, isOpen: false });
    setIsSubmitting(true);
    try {
      const res = await api.ownerResetData(action, user?.name || 'Owner');
      setSavedSuccess(res.message || 'Operation completed successfully!');
      setTimeout(() => setSavedSuccess(''), 5000);
      api.getAuditLogs().then(setAuditLogs);
    } catch (err) {
      alert('Reset failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '24px 28px 80px' }}>
      {/* 👑 OWNER PRIVILEGE HERO BANNER */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(17,17,17,0.85) 50%, rgba(212,175,55,0.06) 100%)',
          border: '1.5px solid rgba(212,175,55,0.35)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #d4af37 0%, #aa8214 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              boxShadow: '0 0 20px rgba(212,175,55,0.5)',
              flexShrink: 0
            }}
          >
            <Crown size={30} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                Owner Master Control & Reset Suite
              </h1>
              <span
                style={{
                  background: 'rgba(212,175,55,0.18)',
                  color: 'var(--accent-gold)',
                  border: '1px solid rgba(212,175,55,0.4)',
                  borderRadius: 20,
                  padding: '3px 12px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                👑 Owner Access Privilege
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 4, maxWidth: 840 }}>
              Full administrative authority to re-brand the cafe, configure the official visitor receipt mobile gateway,
              reset staff emails & passwords, and execute operational clean-slate resets.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setPreviewReceiptOpen(true)}
            className="btn btn-outline-gold btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontWeight: 600 }}
          >
            <Receipt size={16} />
            <span>Simulate Visitor Receipt</span>
          </button>

          <button
            type="button"
            onClick={handleMasterSubmit}
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              fontWeight: 800,
              boxShadow: '0 4px 18px rgba(212,175,55,0.4)'
            }}
          >
            {isSubmitting ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
            <span>Save All Configuration</span>
          </button>
        </div>
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {savedSuccess && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#10b981',
            borderRadius: 'var(--radius-md)',
            padding: '14px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontWeight: 600,
            animation: 'fadeIn 0.3s ease'
          }}
        >
          <CheckCircle2 size={20} />
          <span>{savedSuccess}</span>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#ef4444',
            borderRadius: 'var(--radius-md)',
            padding: '14px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontWeight: 600,
            animation: 'fadeIn 0.3s ease'
          }}
        >
          <AlertTriangle size={20} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* QUICK STATUS STRIP */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}
      >
        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Current Cafe Name
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
            {formData.name || 'Not Configured'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Official WhatsApp Sender No.
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#25D366', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Smartphone size={18} />
            <span>{formData.sender_mobile || '+91 98201 55667'}</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Staff Directory
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-gold)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={18} />
            <span>{staffList.length} Active Accounts</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Taxes (CGST + SGST)
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
            {(Number(formData.tax_rate_cgst) + Number(formData.tax_rate_sgst)).toFixed(1)}% GST
          </div>
        </div>
      </div>

      {/* SECTION TABS */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          borderBottom: '1px solid var(--border-medium)',
          paddingBottom: 12,
          marginBottom: 24,
          overflowX: 'auto'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('master')}
          style={{
            background: activeTab === 'master' ? 'var(--accent-gold)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'master' ? '#000' : 'var(--text-secondary)',
            border: activeTab === 'master' ? 'none' : '1px solid var(--border-subtle)',
            padding: '10px 20px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 800,
            fontSize: '0.86rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s ease'
          }}
        >
          <Crown size={17} />
          <span>👑 Owner Master Control & Reset Suite</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          style={{
            background: activeTab === 'staff' ? 'var(--accent-gold)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'staff' ? '#000' : 'var(--text-secondary)',
            border: activeTab === 'staff' ? 'none' : '1px solid var(--border-subtle)',
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 700,
            fontSize: '0.86rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s ease'
          }}
        >
          <Users size={17} />
          <span>Staff Emails & Passwords ({staffList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reset')}
          style={{
            background: activeTab === 'reset' ? '#ef4444' : 'var(--bg-surface-elevated)',
            color: activeTab === 'reset' ? '#fff' : 'var(--text-secondary)',
            border: activeTab === 'reset' ? 'none' : '1px solid var(--border-subtle)',
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 700,
            fontSize: '0.86rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s ease'
          }}
        >
          <AlertTriangle size={17} />
          <span>⚠️ Data Clean-Slate & Reset System</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('whatsapp')}
          style={{
            background: activeTab === 'whatsapp' ? 'var(--accent-gold)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'whatsapp' ? '#000' : 'var(--text-secondary)',
            border: activeTab === 'whatsapp' ? 'none' : '1px solid var(--border-subtle)',
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 700,
            fontSize: '0.86rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s ease'
          }}
        >
          <MessageSquare size={17} color={activeTab === 'whatsapp' ? '#000' : '#25D366'} />
          <span>WhatsApp Visitor Logs ({whatsappLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          style={{
            background: activeTab === 'audit' ? 'var(--accent-gold)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'audit' ? '#000' : 'var(--text-secondary)',
            border: activeTab === 'audit' ? 'none' : '1px solid var(--border-subtle)',
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 700,
            fontSize: '0.86rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s ease'
          }}
        >
          <Shield size={17} />
          <span>Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: OWNER MASTER CONTROL & RESET SUITE (ALL IN ONE DETAIL)  */}
      {/* ------------------------------------------------------------- */}
      {(activeTab === 'master' || activeTab === 'business') && (
        <form onSubmit={handleMasterSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'start' }}>
            
            {/* LEFT COLUMN: CAFE IDENTITY & VISITOR MESSAGING GATEWAY */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* SECTION 1: CAFE IDENTITY & BRANDING */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Building size={20} color="var(--accent-gold)" />
                    <h3 style={{ fontSize: '1.18rem', fontWeight: 800 }}>1. Cafe Brand & Identity Profile</h3>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Public & Invoicing Presentation</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Cafe Legal / Brand Name <span style={{ color: 'var(--accent-gold)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. The Velvet Bean & Bistro"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Brand Tagline / Slogan
                      </label>
                      <input
                        type="text"
                        value={formData.tagline}
                        onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                        placeholder="e.g. Artisanal Roastery & Fine Food"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-medium)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Currency Symbol
                      </label>
                      <input
                        type="text"
                        value={formData.currency}
                        onChange={e => setFormData({ ...formData, currency: e.target.value })}
                        placeholder="e.g. ₹ or $ or €"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-medium)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Helpline / Customer Care Phone
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g. +91 98201 55667"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-medium)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Support / Billing Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g. support@velvetbean.com"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-medium)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Official Cafe Physical Address (Printed on Invoices & Thermal Slips)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g. 12/B Heritage Lane, Indiranagar, Bengaluru, KA 560038"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-primary)',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Brand Logo URL
                    </label>
                    <input
                      type="url"
                      value={formData.logo_url}
                      onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                      placeholder="https://images.unsplash.com/... or relative URL"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: OFFICIAL VISITOR WHATSAPP SENDER GATEWAY & RECEIPT CONTENT */}
              <div
                className="glass-panel"
                style={{
                  padding: '24px',
                  border: '1.5px solid rgba(37, 211, 102, 0.35)',
                  background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.05) 0%, rgba(17,17,17,0.7) 100%)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Smartphone size={22} color="#25D366" />
                    <div>
                      <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#25D366', margin: 0 }}>
                        2. Visitor Receipt & WhatsApp Dispatch Gateway
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Configure the phone number from which messages & digital tax invoices are delivered to visitors
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      background: 'rgba(37, 211, 102, 0.15)',
                      color: '#25D366',
                      padding: '4px 10px',
                      borderRadius: 12,
                      fontSize: '0.72rem',
                      fontWeight: 800
                    }}
                  >
                    MESSAGING SENDER
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* CAFE SENDER MOBILE NUMBER */}
                  <div
                    style={{
                      background: 'rgba(37, 211, 102, 0.08)',
                      border: '1px solid rgba(37, 211, 102, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px'
                    }}
                  >
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                      Cafe Mobile Number (Sender for Visitor Receipts & Messages) <span style={{ color: '#25D366' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="text"
                        required
                        value={formData.sender_mobile}
                        onChange={e => setFormData({ ...formData, sender_mobile: e.target.value })}
                        placeholder="+91 98201 55667"
                        style={{
                          flex: 1,
                          padding: '11px 14px',
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface-elevated)',
                          border: '1.5px solid #25D366',
                          color: '#25D366',
                          letterSpacing: '0.04em'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewReceiptOpen(true)}
                        className="btn btn-sm"
                        style={{
                          background: '#25D366',
                          color: '#000',
                          fontWeight: 800,
                          padding: '11px 16px',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Send size={15} />
                        <span>Test Preview</span>
                      </button>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6, margin: 0 }}>
                      ℹ️ This phone number will be displayed on WhatsApp invoices, OTP SMS, and reservation confirmations sent to your guests.
                    </p>
                  </div>

                  {/* CUSTOM RECEIPT HEADER & FOOTER */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Custom Receipt Header
                      </label>
                      <textarea
                        rows={3}
                        value={formData.receipt_header}
                        onChange={e => setFormData({ ...formData, receipt_header: e.target.value })}
                        placeholder="🧾 *TAX INVOICE & RECEIPT*&#10;*THE VELVET BEAN & BISTRO*"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-medium)',
                          color: 'var(--text-primary)',
                          fontFamily: 'monospace',
                          fontSize: '0.8rem'
                        }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Top heading on customer invoice</span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Custom Receipt Footer Greeting
                      </label>
                      <textarea
                        rows={3}
                        value={formData.receipt_footer}
                        onChange={e => setFormData({ ...formData, receipt_footer: e.target.value })}
                        placeholder="Thank you for dining with us! We look forward to serving you again. ☕✨"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-medium)',
                          color: 'var(--text-primary)',
                          fontFamily: 'monospace',
                          fontSize: '0.8rem'
                        }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Bottom closing greeting to guest</span>
                    </div>
                  </div>

                  {/* TAXES & LEGAL COMPLIANCE */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        GSTIN Number
                      </label>
                      <input
                        type="text"
                        value={formData.gstin}
                        onChange={e => setFormData({ ...formData, gstin: e.target.value })}
                        placeholder="29AABCT1332L1Z1"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-medium)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        FSSAI License No.
                      </label>
                      <input
                        type="text"
                        value={formData.fssai_license}
                        onChange={e => setFormData({ ...formData, fssai_license: e.target.value })}
                        placeholder="11223344556677"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-medium)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        CGST + SGST (%)
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.tax_rate_cgst}
                          onChange={e => setFormData({ ...formData, tax_rate_cgst: parseFloat(e.target.value) || 0 })}
                          placeholder="CGST"
                          title="CGST Rate"
                          style={{
                            width: '50%',
                            padding: '8px 6px',
                            textAlign: 'center',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-surface-elevated)',
                            border: '1px solid var(--border-medium)',
                            color: 'var(--text-primary)'
                          }}
                        />
                        <input
                          type="number"
                          step="0.1"
                          value={formData.tax_rate_sgst}
                          onChange={e => setFormData({ ...formData, tax_rate_sgst: parseFloat(e.target.value) || 0 })}
                          placeholder="SGST"
                          title="SGST Rate"
                          style={{
                            width: '50%',
                            padding: '8px 6px',
                            textAlign: 'center',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-surface-elevated)',
                            border: '1px solid var(--border-medium)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* AUTOMATION TOGGLES */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 20,
                      padding: '12px 16px',
                      background: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.84rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.whatsapp_enabled}
                        onChange={e => setFormData({ ...formData, whatsapp_enabled: e.target.checked })}
                      />
                      <span>Enable WhatsApp Digital Invoices</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.84rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.advance_booking_enabled}
                        onChange={e => setFormData({ ...formData, advance_booking_enabled: e.target.checked })}
                      />
                      <span>Enable Online Advance Bookings</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.84rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.waiter_call_alerts_enabled}
                        onChange={e => setFormData({ ...formData, waiter_call_alerts_enabled: e.target.checked })}
                      />
                      <span>Enable Waiter Call Notifications</span>
                    </label>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: STAFF EMAILS & PASSWORDS RESET + SYSTEM PURGE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* SECTION 3: STAFF EMAILS & PASSWORDS DIRECTORY */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Key size={20} color="var(--accent-gold)" />
                    <div>
                      <h3 style={{ fontSize: '1.18rem', fontWeight: 800, margin: 0 }}>
                        3. Staff Emails & Passwords Reset
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Manage logins for Owner, Manager, Cashier & Chefs
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddStaffModal(true)}
                    className="btn btn-outline-gold btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '0.78rem' }}
                  >
                    <Plus size={14} />
                    <span>+ Add Staff</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {staffList.map((member) => {
                    const edit = staffEdits[member.id] || {
                      name: member.first_name || member.username,
                      email: member.email,
                      role: member.role,
                      password: '',
                      is_active: member.is_active
                    };
                    const isOwnerRole = member.role === 'OWNER';
                    const showPass = showPasswordMap[member.id] || false;

                    return (
                      <div
                        key={member.id}
                        style={{
                          background: 'var(--bg-surface-elevated)',
                          border: isOwnerRole ? '1.5px solid rgba(212,175,55,0.4)' : '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                background: isOwnerRole
                                  ? 'rgba(212,175,55,0.2)'
                                  : member.role === 'MANAGER'
                                  ? 'rgba(59,130,246,0.15)'
                                  : member.role === 'KITCHEN'
                                  ? 'rgba(249,115,22,0.15)'
                                  : 'rgba(168,85,247,0.15)',
                                color: isOwnerRole
                                  ? 'var(--accent-gold)'
                                  : member.role === 'MANAGER'
                                  ? '#60a5fa'
                                  : member.role === 'KITCHEN'
                                  ? '#fb923c'
                                  : '#c084fc',
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: '0.72rem',
                                fontWeight: 800
                              }}
                            >
                              {member.role_display || member.role}
                            </span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              @{member.username}
                            </span>
                          </div>

                          {!isOwnerRole && (
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(member.id, member.first_name || member.username)}
                              title="Delete staff account"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--status-danger)',
                                cursor: 'pointer',
                                padding: 4
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>

                        {/* Name & Email Fields */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 8 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>
                              Display Name
                            </label>
                            <input
                              type="text"
                              value={edit.name}
                              onChange={e => handleStaffChange(member.id, 'name', e.target.value)}
                              placeholder="Name"
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                fontSize: '0.82rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>
                              Staff Email Address
                            </label>
                            <input
                              type="email"
                              value={edit.email}
                              onChange={e => handleStaffChange(member.id, 'email', e.target.value)}
                              placeholder="staff@cafe.com"
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                fontSize: '0.82rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)'
                              }}
                            />
                          </div>
                        </div>

                        {/* Password Reset Field */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--accent-gold)', fontWeight: 700, marginBottom: 2 }}>
                            Reset Password (Leave blank to keep unchanged)
                          </label>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                              <input
                                type={showPass ? 'text' : 'password'}
                                value={edit.password || ''}
                                onChange={e => handleStaffChange(member.id, 'password', e.target.value)}
                                placeholder="Enter new password to reset"
                                style={{
                                  width: '100%',
                                  padding: '6px 32px 6px 10px',
                                  fontSize: '0.82rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'var(--bg-surface)',
                                  border: edit.password ? '1.5px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                                  color: 'var(--text-primary)'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(member.id)}
                                style={{
                                  position: 'absolute',
                                  right: 6,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer'
                                }}
                              >
                                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSingleStaffUpdate(member.id)}
                              className="btn btn-outline-gold btn-sm"
                              style={{ padding: '4px 10px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                            >
                              Update Staff
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 4: DATA RESET & CLEAN SLATE SUITE ("RESET EVERYTHING") */}
              <div
                className="glass-panel"
                style={{
                  padding: '24px',
                  border: '1.5px solid rgba(239, 68, 68, 0.35)',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(17,17,17,0.7) 100%)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <AlertTriangle size={20} color="#ef4444" />
                  <div>
                    <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#ef4444', margin: 0 }}>
                      4. Operational Data Reset & Clean Slate
                    </h3>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Controlled purge tools to reset dine-in sessions, bills, bookings, or complete factory reset
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
                  {/* Reset Tables */}
                  <div
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Reset All Table Sessions
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Closes active dine-in sessions, dismisses waiter calls, sets all tables to AVAILABLE.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => promptDataReset(
                        'reset_tables',
                        'Reset All Table Sessions',
                        'This will terminate all active dine-in table sessions and reset table states back to AVAILABLE.'
                      )}
                      className="btn btn-outline-gold btn-sm"
                      style={{ fontSize: '0.76rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
                    >
                      Reset Tables
                    </button>
                  </div>

                  {/* Purge Orders & Bills */}
                  <div
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Purge Orders & Billing History
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Clears all test orders, unpaid/paid bills, and payments for a clean sales ledger.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => promptDataReset(
                        'clear_orders',
                        'Purge Orders & Billing History',
                        'This will permanently delete all order tickets, bills, item records, and payments in the system.'
                      )}
                      className="btn btn-sm"
                      style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        fontSize: '0.76rem',
                        padding: '6px 12px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Clear Orders
                    </button>
                  </div>

                  {/* Clear Advance Reservations */}
                  <div
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Clear Advance Reservations
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Deletes all customer advance booking requests and upcoming alerts.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => promptDataReset(
                        'clear_reservations',
                        'Clear Advance Reservations',
                        'This will delete all advance pre-booking records and visitor check-in codes.'
                      )}
                      className="btn btn-sm"
                      style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        fontSize: '0.76rem',
                        padding: '6px 12px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Clear Bookings
                    </button>
                  </div>

                  {/* Factory Reset Clean Slate */}
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ef4444' }}>
                        System Factory Clean Slate
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Resets tables, orders, bills, customer directory & reservations back to Day 1 fresh state.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => promptDataReset(
                        'factory_reset',
                        'Full System Factory Clean Slate',
                        'CRITICAL: This will wipe ALL operational data (sessions, orders, bills, payments, reservations, and customer records). Cafe profile, menu catalog, and staff credentials will be safely preserved.'
                      )}
                      className="btn btn-sm"
                      style={{
                        background: '#ef4444',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.76rem',
                        padding: '6px 14px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Factory Reset
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* MASTER BOTTOM SAVE BAR */}
          <div
            style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 900,
              background: 'rgba(20, 20, 20, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(212,175,55,0.4)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              borderRadius: 40,
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 20
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Crown size={20} color="var(--accent-gold)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Owner Master Control Active
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={loadData}
                className="btn btn-outline-gold btn-sm"
                style={{ borderRadius: 20, padding: '6px 14px' }}
              >
                Discard Edits
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary btn-sm"
                style={{
                  borderRadius: 20,
                  padding: '8px 22px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {isSubmitting ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
                <span>Save All Changes Live</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: DEDICATED STAFF EMAILS & PASSWORDS TAB                 */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'staff' && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Staff Accounts & Access Directory</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                Reset staff emails, passwords, and assigned roles with instant system sync.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddStaffModal(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}
            >
              <Plus size={16} />
              <span>Add New Staff Account</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
            {staffList.map((member) => {
              const edit = staffEdits[member.id] || {
                name: member.first_name || member.username,
                email: member.email,
                role: member.role,
                password: '',
                is_active: member.is_active
              };
              const isOwnerRole = member.role === 'OWNER';
              const showPass = showPasswordMap[member.id] || false;

              return (
                <div
                  key={member.id}
                  className="glass-panel"
                  style={{
                    padding: '20px',
                    border: isOwnerRole ? '1.5px solid rgba(212,175,55,0.45)' : '1px solid var(--border-medium)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: isOwnerRole ? 'var(--accent-gold)' : 'var(--bg-surface-elevated)',
                          color: isOwnerRole ? '#000' : 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800
                        }}
                      >
                        {isOwnerRole ? <Crown size={18} /> : member.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>@{member.username}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>ID #{member.id}</div>
                      </div>
                    </div>

                    <span
                      style={{
                        background: isOwnerRole ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.1)',
                        color: isOwnerRole ? 'var(--accent-gold)' : 'var(--text-secondary)',
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontSize: '0.72rem',
                        fontWeight: 800
                      }}
                    >
                      {member.role_display || member.role}
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={edit.name}
                      onChange={e => handleStaffChange(member.id, 'name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                      Staff Email
                    </label>
                    <input
                      type="email"
                      value={edit.email}
                      onChange={e => handleStaffChange(member.id, 'email', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--accent-gold)', fontWeight: 700, marginBottom: 4 }}>
                      Reset Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={edit.password || ''}
                        onChange={e => handleStaffChange(member.id, 'password', e.target.value)}
                        placeholder="Type new password"
                        style={{
                          width: '100%',
                          padding: '8px 36px 8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface-elevated)',
                          border: edit.password ? '1.5px solid var(--accent-gold)' : '1px solid var(--border-medium)',
                          color: 'var(--text-primary)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(member.id)}
                        style={{
                          position: 'absolute',
                          right: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => handleSingleStaffUpdate(member.id)}
                      className="btn btn-outline-gold btn-sm"
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    >
                      Save Account
                    </button>

                    {!isOwnerRole && (
                      <button
                        type="button"
                        onClick={() => handleDeleteStaff(member.id, member.first_name || member.username)}
                        className="btn btn-sm"
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          border: 'none',
                          padding: '6px 12px',
                          fontSize: '0.78rem'
                        }}
                      >
                        Delete Staff
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: DATA RESET / PURGE SUITE TAB                           */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'reset' && (
        <div className="glass-panel" style={{ padding: '32px', maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444'
              }}
            >
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ef4444', margin: 0 }}>
                System Data Clean-Slate & Operational Reset Suite
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                Execute safe, targeted purges to reset live operational data. Menu items, categories, and staff profiles will NOT be deleted.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 20
              }}
            >
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800 }}>1. Reset Active Table Sessions</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Closes all ongoing customer sessions, clears active waiter bells, and resets all 12+ tables to AVAILABLE.
                </div>
              </div>
              <button
                type="button"
                onClick={() => promptDataReset(
                  'reset_tables',
                  'Reset Active Table Sessions',
                  'Are you sure? This will terminate all active customer table sessions immediately.'
                )}
                className="btn btn-outline-gold"
                style={{ padding: '8px 18px', whiteSpace: 'nowrap' }}
              >
                Reset Tables Now
              </button>
            </div>

            <div
              style={{
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 20
              }}
            >
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800 }}>2. Purge Orders, Bills & Payments</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Deletes all test order tickets, bills, item records, and payment receipts. Ideal before the cafe goes live.
                </div>
              </div>
              <button
                type="button"
                onClick={() => promptDataReset(
                  'clear_orders',
                  'Purge Orders & Bills',
                  'This will permanently clear all orders and billing history. Sales analytics will restart from 0.'
                )}
                className="btn btn-sm"
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  padding: '8px 18px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap'
                }}
              >
                Purge Orders & Bills
              </button>
            </div>

            <div
              style={{
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 20
              }}
            >
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800 }}>3. Clear Advance Table Reservations</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Removes all upcoming/past table booking entries and unique arrival verification codes.
                </div>
              </div>
              <button
                type="button"
                onClick={() => promptDataReset(
                  'clear_reservations',
                  'Clear Advance Reservations',
                  'This will permanently delete all advance booking records.'
                )}
                className="btn btn-sm"
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  padding: '8px 18px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap'
                }}
              >
                Clear Reservations
              </button>
            </div>

            <div
              style={{
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 20
              }}
            >
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800 }}>4. Purge Customer Directory & OTPs</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Removes guest mobile registrations, verified tokens, customer feedback ratings, and OTP records.
                </div>
              </div>
              <button
                type="button"
                onClick={() => promptDataReset(
                  'clear_customers',
                  'Purge Customer Directory',
                  'This will clear all saved customer records and feedback.'
                )}
                className="btn btn-sm"
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  padding: '8px 18px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap'
                }}
              >
                Clear Customers
              </button>
            </div>

            <div
              style={{
                border: '1.5px solid #ef4444',
                background: 'rgba(239, 68, 68, 0.08)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 20,
                marginTop: 10
              }}
            >
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ef4444' }}>
                  5. Full Operational Factory Clean-Slate Reset
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Wipes all operational dine-in sessions, bills, orders, advance bookings, and customer logs in a single atomic wipe. Cafe profile, branding, and menu catalog will remain intact.
                </div>
              </div>
              <button
                type="button"
                onClick={() => promptDataReset(
                  'factory_reset',
                  'Full Operational Factory Reset',
                  'CRITICAL WARNING: This will completely wipe all operational data (orders, bills, sessions, reservations, customer logs). This action cannot be undone.'
                )}
                className="btn"
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  fontWeight: 900,
                  padding: '12px 24px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 18px rgba(239,68,68,0.4)'
                }}
              >
                Perform Factory Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: WHATSAPP DISPATCH GATEWAY & LOGS                       */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'whatsapp' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Smartphone size={22} color="#25D366" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#25D366', margin: 0 }}>
                WhatsApp Dispatch Gateway Status
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Official Sender Mobile Number</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#25D366', marginTop: 4 }}>
                  {formData.sender_mobile || '+91 98201 55667'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Used as the dispatch origin identity when sending digital invoices to guests.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Dispatch History ({whatsappLogs.length} messages)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
                  {whatsappLogs.length > 0 ? (
                    whatsappLogs.map(msg => (
                      <div
                        key={msg.id}
                        style={{
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '12px 14px',
                          fontSize: '0.84rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            Recipient: {msg.phone}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#25D366', fontWeight: 700 }}>
                            ✓ {msg.status}
                          </span>
                        </div>
                        <pre style={{ color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: '4px 0' }}>
                          {msg.preview_text}
                        </pre>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                          Template: {msg.template_name} • {msg.time_display}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No WhatsApp messages logged yet. Settle an invoice in Billing POS to test!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Simulation Box */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 14 }}>Live Receipt Simulation</h3>
            <div
              style={{
                background: '#fff',
                color: '#111',
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                lineHeight: 1.4,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                border: '1px dashed #ccc'
              }}
            >
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                {formData.receipt_header || `🧾 TAX INVOICE & RECEIPT\n${(formData.name || 'CAFE NAME').toUpperCase()}`}
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.75rem', marginTop: 4 }}>
                {formData.address || '12/B Heritage Lane, Indiranagar'}
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#555' }}>
                Phone: {formData.phone || '+91 98201 55667'} | GST: {formData.gstin || '29AABCT1332L1Z1'}
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#006600', fontWeight: 'bold' }}>
                Official Dispatch: {formData.sender_mobile || '+91 98201 55667'}
              </div>
              <div style={{ borderTop: '1px dashed #444', margin: '10px 0' }} />
              <div>Invoice: #INV-2026-0891</div>
              <div>Table: T-04 (Dine-in)</div>
              <div>Guest: Priya Sharma (+91 98765 43210)</div>
              <div style={{ borderTop: '1px dashed #444', margin: '10px 0' }} />
              <div>• Cappuccino Royale x2 - ₹360.00</div>
              <div>• Classic Truffle Fries x1 - ₹220.00</div>
              <div style={{ borderTop: '1px dashed #444', margin: '10px 0' }} />
              <div>Subtotal: ₹580.00</div>
              <div>CGST ({formData.tax_rate_cgst}%): ₹{(580 * formData.tax_rate_cgst / 100).toFixed(2)}</div>
              <div>SGST ({formData.tax_rate_sgst}%): ₹{(580 * formData.tax_rate_sgst / 100).toFixed(2)}</div>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginTop: 4 }}>
                GRAND TOTAL: ₹{(580 + (580 * (formData.tax_rate_cgst + formData.tax_rate_sgst) / 100)).toFixed(2)} [PAID]
              </div>
              <div style={{ borderTop: '1px dashed #444', margin: '10px 0' }} />
              <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '0.75rem' }}>
                {formData.receipt_footer || 'Thank you for dining with us! We look forward to serving you again. ☕✨'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: SYSTEM AUDIT TRAIL                                     */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Shield size={20} color="var(--accent-gold)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>System Security & Audit Trail</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto' }}>
            {auditLogs.map(log => (
              <div
                key={log.id}
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px',
                  fontSize: '0.84rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>
                    {log.user_name} ({log.role})
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                    {log.time_display}
                  </span>
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {log.action}
                </div>
                {log.details && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 3 }}>
                    {log.details}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD NEW STAFF MEMBER                                   */}
      {/* ------------------------------------------------------------- */}
      {showAddStaffModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: 20
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: 500,
              width: '100%',
              padding: '28px',
              border: '1.5px solid var(--accent-gold)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Users size={20} color="var(--accent-gold)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Create Staff Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewStaff} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Full Name <span style={{ color: 'var(--accent-gold)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newStaffData.name}
                  onChange={e => setNewStaffData({ ...newStaffData, name: e.target.value })}
                  placeholder="e.g. Rahul Verma"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Staff Email <span style={{ color: 'var(--accent-gold)' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newStaffData.email}
                  onChange={e => setNewStaffData({ ...newStaffData, email: e.target.value })}
                  placeholder="e.g. rahul@velvetbean.com"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Username (Login ID)
                  </label>
                  <input
                    type="text"
                    value={newStaffData.username}
                    onChange={e => setNewStaffData({ ...newStaffData, username: e.target.value })}
                    placeholder="e.g. rahul"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Assigned Role
                  </label>
                  <select
                    value={newStaffData.role}
                    onChange={e => setNewStaffData({ ...newStaffData, role: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="MANAGER">Manager</option>
                    <option value="CASHIER">Cashier / Billing</option>
                    <option value="KITCHEN">Kitchen Chef</option>
                    <option value="OWNER">Co-Owner</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Initial Password <span style={{ color: 'var(--accent-gold)' }}>*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newStaffData.password}
                  onChange={e => setNewStaffData({ ...newStaffData, password: e.target.value })}
                  placeholder="Enter initial password"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="btn btn-outline-gold btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary btn-sm"
                >
                  {isSubmitting ? 'Creating...' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SYSTEM RESET CONFIRMATION                             */}
      {/* ------------------------------------------------------------- */}
      {resetModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.82)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: 20
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: 480,
              width: '100%',
              padding: '28px',
              border: '2px solid #ef4444',
              boxShadow: '0 20px 60px rgba(239, 68, 68, 0.4)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <AlertTriangle size={28} color="#ef4444" />
              <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ef4444', margin: 0 }}>
                {resetModal.title}
              </h3>
            </div>

            <p style={{ color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: 20 }}>
              {resetModal.warning}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => setResetModal({ ...resetModal, isOpen: false })}
                className="btn btn-outline-gold btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDataReset}
                disabled={isSubmitting}
                className="btn btn-sm"
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  fontWeight: 800,
                  padding: '8px 18px'
                }}
              >
                {isSubmitting ? 'Resetting...' : 'Yes, Execute Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: VISITOR RECEIPT SIMULATION                            */}
      {/* ------------------------------------------------------------- */}
      {previewReceiptOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: 20
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: 420,
              width: '100%',
              padding: '24px',
              border: '1.5px solid var(--accent-gold)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Receipt size={18} color="var(--accent-gold)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Customer Receipt Preview</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewReceiptOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                background: '#fff',
                color: '#111',
                padding: '20px',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                lineHeight: 1.4,
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                {formData.receipt_header || `🧾 TAX INVOICE & RECEIPT\n${(formData.name || 'CAFE NAME').toUpperCase()}`}
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.74rem', marginTop: 4 }}>
                {formData.address || '12/B Heritage Lane, Indiranagar'}
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#555' }}>
                Phone: {formData.phone || '+91 98201 55667'} | GST: {formData.gstin || '29AABCT1332L1Z1'}
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#006600', fontWeight: 'bold' }}>
                Official Dispatch: {formData.sender_mobile || '+91 98201 55667'}
              </div>
              <div style={{ borderTop: '1px dashed #444', margin: '10px 0' }} />
              <div>Invoice: #INV-2026-0891</div>
              <div>Table: T-04 (Dine-in)</div>
              <div>Guest: Priya Sharma (+91 98765 43210)</div>
              <div style={{ borderTop: '1px dashed #444', margin: '10px 0' }} />
              <div>• Cappuccino Royale x2 - ₹360.00</div>
              <div>• Classic Truffle Fries x1 - ₹220.00</div>
              <div style={{ borderTop: '1px dashed #444', margin: '10px 0' }} />
              <div>Subtotal: ₹580.00</div>
              <div>CGST ({formData.tax_rate_cgst}%): ₹{(580 * formData.tax_rate_cgst / 100).toFixed(2)}</div>
              <div>SGST ({formData.tax_rate_sgst}%): ₹{(580 * formData.tax_rate_sgst / 100).toFixed(2)}</div>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginTop: 4 }}>
                GRAND TOTAL: ₹{(580 + (580 * (formData.tax_rate_cgst + formData.tax_rate_sgst) / 100)).toFixed(2)} [PAID]
              </div>
              <div style={{ borderTop: '1px dashed #444', margin: '10px 0' }} />
              <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '0.74rem' }}>
                {formData.receipt_footer || 'Thank you for dining with us! We look forward to serving you again. ☕✨'}
              </div>
            </div>

            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setPreviewReceiptOpen(false)}
                className="btn btn-primary btn-sm"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
