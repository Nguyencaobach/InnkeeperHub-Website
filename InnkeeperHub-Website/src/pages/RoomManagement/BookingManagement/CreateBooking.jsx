import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import bookingApi from '../../../api/bookingApi';
import roomTypeApi from '../../../api/roomTypeApi';
import { QUERY_KEYS } from '../../../hooks/queryKeys';
import './CreateBooking.css';

// Lấy ngày hôm nay dạng YYYY-MM-DD (theo giờ máy)
const getToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Ghép date + hour + minute thành ISO string gắn cứng múi giờ Việt Nam (+07:00)
// Cách này KHÔNG phụ thuộc timezone của máy đang chạy → dùng trên máy nào cũng đúng
const buildISOFromParts = (dateStr, hour, minute) => {
  if (!dateStr) return null;
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  // Khai báo rõ "+07:00" → backend/DB luôn hiểu đúng là giờ Việt Nam
  return `${dateStr}T${h}:${m}:00+07:00`;
};

// Clamp giá trị nhập vào đúng khoảng hợp lệ
const clampHour = (val) => Math.min(23, Math.max(0, parseInt(val, 10) || 0));
const clampMinute = (val) => Math.min(59, Math.max(0, parseInt(val, 10) || 0));

// Format tiền VNĐ
const formatMoney = (amount) =>
  amount != null
    ? Number(amount).toLocaleString('vi-VN') + ' đ'
    : '—';

function CreateBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Lấy roomTypeId từ URL (:id trong route rooms/activities/list/:id/create-booking)
  const { id: roomTypeId } = useParams();

  // Nhận thông tin phòng + tên loại phòng từ state trang cha
  const { room, roomTypeName } = location.state || {};

  // ── STATE ────────────────────────────────────────────────────────────────────
  // Dữ liệu loại phòng (tự fetch để đảm bảo luôn có giá)
  const [roomType, setRoomType] = useState(null);

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // CCCD
  const [cccdFrontFile, setCccdFrontFile] = useState(null);
  const [cccdFrontPreview, setCccdFrontPreview] = useState(null);
  const [cccdBackFile, setCccdBackFile] = useState(null);
  const [cccdBackPreview, setCccdBackPreview] = useState(null);

  // Phiên thuê — tách thành ngày + giờ + phút
  const [rentType, setRentType] = useState('HOURLY');

  const nowRef = new Date();
  const [checkinDate, setCheckinDate] = useState(getToday());
  const [checkinHour, setCheckinHour] = useState(nowRef.getHours());
  const [checkinMinute, setCheckinMinute] = useState(nowRef.getMinutes());

  // Giờ check-out (không bắt buộc — để trống ngày = không gửi)
  const [checkoutDate, setCheckoutDate] = useState('');
  const [checkoutHour, setCheckoutHour] = useState('');
  const [checkoutMinute, setCheckoutMinute] = useState('');

  // UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdBookingCode, setCreatedBookingCode] = useState('');

  // ── FETCH ROOM TYPE ──────────────────────────────────────────────────────────
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

  // Giá theo hình thức thuê đang chọn (cập nhật ngay khi rentType hoặc roomType thay đổi)
  const currentPrice =
    rentType === 'HOURLY'
      ? roomType?.hourly_price
      : roomType?.daily_price;

  // ── CCCD PREVIEW ────────────────────────────────────────────────────────────
  const handleCccdFront = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCccdFrontFile(file);
    setCccdFrontPreview(URL.createObjectURL(file));
  };

  const handleCccdBack = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCccdBackFile(file);
    setCccdBackPreview(URL.createObjectURL(file));
  };

  // Cleanup object URLs khi unmount
  useEffect(() => {
    return () => {
      if (cccdFrontPreview) URL.revokeObjectURL(cccdFrontPreview);
      if (cccdBackPreview) URL.revokeObjectURL(cccdBackPreview);
    };
  }, [cccdFrontPreview, cccdBackPreview]);

  // ── VALIDATION ──────────────────────────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};
    if (!guestName.trim()) newErrors.guestName = 'Vui lòng nhập họ tên khách.';
    if (!guestPhone.trim()) newErrors.guestPhone = 'Vui lòng nhập số điện thoại.';
    if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      newErrors.guestEmail = 'Email không đúng định dạng.';
    }
    if (!checkinDate) newErrors.checkinDate = 'Vui lòng chọn ngày check-in.';

    // Kiểm tra thời lượng tối thiểu nếu người dùng đã nhập checkout
    if (checkinDate && checkoutDate) {
      const coH = checkoutHour === '' ? 0 : Number(checkoutHour);
      const coM = checkoutMinute === '' ? 0 : Number(checkoutMinute);
      const checkinMs = new Date(buildISOFromParts(checkinDate, checkinHour, checkinMinute)).getTime();
      const checkoutMs = new Date(buildISOFromParts(checkoutDate, coH, coM)).getTime();
      const diffMs = checkoutMs - checkinMs;

      if (diffMs <= 0) {
        newErrors.checkout = 'Giờ check-out phải sau giờ check-in.';
      } else if (rentType === 'HOURLY' && diffMs < 60 * 60 * 1000) {
        newErrors.checkout = 'Thuê theo giờ: thời gian tối thiểu là 1 giờ.';
      } else if (rentType === 'DAILY' && diffMs < 24 * 60 * 60 * 1000) {
        newErrors.checkout = 'Thuê theo ngày: thời gian tối thiểu là 1 ngày (24 giờ).';
      }
    }

    return newErrors;
  };

  // ── SUBMIT ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('room_type_id', room?.room_type_id || '');
      formData.append('room_detail_id', room?.id || '');
      formData.append('guest_name', guestName.trim());
      formData.append('guest_phone', guestPhone.trim());
      formData.append('guest_email', guestEmail.trim());
      formData.append('rent_type', rentType);
      formData.append('expected_checkin', buildISOFromParts(checkinDate, checkinHour, checkinMinute));
      if (checkoutDate) {
        // Nếu ngày có nhưng giờ để trống → mặc định 00:00
        const coH = checkoutHour === '' ? 0 : checkoutHour;
        const coM = checkoutMinute === '' ? 0 : checkoutMinute;
        formData.append('expected_checkout', buildISOFromParts(checkoutDate, coH, coM));
      }
      formData.append('total_amount', 0);
      formData.append('deposit_amount', 0);

      if (cccdFrontFile) formData.append('cccd_front', cccdFrontFile);
      if (cccdBackFile) formData.append('cccd_back', cccdBackFile);

      const result = await bookingApi.create(formData);
      setCreatedBookingCode(result?.data?.booking_code || result?.booking_code || '');

      // THAY THẾ ĐOẠN SET CACHE CŨ BẰNG ĐOẠN NÀY
      queryClient.setQueryData(QUERY_KEYS.ROOM_DETAILS(roomTypeId), (oldData) => {
        if (!oldData) return oldData;
        // Nếu dữ liệu là mảng trực tiếp
        if (Array.isArray(oldData)) {
          return oldData.map(r => r.id === room.id ? { ...r, status: 'OCCUPIED' } : r);
        }
        // Nếu dữ liệu bọc trong object { data: [...] }
        if (oldData.data && Array.isArray(oldData.data)) {
          return {
            ...oldData,
            data: oldData.data.map(r => r.id === room.id ? { ...r, status: 'OCCUPIED' } : r)
          };
        }
        return oldData;
      });

      // Invalidate cache để RoomDetailOverview refetch trạng thái phòng mới
      // (stảtTime = 0 cho room details — quan trọng, cầp nhật ngay)
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROOM_DETAILS_ALL });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BOOKINGS });

      setShowSuccess(true);
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể tạo phiên thuê. Vui lòng thử lại.';
      alert(`❌ Lỗi: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="cb-page">
      {/* HEADER */}
      <div className="cb-page-header">
        <button className="cb-btn-back" onClick={() => navigate(-1)} title="Quay lại">
          <i className="ph-bold ph-arrow-left"></i>
        </button>
        <div className="cb-header-text">
          <h1 className="cb-page-title">
            Tạo phiên thuê phòng
          </h1>
          <p className="cb-page-subtitle">
            Điền đầy đủ thông tin để hoàn tất check-in cho khách
          </p>
        </div>
      </div>

      {/* FORM */}
      <form className="cb-form" onSubmit={handleSubmit} noValidate>
        <div className="cb-form-body">

          {/* ═══ CỘT TRÁI: THÔNG TIN KHÁCH HÀNG ═══ */}
          <div className="cb-card">
            <div className="cb-card-header">
              <h2>Thông tin khách hàng</h2>
            </div>

            {/* Họ tên */}
            <div className="cb-field">
              <label htmlFor="cb-guest-name" className="cb-label">
                Họ tên khách <span className="cb-required">*</span>
              </label>
              <input
                id="cb-guest-name"
                type="text"
                className={`cb-input ${errors.guestName ? 'cb-input-error' : ''}`}
                placeholder="Tên khách hàng"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
              {errors.guestName && <p className="cb-error-msg">{errors.guestName}</p>}
            </div>

            {/* Số điện thoại + Email */}
            <div className="cb-field-row">
              <div className="cb-field">
                <label htmlFor="cb-guest-phone" className="cb-label">
                  Số điện thoại <span className="cb-required">*</span>
                </label>
                <input
                  id="cb-guest-phone"
                  type="tel"
                  className={`cb-input ${errors.guestPhone ? 'cb-input-error' : ''}`}
                  placeholder="Chỉ nhập số"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, ''))}
                />
                {errors.guestPhone && <p className="cb-error-msg">{errors.guestPhone}</p>}
              </div>
              <div className="cb-field">
                <label htmlFor="cb-guest-email" className="cb-label">
                  Email <span className="cb-optional">(Tùy chọn)</span>
                </label>
                <input
                  id="cb-guest-email"
                  type="email"
                  className={`cb-input ${errors.guestEmail ? 'cb-input-error' : ''}`}
                  placeholder="Ví dụ: abc@gmail.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
                {errors.guestEmail && <p className="cb-error-msg">{errors.guestEmail}</p>}
              </div>
            </div>

            {/* Upload CCCD */}
            <div className="cb-field-row">
              {/* Mặt trước */}
              <div className="cb-field">
                <label className="cb-label">Ảnh CCCD (Mặt Trước)</label>
                <div
                  className={`cb-cccd-preview ${cccdFrontPreview ? 'has-image' : ''}`}
                  style={cccdFrontPreview ? { backgroundImage: `url(${cccdFrontPreview})` } : {}}
                >
                  {!cccdFrontPreview && (
                    <span className="cb-cccd-placeholder">
                      <i className="ph-bold ph-image"></i>
                    </span>
                  )}
                </div>
                <label htmlFor="cb-cccd-front" className="cb-file-label">
                  Chọn tệp
                </label>
                <input
                  id="cb-cccd-front"
                  type="file"
                  accept="image/*"
                  className="cb-file-input"
                  onChange={handleCccdFront}
                />
                <p className="cb-file-name">
                  {cccdFrontFile ? cccdFrontFile.name : 'Không có tệp nào được chọn'}
                </p>
              </div>

              {/* Mặt sau */}
              <div className="cb-field">
                <label className="cb-label">Ảnh CCCD (Mặt Sau)</label>
                <div
                  className={`cb-cccd-preview ${cccdBackPreview ? 'has-image' : ''}`}
                  style={cccdBackPreview ? { backgroundImage: `url(${cccdBackPreview})` } : {}}
                >
                  {!cccdBackPreview && (
                    <span className="cb-cccd-placeholder">
                      <i className="ph-bold ph-image"></i>
                    </span>
                  )}
                </div>
                <label htmlFor="cb-cccd-back" className="cb-file-label">
                  Chọn tệp
                </label>
                <input
                  id="cb-cccd-back"
                  type="file"
                  accept="image/*"
                  className="cb-file-input"
                  onChange={handleCccdBack}
                />
                <p className="cb-file-name">
                  {cccdBackFile ? cccdBackFile.name : 'Không có tệp nào được chọn'}
                </p>
              </div>
            </div>
          </div>

          {/* ═══ CỘT PHẢI: CHI TIẾT THUÊ PHÒNG ═══ */}
          <div className="cb-card">
            <div className="cb-card-header">
              <h2>Chi tiết Thuê phòng</h2>
            </div>

            {/* Phòng đang chọn */}
            <div className="cb-detail-row">
              <span className="cb-detail-label">Phòng đang chọn:</span>
              <span className="cb-detail-value cb-room-number">
                {room?.room_number || '—'}
              </span>
            </div>

            {/* Loại phòng */}
            {(roomTypeName || roomType?.name) && (
              <div className="cb-detail-row">
                <span className="cb-detail-label">Loại phòng:</span>
                <span className="cb-detail-value">{roomTypeName || roomType.name}</span>
              </div>
            )}

            <div className="cb-divider"></div>

            {/* Hình thức thuê */}
            <div className="cb-detail-row">
              <span className="cb-detail-label">Hình thức thuê:</span>
              <div className="cb-rent-type-group">
                <button
                  type="button"
                  className={`cb-rent-btn ${rentType === 'HOURLY' ? 'active-hourly' : ''}`}
                  onClick={() => setRentType('HOURLY')}
                >
                  Thuê Theo Giờ
                </button>
                <button
                  type="button"
                  className={`cb-rent-btn ${rentType === 'DAILY' ? 'active-daily' : ''}`}
                  onClick={() => setRentType('DAILY')}
                >
                  Thuê Theo Ngày
                </button>
              </div>
            </div>

            {/* Giá phòng — cập nhật theo hình thức thuê */}
            <div className="cb-detail-row">
              <span className="cb-detail-label">
                Giá phòng <span className="cb-price-unit">
                  ({rentType === 'HOURLY' ? '/giờ' : '/ngày'})
                </span>:
              </span>
              <span className="cb-price">{formatMoney(currentPrice)}</span>
            </div>

            <div className="cb-divider"></div>

            {/* Giờ Check-in Thực tế */}
            <div className="cb-field cb-datetime-field">
              <label className="cb-datetime-label cb-label-checkin">
                Giờ Check-in Thực tế
              </label>
              <div className="cb-dt-row">
                <input
                  id="cb-checkin-date"
                  type="date"
                  className={`cb-dt-date ${errors.checkinDate ? 'cb-input-error' : ''}`}
                  value={checkinDate}
                  onChange={(e) => setCheckinDate(e.target.value)}
                />
                <div className="cb-dt-time cb-dt-time--checkin">
                  <input
                    id="cb-checkin-hour"
                    type="number"
                    className="cb-time-num"
                    min="0" max="23"
                    value={String(checkinHour).padStart(2, '0')}
                    onChange={(e) => setCheckinHour(clampHour(e.target.value))}
                    onBlur={(e) => setCheckinHour(clampHour(e.target.value))}
                  />
                  <span className="cb-dt-sep">:</span>
                  <input
                    id="cb-checkin-minute"
                    type="number"
                    className="cb-time-num"
                    min="0" max="59"
                    value={String(checkinMinute).padStart(2, '0')}
                    onChange={(e) => setCheckinMinute(clampMinute(e.target.value))}
                    onBlur={(e) => setCheckinMinute(clampMinute(e.target.value))}
                  />
                </div>
              </div>
              {errors.checkinDate && <p className="cb-error-msg">{errors.checkinDate}</p>}
            </div>

            {/* Giờ Check-out Dự kiến */}
            <div className="cb-field cb-datetime-field">
              <label className="cb-datetime-label cb-label-checkout">
                Giờ Check-out Dự kiến
                <span className="cb-optional"> (Không bắt buộc)</span>
              </label>
              <div className="cb-dt-row">
                <input
                  id="cb-checkout-date"
                  type="date"
                  className="cb-dt-date cb-dt-date--checkout"
                  value={checkoutDate}
                  onChange={(e) => setCheckoutDate(e.target.value)}
                />
                <div className="cb-dt-time cb-dt-time--checkout">
                  <input
                    id="cb-checkout-hour"
                    type="number"
                    className="cb-time-num cb-time-num--checkout"
                    min="0" max="23"
                    placeholder="--"
                    value={checkoutHour}
                    onKeyDown={(e) => ['-', '+', 'e', 'E', '.'].includes(e.key) && e.preventDefault()}
                    onChange={(e) => {
                      if (e.target.value === '') setCheckoutHour('');
                      else setCheckoutHour(clampHour(e.target.value));
                    }}
                    onBlur={(e) => {
                      if (e.target.value !== '') setCheckoutHour(clampHour(e.target.value));
                    }}
                  />
                  <span className="cb-dt-sep cb-dt-sep--checkout">:</span>
                  <input
                    id="cb-checkout-minute"
                    type="number"
                    className="cb-time-num cb-time-num--checkout"
                    min="0" max="59"
                    placeholder="--"
                    value={checkoutMinute}
                    onKeyDown={(e) => ['-', '+', 'e', 'E', '.'].includes(e.key) && e.preventDefault()}
                    onChange={(e) => {
                      if (e.target.value === '') setCheckoutMinute('');
                      else setCheckoutMinute(clampMinute(e.target.value));
                    }}
                    onBlur={(e) => {
                      if (e.target.value !== '') setCheckoutMinute(clampMinute(e.target.value));
                    }}
                  />
                </div>
              </div>
              <p className="cb-hint">Nếu chưa rõ giờ trả, để trống ô ngày.</p>
              {errors.checkout && <p className="cb-error-msg">{errors.checkout}</p>}
            </div>
          </div>
        </div>

        {/* ═══ FOOTER: NÚT BẤM ═══ */}
        <div className="cb-footer">
          <button
            type="button"
            className="cb-btn cb-btn-cancel"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="cb-btn cb-btn-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang lưu...' : 'Xác nhận Lưu'}
          </button>
        </div>
      </form>

      {/* ── MODAL THÀNH CÔNG ──────────────────────────────────────────── */}
      {showSuccess && (
        <div className="cb-success-overlay">
          <div className="cb-success-modal">
            <div className="cb-success-icon">
              <i className="ph-bold ph-check" />
            </div>
            <h3 className="cb-success-title">Thành công!</h3>
            <p className="cb-success-desc">
              Phòng <strong>{room?.room_number}</strong> đã được check-in thành công.
              {createdBookingCode && (
                <> Mã phiên: <strong>{createdBookingCode}</strong>.</>
              )}
            </p>
            <button
              className="cb-success-btn"
              onClick={async () => {
                // invalidateQueries đã chạy ở handleSubmit
                // RoomDetailOverview giờ dùng TanStack Query → tự refetch khi mount
                await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROOM_DETAILS_ALL });
                navigate(`/rooms/activities/list/${roomTypeId}`, {
                  state: { roomTypeName: location.state?.roomTypeName }
                });
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateBooking;
