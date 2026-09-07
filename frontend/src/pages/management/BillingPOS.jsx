import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ThermalReceiptModal from '../../components/ThermalReceiptModal';
import ZReportModal from '../../components/ZReportModal';
import {
  Receipt,
  CreditCard,
  QrCode,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Percent,
  MessageCircle,
  Printer,
  ChevronRight,
  Split,
  Sparkles,
  Users,
  Merge,
  Clock,
  DollarSign,
  Wallet,
  Tag,
  HeartHandshake,
  ShieldCheck,
  AlertTriangle,
  PlusCircle,
  Check
} from 'lucide-react';

export default function BillingPOS() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { cafeInfo } = useAuth();

  const [activeTables, setActiveTables] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(searchParams.get('session_id') || '');
  const [billPreview, setBillPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // Billing inputs
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [serviceCharge, setServiceCharge] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);

  // Coupons
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');

  // Cashier Shifts & Z-Reports
  const [shiftData, setShiftData] = useState(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showPettyCashModal, setShowPettyCashModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [openingFloatInput, setOpeningFloatInput] = useState('2000');
  const [pettyAmountInput, setPettyAmountInput] = useState('');
  const [pettyReasonInput, setPettyReasonInput] = useState('');
  const [countedCashInput, setCountedCashInput] = useState('');
  const [shiftNotesInput, setShiftNotesInput] = useState('');
  const [zReportData, setZReportData] = useState(null);

  // Payment inputs (Split payments)
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [processingPay, setProcessingPay] = useState(false);

  // Completed receipt modal
  const [receiptBill, setReceiptBill] = useState(null);

  // Guest grouping
  const [showGuestView, setShowGuestView] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [mergingBills, setMergingBills] = useState(false);

  const fetchCurrentShift = async () => {
    try {
      const res = await api.getCurrentShift();
      if (res.active) {
        setShiftData(res.shift);
      } else {
        setShiftData(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActiveTables = async () => {
    try {
      const data = await api.getTables();
      const occupied = data.filter(t => t.active_session);
      setActiveTables(occupied);

      if (!selectedSessionId && occupied.length > 0) {
        setSelectedSessionId(occupied[0].active_session.id.toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBillData = async (sessionId) => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const preview = await api.getBillPreview(sessionId);
      setBillPreview(preview);
      if (preview.existing_bill) {
        setDiscountAmount(parseFloat(preview.existing_bill.discount_amount) || 0);
        setDiscountReason(preview.existing_bill.discount_reason || '');
        setTipAmount(parseFloat(preview.existing_bill.tip_amount) || 0);
        setCouponCode(preview.existing_bill.coupon_code || '');
        setPaymentAmount(preview.existing_bill.amount_remaining || preview.existing_bill.grand_total);
      } else {
        setPaymentAmount(preview.estimated_grand_total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveTables();
    fetchCurrentShift();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchBillData(selectedSessionId);
    }
  }, [selectedSessionId]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponMessage('');
    try {
      const res = await api.validateCoupon(couponCode, billPreview?.subtotal || 0);
      if (res.valid) {
        setDiscountAmount(res.discount_amount);
        setDiscountReason(`Coupon: ${res.code}`);
        setCouponMessage(res.message);
      }
    } catch (err) {
      setCouponMessage(err.message || 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleOpenShift = async (e) => {
    e.preventDefault();
    try {
      await api.openShift({
        opening_float: parseFloat(openingFloatInput) || 2000,
        cashier_name: 'Sunil Mehta (Cashier)',
        notes: shiftNotesInput
      });
      setShowOpenShiftModal(false);
      fetchCurrentShift();
      alert('Cashier Shift opened successfully! Starting float logged.');
    } catch (err) {
      alert('Error opening shift: ' + err.message);
    }
  };

  const handleRecordPettyCash = async (e) => {
    e.preventDefault();
    try {
      await api.recordPettyCash({
        amount: parseFloat(pettyAmountInput) || 0,
        reason: pettyReasonInput || 'Emergency Supplies',
        approved_by: 'Kavita Roy (Manager)'
      });
      setShowPettyCashModal(false);
      setPettyAmountInput('');
      setPettyReasonInput('');
      fetchCurrentShift();
      alert('Petty cash outlay recorded from drawer.');
    } catch (err) {
      alert('Error recording petty cash: ' + err.message);
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    try {
      const res = await api.closeShift({
        closing_cash_actual: parseFloat(countedCashInput) || 0,
        notes: shiftNotesInput
      });
      setShowCloseShiftModal(false);
      setCountedCashInput('');
      setShiftNotesInput('');
      setShiftData(null);
      fetchCurrentShift();
      setZReportData(res.z_report);
    } catch (err) {
      alert('Error closing shift: ' + err.message);
    }
  };

  const handleGenerateBill = async () => {
    if (!selectedSessionId) return;
    try {
      const bill = await api.generateBill(selectedSessionId, {
        discount_amount: discountAmount,
        discount_reason: discountReason,
        coupon_code: couponCode,
        service_charge: serviceCharge,
        tip_amount: tipAmount,
        cashier_name: 'Sunil Mehta (Cashier)'
      });
      fetchBillData(selectedSessionId);
      fetchActiveTables();
      fetchCurrentShift();
    } catch (err) {
      alert('Error generating bill: ' + err.message);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const currentBill = billPreview?.existing_bill;
    if (!currentBill) {
      alert('Please generate the bill first before recording payment.');
      return;
    }

    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setProcessingPay(true);
    try {
      const res = await api.recordPayment(currentBill.id, {
        method: paymentMethod,
        amount: amt,
        reference_id: referenceId,
        payer_name: payerName,
        processed_by: 'Sunil Mehta (Cashier)'
      });

      // Clear input fields
      setReferenceId('');
      setPayerName('');

      // Refresh bill state
      await fetchBillData(selectedSessionId);
      await fetchActiveTables();
      await fetchCurrentShift();

      // If fully settled, display receipt modal
      if (res.bill?.status === 'PAID') {
        setReceiptBill(res.bill);
      }
    } catch (err) {
      alert('Error processing payment: ' + err.message);
    } finally {
      setProcessingPay(false);
    }
  };

  const handleCloseSession = async (customBill = null) => {
    const targetSessionId = customBill?.session || selectedSessionId;
    const tableObj = activeTables.find(t => t.active_session?.id?.toString() === targetSessionId?.toString());
    const tableId = customBill?.table_id || tableObj?.id;

    try {
      if (tableId) {
        await api.closeTableSession(tableId);
      } else if (targetSessionId) {
        await api.closeSession(targetSessionId);
      } else {
        alert('No active table or session selected to close.');
        return;
      }
      setReceiptBill(null);
      setSelectedSessionId('');
      setBillPreview(null);
      await fetchActiveTables();
      alert('Table session closed successfully and reset to AVAILABLE! ✨');
    } catch (err) {
      alert('Failed to close session: ' + err.message);
    }
  };

  const handleMergeBills = async () => {
    if (!selectedSessionId) return;
    setMergingBills(true);
    try {
      const res = await api.mergeBills(selectedSessionId, {
        discount_amount: discountAmount,
        discount_reason: discountReason,
        cashier_name: 'Cashier'
      });
      alert(res.message || 'Bills merged successfully! 🔀');
      setShowGuestView(false);
      setSelectedGuest(null);
      await fetchBillData(selectedSessionId);
      await fetchActiveTables();
    } catch (err) {
      alert('Error merging bills: ' + err.message);
    } finally {
      setMergingBills(false);
    }
  };

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Billing & Cashier Terminal (POS)</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
          Itemized tax invoice calculation, discount engine, multi-tender split payments & thermal receipting
        </p>
      </div>

      {/* Cashier Shift & Drawer Status Bar */}
      <div style={{
        background: shiftData ? 'linear-gradient(135deg, #1e1b18 0%, #2a241e 100%)' : 'linear-gradient(135deg, #451a03 0%, #78350f 100%)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        color: '#fff',
        marginBottom: 24,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        border: shiftData ? '1px solid rgba(212,163,115,0.3)' : '1px solid rgba(245,158,11,0.4)'
      }}>
        {shiftData ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(212,163,115,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-gold)'
              }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
                    Shift #{shiftData.shift_number} Active
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    background: 'rgba(34,197,94,0.2)',
                    color: '#4ade80',
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontWeight: 700
                  }}>
                    ● REGISTER OPEN
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#c5b8ae', marginTop: 2 }}>
                  Cashier: <strong>{shiftData.cashier_name}</strong> • Opened: {shiftData.opened_display || 'Today'}
                </div>
              </div>
            </div>

            {/* Live Stats Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: 8 }}>
                <div style={{ fontSize: '0.68rem', color: '#a89d94' }}>Opening Float</div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff' }}>₹{shiftData.opening_float}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: 8 }}>
                <div style={{ fontSize: '0.68rem', color: '#a89d94' }}>Cash In Drawer (Live)</div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#4ade80' }}>
                  ₹{shiftData.live_stats?.expected_drawer_cash?.toFixed(2) || shiftData.opening_float}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: 8 }}>
                <div style={{ fontSize: '0.68rem', color: '#a89d94' }}>Petty Cash Outlay</div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#f87171' }}>
                  ₹{shiftData.live_stats?.petty_cash_total || 0}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: 8 }}>
                <div style={{ fontSize: '0.68rem', color: '#a89d94' }}>Total Shift Sales</div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--accent-gold)' }}>
                  ₹{shiftData.live_stats?.total_sales?.toFixed(2) || 0}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowPettyCashModal(true)}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.78rem',
                  padding: '7px 12px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <PlusCircle size={14} />
                <span>Petty Cash</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCountedCashInput(shiftData.live_stats?.expected_drawer_cash?.toFixed(2) || '');
                  setShowCloseShiftModal(true);
                }}
                className="btn btn-primary"
                style={{
                  fontSize: '0.78rem',
                  padding: '7px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Receipt size={14} />
                <span>Close Shift (Z-Report)</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <AlertTriangle size={24} color="#fef08a" />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>No Active Cashier Shift</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: 2 }}>
                  Declare opening cash drawer float to start tracking shift tenders and generate day-end Z-Reports.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowOpenShiftModal(true)}
              className="btn btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.85rem' }}
            >
              Start Shift (Open Drawer)
            </button>
          </>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: 24,
        alignItems: 'start'
      }}>
        {/* Left Column: Active Dining Tables Selector */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.05rem' }}>Active Tables ({activeTables.length})</h3>
            <button onClick={fetchActiveTables} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
              ↻
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeTables.length > 0 ? (
              activeTables.map(t => {
                const isSelected = t.active_session?.id.toString() === selectedSessionId.toString();
                const isBillReq = t.status === 'BILL_REQUESTED';
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedSessionId(t.active_session.id.toString())}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--accent-gold-dim)' : 'var(--bg-surface-elevated)',
                      border: isSelected ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: isSelected ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                        {t.number}
                        {isBillReq && <span style={{ marginLeft: 6, fontSize: '0.75rem', color: 'var(--status-bill)' }}>🔔 Requested</span>}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {t.active_session?.customer_name || 'Guest'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        ₹{t.current_amount}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Session #{t.active_session?.session_code}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No active tables currently.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Billing & Payment Execution Terminal */}
        {billPreview ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
            {/* Bill Summary & Item Breakdown */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem' }}>{billPreview.table_number} Bill Details</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Customer: {billPreview.customer_name} ({billPreview.customer_phone || 'Walk-in'})
                  </p>
                </div>

                {billPreview.existing_bill && (
                  <span className={`badge ${
                    billPreview.existing_bill.status === 'PAID'
                      ? 'badge-available'
                      : billPreview.existing_bill.status === 'PARTIALLY_PAID'
                      ? 'badge-ordering'
                      : 'badge-occupied'
                  }`}>
                    {billPreview.existing_bill.status}
                  </span>
                )}
              </div>

              {/* Items List */}
              <div style={{
                maxHeight: 280,
                overflowY: 'auto',
                borderTop: '1px solid var(--border-subtle)',
                borderBottom: '1px solid var(--border-subtle)',
                padding: '12px 0',
                marginBottom: 20
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                      <th style={{ paddingBottom: 8 }}>Dish Item</th>
                      <th style={{ paddingBottom: 8, textAlign: 'center' }}>Qty</th>
                      <th style={{ paddingBottom: 8, textAlign: 'right' }}>Price</th>
                      <th style={{ paddingBottom: 8, textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billPreview.items?.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px 0' }}>
                          <div style={{ fontWeight: 600 }}>{item.name} {item.variant ? `(${item.variant})` : ''}</div>
                          {item.addons?.map((a, aidx) => (
                            <div key={aidx} style={{ fontSize: '0.74rem', color: 'var(--accent-gold)' }}>+ {a.name} (₹{a.price})</div>
                          ))}
                        </td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>₹{item.unit_price}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{item.total_price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Guest Breakdown Toggle & View */}
              {billPreview.guests_summary?.length > 1 && (
                <div style={{
                  background: showGuestView ? 'rgba(180, 83, 9, 0.04)' : 'var(--bg-surface-elevated)',
                  border: showGuestView ? '1.5px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                  marginBottom: 20,
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showGuestView ? 14 : 0 }}>
                    <button
                      type="button"
                      onClick={() => { setShowGuestView(!showGuestView); setSelectedGuest(null); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontWeight: 700, fontSize: '0.88rem',
                        color: showGuestView ? 'var(--accent-gold)' : 'var(--text-secondary)'
                      }}
                    >
                      <Users size={16} />
                      <span>Group by Guest ({billPreview.guests_summary.length} guests)</span>
                    </button>

                    {showGuestView && (
                      <button
                        type="button"
                        onClick={handleMergeBills}
                        disabled={mergingBills}
                        className="btn btn-outline-gold btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700 }}
                      >
                        <Split size={14} />
                        <span>{mergingBills ? 'Merging...' : '🔀 Merge All Bills Together'}</span>
                      </button>
                    )}
                  </div>

                  {showGuestView && (
                    <div>
                      {/* Guest Tab Pills */}
                      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
                        {billPreview.guests_summary.map((guest, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedGuest(selectedGuest === guest.guest_name ? null : guest.guest_name)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              border: selectedGuest === guest.guest_name ? '2px solid var(--accent-gold)' : '1px solid var(--border-medium)',
                              background: selectedGuest === guest.guest_name ? 'var(--accent-gold)' : 'var(--bg-surface)',
                              color: selectedGuest === guest.guest_name ? '#fff' : 'var(--text-primary)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <span>{guest.guest_name}</span>
                            <span style={{
                              background: selectedGuest === guest.guest_name ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface-elevated)',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.72rem',
                              fontWeight: 800
                            }}>
                              ₹{guest.estimated_grand_total}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Selected Guest Detail */}
                      {selectedGuest && (() => {
                        const guestData = billPreview.guests_summary.find(g => g.guest_name === selectedGuest);
                        if (!guestData) return null;
                        return (
                          <div style={{
                            background: 'var(--bg-surface)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                            padding: '14px',
                            animation: 'fadeIn 0.2s ease'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                                  {guestData.guest_name}'s Order
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {guestData.orders_count} order(s) • {guestData.items.length} item(s)
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Subtotal: ₹{guestData.subtotal}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tax: ₹{guestData.estimated_tax}</div>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent-gold)' }}>
                                  ₹{guestData.estimated_grand_total}
                                </div>
                              </div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                              <tbody>
                                {guestData.items.map((item, iIdx) => (
                                  <tr key={iIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                    <td style={{ padding: '6px 0', fontWeight: 600 }}>{item.name}</td>
                                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>×{item.quantity}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{item.total_price}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}

                      {/* Summary Row (All Guests) */}
                      {!selectedGuest && (
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(billPreview.guests_summary.length, 3)}, 1fr)`, gap: 10 }}>
                          {billPreview.guests_summary.map((guest, idx) => (
                            <div key={idx} style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                              onClick={() => setSelectedGuest(guest.guest_name)}
                            >
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>{guest.guest_name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                                {guest.items.length} items • {guest.orders_count} order(s)
                              </div>
                              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--accent-gold)' }}>
                                ₹{guest.estimated_grand_total}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Discount Adjustment Form */}
              <div style={{
                background: 'var(--bg-surface-elevated)',
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 20,
                display: 'grid',
                gridTemplateColumns: '140px 1fr auto',
                gap: 12,
                alignItems: 'center'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Discount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Discount Reason / Voucher
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Birthday Special, Loyalty 10%"
                    value={discountReason}
                    onChange={e => setDiscountReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'transparent', marginBottom: 4 }}>
                    Action
                  </label>
                  <button onClick={handleGenerateBill} className="btn btn-secondary btn-sm" style={{ padding: '8px 14px' }}>
                    Apply & Update Bill
                  </button>
                </div>
              </div>

              {/* Promo Coupon & Staff Tip Gratuity Row */}
              <div style={{
                background: 'var(--bg-surface-elevated)',
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 20,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16
              }}>
                {/* Coupon Box */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                    <Tag size={13} color="var(--accent-gold)" />
                    <span>Apply Promo Coupon</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="e.g. WELCOME10, FLAT50"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '8px 12px' }}
                    >
                      {couponLoading ? 'Checking...' : 'Apply'}
                    </button>
                  </div>
                  {couponMessage && (
                    <div style={{ fontSize: '0.74rem', marginTop: 4, color: couponMessage.includes('saved') ? 'var(--status-available)' : 'var(--status-occupied)' }}>
                      {couponMessage}
                    </div>
                  )}
                </div>

                {/* Staff Tip Selector */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                    <HeartHandshake size={13} color="var(--accent-gold)" />
                    <span>Staff Tip / Gratuity</span>
                  </label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { label: 'None', val: 0 },
                      { label: '₹20', val: 20 },
                      { label: '₹50', val: 50 },
                      { label: '₹100', val: 100 },
                      { label: '10%', val: Math.round((billPreview?.subtotal || 0) * 0.1) }
                    ].map(t => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => {
                          setTipAmount(t.val);
                        }}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          border: tipAmount === t.val ? '1.5px solid var(--accent-gold)' : '1px solid var(--border-medium)',
                          background: tipAmount === t.val ? 'var(--accent-gold-dim)' : 'var(--bg-main)',
                          color: tipAmount === t.val ? 'var(--accent-gold)' : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {tipAmount > 0 && (
                    <div style={{ fontSize: '0.74rem', marginTop: 4, color: 'var(--status-available)' }}>
                      +₹{tipAmount} tip added for cafe staff
                    </div>
                  )}
                </div>
              </div>

              {/* Existing Payment Records List (Split tender history) */}
              {billPreview.existing_bill?.payments?.length > 0 && (
                <div style={{
                  background: 'rgba(212,163,115,0.06)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                  marginBottom: 16
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-gold)', marginBottom: 8 }}>
                    <Split size={14} />
                    <span>Split Payment Breakdown</span>
                  </div>
                  {billPreview.existing_bill.payments.map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '4px 0' }}>
                      <span>{p.method_display || p.method} {p.reference_id ? `(#${p.reference_id})` : ''} - by {p.payer_name || 'Guest'}</span>
                      <span style={{ fontWeight: 700, color: 'var(--status-available)' }}>₹{p.amount} [SUCCESS]</span>
                    </div>
                  ))}
                </div>
              )}

              {/* View Receipt Button if generated */}
              {billPreview.existing_bill && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    onClick={() => setReceiptBill(billPreview.existing_bill)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Printer size={14} />
                    <span>Thermal Receipt Preview</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Side: Totals & Split Payment Processing Card */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: 16 }}>Tax Invoice Breakdown</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.88rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Food Subtotal</span>
                    <span style={{ fontWeight: 600 }}>₹{billPreview.subtotal}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-occupied)' }}>
                      <span>Discount ({discountReason || 'Offer'})</span>
                      <span>-₹{discountAmount}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>CGST ({billPreview.cgst_pct}%)</span>
                    <span style={{ fontWeight: 600 }}>₹{billPreview.cgst_amount}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>SGST ({billPreview.sgst_pct}%)</span>
                    <span style={{ fontWeight: 600 }}>₹{billPreview.sgst_amount}</span>
                  </div>
                </div>

                {/* Grand Total */}
                <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>GRAND TOTAL</span>
                    <span style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.65rem',
                      fontWeight: 800,
                      color: 'var(--accent-gold)'
                    }}>
                      ₹{billPreview.existing_bill ? billPreview.existing_bill.grand_total : billPreview.estimated_grand_total}
                    </span>
                  </div>

                  {billPreview.existing_bill && (
                    <div style={{
                      marginTop: 10,
                      padding: '10px 14px',
                      background: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Amount Paid:</span>
                        <span style={{ fontWeight: 700, color: 'var(--status-available)' }}>₹{billPreview.existing_bill.total_paid}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Remaining Balance Due:</span>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: billPreview.existing_bill.is_settled ? 'var(--status-available)' : 'var(--status-occupied)'
                        }}>
                          ₹{billPreview.existing_bill.amount_remaining}
                        </span>
                      </div>

                      {/* Tender breakdown if partial payments exist */}
                      {billPreview.existing_bill.payments?.length > 0 && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border-subtle)' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                            Recorded Tenders ({billPreview.existing_bill.payments.length}):
                          </div>
                          {billPreview.existing_bill.payments.map((p, pidx) => (
                            <div key={pidx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              <span>✓ {p.method_display || p.method} {p.reference_id ? `(${p.reference_id})` : ''}</span>
                              <span style={{ fontWeight: 700 }}>₹{p.amount}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Tender Collection Form (Split Payment) */}
                <form onSubmit={handleRecordPayment} style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Process Payment (Split Tender)
                    </span>
                    {billPreview.existing_bill && !billPreview.existing_bill.is_settled && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                        Max allowed: ₹{billPreview.existing_bill.amount_remaining}
                      </span>
                    )}
                  </div>

                  {/* Payment Method Selector */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                    {[
                      { key: 'UPI', label: 'UPI QR', icon: QrCode },
                      { key: 'CASH', label: 'Cash', icon: Banknote },
                      { key: 'CARD', label: 'Card', icon: CreditCard },
                    ].map(m => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setPaymentMethod(m.key)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: paymentMethod === m.key ? '2px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                          background: paymentMethod === m.key ? 'var(--accent-gold-dim)' : 'var(--bg-surface-elevated)',
                          color: paymentMethod === m.key ? 'var(--accent-gold)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: '0.8rem',
                          fontWeight: 700
                        }}
                      >
                        <m.icon size={18} />
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Split Quick Chips */}
                  {billPreview.existing_bill && !billPreview.existing_bill.is_settled && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(billPreview.existing_bill.amount_remaining)}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, fontSize: '0.75rem', padding: '6px' }}
                      >
                        Full: ₹{billPreview.existing_bill.amount_remaining}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const half = Math.round((parseFloat(billPreview.existing_bill.amount_remaining) / 2) * 100) / 100;
                          setPaymentAmount(half);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, fontSize: '0.75rem', padding: '6px' }}
                      >
                        50% Half: ₹{Math.round((parseFloat(billPreview.existing_bill.amount_remaining) / 2) * 100) / 100}
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Amount to Collect in {paymentMethod} (₹)
                        </label>
                        {billPreview.existing_bill && parseFloat(paymentAmount) > parseFloat(billPreview.existing_bill.amount_remaining) && (
                          <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>
                            ⚠️ Cannot exceed ₹{billPreview.existing_bill.amount_remaining}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0.01"
                        max={billPreview.existing_bill ? billPreview.existing_bill.amount_remaining : undefined}
                        step="any"
                        required
                        value={paymentAmount}
                        onChange={e => {
                          const val = e.target.value;
                          const max = billPreview.existing_bill ? parseFloat(billPreview.existing_bill.amount_remaining) : Infinity;
                          if (parseFloat(val) > max) {
                            setPaymentAmount(max);
                          } else {
                            setPaymentAmount(val);
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface-elevated)',
                          border: billPreview.existing_bill && parseFloat(paymentAmount) > parseFloat(billPreview.existing_bill.amount_remaining)
                            ? '1.5px solid #ef4444'
                            : '1px solid var(--border-medium)',
                          color: 'var(--text-primary)',
                          fontFamily: 'inherit',
                          fontSize: '1.05rem',
                          fontWeight: 700
                        }}
                      />
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="Ref ID / UTR number / Cheque no. (optional)"
                        value={referenceId}
                        onChange={e => setReferenceId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                          fontFamily: 'inherit',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>
                  </div>

                  {!billPreview.existing_bill ? (
                    <button
                      type="button"
                      onClick={handleGenerateBill}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '12px' }}
                    >
                      <Receipt size={16} />
                      <span>Generate Bill to Process</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={processingPay || billPreview.existing_bill.is_settled || !paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > parseFloat(billPreview.existing_bill.amount_remaining)}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '12px' }}
                    >
                      {processingPay
                        ? 'Processing...'
                        : billPreview.existing_bill.is_settled
                        ? 'Bill Fully Settled ✓'
                        : `Record ₹${paymentAmount || 0} (${paymentMethod})`}
                    </button>
                  )}
                </form>
              </div>

              {/* Table Session Reset Action */}
              {billPreview.existing_bill?.is_settled && (
                <div style={{ marginTop: 20 }}>
                  <button
                    onClick={() => handleCloseSession(billPreview.existing_bill)}
                    className="btn btn-success"
                    style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
                  >
                    <CheckCircle2 size={18} />
                    <span>Table Settled • Close Session & Reset Table</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            padding: '80px 0',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-medium)'
          }}>
            <Receipt size={44} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.2rem' }}>Select a Table to Process Bill</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
              Choose any occupied dining table from the left to view dishes, apply discounts and record payment.
            </p>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {receiptBill && (
        <ThermalReceiptModal
          bill={receiptBill}
          cafeInfo={cafeInfo}
          onClose={() => setReceiptBill(null)}
          onCloseSession={handleCloseSession}
        />
      )}

      {/* Day-End Z-Report Modal */}
      {zReportData && (
        <ZReportModal
          zReport={zReportData}
          onClose={() => setZReportData(null)}
        />
      )}

      {/* 1. Open Shift Modal */}
      {showOpenShiftModal && (
        <div className="modal-backdrop" onClick={() => setShowOpenShiftModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Wallet size={20} color="var(--accent-gold)" />
                <h3 style={{ margin: 0 }}>Open Cashier Shift</h3>
              </div>
              <button onClick={() => setShowOpenShiftModal(false)} className="modal-close-btn">&times;</button>
            </div>

            <form onSubmit={handleOpenShift} style={{ padding: '20px' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6 }}>
                  Opening Drawer Cash Float (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={openingFloatInput}
                  onChange={e => setOpeningFloatInput(e.target.value)}
                  placeholder="e.g. 2000"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '1.1rem',
                    fontWeight: 700
                  }}
                />
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Starting physical cash notes and coins placed in the till drawer.
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6 }}>
                  Shift / Register Notes (Optional)
                </label>
                <input
                  type="text"
                  value={shiftNotesInput}
                  onChange={e => setShiftNotesInput(e.target.value)}
                  placeholder="e.g. Morning opening register 1"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowOpenShiftModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  Start Shift & Open Drawer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Petty Cash Expense Modal */}
      {showPettyCashModal && (
        <div className="modal-backdrop" onClick={() => setShowPettyCashModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <DollarSign size={20} color="var(--accent-gold)" />
                <h3 style={{ margin: 0 }}>Log Petty Cash Outlay</h3>
              </div>
              <button onClick={() => setShowPettyCashModal(false)} className="modal-close-btn">&times;</button>
            </div>

            <form onSubmit={handleRecordPettyCash} style={{ padding: '20px' }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6 }}>
                  Cash Amount Taken from Drawer (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={pettyAmountInput}
                  onChange={e => setPettyAmountInput(e.target.value)}
                  placeholder="e.g. 150"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '1.1rem',
                    fontWeight: 700
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6 }}>
                  Reason / Purpose
                </label>
                <input
                  type="text"
                  required
                  value={pettyReasonInput}
                  onChange={e => setPettyReasonInput(e.target.value)}
                  placeholder="e.g. Emergency mint leaves, Ice bag, cleaning cloth"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowPettyCashModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  Record Cash Deduction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Close Shift & Reconcile Modal */}
      {showCloseShiftModal && shiftData && (
        <div className="modal-backdrop" onClick={() => setShowCloseShiftModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Receipt size={20} color="var(--accent-gold)" />
                <h3 style={{ margin: 0 }}>Close Shift & Reconcile Z-Report</h3>
              </div>
              <button onClick={() => setShowCloseShiftModal(false)} className="modal-close-btn">&times;</button>
            </div>

            <form onSubmit={handleCloseShift} style={{ padding: '20px' }}>
              <div style={{
                background: 'var(--bg-surface-elevated)',
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 16,
                fontSize: '0.84rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Opening Float:</span>
                  <span>₹{shiftData.opening_float}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Cash Sales Collected:</span>
                  <span style={{ color: 'var(--status-available)', fontWeight: 700 }}>
                    +₹{shiftData.live_stats?.cash_sales?.toFixed(2) || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Petty Cash Outlay:</span>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>
                    -₹{shiftData.live_stats?.petty_cash_total?.toFixed(2) || 0}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-medium)',
                  paddingTop: 6,
                  fontWeight: 800
                }}>
                  <span>Expected Drawer Cash:</span>
                  <span style={{ color: 'var(--accent-gold)', fontSize: '1.05rem' }}>
                    ₹{shiftData.live_stats?.expected_drawer_cash?.toFixed(2) || shiftData.opening_float}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 6 }}>
                  Physical Cash Counted in Drawer (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={countedCashInput}
                  onChange={e => setCountedCashInput(e.target.value)}
                  placeholder="Enter counted amount"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '1.15rem',
                    fontWeight: 800
                  }}
                />

                {countedCashInput && (() => {
                  const expected = shiftData.live_stats?.expected_drawer_cash || parseFloat(shiftData.opening_float);
                  const counted = parseFloat(countedCashInput) || 0;
                  const variance = counted - expected;
                  return (
                    <div style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      display: 'flex',
                      justifyContent: 'space-between',
                      background: variance === 0 ? 'rgba(34,197,94,0.1)' : (variance > 0 ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)'),
                      color: variance === 0 ? '#16a34a' : (variance > 0 ? '#2563eb' : '#dc2626')
                    }}>
                      <span>Variance ({variance === 0 ? 'Matched' : (variance > 0 ? 'Surplus' : 'Shortage')}):</span>
                      <span>{variance >= 0 ? '+' : ''}₹{variance.toFixed(2)}</span>
                    </div>
                  );
                })()}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6 }}>
                  Closing Notes
                </label>
                <input
                  type="text"
                  value={shiftNotesInput}
                  onChange={e => setShiftNotesInput(e.target.value)}
                  placeholder="e.g. Shift ended on time, all orders reconciled"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCloseShiftModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  Close Shift & Generate Z-Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
