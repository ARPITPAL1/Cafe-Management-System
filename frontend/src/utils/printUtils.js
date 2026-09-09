/**
 * Thermal Printing Utilities for KOT and Customer Tax Invoices
 * Prints via dedicated iframe with standard 80mm roll dimensions.
 */

export function printKOT(order, cafeInfo = {}) {
  if (!order) return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const items = order.items || [];
  const totalQty = items.reduce((sum, it) => sum + (it.quantity || 1), 0);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>KOT #${order.order_number}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            line-height: 1.35;
            color: #000;
            background: #fff;
            width: 72mm;
            margin: 0 auto;
            padding: 4mm 2mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .title {
            font-size: 16px;
            font-weight: 900;
            text-align: center;
            letter-spacing: 0.05em;
          }
          .subtitle {
            font-size: 11px;
            text-align: center;
            margin-top: 2px;
          }
          .dashed {
            border-top: 1.5px dashed #000;
            margin: 6px 0;
          }
          .solid {
            border-top: 1.5px solid #000;
            margin: 6px 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin-bottom: 3px;
          }
          .row-lg {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            font-weight: 900;
            margin-bottom: 4px;
          }
          .items-header {
            font-size: 12px;
            font-weight: 900;
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
          }
          .item-block {
            margin-bottom: 8px;
          }
          .item-line {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            font-weight: 900;
          }
          .addon-line {
            font-size: 11px;
            padding-left: 14px;
            color: #222;
          }
          .notes-line {
            font-size: 11px;
            font-style: italic;
            font-weight: bold;
            padding-left: 14px;
            margin-top: 2px;
          }
          .order-notes-box {
            background: #f4f4f4;
            border: 1px solid #333;
            padding: 4px 6px;
            margin: 6px 0;
            font-size: 12px;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            font-size: 11px;
            margin-top: 8px;
            letter-spacing: 0.05em;
          }
        </style>
      </head>
      <body>
        <div class="title">KITCHEN ORDER TICKET (KOT)</div>
        <div class="subtitle">${cafeInfo.name || 'Artisan Cafe & Bistro'}</div>
        <div class="dashed"></div>

        <div class="row-lg">
          <span>ORDER #${order.order_number}</span>
          <span>${order.table_number || 'Takeaway'}</span>
        </div>

        <div class="row">
          <span>Time: ${order.created_at_display || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span>Source: ${order.order_source || 'Dine-In'}</span>
        </div>

        ${order.customer_name ? `
          <div class="row">
            <span>Diner: ${order.customer_name}</span>
          </div>
        ` : ''}

        ${order.notes ? `
          <div class="order-notes-box">
            NOTE: ${order.notes}
          </div>
        ` : ''}

        <div class="dashed"></div>
        <div class="items-header">
          <span>ITEM & DESCRIPTION</span>
          <span>QTY</span>
        </div>
        <div class="solid"></div>

        <div>
          ${items.map(it => `
            <div class="item-block">
              <div class="item-line">
                <span>${it.item_name || it.menu_item?.name || 'Item'} ${it.variant_name ? `(${it.variant_name})` : ''}</span>
                <span>${it.quantity}</span>
              </div>
              ${(it.addons_json || []).map(a => `
                <div class="addon-line">+ ${typeof a === 'object' ? a.name : a}</div>
              `).join('')}
              ${it.special_instructions ? `
                <div class="notes-line">* ${it.special_instructions}</div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <div class="dashed"></div>
        <div class="row-lg">
          <span>TOTAL ITEMS:</span>
          <span>${totalQty}</span>
        </div>
        <div class="dashed"></div>

        <div class="footer">
          *** KITCHEN COPY • ORDER #${order.order_number} ***
        </div>
      </body>
    </html>
  `;

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch (e) {}
    }, 1500);
  }, 300);
}

export function printThermalReceipt(bill, cafeInfo = {}) {
  if (!bill) return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const items = bill.items_breakdown || [];

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt ${bill.bill_number}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 1.35;
            color: #000;
            background: #fff;
            width: 72mm;
            margin: 0 auto;
            padding: 4mm 2mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .cafe-name {
            font-size: 15px;
            font-weight: 900;
            text-align: center;
            text-transform: uppercase;
          }
          .cafe-sub {
            font-size: 10px;
            text-align: center;
            color: #333;
            margin-top: 1px;
          }
          .dashed {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .solid {
            border-top: 1.5px solid #000;
            margin: 6px 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            margin-bottom: 2px;
          }
          .row-bold {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            font-weight: 900;
            margin-bottom: 3px;
          }
          .item-grid {
            display: grid;
            grid-template-columns: 1fr 24px 44px 50px;
            font-size: 11px;
            margin-bottom: 3px;
          }
          .item-grid-header {
            font-weight: 900;
            font-size: 11px;
            margin-bottom: 4px;
          }
          .tar { text-align: right; }
          .tac { text-align: center; }
          .footer {
            text-align: center;
            font-size: 10px;
            margin-top: 8px;
            color: #333;
          }
        </style>
      </head>
      <body>
        <div class="cafe-name">${cafeInfo.name || 'The Roasted Bean & Co.'}</div>
        <div class="cafe-sub">${cafeInfo.address || '42 Heritage Blvd, Mumbai'}</div>
        <div class="cafe-sub">Phone: ${cafeInfo.phone || '+91 98201 55667'}</div>
        ${cafeInfo.gstin ? `<div class="cafe-sub">GSTIN: ${cafeInfo.gstin}</div>` : ''}
        ${cafeInfo.fssai_license ? `<div class="cafe-sub">FSSAI: ${cafeInfo.fssai_license}</div>` : ''}

        <div class="dashed"></div>
        <div class="row">
          <span>Invoice: ${bill.bill_number}</span>
          <span>Table: ${bill.table_number || ''}</span>
        </div>
        <div class="row">
          <span>Date: ${bill.created_display || new Date().toLocaleDateString()}</span>
          <span>Status: ${bill.status}</span>
        </div>
        ${bill.customer_name ? `
          <div class="row">
            <span>Customer: ${bill.customer_name}</span>
            <span>${bill.customer_phone || ''}</span>
          </div>
        ` : ''}

        <div class="dashed"></div>
        <div class="item-grid item-grid-header">
          <span>ITEM</span>
          <span class="tac">QTY</span>
          <span class="tar">RATE</span>
          <span class="tar">AMT</span>
        </div>
        <div class="solid"></div>

        <div>
          ${items.map(it => `
            <div style="margin-bottom: 3px;">
              <div class="item-grid">
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${it.item_name} ${it.variant ? `(${it.variant})` : ''}</span>
                <span class="tac">${it.quantity}</span>
                <span class="tar">${it.unit_price}</span>
                <span class="tar">₹${it.total_price}</span>
              </div>
              ${(it.addons || []).map(a => `
                <div style="font-size: 9px; color: #555; padding-left: 8px;">+ ${a.name} (₹${a.price})</div>
              `).join('')}
            </div>
          `).join('')}
        </div>

        <div class="dashed"></div>
        <div class="row">
          <span>Subtotal:</span>
          <span>₹${parseFloat(bill.subtotal || 0).toFixed(2)}</span>
        </div>
        ${parseFloat(bill.discount_amount || 0) > 0 ? `
          <div class="row" style="color: #000; font-weight: bold;">
            <span>Discount (${bill.discount_reason || 'Promo'}):</span>
            <span>-₹${parseFloat(bill.discount_amount).toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="row">
          <span>CGST (2.5%):</span>
          <span>₹${parseFloat(bill.cgst_amount || 0).toFixed(2)}</span>
        </div>
        <div class="row">
          <span>SGST (2.5%):</span>
          <span>₹${parseFloat(bill.sgst_amount || 0).toFixed(2)}</span>
        </div>
        ${parseFloat(bill.service_charge || 0) > 0 ? `
          <div class="row">
            <span>Service Charge:</span>
            <span>₹${parseFloat(bill.service_charge).toFixed(2)}</span>
          </div>
        ` : ''}
        ${parseFloat(bill.round_off || 0) !== 0 ? `
          <div class="row">
            <span>Round Off:</span>
            <span>₹${parseFloat(bill.round_off).toFixed(2)}</span>
          </div>
        ` : ''}

        <div class="solid"></div>
        <div class="row-bold">
          <span>GRAND TOTAL:</span>
          <span>₹${parseFloat(bill.grand_total || 0).toFixed(2)}</span>
        </div>
        <div class="solid"></div>

        ${(bill.payments || []).length > 0 ? `
          <div style="margin-top: 4px;">
            <div style="font-size: 10px; font-weight: bold; margin-bottom: 2px;">PAYMENT DETAILS:</div>
            ${bill.payments.map(p => `
              <div class="row" style="font-size: 10px;">
                <span>${p.method_display || p.method} ${p.reference_id ? `(${p.reference_id})` : ''}:</span>
                <span>₹${parseFloat(p.amount).toFixed(2)} [PAID]</span>
              </div>
            `).join('')}
          </div>
          <div class="dashed"></div>
        ` : ''}

        <div class="footer">
          <div>${cafeInfo.receipt_footer || 'Thank you for dining with us! Please visit again.'}</div>
        </div>
      </body>
    </html>
  `;

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch (e) {}
    }, 1500);
  }, 300);
}
