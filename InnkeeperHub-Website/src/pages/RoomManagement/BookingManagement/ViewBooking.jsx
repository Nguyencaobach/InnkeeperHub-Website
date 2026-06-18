import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import bookingApi from '../../../api/bookingApi';
import roomTypeApi from '../../../api/roomTypeApi';
import './CreateBooking.css';
import './ViewBooking.css';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const getImageSrc = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) {
    try { return BASE_URL + new URL(url).pathname; } catch { return url; }
  }
  return `${BASE_URL}${url}`;
};

// ── Helpers (giống CreateBooking) ────────────────────────────────────────────
const getToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const buildISOFromParts = (dateStr, hour, minute) => {
  if (!dateStr) return null;
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  return `${dateStr}T${h}:${m}:00+07:00`;
};

const clampHour = (val) => Math.min(23, Math.max(0, parseInt(val, 10) || 0));
const clampMinute = (val) => Math.min(59, Math.max(0, parseInt(val, 10) || 0));

const formatMoney = (amount) =>
  amount != null ? Number(amount).toLocaleString('vi-VN') + ' đ' : '—';

// Tách ISO string thành { date, hour, minute }
const parseISOtoParts = (isoStr) => {
  if (!isoStr) return { date: '', hour: '', minute: '' };
  const d = new Date(isoStr);
  if (isNaN(d)) return { date: '', hour: '', minute: '' };
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
};

const formatDateTime = (isoStr) => {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d)) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
};

// ── Component ────────────────────────────────────────────────────────────────
function ViewBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: roomTypeId } = useParams();

  const { room, roomTypeName } = location.state || {};

  // ── STATE ──────────────────────────────────────────────────────────────────
  const [booking, setBooking] = useState(null);
  const [roomType, setRoomType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Form fields (dùng khi chỉnh sửa)
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [rentType, setRentType] = useState('HOURLY');

  const [checkinDate, setCheckinDate] = useState(getToday());
  const [checkinHour, setCheckinHour] = useState(0);
  const [checkinMinute, setCheckinMinute] = useState(0);

  const [checkoutDate, setCheckoutDate] = useState('');
  const [checkoutHour, setCheckoutHour] = useState('');
  const [checkoutMinute, setCheckoutMinute] = useState('');

  // UI states
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Tab cột phải
  const [activeTab, setActiveTab] = useState('detail');

  // Đồng hồ live — cập nhật mỗi phút để tab tính tiền luôn đúng
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // ── FETCH DATA ─────────────────────────────────────────────────────────────
  const loadBooking = useCallback(async () => {
    if (!room?.id) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await bookingApi.getByRoomId(room.id);
      const data = res?.data ?? res;
      setBooking(data);
      populateForm(data);
    } catch (err) {
      setFetchError(err?.response?.data?.message || err?.message || 'Không thể tải phiên thuê.');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  useEffect(() => {
    if (!roomTypeId) return;
    const fetchRoomType = async () => {
      try {
        const res = await roomTypeApi.getAll();
        const data = Array.isArray(res) ? res : (res?.data ?? []);
        const found = data.find(rt => String(rt.id) === String(roomTypeId));
        if (found) setRoomType(found);
      } catch (err) {
        console.error('Lỗi fetch loại phòng:', err);
      }
    };
    fetchRoomType();
  }, [roomTypeId]);

  const populateForm = (data) => {
    if (!data) return;
    setGuestName(data.guest_name || '');
    setGuestPhone(data.guest_phone || '');
    setGuestEmail(data.guest_email || '');
    setRentType(data.rent_type || 'HOURLY');

    const ci = parseISOtoParts(data.expected_checkin);
    setCheckinDate(ci.date || getToday());
    setCheckinHour(ci.hour !== '' ? ci.hour : 0);
    setCheckinMinute(ci.minute !== '' ? ci.minute : 0);

    const co = parseISOtoParts(data.expected_checkout);
    setCheckoutDate(co.date || '');
    setCheckoutHour(co.hour !== '' ? co.hour : '');
    setCheckoutMinute(co.minute !== '' ? co.minute : '');

    setIsDirty(false);
    setErrors({});
  };

  // Giá theo hình thức thuê
  const currentPrice =
    rentType === 'HOURLY' ? roomType?.hourly_price : roomType?.daily_price;

  // ── MARK DIRTY ─────────────────────────────────────────────────────────────
  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  // ── VALIDATE ───────────────────────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};
    if (!guestName.trim()) newErrors.guestName = 'Vui lòng nhập họ tên khách.';
    if (!guestPhone.trim()) newErrors.guestPhone = 'Vui lòng nhập số điện thoại.';
    if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      newErrors.guestEmail = 'Email không đúng định dạng.';
    }

    // So sánh checkout với checkin gốc (không thể thay đổi checkin)
    if (checkoutDate && booking?.expected_checkin) {
      const coH = checkoutHour === '' ? 0 : Number(checkoutHour);
      const coM = checkoutMinute === '' ? 0 : Number(checkoutMinute);
      const checkinMs = new Date(booking.expected_checkin).getTime();
      const checkoutMs = new Date(buildISOFromParts(checkoutDate, coH, coM)).getTime();
      const diffMs = checkoutMs - checkinMs;

      if (diffMs <= 0) {
        newErrors.checkout = 'Giờ check-out phải sau giờ check-in.';
      } else if (booking.rent_type === 'HOURLY' && diffMs < 60 * 60 * 1000) {
        newErrors.checkout = 'Thuê theo giờ: thời gian tối thiểu là 1 giờ.';
      } else if (booking.rent_type === 'DAILY' && diffMs < 24 * 60 * 60 * 1000) {
        newErrors.checkout = 'Thuê theo ngày: thời gian tối thiểu là 1 ngày (24 giờ).';
      }
    }
    return newErrors;
  };

  // ── HANDLERS ───────────────────────────────────────────────────────────────
  const handleEditToggle = () => {
    if (isEditing && isDirty) {
      // Hủy chỉnh sửa → reset về dữ liệu gốc
      populateForm(booking);
    }
    setIsEditing((prev) => !prev);
  };

  const handleSaveClick = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setShowConfirmSave(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmSave(false);
    setIsSubmitting(true);
    try {
      // Chỉ cập nhật thông tin khách và checkout dự kiến
      const payload = {
        guest_name: guestName.trim(),
        guest_phone: guestPhone.trim(),
        guest_email: guestEmail.trim(),
        expected_checkout: checkoutDate
          ? buildISOFromParts(checkoutDate, checkoutHour === '' ? 0 : checkoutHour, checkoutMinute === '' ? 0 : checkoutMinute)
          : null,
      };
      const res = await bookingApi.update(booking.booking_id, payload);
      const updated = res?.data ?? res;
      setBooking(updated);
      populateForm(updated);
      setIsEditing(false);
      setIsDirty(false);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể cập nhật.';
      alert(`❌ Lỗi: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckoutClick = () => {
    // Đóng băng thời điểm hiện tại rồi navigate sang màn hình xác nhận
    const checkoutTime = new Date().toISOString();
    navigate(
      `${location.pathname.replace('view-booking', 'payment-overview')}`,
      { state: { room, roomTypeName, booking, roomType, checkoutTime } }
    );
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="cb-page vb-loading-wrap">
        <div className="vb-loading-spinner" />
        <p>Đang tải thông tin phiên thuê...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="cb-page vb-error-wrap">
        <i className="ph-fill ph-warning-circle" />
        <p>{fetchError}</p>
        <button className="cb-btn cb-btn-cancel" onClick={() => navigate(-1)}>
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="cb-page">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="cb-page-header">
        <button className="cb-btn-back" onClick={() => navigate(-1)} title="Quay lại">
          <i className="ph-bold ph-arrow-left" />
        </button>
        <div className="cb-header-text vb-header-text-grow">
          <h1 className="cb-page-title">
            Xem phiên thuê phòng
          </h1>
          <p className="cb-page-subtitle">
            Mã phiên: <strong>{booking?.booking_code || '—'}</strong>
            &nbsp;·&nbsp;Phòng: <strong>{room?.room_number || '—'}</strong>
          </p>
        </div>

        {/* Nút Chỉnh sửa / Hủy chỉnh sửa */}
        <button
          className={`vb-btn-edit ${isEditing ? 'vb-btn-edit--cancel' : 'vb-btn-edit--active'}`}
          onClick={handleEditToggle}
          disabled={isSubmitting}
          title={isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa thông tin phiên thuê'}
        >
          {isEditing ? (
            <><i className="ph-bold ph-x" /> Hủy chỉnh sửa</>
          ) : (
            <><i className="ph-bold ph-pencil-simple" /> Chỉnh sửa</>
          )}
        </button>
      </div>

      {/* ── FORM BODY (dùng lại cấu trúc CreateBooking) ─────────────────── */}
      <form className="cb-form" onSubmit={(e) => e.preventDefault()} noValidate>
        <div className="cb-form-body">

          {/* ═══ CỘT TRÁI: THÔNG TIN KHÁCH HÀNG ═══ */}
          <div className="cb-card">
            <div className="cb-card-header">
              <h2>Thông tin khách hàng</h2>
            </div>

            {/* Họ tên */}
            <div className="cb-field">
              <label htmlFor="vb-guest-name" className="cb-label">
                Họ tên khách <span className="cb-required">*</span>
              </label>
              <input
                id="vb-guest-name"
                type="text"
                className={`cb-input ${!isEditing ? 'vb-input-readonly' : ''} ${errors.guestName ? 'cb-input-error' : ''}`}
                value={guestName}
                readOnly={!isEditing}
                onChange={(e) => { setGuestName(e.target.value); markDirty(); }}
              />
              {errors.guestName && <p className="cb-error-msg">{errors.guestName}</p>}
            </div>

            {/* Số điện thoại + Email */}
            <div className="cb-field-row">
              <div className="cb-field">
                <label htmlFor="vb-guest-phone" className="cb-label">
                  Số điện thoại <span className="cb-required">*</span>
                </label>
                <input
                  id="vb-guest-phone"
                  type="tel"
                  className={`cb-input ${!isEditing ? 'vb-input-readonly' : ''} ${errors.guestPhone ? 'cb-input-error' : ''}`}
                  value={guestPhone}
                  readOnly={!isEditing}
                  onChange={(e) => { setGuestPhone(e.target.value.replace(/\D/g, '')); markDirty(); }}
                />
                {errors.guestPhone && <p className="cb-error-msg">{errors.guestPhone}</p>}
              </div>
              <div className="cb-field">
                <label htmlFor="vb-guest-email" className="cb-label">
                  Email <span className="cb-optional">(Tùy chọn)</span>
                </label>
                <input
                  id="vb-guest-email"
                  type="email"
                  className={`cb-input ${!isEditing ? 'vb-input-readonly' : ''} ${errors.guestEmail ? 'cb-input-error' : ''}`}
                  value={guestEmail}
                  readOnly={!isEditing}
                  onChange={(e) => { setGuestEmail(e.target.value); markDirty(); }}
                />
                {errors.guestEmail && <p className="cb-error-msg">{errors.guestEmail}</p>}
              </div>
            </div>

            {/* Ảnh CCCD (readonly, chỉ hiển thị) */}
            <div className="cb-field-row">
              <div className="cb-field">
                <label className="cb-label">Ảnh CCCD (Mặt Trước)</label>
                <div
                  className={`cb-cccd-preview ${booking?.cccd_front_url ? 'has-image' : ''}`}
                  style={booking?.cccd_front_url
                    ? { backgroundImage: `url(${getImageSrc(booking.cccd_front_url)})` }
                    : {}}
                >
                  {!booking?.cccd_front_url && (
                    <span className="cb-cccd-placeholder">
                      <i className="ph-bold ph-image" />
                    </span>
                  )}
                </div>
                <p className="cb-file-name vb-cccd-note">
                  {booking?.cccd_front_url ? 'Đã có ảnh CCCD' : 'Không có ảnh'}
                </p>
              </div>
              <div className="cb-field">
                <label className="cb-label">Ảnh CCCD (Mặt Sau)</label>
                <div
                  className={`cb-cccd-preview ${booking?.cccd_back_url ? 'has-image' : ''}`}
                  style={booking?.cccd_back_url
                    ? { backgroundImage: `url(${getImageSrc(booking.cccd_back_url)})` }
                    : {}}
                >
                  {!booking?.cccd_back_url && (
                    <span className="cb-cccd-placeholder">
                      <i className="ph-bold ph-image" />
                    </span>
                  )}
                </div>
                <p className="cb-file-name vb-cccd-note">
                  {booking?.cccd_back_url ? 'Đã có ảnh CCCD' : 'Không có ảnh'}
                </p>
              </div>
            </div>


          </div>

          {/* ═══ CỘT PHẢI: TAB PANEL ═══ */}
          <div className="cb-card vb-tab-card">

            {/* ── Tab Bar ── */}
            <div className="vb-tab-bar">
              <button
                type="button"
                className={`vb-tab-btn ${activeTab === 'detail' ? 'vb-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('detail')}
              >
                Chi tiết thuê phòng
              </button>
              <button
                type="button"
                className={`vb-tab-btn ${activeTab === 'billing' ? 'vb-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('billing')}
              >
                Tính tiền phòng
              </button>
              <button
                type="button"
                className="vb-tab-btn"
                onClick={() =>
                  navigate(
                    `${location.pathname.replace('view-booking', 'booking-services')}`,
                    { state: { room, roomTypeName, booking } }
                  )
                }
              >
                Dịch vụ thêm
              </button>
            </div>

            {/* ── Tab: Chi tiết thuê phòng ── */}
            {activeTab === 'detail' && (
              <div className="vb-tab-content">
                {/* Phòng đang xem */}
                <div className="cb-detail-row">
                  <span className="cb-detail-label">Phòng đang xem:</span>
                  <span className="cb-detail-value cb-room-number">{room?.room_number || '—'}</span>
                </div>

                {/* Loại phòng */}
                {(roomTypeName || roomType?.name) && (
                  <div className="cb-detail-row">
                    <span className="cb-detail-label">Loại phòng:</span>
                    <span className="cb-detail-value">{roomTypeName || roomType?.name}</span>
                  </div>
                )}

                <div className="cb-divider" />

                {/* Hình thức thuê — chỉ xem */}
                <div className="cb-detail-row">
                  <span className="cb-detail-label">Hình thức thuê:</span>
                  <span className="cb-detail-value vb-rent-badge">
                    {rentType === 'HOURLY' ? 'Theo giờ' : 'Theo ngày'}
                  </span>
                </div>

                {/* Giá phòng */}
                <div className="cb-detail-row">
                  <span className="cb-detail-label">
                    Giá phòng <span className="cb-price-unit">
                      ({rentType === 'HOURLY' ? '/giờ' : '/ngày'})
                    </span>:
                  </span>
                  <span className="cb-price">{formatMoney(currentPrice)}</span>
                </div>

                <div className="cb-divider" />

                {/* Giờ Check-in Dự kiến — chỉ xem */}
                <div className="cb-field cb-datetime-field">
                  <label className="cb-datetime-label cb-label-checkin">Giờ Check-in Dự kiến</label>
                  <div className="cb-dt-row">
                    <input
                      id="vb-checkin-date"
                      type="date"
                      className="cb-dt-date vb-input-readonly"
                      value={checkinDate}
                      readOnly
                      onChange={() => { }}
                    />
                    <div className="cb-dt-time vb-dt-time-readonly">
                      <input
                        id="vb-checkin-hour"
                        type="number"
                        className="cb-time-num"
                        min="0" max="23"
                        value={String(checkinHour).padStart(2, '0')}
                        readOnly
                        onChange={() => { }}
                      />
                      <span className="cb-dt-sep">:</span>
                      <input
                        id="vb-checkin-minute"
                        type="number"
                        className="cb-time-num"
                        min="0" max="59"
                        value={String(checkinMinute).padStart(2, '0')}
                        readOnly
                        onChange={() => { }}
                      />
                    </div>
                  </div>
                </div>

                {/* Giờ Check-out Dự kiến */}
                <div className="cb-field cb-datetime-field">
                  <label className="cb-datetime-label cb-label-checkout">
                    Giờ Check-out Dự kiến
                    <span className="cb-optional"> (Không bắt buộc)</span>
                  </label>
                  <div className="cb-dt-row">
                    <input
                      id="vb-checkout-date"
                      type="date"
                      className={`cb-dt-date cb-dt-date--checkout ${!isEditing ? 'vb-input-readonly' : ''}`}
                      value={checkoutDate}
                      readOnly={!isEditing}
                      onChange={(e) => { setCheckoutDate(e.target.value); markDirty(); }}
                    />
                    <div className={`cb-dt-time cb-dt-time--checkout ${!isEditing ? 'vb-dt-time-readonly' : ''}`}>
                      <input
                        id="vb-checkout-hour"
                        type="number"
                        className="cb-time-num cb-time-num--checkout"
                        min="0" max="23"
                        placeholder="--"
                        value={checkoutHour}
                        readOnly={!isEditing}
                        onKeyDown={(e) => isEditing && ['-', '+', 'e', 'E', '.'].includes(e.key) && e.preventDefault()}
                        onChange={(e) => {
                          if (!isEditing) return;
                          if (e.target.value === '') setCheckoutHour('');
                          else setCheckoutHour(clampHour(e.target.value));
                          markDirty();
                        }}
                        onBlur={(e) => {
                          if (e.target.value !== '') setCheckoutHour(clampHour(e.target.value));
                        }}
                      />
                      <span className="cb-dt-sep cb-dt-sep--checkout">:</span>
                      <input
                        id="vb-checkout-minute"
                        type="number"
                        className="cb-time-num cb-time-num--checkout"
                        min="0" max="59"
                        placeholder="--"
                        value={checkoutMinute}
                        readOnly={!isEditing}
                        onKeyDown={(e) => isEditing && ['-', '+', 'e', 'E', '.'].includes(e.key) && e.preventDefault()}
                        onChange={(e) => {
                          if (!isEditing) return;
                          if (e.target.value === '') setCheckoutMinute('');
                          else setCheckoutMinute(clampMinute(e.target.value));
                          markDirty();
                        }}
                        onBlur={(e) => {
                          if (e.target.value !== '') setCheckoutMinute(clampMinute(e.target.value));
                        }}
                      />
                    </div>
                  </div>
                  {!isEditing && <p className="cb-hint">Chế độ xem — nhấn Chỉnh sửa để cập nhật giờ trả dự kiến.</p>}
                  {isEditing && <p className="cb-hint">Nếu chưa rõ giờ trả, để trống ô ngày.</p>}
                  {errors.checkout && <p className="cb-error-msg">{errors.checkout}</p>}
                </div>
              </div>
            )}

            {/* ── Tab: Tính tiền phòng ── */}
            {activeTab === 'billing' && (() => {
              const checkinMs = booking?.expected_checkin
                ? new Date(booking.expected_checkin).getTime()
                : null;
              const diffMs = checkinMs ? Math.max(0, now.getTime() - checkinMs) : 0;
              const totalMinutes = Math.floor(diffMs / 60_000);

              const isHourly = (booking?.rent_type || rentType) === 'HOURLY';
              const unitPrice = isHourly ? roomType?.hourly_price : roomType?.daily_price;
              const billableUnits = isHourly
                ? Math.max(1, Math.ceil(totalMinutes / 60))
                : Math.max(1, Math.ceil(totalMinutes / (60 * 24)));
              const totalAmount = unitPrice != null ? billableUnits * unitPrice : null;

              // Hiển thị thời gian thực tế đã ở (floor, chỉ để tham khảo)
              const hoursReal = Math.floor(totalMinutes / 60);
              const minutesReal = totalMinutes % 60;

              return (
                <div className="vb-tab-content vb-billing">

                  {/* ─ 1. Thời gian check-in ─ */}
                  <div className="vb-bill-section">
                    <span className="vb-bill-section-label">Thời gian check-in</span>
                    <div className="vb-bill-field-box">
                      {formatDateTime(booking?.expected_checkin)}
                    </div>
                  </div>

                  {/* ─ 2. Thời gian đã sử dụng ─ */}
                  <div className="vb-bill-section">
                    <span className="vb-bill-section-label">Thời gian đã sử dụng</span>
                    <div className="vb-bill-field-box vb-bill-field-box--time">
                      <span className="vb-bill-time-real">
                        {hoursReal} giờ {minutesReal > 0 ? `${minutesReal} phút` : ''}
                      </span>
                      <span className="vb-bill-time-sep">→</span>
                      <span className="vb-bill-time-billed">
                        Tính {billableUnits} {isHourly ? 'giờ' : 'ngày'}
                      </span>
                    </div>
                  </div>

                  {/* ─ 3. Loại hình thuê + Đơn giá ─ */}
                  <div className="vb-bill-section">
                    <span className="vb-bill-section-label">Loại hình thuê &amp; Đơn giá</span>
                    <div className="vb-bill-row2">
                      <div className="vb-bill-field-box vb-bill-field-box--center">
                        {isHourly ? 'Theo giờ' : 'Theo ngày'}
                      </div>
                      <div className="vb-bill-field-box vb-bill-field-box--center">
                        <span className="cb-price">{formatMoney(unitPrice)}</span>
                        <span className="cb-price-unit">/ {isHourly ? 'giờ' : 'ngày'}</span>
                      </div>
                    </div>
                  </div>

                  {/* ─ 4+5. Giá tiền (công thức + thực tế gộp chung) ─ */}
                  <div className="vb-bill-section">
                    <span className="vb-bill-section-label">Giá tiền thực tế</span>
                    <div className="vb-bill-field-box vb-bill-field-box--combined">
                      <span className="vb-bill-formula-line">
                        {billableUnits} {isHourly ? 'giờ' : 'ngày'}
                        <span className="vb-bill-op"> × </span>
                        {formatMoney(unitPrice)}
                      </span>
                      <span className="vb-bill-total-line">
                        {totalAmount != null ? formatMoney(totalAmount) : '—'}
                      </span>
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* ── Tab: Dịch vụ thêm ── */}
            {activeTab === 'service' && (
              <div className="vb-tab-content vb-tab-empty">
                <i className="ph-bold ph-sparkle vb-tab-empty-icon" />
                <p className="vb-tab-empty-title">Dịch vụ thêm</p>
                <p className="vb-tab-empty-desc">Tính năng đang được phát triển.</p>
              </div>
            )}

          </div>
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <div className="cb-footer">
          {isEditing && isDirty ? (
            /* Khi đang chỉnh sửa VÀ có thay đổi → Nút Lưu */
            <>
              <button
                type="button"
                className="cb-btn cb-btn-cancel"
                onClick={handleEditToggle}
                disabled={isSubmitting}
              >
                <i className="ph-bold ph-x" /> Hủy
              </button>
              <button
                type="button"
                className="cb-btn cb-btn-submit"
                onClick={handleSaveClick}
                disabled={isSubmitting}
              >
                <i className="ph-bold ph-floppy-disk" />
                {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </>
          ) : !isEditing ? (
            /* Khi không chỉnh sửa → Nút Thanh toán & Trả Phòng */
            <button
              type="button"
              className="vb-btn-checkout"
              onClick={handleCheckoutClick}
            >
              <i className="ph-bold ph-money" />
              Thanh toán &amp; Trả Phòng
            </button>
          ) : (
            /* Đang edit nhưng chưa có thay đổi → hint nhỏ */
            <p className="vb-edit-hint">
              <i className="ph-bold ph-pencil-simple" /> Chỉnh sửa thông tin rồi nhấn Lưu.
            </p>
          )}
        </div>
      </form>

      {/* ── MODAL XÁC NHẬN LƯU ────────────────────────────────────────────── */}
      {showConfirmSave && (
        <div className="vb-modal-overlay" onClick={() => setShowConfirmSave(false)}>
          <div className="vb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vb-modal-icon vb-modal-icon--save">
              <i className="ph-bold ph-floppy-disk" />
            </div>
            <h3 className="vb-modal-title">Xác nhận lưu thay đổi</h3>
            <p className="vb-modal-desc">
              Bạn có chắc muốn cập nhật thông tin phiên thuê phòng{' '}
              <strong>{room?.room_number}</strong> không?
            </p>
            <div className="vb-modal-actions">
              <button
                className="cb-btn cb-btn-cancel"
                onClick={() => setShowConfirmSave(false)}
              >
                Hủy
              </button>
              <button
                className="cb-btn cb-btn-submit"
                onClick={handleConfirmSave}
              >
                <i className="ph-bold ph-check" /> Xác nhận lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal checkout đã chuyển sang PaymentOverview */}
      {/* ── MODAL: Lưu thành công ─────────────────────────────────── */}
      {showSaveSuccess && (
        <div className="cb-success-overlay">
          <div className="cb-success-modal">
            <div className="cb-success-icon">
              <i className="ph-bold ph-check" />
            </div>
            <h3 className="cb-success-title">Thành công!</h3>
            <p className="cb-success-desc">
              Thông tin phiên thuê phòng <strong>{room?.room_number}</strong> đã được cập nhật thành công.
            </p>
            <button
              className="cb-success-btn"
              onClick={() => setShowSaveSuccess(false)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewBooking;
