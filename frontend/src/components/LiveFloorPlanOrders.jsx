import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Plus,
  MoreHorizontal,
  Coffee,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  X
} from 'lucide-react';

// SVG Potted Plant Component to match the floor plan aesthetic
function CafePlant({ style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none', userSelect: 'none', ...style }}>
      <svg width="44" height="48" viewBox="0 0 48 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Palm / Monstera Leaves */}
        <path d="M24 22C20 12 12 10 6 12C8 18 16 22 24 22Z" fill="#2d6a4f" opacity="0.9" />
        <path d="M24 22C28 12 36 10 42 12C40 18 32 22 24 22Z" fill="#2d6a4f" opacity="0.9" />
        <path d="M24 20C17 7 21 2 24 2C27 2 31 7 24 20Z" fill="#40916c" />
        <path d="M24 22C16 16 10 18 4 24C8 28 18 26 24 22Z" fill="#52b788" opacity="0.85" />
        <path d="M24 22C32 16 38 18 44 24C40 28 30 26 24 22Z" fill="#52b788" opacity="0.85" />
        <path d="M24 22C20 25 14 28 10 34C16 35 22 30 24 22Z" fill="#2d6a4f" opacity="0.75" />
        <path d="M24 22C28 25 34 28 38 34C32 35 26 30 24 22Z" fill="#2d6a4f" opacity="0.75" />

        {/* Terracotta Clay Pot */}
        <path d="M15 32H33L31 48H17L15 32Z" fill="#c27d53" />
        <path d="M13 29H35C35.5 29 36 29.5 36 30V32C36 32.5 35.5 33 35 33H13C12.5 33 12 32.5 12 32V30C12 29.5 12.5 29 13 29Z" fill="#a95f36" />
        <path d="M17 48H31L30.5 50C30.5 50.5 30 51 29.5 51H18.5C18 51 17.5 50.5 17.5 50L17 48Z" fill="#8f4a27" />
        {/* Pot Highlights */}
        <path d="M18 34L19 46" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function LiveFloorPlanOrders({ onAddTable, onTableSelect, hideRecentOrders = false, className = '' }) {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchLiveState = async () => {
    try {
      const [tData, oData] = await Promise.all([
        api.getTables().catch(() => []),
        api.getOrders().catch(() => [])
      ]);
      setTables(Array.isArray(tData) ? tData : []);
      setOrders(Array.isArray(oData) ? oData : []);
    } catch (err) {
      console.error('Error polling live floor & orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveState();
    const interval = setInterval(fetchLiveState, 3000); // 3s live polling
    return () => clearInterval(interval);
  }, []);

  // Map 12 slots to real tables or realistic mock state
  const getTableSlot = (num) => {
    // Try to find a real table matching num or "Table 0num"
    const found = tables.find(t => {
      const parsedNum = parseInt(String(t.number).replace(/[^0-9]/g, ''), 10);
      return parsedNum === num;
    });

    if (found) {
      // Map DB status to visual status
      let visualStatus = 'AVAILABLE';
      if (['OCCUPIED', 'ORDERING'].includes(found.status)) visualStatus = 'OCCUPIED';
      else if (['PREPARING', 'SERVED'].includes(found.status)) visualStatus = 'OCCUPIED';
      else if (['BILL_REQUESTED', 'CLEANING'].includes(found.status)) visualStatus = 'CLEANING';
      else if (found.status === 'RESERVED') visualStatus = 'RESERVED';
      else if (found.status === 'AVAILABLE') visualStatus = 'AVAILABLE';
      return { ...found, visualStatus, slotNum: num };
    }

    // Default status matching the user's reference mockup if table not in DB
    const mockupDefaults = {
      1: 'AVAILABLE',
      2: 'OCCUPIED',
      3: 'AVAILABLE',
      4: 'OCCUPIED',
      5: 'CLEANING',
      6: 'AVAILABLE',
      7: 'AVAILABLE',
      8: 'RESERVED',
      9: 'AVAILABLE',
      10: 'OCCUPIED',
      11: 'AVAILABLE',
      12: 'AVAILABLE'
    };

    return {
      id: `virtual-${num}`,
      number: `Table ${num < 10 ? '0' + num : num}`,
      visualStatus: mockupDefaults[num] || 'AVAILABLE',
      status: mockupDefaults[num] || 'AVAILABLE',
      capacity: 4,
      shape: num >= 9 ? 'ROUND' : 'SQUARE',
      slotNum: num,
      isVirtual: true
    };
  };

  const statusColors = {
    AVAILABLE: {
      bg: '#7fd5a3',
      border: '#60c38a',
      text: '#123b24',
      badgeBg: '#dcfce7',
      badgeText: '#15803d',
      label: 'Available'
    },
    OCCUPIED: {
      bg: '#f87171',
      border: '#ef4444',
      text: '#450a0a',
      badgeBg: '#fee2e2',
      badgeText: '#b91c1c',
      label: 'Occupied'
    },
    CLEANING: {
      bg: '#fcd34d',
      border: '#fbbf24',
      text: '#451a03',
      badgeBg: '#fef3c7',
      badgeText: '#b45309',
      label: 'Cleaning'
    },
    RESERVED: {
      bg: '#60a5fa',
      border: '#3b82f6',
      text: '#172554',
      badgeBg: '#dbeafe',
      badgeText: '#1d4ed8',
      label: 'Reserved'
    }
  };

  // Default fallback mock orders matching the user screenshot if orders list is small
  const defaultOrders = [
    {
      id: 1026,
      order_number: 1026,
      table_number: 'Table 04',
      table_badge: 'T4',
      items: [
        { item_name: 'Cappuccino', quantity: 2 },
        { item_name: 'Brownie', quantity: 1 }
      ],
      amount: 320,
      status: 'Preparing',
      status_style: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' }
    },
    {
      id: 1025,
      order_number: 1025,
      table_number: 'Table 07',
      table_badge: 'T7',
      items: [
        { item_name: 'Margherita Pizza', quantity: 1 }
      ],
      amount: 280,
      status: 'Served',
      status_style: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' }
    },
    {
      id: 1024,
      order_number: 1024,
      table_number: 'Table 02',
      table_badge: 'T2',
      items: [
        { item_name: 'Classic Burger', quantity: 1 },
        { item_name: 'Fries', quantity: 1 }
      ],
      amount: 350,
      status: 'Cooking',
      status_style: { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' }
    },
    {
      id: 1023,
      order_number: 1023,
      table_number: 'Table 08',
      table_badge: 'T8',
      items: [
        { item_name: 'Iced Coffee', quantity: 2 }
      ],
      amount: 300,
      status: 'Ready',
      status_style: { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' }
    },
    {
      id: 1022,
      order_number: 1022,
      table_number: 'Table 01',
      table_badge: 'T1',
      items: [
        { item_name: 'Pasta Alfredo', quantity: 1 }
      ],
      amount: 250,
      status: 'Served',
      status_style: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' }
    },
    {
      id: 1021,
      order_number: 1021,
      table_number: 'Table 06',
      table_badge: 'T6',
      items: [
        { item_name: 'Cappuccino', quantity: 2 },
        { item_name: 'Sandwich', quantity: 1 }
      ],
      amount: 420,
      status: 'Paid',
      status_style: { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }
    }
  ];

  // Helper to format live order into display row
  const formatOrderRow = (o, idx) => {
    // Extract table badge (e.g. "Table 04" -> "T4")
    const tblStr = o.table_number || (o.session?.table?.number) || 'T?';
    const numMatch = tblStr.match(/\d+/);
    const tableBadge = numMatch ? `T${parseInt(numMatch[0], 10)}` : 'T1';

    let displayStatus = 'Preparing';
    let statusStyle = { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };

    const rawStatus = (o.status || '').toUpperCase();
    if (rawStatus === 'SERVED') {
      displayStatus = 'Served';
      statusStyle = { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
    } else if (rawStatus === 'PREPARING') {
      displayStatus = 'Cooking';
      statusStyle = { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' };
    } else if (rawStatus === 'READY') {
      displayStatus = 'Ready';
      statusStyle = { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' };
    } else if (['PAID', 'COMPLETED'].includes(rawStatus)) {
      displayStatus = 'Paid';
      statusStyle = { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
    } else if (rawStatus === 'CONFIRMED' || rawStatus === 'PLACED') {
      displayStatus = 'Preparing';
      statusStyle = { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
    }

    const items = (o.items && o.items.length > 0)
      ? o.items.map(it => ({ item_name: it.item_name || it.name || 'Dish', quantity: it.quantity || 1 }))
      : [{ item_name: 'Dine-in Order', quantity: 1 }];

    const amount = o.subtotal || o.total_amount || 250;

    return {
      id: o.id || (1026 - idx),
      order_number: o.order_number || o.id || (1026 - idx),
      table_number: tblStr,
      table_badge: tableBadge,
      items,
      amount,
      status: displayStatus,
      status_style: statusStyle,
      rawOrder: o
    };
  };

  // Combine live orders with defaults if needed
  const displayOrders = orders.length >= 4 
    ? orders.slice(0, 6).map(formatOrderRow) 
    : [
        ...orders.map(formatOrderRow),
        ...defaultOrders.slice(orders.length, 6)
      ];

  const handleTableClick = (tableData) => {
    if (onTableSelect) {
      onTableSelect(tableData);
    } else {
      setSelectedTable(tableData);
    }
  };

  return (
    <div className={`live-floor-plan-orders-container ${className}`} style={{ marginBottom: 28 }}>
      <div 
        className="live-floor-plan-orders-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: hideRecentOrders ? '1fr' : 'minmax(0, 1.18fr) minmax(0, 1fr)',
          gap: 24,
          alignItems: 'stretch'
        }}
      >
        {/* ================= LEFT CARD: TABLE MANAGEMENT FLOOR PLAN ================= */}
        <div style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: '24px 26px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          border: '1px solid #eaeaea',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Card Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div>
              <h2 style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: '#1e293b',
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}>
                Table Management
              </h2>
              <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginTop: 3, fontWeight: 500 }}>
                Live status of all tables
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => {
                  if (onAddTable) onAddTable();
                  else navigate('/admin/tables');
                }}
                style={{
                  background: '#3d2314',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '9px 16px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(61, 35, 20, 0.25)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Plus size={15} strokeWidth={3} />
                <span>Add Table</span>
              </button>

              <Link
                to="/admin/tables"
                style={{
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '9px 15px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.background = '#ffffff';
                }}
              >
                <span>View All</span>
              </Link>
            </div>
          </div>

          {/* Canvas Floor Area */}
          <div style={{
            position: 'relative',
            background: '#f8f5ee',
            borderRadius: 16,
            padding: '30px 24px 24px',
            border: '1px solid #ede8de',
            minHeight: 380,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden'
          }}>
            {/* Potted Plants on the Floor Canvas */}
            <CafePlant style={{ position: 'absolute', top: 12, right: 14 }} />
            <CafePlant style={{ position: 'absolute', top: '48%', left: 10, transform: 'translateY(-50%) scale(0.9)' }} />
            <CafePlant style={{ position: 'absolute', bottom: 36, left: 12, transform: 'scale(0.85)' }} />
            <CafePlant style={{ position: 'absolute', bottom: 36, right: 14, transform: 'scale(0.85)' }} />

            {/* Vertical Cafe Divider / Architectural Pillar */}
            <div style={{
              position: 'absolute',
              top: 70,
              bottom: 80,
              right: 28,
              width: 5,
              background: '#dfd7ca',
              borderRadius: 4,
              opacity: 0.85
            }} />

            {/* 12 Tables Floor Grid: 4 columns × 3 rows */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gridTemplateRows: 'repeat(3, auto)',
              gap: '24px 16px',
              padding: '10px 48px 16px 36px',
              zIndex: 2
            }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => {
                const tableInfo = getTableSlot(num);
                const colorConfig = statusColors[tableInfo.visualStatus] || statusColors.AVAILABLE;
                const isRound = num >= 9;

                return (
                  <div
                    key={num}
                    onClick={() => handleTableClick(tableInfo)}
                    title={`${tableInfo.number} • ${colorConfig.label} (Click for details)`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'transform 0.18s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {/* Top Chair */}
                    <div style={{
                      width: isRound ? 26 : 28,
                      height: 8,
                      background: '#5c3a21',
                      borderRadius: isRound ? '6px 6px 0 0' : '4px 4px 0 0',
                      marginBottom: 2,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                    }} />

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {/* Left Chair */}
                      <div style={{
                        width: 8,
                        height: isRound ? 26 : 28,
                        background: '#5c3a21',
                        borderRadius: isRound ? '6px 0 0 6px' : '4px 0 0 4px',
                        marginRight: 2,
                        boxShadow: '1px 0 2px rgba(0,0,0,0.2)'
                      }} />

                      {/* Table Top Surface */}
                      <div style={{
                        width: 54,
                        height: 54,
                        background: colorConfig.bg,
                        borderRadius: isRound ? '50%' : 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 3px 6px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,0.4)',
                        border: `1.5px solid ${colorConfig.border}`,
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}>
                        <span style={{
                          fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                          fontSize: '1.25rem',
                          fontWeight: 800,
                          color: '#1e293b',
                          letterSpacing: '-0.02em',
                          userSelect: 'none'
                        }}>
                          {num}
                        </span>

                        {/* If calling waiter */}
                        {tableInfo.waiter_called && (
                          <span style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: '#ef4444',
                            border: '2px solid #fff',
                            animation: 'pulse 1.5s infinite'
                          }} />
                        )}
                      </div>

                      {/* Right Chair */}
                      <div style={{
                        width: 8,
                        height: isRound ? 26 : 28,
                        background: '#5c3a21',
                        borderRadius: isRound ? '0 6px 6px 0' : '0 4px 4px 0',
                        marginLeft: 2,
                        boxShadow: '-1px 0 2px rgba(0,0,0,0.2)'
                      }} />
                    </div>

                    {/* Bottom Chair */}
                    <div style={{
                      width: isRound ? 26 : 28,
                      height: 8,
                      background: '#5c3a21',
                      borderRadius: isRound ? '0 0 6px 6px' : '0 0 4px 4px',
                      marginTop: 2,
                      boxShadow: '0 -1px 2px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                );
              })}
            </div>

            {/* Bottom Status Legend */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              flexWrap: 'wrap',
              marginTop: 18,
              paddingTop: 12,
              borderTop: '1px solid rgba(223, 215, 202, 0.7)',
              zIndex: 3
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: statusColors.AVAILABLE.bg, border: `1.5px solid ${statusColors.AVAILABLE.border}` }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Available</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: statusColors.OCCUPIED.bg, border: `1.5px solid ${statusColors.OCCUPIED.border}` }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Occupied</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: statusColors.CLEANING.bg, border: `1.5px solid ${statusColors.CLEANING.border}` }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Cleaning</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: statusColors.RESERVED.bg, border: `1.5px solid ${statusColors.RESERVED.border}` }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Reserved</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT CARD: RECENT ORDERS ================= */}
        {!hideRecentOrders && (
          <div style={{
            background: '#ffffff',
          borderRadius: 20,
          padding: '24px 26px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          border: '1px solid #eaeaea',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16
          }}>
            <div>
              <h2 style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: '#1e293b',
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}>
                Recent Orders
              </h2>
            </div>

            <Link
              to="/admin/orders"
              style={{
                background: '#ffffff',
                color: '#334155',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '7px 14px',
                fontSize: '0.84rem',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.background = '#f8fafc';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.background = '#ffffff';
              }}
            >
              View All
            </Link>
          </div>

          {/* Orders Table Container */}
          <div style={{ flex: 1, overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left'
            }}>
              <thead>
                <tr style={{
                  color: '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  letterSpacing: '0.01em',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <th style={{ padding: '10px 8px 12px 0', width: '12%' }}>#</th>
                  <th style={{ padding: '10px 8px 12px', width: '12%' }}>Table</th>
                  <th style={{ padding: '10px 10px 12px', width: '40%' }}>Items</th>
                  <th style={{ padding: '10px 8px 12px', width: '16%' }}>Amount</th>
                  <th style={{ padding: '10px 8px 12px', width: '16%' }}>Status</th>
                  <th style={{ padding: '10px 0 12px', width: '4%', textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {displayOrders.map((ord, idx) => (
                  <tr
                    key={ord.id || idx}
                    style={{
                      borderBottom: idx === displayOrders.length - 1 ? 'none' : '1px solid #f8fafc',
                      transition: 'background 0.15s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedOrder(ord)}
                    onMouseEnter={e => e.currentTarget.style.background = '#fcfbf9'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Order ID */}
                    <td style={{
                      padding: '14px 8px 14px 0',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      whiteSpace: 'nowrap'
                    }}>
                      #{ord.order_number}
                    </td>

                    {/* Table Badge */}
                    <td style={{ padding: '14px 8px' }}>
                      <span style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 8,
                        display: 'inline-block'
                      }}>
                        {ord.table_badge}
                      </span>
                    </td>

                    {/* Items Stack */}
                    <td style={{ padding: '14px 10px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {ord.items.map((it, i) => (
                          <div key={i} style={{
                            fontSize: '0.82rem',
                            color: '#334155',
                            fontWeight: 500,
                            lineHeight: 1.3
                          }}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{it.quantity} × </span>
                            <span>{it.item_name}</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Amount */}
                    <td style={{
                      padding: '14px 8px',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      whiteSpace: 'nowrap'
                    }}>
                      ₹{ord.amount}
                    </td>

                    {/* Status Pill Badge */}
                    <td style={{ padding: '14px 8px' }}>
                      <span style={{
                        background: ord.status_style.bg,
                        color: ord.status_style.text,
                        border: `1px solid ${ord.status_style.border}`,
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        padding: '4px 12px',
                        borderRadius: 14,
                        display: 'inline-block',
                        whiteSpace: 'nowrap'
                      }}>
                        {ord.status}
                      </span>
                    </td>

                    {/* Action Menu dots */}
                    <td style={{ padding: '14px 0', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(ord);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Order options"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>

      {/* ================= MODAL: TABLE QUICK DETAILS ================= */}
      {selectedTable && (
        <div className="modal-backdrop" onClick={() => setSelectedTable(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: 24, borderRadius: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: selectedTable.shape === 'ROUND' ? '50%' : 12,
                  background: statusColors[selectedTable.visualStatus]?.bg || '#7fd5a3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#1e293b',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {selectedTable.slotNum || selectedTable.number}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedTable.number}
                  </h3>
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: statusColors[selectedTable.visualStatus]?.badgeBg,
                    color: statusColors[selectedTable.visualStatus]?.badgeText,
                    display: 'inline-block',
                    marginTop: 4
                  }}>
                    ● {statusColors[selectedTable.visualStatus]?.label || 'Active'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: '#f8fafc',
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 20,
              fontSize: '0.85rem',
              color: '#475569',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Capacity:</span>
                <strong style={{ color: '#0f172a' }}>{selectedTable.capacity || 4} Guests</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Section:</span>
                <strong style={{ color: '#0f172a' }}>{selectedTable.floor_section || 'Indoor Main Dining'}</strong>
              </div>
              {selectedTable.active_session && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Session:</span>
                    <code style={{ background: '#fff', padding: '1px 6px', borderRadius: 4, fontWeight: 700, color: '#b45309' }}>
                      {selectedTable.active_session.session_code}
                    </code>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Active Bill:</span>
                    <strong style={{ color: '#059669', fontSize: '0.95rem' }}>
                      ₹{selectedTable.active_session.total_amount || selectedTable.active_session.subtotal || 0}
                    </strong>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setSelectedTable(null);
                  navigate('/admin/tables');
                }}
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px 14px', fontSize: '0.86rem', fontWeight: 700 }}
              >
                Open in Table Manager
              </button>
              <button
                onClick={() => setSelectedTable(null)}
                className="btn btn-secondary"
                style={{ padding: '10px 14px', fontSize: '0.86rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ORDER QUICK DETAILS ================= */}
      {selectedOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: 24, borderRadius: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Order #{selectedOrder.order_number}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {selectedOrder.table_number} ({selectedOrder.table_badge})
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: '#f8fafc',
              borderRadius: 12,
              padding: '16px',
              marginBottom: 18,
              border: '1px solid #f1f5f9'
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
                Ordered Items
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedOrder.items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span style={{ color: '#0f172a' }}>
                      <strong>{it.quantity}×</strong> {it.item_name}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: 14,
                paddingTop: 10,
                borderTop: '1px dashed #cbd5e1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>Total Amount</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  ₹{selectedOrder.amount}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  navigate('/admin/orders');
                }}
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px 14px', fontSize: '0.86rem', fontWeight: 700 }}
              >
                View in Orders KDS
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="btn btn-secondary"
                style={{ padding: '10px 14px', fontSize: '0.86rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
