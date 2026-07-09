/**
 * printInvoiceFromBill.js
 * Giống printInvoice.js nhưng nhận dữ liệu từ bảng bill_payments
 * thay vì từ state của PaymentOverview.
 */
import { getImageSrc } from '../../utils/imageUrl';

const fmt = (n) =>
  n != null ? Number(n).toLocaleString('vi-VN') + ' đ' : '—';

const fmtDT = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
};

export function printInvoiceFromBill({ bill, businessInfo }) {
  if (!bill) return;

  const invoiceDate = new Date().toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  const isCash = bill.payment_method === 'CASH';

  // ── Tính thời gian thực tế từ actual_checkin → actual_checkout ──
  const checkinMs  = bill.actual_checkin  ? new Date(bill.actual_checkin).getTime()  : null;
  const checkoutMs = bill.actual_checkout ? new Date(bill.actual_checkout).getTime() : null;
  const diffMs     = (checkinMs && checkoutMs) ? Math.max(0, checkoutMs - checkinMs) : 0;
  const totalMins  = Math.floor(diffMs / 60_000);
  const hoursReal  = Math.floor(totalMins / 60);
  const minutesReal = totalMins % 60;

  const isHourly = bill.rent_type === 'HOURLY';
  const billableUnits = isHourly
    ? Math.max(1, Math.ceil(totalMins / 60))
    : Math.max(1, Math.ceil(totalMins / (60 * 24)));

  // Đơn giá ngược từ tổng / số lượng (nếu có)
  const unitPrice = billableUnits > 0 && bill.room_price > 0
    ? Math.round(bill.room_price / billableUnits)
    : null;

  // ── Dịch vụ ──────────────────────────────────────────────────────
  const services = Array.isArray(bill.services_detail) ? bill.services_detail : [];
  const inventoryItems = services.filter((s) => s.type === 'INVENTORY');
  const serviceItems   = services.filter((s) => s.type === 'GENERAL');
  const hasServices    = services.length > 0;

  const serviceRows = services.map((s) => `
    <tr>
      <td>${s.name || ''}</td>
      <td class="center">${s.type === 'INVENTORY' ? 'San pham' : 'Dich vu'}</td>
      <td class="right">${s.quantity ?? 1}</td>
      <td class="right">${fmt(s.unit_price)}</td>
      <td class="right bold">${fmt(s.subtotal ?? (s.unit_price * (s.quantity ?? 1)))}</td>
    </tr>`).join('');

  // ── Bank info ─────────────────────────────────────────────────────
  const bankInfoHtml = (!isCash && businessInfo?.bank_account_number) ? `
    <div class="bank-info">
      <div>${businessInfo.bank_name || ''}</div>
      <div>STK: <strong>${businessInfo.bank_account_number}</strong></div>
      ${businessInfo.bank_account_name ? `<div>Chu TK: ${businessInfo.bank_account_name}</div>` : ''}
    </div>` : '';

  const logoHtml = businessInfo?.logo_url
    ? `<img src="${businessInfo.logo_url}" class="logo" alt="Logo" />`
    : '';

  // ── CCCD ──────────────────────────────────────────────────────
  const cccdFrontUrl = bill?.cccd_front_url ? getImageSrc(bill.cccd_front_url) : null;
  const cccdBackUrl = bill?.cccd_back_url ? getImageSrc(bill.cccd_back_url) : null;

  const cccdHtml = (cccdFrontUrl || cccdBackUrl) ? `
    <div style="page-break-inside: avoid; margin-top: 24px; padding-top: 10px; border-top: 1px dashed #ccc;">
      <div class="section-title">Anh CCCD Khach hang</div>
      <div style="display: flex; gap: 10px; justify-content: center; margin-top: 12px;">
        ${cccdFrontUrl ? `<img src="${cccdFrontUrl}" alt="CCCD Mat Truoc" style="width: 48%; max-height: 250px; object-fit: contain; border: 1px solid #ccc; border-radius: 4px; background: #fafafa; padding: 4px;" />` : ''}
        ${cccdBackUrl ? `<img src="${cccdBackUrl}" alt="CCCD Mat Sau" style="width: 48%; max-height: 250px; object-fit: contain; border: 1px solid #ccc; border-radius: 4px; background: #fafafa; padding: 4px;" />` : ''}
      </div>
    </div>
  ` : '';

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Hoa don - ${bill.id || 'N/A'}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      color: #000;
      background: #fff;
      padding: 14mm 16mm 10mm;
      line-height: 1.55;
    }
    @page { size: A4 portrait; margin: 8mm; }

    .biz-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 10px; }
    .logo { width: 68px; height: 68px; object-fit: contain; border: 1px solid #ccc; flex-shrink: 0; }
    .biz-info { flex: 1; }
    .biz-type { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
    .biz-name { font-size: 18px; font-weight: bold; line-height: 1.2; margin-bottom: 5px; }
    .biz-meta-grid { display: flex; flex-wrap: wrap; gap: 2px 18px; }
    .biz-meta { font-size: 11.5px; }
    .biz-meta.full { flex-basis: 100%; }

    .doc-info { text-align: right; flex-shrink: 0; min-width: 165px; }
    .doc-title { font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #000; padding-bottom: 4px; display: inline-block; margin-bottom: 6px; }
    .doc-meta { font-size: 11.5px; margin-bottom: 3px; }
    .doc-date { font-size: 11px; }

    hr.thick { border: none; border-top: 2px solid #000; margin: 10px 0; }
    hr.thin  { border: none; border-top: 1px solid #aaa; margin: 12px 0; }

    .section-title { font-size: 12.5px; font-weight: bold; border-left: 3px solid #000; padding: 3px 8px; margin: 12px 0 6px; background: #f0f0f0; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 16px; padding: 4px 8px; }
    .info-row { display: flex; gap: 6px; font-size: 12.5px; }
    .info-label { white-space: nowrap; min-width: 135px; flex-shrink: 0; }
    .info-value { font-weight: bold; }

    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4px; }
    th { background: #e0e0e0; color: #000; font-weight: bold; padding: 6px 8px; text-align: left; font-size: 11.5px; border: 1px solid #aaa; }
    td { padding: 5px 8px; border: 1px solid #ccc; vertical-align: top; }
    tr:nth-child(even) td { background: #f7f7f7; }
    .right  { text-align: right  !important; }
    .center { text-align: center !important; }
    .bold   { font-weight: bold  !important; }
    .cell-sub { font-size: 10.5px; font-style: italic; display: block; margin-top: 2px; }

    .summary-wrap { display: flex; gap: 18px; align-items: flex-start; margin-top: 12px; }
    .summary-left { flex: 1; display: flex; flex-direction: column; gap: 10px; }

    .checkout-box { padding: 7px 10px; border: 1px solid #aaa; }
    .checkout-label { font-size: 10.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 3px; }
    .checkout-value { font-size: 13.5px; font-weight: bold; }

    .payment-box { padding: 7px 10px; border: 1px solid #aaa; }
    .payment-label { font-size: 10.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 3px; }
    .payment-value { font-size: 13px; font-weight: bold; }
    .bank-info { font-size: 11.5px; line-height: 1.6; border-top: 1px solid #ccc; margin-top: 6px; padding-top: 5px; }
    .bank-info div { margin: 0; }

    .total-box { flex-shrink: 0; width: 265px; border: 1.5px solid #000; }
    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; font-size: 12px; border-bottom: 1px solid #ccc; gap: 10px; }
    .total-row:last-child { border-bottom: none; }
    .total-row.grand { background: #222; color: #fff; font-weight: bold; padding: 10px; font-size: 12.5px; }
    .grand-amount { font-size: 17px; font-weight: bold; white-space: nowrap; }

    .sign-row { display: flex; justify-content: space-around; margin-top: 32px; gap: 16px; }
    .sign-col { text-align: center; flex: 1; }
    .sign-role { font-size: 12.5px; font-weight: bold; margin-bottom: 2px; }
    .sign-hint { font-size: 11px; font-style: italic; margin-bottom: 50px; }
    .sign-line { border-top: 1px solid #666; margin: 0 20px; }
    .thank-you { text-align: center; font-size: 12px; font-style: italic; margin-top: 16px; padding-top: 10px; border-top: 1px solid #aaa; }
  </style>
</head>
<body>

  <div class="biz-header">
    ${logoHtml}
    <div class="biz-info">
      ${businessInfo?.business_type ? `<p class="biz-type">${businessInfo.business_type}</p>` : ''}
      <h1 class="biz-name">${businessInfo?.business_name || '—'}</h1>
      <div class="biz-meta-grid">
        ${businessInfo?.tax_code ? `<span class="biz-meta"><strong>MST:</strong> ${businessInfo.tax_code}</span>` : ''}
        ${businessInfo?.legal_representative ? `<span class="biz-meta"><strong>Dai dien:</strong> ${businessInfo.legal_representative}</span>` : ''}
        ${businessInfo?.business_address ? `<span class="biz-meta full"><strong>Dia chi:</strong> ${businessInfo.business_address}</span>` : ''}
        ${businessInfo?.hotline ? `<span class="biz-meta"><strong>DT:</strong> ${businessInfo.hotline}</span>` : ''}
        ${businessInfo?.email_contact ? `<span class="biz-meta"><strong>Email:</strong> ${businessInfo.email_contact}</span>` : ''}
      </div>
    </div>
    <div class="doc-info">
      <div class="doc-title">Hoa don dich vu</div>
      <p class="doc-meta">Ma bill: <strong>${bill.id || '—'}</strong></p>
      <p class="doc-meta">Ma phien: <strong>${bill.booking_code || '—'}</strong></p>
      <p class="doc-date">Ngay in: ${invoiceDate}</p>
    </div>
  </div>

  <hr class="thick" />

  <div class="section-title">Thong tin khach hang</div>
  <div class="info-grid">
    <div class="info-row">
      <span class="info-label">Ho ten khach:</span>
      <span class="info-value">${bill.guest_name || '—'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">So dien thoai:</span>
      <span class="info-value">${bill.guest_phone || '—'}</span>
    </div>
    ${bill.guest_email ? `
    <div class="info-row">
      <span class="info-label">Email:</span>
      <span class="info-value">${bill.guest_email}</span>
    </div>` : ''}
    <div class="info-row">
      <span class="info-label">Phong:</span>
      <span class="info-value">${bill.room_number || '—'}</span>
    </div>
  </div>

  <div class="section-title">Chi tiet thue phong</div>
  <div class="info-grid">
    <div class="info-row">
      <span class="info-label">Hinh thuc thue:</span>
      <span class="info-value">${isHourly ? 'Theo gio' : 'Theo ngay'}</span>
    </div>
    ${unitPrice ? `
    <div class="info-row">
      <span class="info-label">Don gia:</span>
      <span class="info-value">${fmt(unitPrice)} / ${isHourly ? 'gio' : 'ngay'}</span>
    </div>` : ''}
    <div class="info-row">
      <span class="info-label">Gio check-in:</span>
      <span class="info-value">${fmtDT(bill.actual_checkin)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Gio check-out:</span>
      <span class="info-value">${fmtDT(bill.actual_checkout)}</span>
    </div>
  </div>

  <div class="section-title">Tinh tien phong</div>
  <table>
    <thead>
      <tr>
        <th>Dien giai</th>
        <th class="right">So luong</th>
        <th class="right">Don gia</th>
        <th class="right">Thanh tien</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          Tien phong ${bill.room_number || ''}
          <span class="cell-sub">
            Thuc te: ${hoursReal} gio${minutesReal > 0 ? ` ${minutesReal} phut` : ''}
            &nbsp;-&gt;&nbsp;Tinh ${billableUnits} ${isHourly ? 'gio' : 'ngay'}
          </span>
        </td>
        <td class="right">${billableUnits} ${isHourly ? 'gio' : 'ngay'}</td>
        <td class="right">${unitPrice ? fmt(unitPrice) : '—'}</td>
        <td class="right bold">${fmt(bill.room_price)}</td>
      </tr>
    </tbody>
  </table>

  ${hasServices ? `
  <div class="section-title">Dich vu &amp; San pham them</div>
  <table>
    <thead>
      <tr>
        <th>Ten dich vu / San pham</th>
        <th class="center">Loai</th>
        <th class="right">So luong</th>
        <th class="right">Don gia</th>
        <th class="right">Thanh tien</th>
      </tr>
    </thead>
    <tbody>${serviceRows}</tbody>
  </table>` : ''}

  <hr class="thin" />

  <div class="summary-wrap">
    <div class="summary-left">
      <div class="checkout-box">
        <div class="checkout-label">Thoi gian tra phong thuc te</div>
        <div class="checkout-value">${fmtDT(bill.actual_checkout)}</div>
      </div>
      <div class="payment-box">
        <div class="payment-label">Phuong thuc thanh toan</div>
        <div class="payment-value">${isCash ? 'Tien mat' : 'Chuyen khoan ngan hang'}</div>
        ${bankInfoHtml}
      </div>
    </div>
    <div class="total-box">
      <div class="total-row">
        <span>Tien phong</span>
        <span>${fmt(bill.room_price)}</span>
      </div>
      <div class="total-row">
        <span>Tien dich vu &amp; san pham</span>
        <span>${fmt(bill.service_price)}</span>
      </div>
      ${bill.discount_amount && bill.discount_amount > 0 ? `
      <div class="total-row" style="color: #16a34a;">
        <span>Giam gia (${bill.discount_code || 'Voucher'})</span>
        <span>-${fmt(bill.discount_amount)}</span>
      </div>` : ''}
      ${bill.deposit_applied && bill.deposit_amount > 0 ? `
      <div class="total-row">
        <span>Tien coc da tru</span>
        <span>- ${fmt(bill.deposit_amount)}</span>
      </div>` : ''}
      <div class="total-row grand">
        <span>TONG CONG PHAI TRA</span>
        <span class="grand-amount">${fmt(bill.final_amount)}</span>
      </div>
    </div>
  </div>

  ${cccdHtml}

  <div class="sign-row">
    <div class="sign-col">
      <p class="sign-role">Khach hang</p>
      <p class="sign-hint">(Ky, ghi ro ho ten)</p>
      <div class="sign-line"></div>
    </div>
    <div class="sign-col">
      <p class="sign-role">Nhan vien le tan</p>
      <p class="sign-hint">(Ky, ghi ro ho ten)</p>
      <div class="sign-line"></div>
    </div>
    <div class="sign-col">
      <p class="sign-role">Dai dien doanh nghiep</p>
      <p class="sign-hint">(Ky, dong dau)</p>
      <div class="sign-line"></div>
    </div>
  </div>

  <p class="thank-you">
    Cam on quy khach da su dung dich vu cua chung toi!${businessInfo?.hotline ? ` Moi thac mac xin lien he: ${businessInfo.hotline}` : ''}
  </p>

  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`;

  const printWin = window.open('', '_blank', 'width=900,height=700');
  if (!printWin) {
    alert('Trinh duyet da chan popup. Vui long cho phep popup de in hoa don.');
    return;
  }
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
}
