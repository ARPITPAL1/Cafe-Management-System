import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  TrendingUp,
  DollarSign,
  Download,
  Filter,
  BarChart3,
  Percent,
  PieChart,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';

export default function ReportsAnalytics() {
  const [activeTab, setActiveTab] = useState('MARGINS');
  const [margins, setMargins] = useState([]);
  const [dailySales, setDailySales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('total_profit');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [marginsData, dailyData] = await Promise.all([
        api.getMarginAnalysis(sortBy),
        api.getDailySalesReport()
      ]);
      setMargins(marginsData);
      setDailySales(dailyData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [sortBy]);

  // Aggregate stats
  const totalRevenue = margins.reduce((acc, m) => acc + (m.total_revenue || 0), 0);
  const totalProfit = margins.reduce((acc, m) => acc + (m.total_profit || 0), 0);
  const avgMarginPct = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  const exportCSV = () => {
    const headers = ['Dish Name', 'Category', 'Selling Price (₹)', 'Food Cost (₹)', 'Packaging (₹)', 'Gross Margin (₹)', 'Margin %', 'Qty Sold', 'Revenue (₹)', 'Total Profit (₹)'];
    const rows = margins.map(m => [
      `"${m.name}"`,
      `"${m.category}"`,
      m.price,
      m.food_cost,
      m.packaging_cost,
      m.gross_margin,
      `${m.margin_percentage}%`,
      m.quantity_sold,
      m.total_revenue,
      m.total_profit
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cafe_margins_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Financial Intelligence & Margin Reports</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            Detailed dish-level food costing, recipe profitability and daily sales analytics
          </p>
        </div>

        <button onClick={exportCSV} className="btn btn-secondary btn-sm">
          <Download size={14} />
          <span>Export Margins (CSV)</span>
        </button>
      </div>

      {/* Top 3 Financial KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Menu Sales Volume
          </span>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 6 }}>
            ₹{totalRevenue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Aggregated item sales
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Gross Contribution
          </span>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--status-available)', marginTop: 6 }}>
            ₹{totalProfit.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--status-available)', marginTop: 4 }}>
            After ingredient food costs & packaging
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Average Margin Health
          </span>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-gold)', marginTop: 6 }}>
            {avgMarginPct}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Healthy benchmark: 55% - 70%
          </div>
        </div>
      </div>

      {/* Navigation Tabs: Margins vs Daily Sales */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('MARGINS')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'MARGINS' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
            background: activeTab === 'MARGINS' ? 'var(--accent-gold-dim)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'MARGINS' ? 'var(--accent-gold)' : 'var(--text-secondary)'
          }}
        >
          Dish Margin Intelligence
        </button>

        <button
          onClick={() => setActiveTab('DAILY')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'DAILY' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
            background: activeTab === 'DAILY' ? 'var(--accent-gold-dim)' : 'var(--bg-surface-elevated)',
            color: activeTab === 'DAILY' ? 'var(--accent-gold)' : 'var(--text-secondary)'
          }}
        >
          Daily Sales & Payment Methods
        </button>
      </div>

      {activeTab === 'MARGINS' ? (
        <div className="glass-panel" style={{ padding: '20px' }}>
          {/* Sort Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Dish Profitability Leaderboard ({margins.length} dishes)
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sort By:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  fontSize: '0.82rem'
                }}
              >
                <option value="total_profit">Highest Gross Profit (₹)</option>
                <option value="quantity_sold">Most Units Sold</option>
                <option value="margin_percentage">Highest Margin %</option>
                <option value="total_revenue">Highest Gross Revenue</option>
              </select>
            </div>
          </div>

          {/* Margins Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 8px' }}>Dish Name</th>
                  <th style={{ padding: '10px 8px' }}>Category</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Selling Price</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Food Cost</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Gross Margin (₹)</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Margin %</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Units Sold</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Revenue</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Total Profit</th>
                </tr>
              </thead>
              <tbody>
                {margins.map((m, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 600 }}>
                      {m.is_veg ? '🟢 ' : '🔴 '}
                      {m.name}
                    </td>
                    <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{m.category}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>₹{m.price}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>₹{m.food_cost}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--status-available)', fontWeight: 600 }}>
                      +₹{m.gross_margin}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        background: m.margin_percentage >= 60 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                        color: m.margin_percentage >= 60 ? 'var(--status-available)' : 'var(--status-ordering)'
                      }}>
                        {m.margin_percentage}%
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 700 }}>
                      {m.quantity_sold}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>₹{m.total_revenue}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--status-available)' }}>
                      ₹{m.total_profit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Daily Sales Section */
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Historical Daily Sales & Settlement Tenders</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 8px' }}>Date</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Settled Bills</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Gross Sales</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Discounts</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Taxes (GST)</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Net Sales</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Cash</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>UPI</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Card</th>
                </tr>
              </thead>
              <tbody>
                {dailySales.map((d, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 700 }}>{d.date}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>{d.orders_count}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>₹{d.gross_sales.toFixed(2)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--status-occupied)' }}>-₹{d.discount_total.toFixed(2)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>₹{d.tax_total.toFixed(2)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-gold)' }}>
                      ₹{d.net_sales.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>₹{d.cash_sales.toFixed(2)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--status-available)' }}>₹{d.upi_sales.toFixed(2)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--status-bill)' }}>₹{d.card_sales.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
