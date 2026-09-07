const rawApi = import.meta.env.VITE_API_BASE;
const API_BASE = (rawApi && !rawApi.includes('<') && !rawApi.includes('your-backend') && !rawApi.includes('service-url')) 
  ? rawApi.replace(/\/$/, '') 
  : '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.error || data?.message || (data && typeof data === 'object' ? JSON.stringify(data) : response.statusText || 'Network request failed');
      throw new Error(errorMsg);
    }
    return data;
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  // Core & Auth
  getCafeProfile: () => request('/core/cafe/'),
  updateCafeProfile: (data) => request('/core/cafe/', { method: 'PUT', body: JSON.stringify(data) }),
  staffLogin: (data) => request('/core/login/', { method: 'POST', body: JSON.stringify(data) }),
  getStaffList: () => request('/core/staff/'),
  getAuditLogs: () => request('/core/audit-logs/'),
  ownerMasterUpdate: (data) => request('/core/owner/master-update/', { method: 'POST', body: JSON.stringify(data) }),
  manageStaff: (data) => request('/core/owner/manage-staff/', { method: 'POST', body: JSON.stringify(data) }),
  ownerResetData: (action, operatorName = 'Owner') => 
    request('/core/owner/reset-data/', { method: 'POST', body: JSON.stringify({ action, operator_name: operatorName }) }),

  // Tables
  getTables: () => request('/tables/'),
  addTable: (data) => request('/tables/', { method: 'POST', body: JSON.stringify(data) }),
  getTableDetail: (id) => request(`/tables/${id}/`),
  updateTable: (id, data) => request(`/tables/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTable: (id) => request(`/tables/${id}/`, { method: 'DELETE' }),
  regenerateToken: (id) => request(`/tables/${id}/regenerate-token/`, { method: 'POST' }),
  updateTableStatus: (id, status) => request(`/tables/${id}/update-status/`, { method: 'POST', body: JSON.stringify({ status }) }),
  openTableSession: (id, guestCount = 2) => request(`/tables/${id}/open-session/`, { method: 'POST', body: JSON.stringify({ guest_count: guestCount }) }),
  closeTableSession: (id) => request(`/tables/${id}/close-session/`, { method: 'POST' }),
  closeSession: (sessionId) => request(`/tables/sessions/${sessionId}/close/`, { method: 'POST' }),
  getTableByToken: (token) => request(`/tables/by-token/${token}/`),
  callWaiter: (token, customerName = 'Guest') => request(`/tables/by-token/${token}/call-waiter/`, { method: 'POST', body: JSON.stringify({ customer_name: customerName }) }),
  dismissWaiter: (id, staffName = 'Staff') => request(`/tables/${id}/dismiss-waiter/`, { method: 'POST', body: JSON.stringify({ staff_name: staffName }) }),
  dismissAllWaiters: (staffName = 'Manager') => request('/tables/dismiss-all-waiters/', { method: 'POST', body: JSON.stringify({ staff_name: staffName }) }),
  requestEssentials: (token, items, customerName = 'Guest') => request(`/tables/by-token/${token}/request-essentials/`, { method: 'POST', body: JSON.stringify({ items, customer_name: customerName }) }),
  provisionCafe: (data) => request('/core/provision/', { method: 'POST', body: JSON.stringify(data) }),

  // Advance Table Reservations
  getReservations: (params = '') => request(`/tables/reservations/${params ? '?' + params : ''}`),
  createReservation: (data) => request('/tables/reservations/', { method: 'POST', body: JSON.stringify(data) }),
  updateReservation: (id, data) => request(`/tables/reservations/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteReservation: (id) => request(`/tables/reservations/${id}/`, { method: 'DELETE' }),
  dismissAllReservationAlerts: () => request('/tables/reservations/dismiss-all-alerts/', { method: 'POST' }),
  checkInReservation: (data) => request('/tables/reservations/check-in/', { method: 'POST', body: JSON.stringify(data) }),
  toggleAdvanceBooking: (enabled = null) => request('/tables/toggle-advance-booking/', { method: 'POST', body: JSON.stringify({ enabled }) }),
  toggleWaiterAlerts: (enabled = null) => request('/tables/toggle-waiter-alerts/', { method: 'POST', body: JSON.stringify({ enabled }) }),


  // Menu
  getMenuCatalog: (forCustomer = false) => request(`/menu/?for_customer=${forCustomer}`),
  getCategories: () => request('/menu/categories/'),
  addCategory: (data) => request('/menu/categories/', { method: 'POST', body: JSON.stringify(data) }),
  addMenuItem: (data) => request('/menu/items/', { method: 'POST', body: JSON.stringify(data) }),
  updateMenuItem: (id, data) => request(`/menu/items/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMenuItem: (id) => request(`/menu/items/${id}/`, { method: 'DELETE' }),
  toggleItemStock: (id) => request(`/menu/items/${id}/toggle-stock/`, { method: 'POST' }),

  // Orders
  getOrders: (params = '') => request(`/orders/${params ? '?' + params : ''}`),
  createOrder: (data) => request('/orders/', { method: 'POST', body: JSON.stringify(data) }),
  getOrderDetail: (id) => request(`/orders/${id}/`),
  updateOrderStatus: (id, status, changedBy = 'Staff', notes = '') => 
    request(`/orders/${id}/status/`, { method: 'POST', body: JSON.stringify({ status, changed_by: changedBy, notes }) }),
  addItemsToOrder: (id, items, addedBy = 'Staff') => 
    request(`/orders/${id}/add-items/`, { method: 'POST', body: JSON.stringify({ items, added_by: addedBy }) }),
  cancelOrderItem: (itemId, reason, cancelledBy = 'Cashier') => 
    request(`/orders/items/${itemId}/cancel/`, { method: 'POST', body: JSON.stringify({ reason, cancelled_by: cancelledBy }) }),
  getKitchenOrders: () => request('/orders/kitchen/'),

  // Billing
  getBillPreview: (sessionId) => request(`/billing/session/${sessionId}/preview/`),
  generateBill: (sessionId, data = {}) => request(`/billing/session/${sessionId}/generate/`, { method: 'POST', body: JSON.stringify(data) }),
  recordPayment: (billId, data) => request(`/billing/${billId}/payment/`, { method: 'POST', body: JSON.stringify(data) }),
  sendWhatsAppInvoice: (billId, phone = '') => request(`/billing/${billId}/send-whatsapp/`, { method: 'POST', body: JSON.stringify({ phone }) }),
  requestBill: (sessionId, requestedBy = 'Customer') => 
    request(`/billing/session/${sessionId}/request-bill/`, { method: 'POST', body: JSON.stringify({ requested_by: requestedBy }) }),
  mergeBills: (sessionId, data = {}) =>
    request(`/billing/session/${sessionId}/merge-bills/`, { method: 'POST', body: JSON.stringify(data) }),

  // Customers & OTP
  getCustomers: (search = '') => request(`/customers/${search ? '?search=' + encodeURIComponent(search) : ''}`),
  getCustomerDetail: (id) => request(`/customers/${id}/`),
  sendOTP: (phone, name = '') => request('/customers/send-otp/', { method: 'POST', body: JSON.stringify({ phone, name }) }),
  verifyOTP: (phone, otpCode, name = '', sessionId = null) => 
    request('/customers/verify-otp/', { method: 'POST', body: JSON.stringify({ phone, otp_code: otpCode, name, session_id: sessionId }) }),
  submitFeedback: (data) => request('/customers/feedback/', { method: 'POST', body: JSON.stringify(data) }),
  getFeedback: () => request('/customers/feedback/'),

  // Reports & Margins
  getDashboardAnalytics: () => request('/reports/dashboard/'),
  getMarginAnalysis: (sortBy = 'quantity_sold') => request(`/reports/margins/?sort_by=${sortBy}`),
  getDailySalesReport: () => request('/reports/daily/'),

  // Communications
  getWhatsAppLogs: () => request('/communications/whatsapp-logs/'),
};
