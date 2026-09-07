import React from 'react';
import {
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  DollarSign,
  Clock,
  User,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Coins
} from 'lucide-react';

export default function ZReportModal({ zReport, onClose }) {
  if (!zReport) return null;

  const handlePrint = () => {
    window.print();
  };

  const isMatched = zReport.cash_variance === 0;
  const isSurplus = zReport.cash_variance > 0;
  const isShortage = zReport.cash_variance < 0;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 480,
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden'
        }}
      >
        {/* Header with Print & Close controls */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #2b2520 0%, #171412 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Receipt size={20} color="var(--accent-gold)" />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Day-End Z-Report</h3>
              <p style={{ fontSize: '0.72rem', color: '#c5b8ae', margin: 0 }}>Shift #{zReport.shift_number} Reconciliation Audit</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handlePrint}
              className="btn btn-primary"
              style={{
                padding: '6px 12px',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Printer size={14} />
              <span>Print Z-Report</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: 'none',
                color: '#fff',
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div id="printable-z-report" style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 28px',
          fontFamily: "'Courier New', Courier, monospace",
          color: '#111',
          fontSize: '0.82rem',
          lineHeight: 1.45,
          background: '#faf9f6'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '1.5px dashed #444', paddingBottom: 14, marginBottom: 14 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {zReport.cafe_name || 'The Velvet Bean & Bistro'}
            </h2>
            <p style={{ margin: '4px 0 2px', fontSize: '0.75rem' }}>{zReport.cafe_address}</p>
            <p style={{ margin: '2px 0', fontSize: '0.75rem' }}>Phone: {zReport.cafe_phone} | GSTIN: {zReport.gstin}</p>
            <div style={{
              display: 'inline-block',
              marginTop: 8,
              padding: '2px 10px',
              border: '1px solid #111',
              fontWeight: 900,
              fontSize: '0.8rem',
              letterSpacing: '0.1em'
            }}>
              OFFICIAL CASHIER Z-REPORT
            </div>
          </div>

          {/* Shift Details */}
          <div style={{ marginBottom: 14, borderBottom: '1px dashed #999', paddingBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span>SHIFT NUMBER:</span>
              <strong>#{zReport.shift_number}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span>CASHIER:</span>
              <strong>{zReport.cashier_name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span>OPENED AT:</span>
              <span>{zReport.opened_at}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>CLOSED AT:</span>
              <span>{zReport.closed_at}</span>
            </div>
          </div>

          {/* Sales Summary */}
          <div style={{ marginBottom: 14, borderBottom: '1px dashed #999', paddingBottom: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6, textDecoration: 'underline' }}>SALES SUMMARY:</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span>Total Settled Bills:</span>
              <strong>{zReport.bills_count}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span>Gross Sales:</span>
              <span>₹{zReport.gross_sales.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, color: '#b91c1c' }}>
              <span>Discounts Applied:</span>
              <span>-₹{zReport.total_discounts.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span>GST Tax Collected:</span>
              <span>₹{zReport.total_tax_collected.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span>Tips Received:</span>
              <span>₹{zReport.total_tips.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '0.9rem', marginTop: 4, paddingTop: 4, borderTop: '1px solid #ddd' }}>
              <span>NET REVENUE:</span>
              <span>₹{zReport.net_sales.toFixed(2)}</span>
            </div>
          </div>

          {/* Tender Breakdown */}
          <div style={{ marginBottom: 14, borderBottom: '1px dashed #999', paddingBottom: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6, textDecoration: 'underline' }}>PAYMENT TENDERS:</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span>Cash Payments:</span>
              <strong>₹{zReport.total_cash_sales.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span>UPI (QR / GPay / PhonePe):</span>
              <strong>₹{zReport.total_upi_sales.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span>Card (Credit / Debit):</span>
              <strong>₹{zReport.total_card_sales.toFixed(2)}</strong>
            </div>
            {zReport.total_other_sales > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span>Other / Wallets:</span>
                <strong>₹{zReport.total_other_sales.toFixed(2)}</strong>
              </div>
            )}
          </div>

          {/* Drawer Reconciliation */}
          <div style={{
            background: isMatched ? '#f0fdf4' : (isSurplus ? '#eff6ff' : '#fef2f2'),
            border: `1.5px solid ${isMatched ? '#86efac' : (isSurplus ? '#bfdbfe' : '#fecaca')}`,
            padding: '12px 14px',
            borderRadius: 8,
            marginBottom: 16
          }}>
            <div style={{ fontWeight: 900, marginBottom: 6, color: '#111' }}>
              DRAWER CASH RECONCILIATION:
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span>(+) Starting Drawer Float:</span>
              <span>₹{zReport.opening_float.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span>(+) Cash Sales Tendered:</span>
              <span>₹{zReport.total_cash_sales.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, color: '#b91c1c' }}>
              <span>(-) Petty Cash Outlay:</span>
              <span>-₹{zReport.total_petty_cash.toFixed(2)}</span>
            </div>
            
            {zReport.petty_cash_expenses && zReport.petty_cash_expenses.length > 0 && (
              <div style={{ margin: '6px 0', paddingLeft: 10, fontSize: '0.74rem', color: '#666', borderLeft: '2px solid #ccc' }}>
                {zReport.petty_cash_expenses.map((exp, idx) => (
                  <div key={idx}>• {exp.reason}: ₹{exp.amount.toFixed(2)} ({exp.time})</div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginTop: 4, paddingTop: 4, borderTop: '1px dashed #aaa' }}>
              <span>Expected Cash in Drawer:</span>
              <strong>₹{zReport.expected_cash_in_drawer.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginTop: 2 }}>
              <span>Actual Counted Cash:</span>
              <strong>₹{zReport.actual_cash_in_drawer.toFixed(2)}</strong>
            </div>
            
            {/* Variance row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 8,
              paddingTop: 6,
              borderTop: '2px solid #111',
              fontWeight: 900,
              fontSize: '0.9rem',
              color: isMatched ? '#166534' : (isSurplus ? '#1e40af' : '#991b1b')
            }}>
              <span>VARIANCE ({zReport.variance_status}):</span>
              <span>{zReport.cash_variance >= 0 ? '+' : ''}₹{zReport.cash_variance.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer Sign-off */}
          <div style={{ textAlign: 'center', fontSize: '0.74rem', color: '#555', marginTop: 16 }}>
            <p style={{ margin: '0 0 16px' }}>*** END OF SHIFT REPORT ***</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, paddingTop: 8 }}>
              <div style={{ borderTop: '1px solid #999', width: '45%', paddingTop: 4 }}>
                Cashier Signature
              </div>
              <div style={{ borderTop: '1px solid #999', width: '45%', paddingTop: 4 }}>
                Manager Signature
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={{ padding: '12px 20px', background: '#f5f5f5', borderTop: '1px solid #e5e5e5', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            Close
          </button>
          <button onClick={handlePrint} className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Printer size={15} />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
