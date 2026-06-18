/**
 * printInvoice.js
 * Mở cửa sổ in mới với nội dung hóa đơn đầy đủ.
 * Cách này KHÔNG phụ thuộc vào @media print CSS tricks nên luôn hoạt động đúng.
 */

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

export function printInvoice({
  businessInfo,
  booking,
  room,
  roomTypeName,
  roomType,
  inventoryItems = [],
  serviceItems = [],
  checkoutTime,
  billableUnits,
  isHourly,
  unitPrice,
  roomTotal,
  serviceTotal,
  grandTotal,
  paymentMethod,
  hoursReal,
  minutesReal,
}) {
  const invoiceDate = new Date().toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  const isCash =
    paymentMethod === 'CASH' ||
    paymentMethod === 'Tiền mặt';

  // ── Hàng dịch vụ / sản phẩm ──────────────────────────────────
  const serviceRows = [
    ...inventoryItems.map((item) => `
      <tr>
        <td>${item.item_name || ''}</td>
        <td class="center">Sản phẩm</td>
        <td class="right">${item.quantity}</td>
        <td class="right">${fmt(item.unit_price)}</td>
        <td class="right bold">${fmt(item.unit_price * item.quantity)}</td>
      </tr>`),
    ...serviceItems.map((item) => `
      <tr>
        <td>${item.item_name || ''}</td>
        <td class="center">Dịch vụ</td>
        <td class="right">${item.quantity}</td>
        <td class="right">${fmt(item.unit_price)}</td>
        <td class="right bold">${fmt(item.unit_price * item.quantity)}</td>
      </tr>`),
  ].join('');

  const hasServices = inventoryItems.length > 0 || serviceItems.length > 0;

  // ── Thông tin ngân hàng ───────────────────────────────────────
  const bankInfoHtml = (!isCash && businessInfo?.bank_account_number) ? `
    <div class="bank-info">
      <div>${businessInfo.bank_name || ''}</div>
      <div>STK: <strong>${businessInfo.bank_account_number}</strong></div>
      ${businessInfo.bank_account_name ? `<div>Chủ TK: ${businessInfo.bank_account_name}</div>` : ''}
    </div>` : '';

  // ── Logo ──────────────────────────────────────────────────────
  const logoHtml = businessInfo?.logo_url
    ? `<img src="${businessInfo.logo_url}" class="logo" alt="Logo" />`
    : '';

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Hoa don - ${booking?.booking_code || 'N/A'}</title>
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

    @page {
      size: A4 portrait;
      margin: 8mm;
    }

    /* ── Header doanh nghiệp ── */
    .biz-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 10px;
    }

    .logo {
      width: 68px;
      height: 68px;
      object-fit: contain;
      border: 1px solid #ccc;
      flex-shrink: 0;
    }

    .biz-info { flex: 1; }

    .biz-type {
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 2px;
    }

    .biz-name {
      font-size: 18px;
      font-weight: bold;
      line-height: 1.2;
      margin-bottom: 5px;
    }

    .biz-meta-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 2px 18px;
    }

    .biz-meta { font-size: 11.5px; }
    .biz-meta.full { flex-basis: 100%; }

    /* ── Tiêu đề tài liệu (góc phải) ── */
    .doc-info {
      text-align: right;
      flex-shrink: 0;
      min-width: 165px;
    }

    .doc-title {
      font-size: 15px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 2px solid #000;
      padding-bottom: 4px;
      display: inline-block;
      margin-bottom: 6px;
    }

    .doc-meta {
      font-size: 11.5px;
      margin-bottom: 3px;
    }

    .doc-date { font-size: 11px; }

    /* ── Divider ── */
    hr.thick {
      border: none;
      border-top: 2px solid #000;
      margin: 10px 0;
    }

    hr.thin {
      border: none;
      border-top: 1px solid #aaa;
      margin: 12px 0;
    }

    /* ── Section heading ── */
    .section-title {
      font-size: 12.5px;
      font-weight: bold;
      border-left: 3px solid #000;
      padding: 3px 8px;
      margin: 12px 0 6px;
      background: #f0f0f0;
    }

    /* ── Info grid (2 cột) ── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px 16px;
      padding: 4px 8px;
    }

    .info-row {
      display: flex;
      gap: 6px;
      font-size: 12.5px;
    }

    .info-label {
      white-space: nowrap;
      min-width: 135px;
      flex-shrink: 0;
    }

    .info-value { font-weight: bold; }

    /* ── Tables ── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 4px;
    }

    th {
      background: #e0e0e0;
      color: #000;
      font-weight: bold;
      padding: 6px 8px;
      text-align: left;
      font-size: 11.5px;
      border: 1px solid #aaa;
    }

    td {
      padding: 5px 8px;
      border: 1px solid #ccc;
      vertical-align: top;
    }

    tr:nth-child(even) td { background: #f7f7f7; }

    .right { text-align: right !important; }
    .center { text-align: center !important; }
    .bold { font-weight: bold !important; }

    .cell-sub {
      font-size: 10.5px;
      font-style: italic;
      display: block;
      margin-top: 2px;
    }

    /* ── Summary block (tổng kết) ── */
    .summary-wrap {
      display: flex;
      gap: 18px;
      align-items: flex-start;
      margin-top: 12px;
    }

    .summary-left { flex: 1; display: flex; flex-direction: column; gap: 10px; }

    .checkout-box {
      padding: 7px 10px;
      border: 1px solid #aaa;
    }

    .checkout-label {
      font-size: 10.5px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 3px;
    }

    .checkout-value {
      font-size: 13.5px;
      font-weight: bold;
    }

    .payment-box {
      padding: 7px 10px;
      border: 1px solid #aaa;
    }

    .payment-label {
      font-size: 10.5px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 3px;
    }

    .payment-value {
      font-size: 13px;
      font-weight: bold;
    }

    .bank-info {
      font-size: 11.5px;
      line-height: 1.6;
      border-top: 1px solid #ccc;
      margin-top: 6px;
      padding-top: 5px;
    }

    .bank-info div { margin: 0; }

    /* ── Bảng tổng tiền (cột phải) ── */
    .total-box {
      flex-shrink: 0;
      width: 265px;
      border: 1.5px solid #000;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 10px;
      font-size: 12px;
      border-bottom: 1px solid #ccc;
      gap: 10px;
    }

    .total-row:last-child { border-bottom: none; }

    .total-row.grand {
      background: #222;
      color: #fff;
      font-weight: bold;
      padding: 10px;
      font-size: 12.5px;
    }

    .grand-amount {
      font-size: 17px;
      font-weight: bold;
      white-space: nowrap;
    }

    /* ── Chữ ký ── */
    .sign-row {
      display: flex;
      justify-content: space-around;
      margin-top: 32px;
      gap: 16px;
    }

    .sign-col { text-align: center; flex: 1; }

    .sign-role {
      font-size: 12.5px;
      font-weight: bold;
      margin-bottom: 2px;
    }

    .sign-hint {
      font-size: 11px;
      font-style: italic;
      margin-bottom: 50px;
    }

    .sign-line {
      border-top: 1px solid #666;
      margin: 0 20px;
    }

    /* ── Cảm ơn ── */
    .thank-you {
      text-align: center;
      font-size: 12px;
      font-style: italic;
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #aaa;
    }
  </style>
</head>
<body>

  <!-- HEADER DOANH NGHIỆP -->
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
      <p class="doc-meta">Ma phien: <strong>${booking?.booking_code || '—'}</strong></p>
      <p class="doc-date">Ngay in: ${invoiceDate}</p>
    </div>
  </div>

  <hr class="thick" />

  <!-- THÔNG TIN KHÁCH HÀNG -->
  <div class="section-title">Thong tin khach hang</div>
  <div class="info-grid">
    <div class="info-row">
      <span class="info-label">Ho ten khach:</span>
      <span class="info-value">${booking?.guest_name || '—'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">So dien thoai:</span>
      <span class="info-value">${booking?.guest_phone || '—'}</span>
    </div>
    ${booking?.guest_email ? `
    <div class="info-row">
      <span class="info-label">Email:</span>
      <span class="info-value">${booking.guest_email}</span>
    </div>` : ''}
    <div class="info-row">
      <span class="info-label">Phong:</span>
      <span class="info-value">
        ${room?.room_number || '—'}${(roomTypeName || roomType?.name) ? ` — ${roomTypeName || roomType?.name}` : ''}
      </span>
    </div>
  </div>

  <!-- CHI TIẾT THUÊ PHÒNG -->
  <div class="section-title">Chi tiet thue phong</div>
  <div class="info-grid">
    <div class="info-row">
      <span class="info-label">Hinh thuc thue:</span>
      <span class="info-value">${isHourly ? 'Theo gio' : 'Theo ngay'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Don gia:</span>
      <span class="info-value">${fmt(unitPrice)} / ${isHourly ? 'gio' : 'ngay'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Gio check-in:</span>
      <span class="info-value">${fmtDT(booking?.expected_checkin)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Check-out du kien:</span>
      <span class="info-value">${fmtDT(booking?.expected_checkout)}</span>
    </div>
  </div>

  <!-- TÍNH TIỀN PHÒNG -->
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
          Tien phong ${room?.room_number || ''}
          <span class="cell-sub">
            Thuc te: ${hoursReal} gio${minutesReal > 0 ? ` ${minutesReal} phut` : ''}
            &nbsp;-&gt;&nbsp;Tinh ${billableUnits} ${isHourly ? 'gio' : 'ngay'}
          </span>
        </td>
        <td class="right">${billableUnits} ${isHourly ? 'gio' : 'ngay'}</td>
        <td class="right">${fmt(unitPrice)}</td>
        <td class="right bold">${roomTotal != null ? fmt(roomTotal) : '—'}</td>
      </tr>
    </tbody>
  </table>

  ${hasServices ? `
  <!-- DỊCH VỤ & SẢN PHẨM -->
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

  <!-- TỔNG KẾT -->
  <div class="summary-wrap">
    <div class="summary-left">
      <div class="checkout-box">
        <div class="checkout-label">Thoi gian tra phong thuc te</div>
        <div class="checkout-value">${fmtDT(checkoutTime)}</div>
      </div>
      <div class="payment-box">
        <div class="payment-label">Phuong thuc thanh toan</div>
        <div class="payment-value">${isCash ? 'Tien mat' : 'Chuyen khoan ngan hang'}</div>
        ${bankInfoHtml}
      </div>
    </div>
    <div class="total-box">
      <div class="total-row">
        <span>Tien phong (${billableUnits} ${isHourly ? 'gio' : 'ngay'})</span>
        <span>${fmt(roomTotal)}</span>
      </div>
      <div class="total-row">
        <span>Tien dich vu &amp; san pham</span>
        <span>${fmt(serviceTotal)}</span>
      </div>
      <div class="total-row grand">
        <span>TONG CONG PHAI TRA</span>
        <span class="grand-amount">${fmt(grandTotal)}</span>
      </div>
    </div>
  </div>

  <!-- CHỮ KÝ -->
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

  // Mở popup window và viết HTML vào đó
  const printWin = window.open('', '_blank', 'width=900,height=700');
  if (!printWin) {
    alert('Trinh duyet da chan popup. Vui long cho phep popup de in hoa don.');
    return;
  }
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
}
