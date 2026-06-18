/* ─────────────────────────────────────────────────────────────────
   InvoicePrintView.jsx
   Giao diện hoá đơn dùng để in — chỉ hiển thị khi gọi window.print()
   Layout: ẩn hoàn toàn trên màn hình, chỉ render khi in (CSS @media print)
   ───────────────────────────────────────────────────────────────── */
import './InvoicePrintView.css';

const fmt = (n) =>
  n != null ? Number(n).toLocaleString('vi-VN') + ' đ' : '—';

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
};

function InvoicePrintView({
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

  return (
    <div className="inv-root" id="invoice-print-root">

      {/* ══ HEADER: THÔNG TIN DOANH NGHIỆP ══ */}
      <div className="inv-biz-header">
        {businessInfo?.logo_url && (
          <img
            src={businessInfo.logo_url}
            alt="Logo"
            className="inv-biz-logo"
          />
        )}
        <div className="inv-biz-info">
          {businessInfo?.business_type && (
            <p className="inv-biz-type">{businessInfo.business_type}</p>
          )}
          <h1 className="inv-biz-name">{businessInfo?.business_name || '—'}</h1>
          <div className="inv-biz-meta-grid">
            {businessInfo?.tax_code && (
              <span className="inv-biz-meta">
                <strong>MST:</strong> {businessInfo.tax_code}
              </span>
            )}
            {businessInfo?.legal_representative && (
              <span className="inv-biz-meta">
                <strong>Đại diện:</strong> {businessInfo.legal_representative}
              </span>
            )}
            {businessInfo?.business_address && (
              <span className="inv-biz-meta inv-biz-meta--full">
                <strong>Địa chỉ:</strong> {businessInfo.business_address}
              </span>
            )}
            {businessInfo?.hotline && (
              <span className="inv-biz-meta">
                <strong>ĐT:</strong> {businessInfo.hotline}
              </span>
            )}
            {businessInfo?.email_contact && (
              <span className="inv-biz-meta">
                <strong>Email:</strong> {businessInfo.email_contact}
              </span>
            )}
          </div>
        </div>
        <div className="inv-doc-info">
          <h2 className="inv-doc-title">HÓA ĐƠN DỊCH VỤ</h2>
          <p className="inv-doc-code">
            Mã phiên: <strong>{booking?.booking_code || '—'}</strong>
          </p>
          <p className="inv-doc-date">Ngày in: {invoiceDate}</p>
        </div>
      </div>

      <div className="inv-divider" />

      {/* ══ THÔNG TIN KHÁCH HÀNG ══ */}
      <div className="inv-section">
        <h3 className="inv-section-title">
          <span className="inv-section-icon">👤</span> Thông tin khách hàng
        </h3>
        <div className="inv-info-grid">
          <div className="inv-info-row">
            <span className="inv-info-label">Họ tên khách:</span>
            <span className="inv-info-value">{booking?.guest_name || '—'}</span>
          </div>
          <div className="inv-info-row">
            <span className="inv-info-label">Số điện thoại:</span>
            <span className="inv-info-value">{booking?.guest_phone || '—'}</span>
          </div>
          {booking?.guest_email && (
            <div className="inv-info-row">
              <span className="inv-info-label">Email:</span>
              <span className="inv-info-value">{booking.guest_email}</span>
            </div>
          )}
          <div className="inv-info-row">
            <span className="inv-info-label">Phòng:</span>
            <span className="inv-info-value inv-highlight">
              {room?.room_number || '—'}
              {(roomTypeName || roomType?.name) ? ` — ${roomTypeName || roomType?.name}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ══ CHI TIẾT THUÊ PHÒNG ══ */}
      <div className="inv-section">
        <h3 className="inv-section-title">
          <span className="inv-section-icon">🏨</span> Chi tiết thuê phòng
        </h3>
        <div className="inv-info-grid">
          <div className="inv-info-row">
            <span className="inv-info-label">Hình thức thuê:</span>
            <span className="inv-info-value">
              {booking?.rent_type === 'HOURLY' ? 'Theo giờ' : 'Theo ngày'}
            </span>
          </div>
          <div className="inv-info-row">
            <span className="inv-info-label">Đơn giá:</span>
            <span className="inv-info-value">
              {fmt(unitPrice)} / {isHourly ? 'giờ' : 'ngày'}
            </span>
          </div>
          <div className="inv-info-row">
            <span className="inv-info-label">Giờ check-in:</span>
            <span className="inv-info-value">{fmtDateTime(booking?.expected_checkin)}</span>
          </div>
          <div className="inv-info-row">
            <span className="inv-info-label">Check-out dự kiến:</span>
            <span className="inv-info-value">{fmtDateTime(booking?.expected_checkout)}</span>
          </div>
        </div>
      </div>

      {/* ══ TÍNH TIỀN PHÒNG ══ */}
      <div className="inv-section">
        <h3 className="inv-section-title">
          <span className="inv-section-icon">⏱️</span> Tính tiền phòng
        </h3>
        <table className="inv-table">
          <thead>
            <tr>
              <th>Diễn giải</th>
              <th className="inv-col-right">Số lượng</th>
              <th className="inv-col-right">Đơn giá</th>
              <th className="inv-col-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Tiền phòng {room?.room_number}
                <br />
                <span className="inv-cell-sub">
                  Thời gian thực: {hoursReal} giờ {minutesReal > 0 ? `${minutesReal} phút` : ''}
                  &nbsp;→&nbsp;Tính {billableUnits} {isHourly ? 'giờ' : 'ngày'}
                </span>
              </td>
              <td className="inv-col-right">{billableUnits} {isHourly ? 'giờ' : 'ngày'}</td>
              <td className="inv-col-right">{fmt(unitPrice)}</td>
              <td className="inv-col-right inv-amount">{roomTotal != null ? fmt(roomTotal) : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ══ DỊCH VỤ THÊM ══ */}
      {(inventoryItems.length > 0 || serviceItems.length > 0) && (
        <div className="inv-section">
          <h3 className="inv-section-title">
            <span className="inv-section-icon">🛎️</span> Dịch vụ & Sản phẩm thêm
          </h3>
          <table className="inv-table">
            <thead>
              <tr>
                <th>Tên dịch vụ / Sản phẩm</th>
                <th className="inv-col-center">Loại</th>
                <th className="inv-col-right">Số lượng</th>
                <th className="inv-col-right">Đơn giá</th>
                <th className="inv-col-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {inventoryItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.item_name}</td>
                  <td className="inv-col-center">
                    <span className="inv-badge inv-badge--product">Sản phẩm</span>
                  </td>
                  <td className="inv-col-right">{item.quantity}</td>
                  <td className="inv-col-right">{fmt(item.unit_price)}</td>
                  <td className="inv-col-right inv-amount">{fmt(item.unit_price * item.quantity)}</td>
                </tr>
              ))}
              {serviceItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.item_name}</td>
                  <td className="inv-col-center">
                    <span className="inv-badge inv-badge--service">Dịch vụ</span>
                  </td>
                  <td className="inv-col-right">{item.quantity}</td>
                  <td className="inv-col-right">{fmt(item.unit_price)}</td>
                  <td className="inv-col-right inv-amount">{fmt(item.unit_price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="inv-divider" />

      {/* ══ TỔNG KẾT THANH TOÁN ══ */}
      <div className="inv-summary-block">

        {/* Cột trái: Thông tin trả phòng + Phương thức */}
        <div className="inv-summary-left">
          <div className="inv-checkout-info">
            <p className="inv-checkout-label">Thời gian trả phòng thực tế</p>
            <p className="inv-checkout-value">{fmtDateTime(checkoutTime)}</p>
          </div>
          <div className="inv-payment-method">
            <p className="inv-payment-label">Phương thức thanh toán</p>
            <p className="inv-payment-value">
              {paymentMethod === 'CASH' || paymentMethod === 'Tiền mặt'
                ? '💵 Tiền mặt'
                : '🏦 Chuyển khoản ngân hàng'}
            </p>
            {(paymentMethod === 'TRANSFER' || paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'Chuyển khoản') &&
              businessInfo?.bank_account_number && (
                <div className="inv-bank-info">
                  <p>{businessInfo.bank_name}</p>
                  <p>
                    STK: <strong>{businessInfo.bank_account_number}</strong>
                  </p>
                  {businessInfo.bank_account_name && (
                    <p>Chủ TK: {businessInfo.bank_account_name}</p>
                  )}
                </div>
              )}
          </div>
        </div>

        {/* Cột phải: Bảng tổng tiền */}
        <div className="inv-summary-right">
          <div className="inv-total-table">
            <div className="inv-total-row">
              <span>Tiền phòng ({billableUnits} {isHourly ? 'giờ' : 'ngày'})</span>
              <span>{fmt(roomTotal)}</span>
            </div>
            <div className="inv-total-row">
              <span>Tiền dịch vụ &amp; sản phẩm</span>
              <span>{fmt(serviceTotal)}</span>
            </div>
            <div className="inv-total-row inv-total-row--grand">
              <span>TỔNG CỘNG PHẢI TRẢ</span>
              <span className="inv-grand-amount">{fmt(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ FOOTER ══ */}
      <div className="inv-footer">
        <div className="inv-footer-col">
          <p className="inv-footer-role">Khách hàng</p>
          <p className="inv-footer-sign">(Ký, ghi rõ họ tên)</p>
          <div className="inv-footer-line" />
        </div>
        <div className="inv-footer-col">
          <p className="inv-footer-role">Nhân viên lễ tân</p>
          <p className="inv-footer-sign">(Ký, ghi rõ họ tên)</p>
          <div className="inv-footer-line" />
        </div>
        <div className="inv-footer-col">
          <p className="inv-footer-role">Đại diện doanh nghiệp</p>
          <p className="inv-footer-sign">(Ký, đóng dấu)</p>
          <div className="inv-footer-line" />
        </div>
      </div>

      <p className="inv-thank-you">
        Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi!
        {businessInfo?.hotline && ` Mọi thắc mắc xin liên hệ: ${businessInfo.hotline}`}
      </p>

    </div>
  );
}

export default InvoicePrintView;
