import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import bookingApi from '../../../api/bookingApi';
import voucherApi from '../../../api/voucherApi';
import bookingServiceItemApi from '../../../api/bookingServiceItemApi';
import roomTypeApi from '../../../api/roomTypeApi';
import profileApi from '../../../api/profileApi';
import { printInvoice } from './printInvoice';
import { getImageSrc } from '../../../utils/imageUrl';
import { QUERY_KEYS } from '../../../hooks/queryKeys';
import './CreateBooking.css';
import './ViewBooking.css';
import './BookingServices.css';
import './PaymentOverview.css';
import { BrowserMultiFormatReader } from '@zxing/browser';

// ── Helpers (giống ViewBooking) ──────────────────────────────────────────────
const formatMoney = (amount) =>
  amount != null ? Number(amount).toLocaleString('vi-VN') + ' đ' : '—';

const formatDateTime = (isoStr) => {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d)) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
};

const parseISOtoParts = (isoStr) => {
  if (!isoStr) return { date: '', hour: '', minute: '' };
  const d = new Date(isoStr);
  if (isNaN(d)) return { date: '', hour: '', minute: '' };
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return { date: `${year}-${month}-${day}`, hour: d.getHours(), minute: d.getMinutes() };
};

// ── Component ────────────────────────────────────────────────────────────────
function PaymentOverview() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: roomTypeId } = useParams();

  // Dữ liệu truyền qua từ ViewBooking
  const { room, roomTypeName, booking: initBooking, roomType: initRoomType, checkoutTime } = location.state || {};

  // ── STATE ──────────────────────────────────────────────────────────────────
  const [booking] = useState(initBooking);
  const [roomType, setRoomType] = useState(initRoomType || null);

  // Form fields (tất cả readonly)
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [rentType, setRentType] = useState('HOURLY');
  const [checkinDate, setCheckinDate] = useState('');
  const [checkinHour, setCheckinHour] = useState(0);
  const [checkinMinute, setCheckinMinute] = useState(0);
  const [checkoutDate, setCheckoutDate] = useState('');
  const [checkoutHour, setCheckoutHour] = useState('');
  const [checkoutMinute, setCheckoutMinute] = useState('');

  // Tab cột phải
  const [activeTab, setActiveTab] = useState('detail');

  // Dịch vụ thêm
  const [inventoryItems, setInventoryItems] = useState([]);
  const [serviceItems, setServiceItems] = useState([]);

  // Thanh toán
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Voucher & Tích điểm
  const [discountCode, setDiscountCode] = useState('');
  const [discountInfo, setDiscountInfo] = useState(null); // { code, discount_amount, ... }
  const [discountError, setDiscountError] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [memberInfo, setMemberInfo] = useState(null); // { customer_id, full_name, member_code, current_points }
  const [memberError, setMemberError] = useState('');
  const [memberCode, setMemberCode] = useState('');
  const [isLookingMember, setIsLookingMember] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Thông tin doanh nghiệp + VietQR
  const [businessInfo, setBusinessInfo] = useState(null);
  const [qrBankCode, setQrBankCode] = useState(null);
  const [isLoadingBiz, setIsLoadingBiz] = useState(false);

  // ── POPULATE FORM TỪ BOOKING ──────────────────────────────────────────────
  useEffect(() => {
    if (!booking) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGuestName(booking.guest_name || '');
    setGuestPhone(booking.guest_phone || '');
    setGuestEmail(booking.guest_email || '');
    setRentType(booking.rent_type || 'HOURLY');

    const ci = parseISOtoParts(booking.expected_checkin);
    setCheckinDate(ci.date || '');
    setCheckinHour(ci.hour !== '' ? ci.hour : 0);
    setCheckinMinute(ci.minute !== '' ? ci.minute : 0);

    const co = parseISOtoParts(booking.expected_checkout);
    setCheckoutDate(co.date || '');
    setCheckoutHour(co.hour !== '' ? co.hour : '');
    setCheckoutMinute(co.minute !== '' ? co.minute : '');
  }, [booking]);

  // ── FETCH ROOM TYPE NẾU CHƯA CÓ ─────────────────────────────────────────
  useEffect(() => {
    if (roomType || !roomTypeId) return;
    roomTypeApi.getAll()
      .then((res) => {
        const data = Array.isArray(res) ? res : (res?.data ?? []);
        const found = data.find(rt => String(rt.id) === String(roomTypeId));
        if (found) setRoomType(found);
      })
      .catch(() => {});
  }, [roomTypeId, roomType]);

  // ── FETCH THÔNG TIN DOANH NGHIỆP + BANK CODE VIETQR ─────────────────
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingBiz(true);
    profileApi.getBusinessSettings()
      .then(async (res) => {
        const biz = res?.data ?? res;
        setBusinessInfo(biz);

        if (biz?.bank_name && biz?.bank_account_number) {
          // Tìm bank code từ danh sách VietQR
          try {
            const bankRes = await fetch('https://api.vietqr.io/v2/banks');
            const bankJson = await bankRes.json();
            const banks = bankJson?.data ?? [];
            // So sánh bank_name với shortName, name, code (normalize lowercase)
            const normalizedInput = biz.bank_name.toLowerCase().replace(/\s+/g, '');
            const match = banks.find(b =>
              b.shortName?.toLowerCase().replace(/\s+/g, '').includes(normalizedInput) ||
              normalizedInput.includes(b.shortName?.toLowerCase().replace(/\s+/g, '')) ||
              b.name?.toLowerCase().includes(biz.bank_name.toLowerCase()) ||
              b.code?.toLowerCase() === normalizedInput
            );
            if (match) setQrBankCode(match.bin || match.code);
          } catch {
            // Không map được bank code → vẫn hiển thị thông tin text
          }
        }
      })
      .catch(() => setBusinessInfo(null))
      .finally(() => setIsLoadingBiz(false));
  }, []);

  // ── LOAD DỊCH VỤ ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!booking?.booking_id) { return; }
    bookingServiceItemApi.getByBookingId(booking.booking_id)
      .then((res) => {
        const all = Array.isArray(res) ? res : (res?.data ?? []);
        setInventoryItems(all.filter((i) => i.service_type === 'INVENTORY'));
        setServiceItems(all.filter((i) => i.service_type === 'GENERAL'));
      })
      .catch(() => {});
  }, [booking?.booking_id]);

  // ── TÍNH TIỀN PHÒNG (đóng băng theo checkoutTime) ─────────────────────────
  const frozenCheckout = checkoutTime ? new Date(checkoutTime) : new Date();
  const checkinMs = booking?.expected_checkin ? new Date(booking.expected_checkin).getTime() : null;
  const diffMs = checkinMs ? Math.max(0, frozenCheckout.getTime() - checkinMs) : 0;
  const totalMinutes = Math.floor(diffMs / 60_000);

  const isHourly = (booking?.rent_type || rentType) === 'HOURLY';
  const unitPrice = isHourly ? roomType?.hourly_price : roomType?.daily_price;
  const billableUnits = isHourly
    ? Math.max(1, Math.ceil(totalMinutes / 60))
    : Math.max(1, Math.ceil(totalMinutes / (60 * 24)));
  const roomTotal = unitPrice != null ? billableUnits * unitPrice : null;

  // Thời gian thực tế (hiển thị)
  const hoursReal = Math.floor(totalMinutes / 60);
  const minutesReal = totalMinutes % 60;

  // ── TỔNG DỊCH VỤ ─────────────────────────────────────────────────────────
  const totalInventory = inventoryItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const totalService = serviceItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const serviceTotal = totalInventory + totalService;
  const subtotal = (roomTotal ?? 0) + serviceTotal;
  const discountAmount = discountInfo ? Number(discountInfo.discount_amount) : 0;
  const depositAmount = booking?.deposit_amount ? Number(booking.deposit_amount) : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount - depositAmount);

  // Điểm sẽ tích = grandTotal / 10.000
  const pointsToEarn = Math.floor(grandTotal / 10000);

  const currentPrice = isHourly ? roomType?.hourly_price : roomType?.daily_price;

  // ── ÁP DỤNG MÃ GIẢM GIÁ ──────────────────────────────────────────────────
  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setIsApplyingDiscount(true);
    setDiscountError('');
    setDiscountInfo(null);
    try {
      const res = await voucherApi.applyDiscount(discountCode.trim());
      const data = res?.data ?? res;
      // Kiểm tra đơn tối thiểu
      const minOrder = Number(data.min_order_value) || 0;
      if (minOrder > 0 && subtotal < minOrder) {
        setDiscountError(`Mã voucher yêu cầu đơn tối thiểu ${Number(minOrder).toLocaleString('vi-VN')}đ. Đơn hiện tại: ${Number(subtotal).toLocaleString('vi-VN')}đ`);
        return;
      }
      setDiscountInfo(data);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Mã không hợp lệ';
      setDiscountError(msg);
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const handleRemoveDiscount = () => {
    setDiscountCode('');
    setDiscountInfo(null);
    setDiscountError('');
  };

  // ── QUÉT MÃ THÀNH VIÊN ────────────────────────────────────────────────────
  const handleLookupMember = async () => {
    if (!memberCode.trim()) return;
    setIsLookingMember(true);
    setMemberError('');
    setMemberInfo(null);
    try {
      const res = await voucherApi.lookupMember(memberCode.trim());
      const data = res?.data ?? res;
      setMemberInfo(data);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Không tìm thấy khách hàng';
      setMemberError(msg);
    } finally {
      setIsLookingMember(false);
    }
  };

  const handleRemoveMember = () => {
    setMemberCode('');
    setMemberInfo(null);
    setMemberError('');
  };

  // ── CAMERA QUÉT BARCODE ──────────────────────────────────────────────────
  const controlsRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setShowCamera(false);
  }, []);

  useEffect(() => {
    if (showCamera) {
      const startScanner = async () => {
        try {
          const codeReader = new BrowserMultiFormatReader();
          const controls = await codeReader.decodeFromConstraints(
            { video: { facingMode: 'environment' } },
            videoRef.current,
            (result, error, currentControls) => {
              if (result) {
                const code = result.getText();
                setMemberCode(code.toUpperCase());
                
                // Dừng camera an toàn qua controls
                if (currentControls) {
                  currentControls.stop();
                } else if (controlsRef.current) {
                  controlsRef.current.stop();
                }
                controlsRef.current = null;
                setShowCamera(false);

                // Auto lookup
                setIsLookingMember(true);
                setMemberError('');
                setMemberInfo(null);
                voucherApi.lookupMember(code.trim()).then(res => {
                  setMemberInfo(res?.data ?? res);
                }).catch(err => {
                  setMemberError(err?.response?.data?.message || 'Không tìm thấy khách hàng');
                }).finally(() => setIsLookingMember(false));
              }
            }
          );
          controlsRef.current = controls;
        } catch (err) {
          setMemberError('Không thể truy cập camera. Vui lòng nhập mã trực tiếp.');
          setShowCamera(false);
        }
      };
      setTimeout(startScanner, 100); // Đợi modal render video tag xong
    }
  }, [showCamera]);

  const startCamera = () => {
    setShowCamera(true);
  };

  // ── XÁC NHẬN THANH TOÁN ──────────────────────────────────────────────────
  const handleConfirmCheckout = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Snapshot danh sách dịch vụ/sản phẩm
      const servicesDetail = [
        ...inventoryItems.map(i => ({
          type: 'INVENTORY',
          name: i.item_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.unit_price * i.quantity,
        })),
        ...serviceItems.map(i => ({
          type: 'GENERAL',
          name: i.item_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.unit_price * i.quantity,
        })),
      ];

      const paymentPayload = {
        payment_method: paymentMethod === 'TRANSFER' ? 'BANK_TRANSFER' : 'CASH',
        room_price:     roomTotal ?? 0,
        service_price:  serviceTotal,
        discount_amount: discountAmount,
        discount_code:  discountInfo?.code || null,
        final_amount:   grandTotal,
        services_detail: servicesDetail,
        memberCode:     memberInfo?.member_code || null,
        pointsToEarn:   pointsToEarn > 0 ? pointsToEarn : 0,
      };

      await bookingApi.checkout(booking.booking_id, paymentPayload);

      queryClient.setQueryData(QUERY_KEYS.ROOM_DETAILS(roomTypeId), (oldData) => {
        if (!oldData) return oldData;
        if (Array.isArray(oldData)) {
          return oldData.map(r => r.id === room.id ? { ...r, status: 'CLEANING' } : r);
        }
        if (oldData.data && Array.isArray(oldData.data)) {
          return {
            ...oldData,
            data: oldData.data.map(r => r.id === room.id ? { ...r, status: 'CLEANING' } : r)
          };
        }
        return oldData;
      });

      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROOM_DETAILS_ALL });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BOOKINGS });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BILL_PAYMENTS_LOG });

      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể trả phòng.';
      alert(`❌ Lỗi: ${msg}`);
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  if (!booking) {
    return (
      <div className="cb-page vb-error-wrap">
        <i className="ph-fill ph-warning-circle" />
        <p>Không tìm thấy thông tin phiên thuê.</p>
        <button className="cb-btn cb-btn-cancel" onClick={() => navigate(-1)}>Quay lại</button>
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
          <h1 className="cb-page-title">Thanh toán &amp; Trả phòng</h1>
          <p className="cb-page-subtitle">
            Mã phiên: <strong>{booking?.booking_code || '—'}</strong>
            &nbsp;·&nbsp;Phòng: <strong>{room?.room_number || '—'}</strong>
          </p>
        </div>
        {/* ── NÚT IN HÓA ĐƠN ── */}
        <button
          type="button"
          className="po-print-btn po-print-btn--green"
          onClick={() => printInvoice({
            businessInfo,
            booking,
            room,
            roomTypeName,
            roomType,
            inventoryItems,
            serviceItems,
            checkoutTime,
            billableUnits,
            isHourly,
            unitPrice,
            roomTotal,
            serviceTotal,
            grandTotal,
            paymentMethod,
            discountCode: discountInfo?.code || null,
            discountAmount,
            depositAmount,
            hoursReal,
            minutesReal,
          })}
          title="In hóa đơn"
        >
          <span>In hóa đơn</span>
        </button>
      </div>

      {/* ── FORM BODY — TÁI SỬ DỤNG LAYOUT ViewBooking ─────────────────── */}
      <form className="cb-form" onSubmit={(e) => e.preventDefault()} noValidate>
        <div className="cb-form-body">

          {/* ═══ CỘT TRÁI: THÔNG TIN KHÁCH HÀNG (readonly) ═══ */}
          <div className="cb-card">
            <div className="cb-card-header">
              <h2>Thông tin khách hàng</h2>
            </div>

            {/* Họ tên */}
            <div className="cb-field">
              <label htmlFor="po-guest-name" className="cb-label">Họ tên khách</label>
              <input
                id="po-guest-name"
                type="text"
                className="cb-input vb-input-readonly"
                value={guestName}
                readOnly
                onChange={() => {}}
              />
            </div>

            {/* Số điện thoại + Email */}
            <div className="cb-field-row">
              <div className="cb-field">
                <label htmlFor="po-guest-phone" className="cb-label">Số điện thoại</label>
                <input
                  id="po-guest-phone"
                  type="tel"
                  className="cb-input vb-input-readonly"
                  value={guestPhone}
                  readOnly
                  onChange={() => {}}
                />
              </div>
              <div className="cb-field">
                <label htmlFor="po-guest-email" className="cb-label">
                  Email <span className="cb-optional">(Tùy chọn)</span>
                </label>
                <input
                  id="po-guest-email"
                  type="email"
                  className="cb-input vb-input-readonly"
                  value={guestEmail}
                  readOnly
                  onChange={() => {}}
                />
              </div>
            </div>

            {/* Ảnh CCCD */}
            <div className="cb-field-row">
              <div className="cb-field">
                <label className="cb-label">Ảnh CCCD (Mặt Trước)</label>
                <div
                  className={`cb-cccd-preview ${booking?.cccd_front_url ? 'has-image' : ''}`}
                  style={booking?.cccd_front_url ? { backgroundImage: `url('${getImageSrc(booking.cccd_front_url)}')` } : {}}
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
                  style={booking?.cccd_back_url ? { backgroundImage: `url('${getImageSrc(booking.cccd_back_url)}')` } : {}}
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

          {/* ═══ CỘT PHẢI: TAB PANEL (readonly) ═══ */}
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
                    `${location.pathname.replace('payment-overview', 'booking-services')}`,
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
                <div className="cb-detail-row">
                  <span className="cb-detail-label">Phòng đang xem:</span>
                  <span className="cb-detail-value cb-room-number">{room?.room_number || '—'}</span>
                </div>

                {(roomTypeName || roomType?.name) && (
                  <div className="cb-detail-row">
                    <span className="cb-detail-label">Loại phòng:</span>
                    <span className="cb-detail-value">{roomTypeName || roomType?.name}</span>
                  </div>
                )}

                <div className="cb-divider" />

                <div className="cb-detail-row">
                  <span className="cb-detail-label">Hình thức thuê:</span>
                  <span className="cb-detail-value vb-rent-badge">
                    {rentType === 'HOURLY' ? 'Theo giờ' : 'Theo ngày'}
                  </span>
                </div>

                <div className="cb-detail-row">
                  <span className="cb-detail-label">
                    Giá phòng <span className="cb-price-unit">({rentType === 'HOURLY' ? '/giờ' : '/ngày'})</span>:
                  </span>
                  <span className="cb-price">{formatMoney(currentPrice)}</span>
                </div>

                <div className="cb-divider" />

                {/* Giờ Check-in Dự kiến */}
                <div className="cb-field cb-datetime-field">
                  <label className="cb-datetime-label cb-label-checkin">Giờ Check-in Dự kiến</label>
                  <div className="cb-dt-row">
                    <input
                      type="date"
                      className="cb-dt-date vb-input-readonly"
                      value={checkinDate}
                      readOnly
                      onChange={() => {}}
                    />
                    <div className="cb-dt-time vb-dt-time-readonly">
                      <input
                        type="number" className="cb-time-num"
                        value={String(checkinHour).padStart(2, '0')}
                        readOnly onChange={() => {}}
                      />
                      <span className="cb-dt-sep">:</span>
                      <input
                        type="number" className="cb-time-num"
                        value={String(checkinMinute).padStart(2, '0')}
                        readOnly onChange={() => {}}
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
                      type="date"
                      className="cb-dt-date cb-dt-date--checkout vb-input-readonly"
                      value={checkoutDate}
                      readOnly onChange={() => {}}
                    />
                    <div className="cb-dt-time cb-dt-time--checkout vb-dt-time-readonly">
                      <input
                        type="number" className="cb-time-num cb-time-num--checkout"
                        placeholder="--" value={checkoutHour}
                        readOnly onChange={() => {}}
                      />
                      <span className="cb-dt-sep cb-dt-sep--checkout">:</span>
                      <input
                        type="number" className="cb-time-num cb-time-num--checkout"
                        placeholder="--" value={checkoutMinute}
                        readOnly onChange={() => {}}
                      />
                    </div>
                  </div>
                  <p className="cb-hint">Chế độ xem — không thể chỉnh sửa khi thanh toán.</p>
                </div>
              </div>
            )}

            {/* ── Tab: Tính tiền phòng (đóng băng theo checkoutTime) ── */}
            {activeTab === 'billing' && (
              <div className="vb-tab-content vb-billing">

                <div className="vb-bill-section">
                  <span className="vb-bill-section-label">Thời gian check-in</span>
                  <div className="vb-bill-field-box">{formatDateTime(booking?.expected_checkin)}</div>
                </div>

                {/* Thời gian trả phòng thực tế (đóng băng) */}
                <div className="vb-bill-section">
                  <span className="vb-bill-section-label">Thời gian trả phòng thực tế</span>
                  <div className="vb-bill-field-box" style={{ color: '#16a34a', fontWeight: 700 }}>
                    {formatDateTime(checkoutTime)}
                  </div>
                </div>

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

                <div className="vb-bill-section">
                  <span className="vb-bill-section-label">Giá tiền thực tế</span>
                  <div className="vb-bill-field-box vb-bill-field-box--combined">
                    <span className="vb-bill-formula-line">
                      {billableUnits} {isHourly ? 'giờ' : 'ngày'}
                      <span className="vb-bill-op"> × </span>
                      {formatMoney(unitPrice)}
                    </span>
                    <span className="vb-bill-total-line">
                      {roomTotal != null ? formatMoney(roomTotal) : '—'}
                    </span>
                  </div>
                </div>

              </div>
            )}



          </div>
        </div>

        {/* ── FOOTER: TỔNG KẾT THANH TOÁN ─────────────────────────────────── */}
        <div className="po-summary-footer">

          {/* 1. Thời gian trả phòng thực tế */}
          <div className="po-checkout-time-block">
            <div className="po-checkout-time-label">Thời gian trả phòng thực tế</div>
            <div className="po-checkout-time-value">{formatDateTime(checkoutTime)}</div>
          </div>

          {/* ── ƯU ĐÃI & TÍCH ĐIỂM ──────────────────────────────────── */}
          <div className="po-voucher-section">
            <h4 className="po-voucher-title"><i className="ph-bold ph-ticket" /> Ưu đãi & Tích điểm</h4>

            {/* Nhập mã giảm giá */}
            <div className="po-voucher-row">
              <label className="po-voucher-label">Mã giảm giá</label>
              {discountInfo ? (
                <div className="po-voucher-applied">
                  <span className="po-voucher-applied-code">
                    <i className="ph-bold ph-check-circle" style={{ color: '#16a34a' }} />
                    {discountInfo.code} — Giảm {formatMoney(discountInfo.discount_amount)}
                  </span>
                  <button type="button" className="po-voucher-remove" onClick={handleRemoveDiscount}>
                    <i className="ph-bold ph-x" />
                  </button>
                </div>
              ) : (
                <div className="po-voucher-input-wrap">
                  <input
                    type="text"
                    className={`po-voucher-input ${discountError ? 'po-voucher-input--error' : ''}`}
                    placeholder="Nhập mã giảm giá..."
                    value={discountCode}
                    onChange={(e) => { setDiscountCode(e.target.value.toUpperCase()); setDiscountError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
                  />
                  <button
                    type="button"
                    className="po-voucher-apply-btn"
                    onClick={handleApplyDiscount}
                    disabled={isApplyingDiscount || !discountCode.trim()}
                  >
                    {isApplyingDiscount ? '...' : 'Áp dụng'}
                  </button>
                </div>
              )}
              {discountError && <span className="po-voucher-error">{discountError}</span>}
            </div>

            {/* Mã thành viên (tích điểm) */}
            <div className="po-voucher-row" style={{ marginTop: '12px' }}>
              <label className="po-voucher-label">Mã thành viên khách hàng</label>
              {memberInfo ? (
                <div className="po-member-info-card">
                  <div className="po-member-info-left">
                    <span style={{ color: '#16a34a', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <i className="ph-bold ph-check-circle" /> Mã hợp lệ
                    </span>
                    <span className="po-member-name"><i className="ph-bold ph-user" /> {memberInfo.full_name}</span>
                    <span className="po-member-code">{memberInfo.member_code}</span>
                    <span className="po-member-points">Điểm hiện có: <strong>{Number(memberInfo.current_points || 0).toLocaleString('vi-VN')}</strong></span>
                    <span className="po-member-earn">Sẽ tích được: <strong style={{ color: '#16a34a' }}>+{pointsToEarn} điểm</strong></span>
                  </div>
                  <button type="button" className="po-voucher-remove" onClick={handleRemoveMember}>
                    <i className="ph-bold ph-x" />
                  </button>
                </div>
              ) : (
                <div className="po-voucher-input-wrap">
                  <input
                    type="text"
                    className={`po-voucher-input ${memberError ? 'po-voucher-input--error' : ''}`}
                    placeholder="Nhập hoặc quét mã thành viên..."
                    value={memberCode}
                    onChange={(e) => { setMemberCode(e.target.value.toUpperCase()); setMemberError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleLookupMember()}
                  />
                  <button
                    type="button"
                    className="po-voucher-apply-btn po-voucher-apply-btn--cam"
                    onClick={startCamera}
                    title="Quét barcode bằng camera"
                  >
                    <i className="ph-bold ph-camera" />
                  </button>
                </div>
              )}
              {memberError && <span className="po-voucher-error">{memberError}</span>}
            </div>
          </div>

          {/* 2. Tổng tiền phải trả */}
          <div className="po-money-block">
            <div className="po-money-row">
              <span className="po-money-label">Tiền phòng ({billableUnits} {isHourly ? 'giờ' : 'ngày'})</span>
              <span className="po-money-value">{formatMoney(roomTotal)}</span>
            </div>
            <div className="po-money-row">
              <span className="po-money-label">Tiền dịch vụ & sản phẩm</span>
              <span className="po-money-value">{formatMoney(serviceTotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="po-money-row po-money-row--discount">
                <span className="po-money-label" style={{ color: '#16a34a' }}>
                  <i className="ph-bold ph-tag" /> Giảm giá ({discountInfo?.code})
                </span>
                <span className="po-money-value" style={{ color: '#16a34a' }}>-{formatMoney(discountAmount)}</span>
              </div>
            )}
            {depositAmount > 0 && (
              <div className="po-money-row po-money-row--discount">
                <span className="po-money-label" style={{ color: '#eab308' }}>
                  <i className="ph-bold ph-piggy-bank" /> Tiền cọc đã trừ
                </span>
                <span className="po-money-value" style={{ color: '#eab308' }}>-{formatMoney(depositAmount)}</span>
              </div>
            )}
            <div className="po-total-row">
              <span className="po-total-label">Tổng cộng phải trả</span>
              <span className="po-total-value">{formatMoney(grandTotal)}</span>
            </div>
          </div>

          {/* 3. Phương thức thanh toán */}
          <div className="po-method-cards">
            <div
              className={`po-method-card ${paymentMethod === 'CASH' ? 'po-method-card--active' : ''}`}
              onClick={() => setPaymentMethod('CASH')}
            >
              <div className="po-method-icon"><i className="ph-bold ph-money" /></div>
              <div className="po-method-info">
                <p className="po-method-name">Tiền mặt</p>
                <p className="po-method-desc">Thanh toán trực tiếp</p>
              </div>
              <div className="po-method-radio">
                <div className="po-method-radio-dot" />
              </div>
            </div>
            <div
              className={`po-method-card ${paymentMethod === 'TRANSFER' ? 'po-method-card--active' : ''}`}
              onClick={() => setPaymentMethod('TRANSFER')}
            >
              <div className="po-method-icon"><i className="ph-bold ph-bank" /></div>
              <div className="po-method-info">
                <p className="po-method-name">Chuyển khoản</p>
                <p className="po-method-desc">Qua tài khoản ngân hàng</p>
              </div>
              {paymentMethod === 'TRANSFER' ? (
                <button
                  type="button"
                  className="po-qr-trigger-btn"
                  onClick={(e) => { e.stopPropagation(); setShowQrModal(true); }}
                >
                  <i className="ph-bold ph-qr-code" />
                  Xem mã QR
                </button>
              ) : (
                <div className="po-method-radio">
                  <div className="po-method-radio-dot" />
                </div>
              )}
            </div>
          </div>

          {/* 4. Nút Xác nhận thanh toán */}
          <button
            type="button"
            className="po-confirm-btn"
            onClick={() => setShowConfirmModal(true)}
            disabled={isSubmitting}
          >
            <i className="ph-bold ph-check-circle" />
            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
          </button>

        </div>
      </form>

      {/* ── MODAL XÁC NHẬN ── */}
      {showConfirmModal && (
        <div className="vb-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="vb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vb-modal-icon vb-modal-icon--checkout">
              <i className="ph-bold ph-money" />
            </div>
            <h3 className="vb-modal-title">Xác nhận thanh toán</h3>
            <p className="vb-modal-desc">
              Tổng tiền: <strong style={{ color: '#dc2626', fontSize: '18px' }}>{formatMoney(grandTotal)}</strong><br />
              Phương thức: <strong>{paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}</strong><br /><br />
              Bạn có chắc muốn hoàn tất phiên thuê phòng <strong>{room?.room_number}</strong>?<br />
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>Hành động này không thể hoàn tác.</span>
            </p>
            <div className="vb-modal-actions">
              <button className="cb-btn cb-btn-cancel" onClick={() => setShowConfirmModal(false)}>Hủy</button>
              <button
                className="vb-btn-checkout vb-btn-checkout--sm"
                onClick={handleConfirmCheckout}
                disabled={isSubmitting}
              >
                <i className="ph-bold ph-check" />
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL THÀNH CÔNG ── */}
      {showSuccessModal && (
        <div className="cb-success-overlay">
          <div className="cb-success-modal">
            <div className="cb-success-icon">
              <i className="ph-bold ph-check" />
            </div>
            <h3 className="cb-success-title">Thanh toán thành công!</h3>
            <p className="cb-success-desc">
              Phiên thuê phòng <strong>{room?.room_number}</strong> đã được hoàn tất.<br />
              Phòng đã chuyển sang trạng thái <strong>Cần dọn dẹp</strong>.
            </p>
            <button className="cb-success-btn" onClick={async () => {
              // Invalidate cache → RoomDetailOverview (TanStack Query) tự refetch
              await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROOM_DETAILS_ALL });
              await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BOOKINGS });
              navigate(`/rooms/activities/list/${roomTypeId}`, {
                state: { roomTypeName }
              });
            }}>
              Về danh sách phòng
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL QR CHUYỂN KHOẢN ───────────────────────────────────── */}
      {showQrModal && (
        <div className="po-qr-modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="po-qr-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="po-qr-modal-header">
              <div className="po-qr-modal-title-wrap">
                <div>
                  <h3 className="po-qr-modal-title">Chuyển khoản ngân hàng</h3>
                  <p className="po-qr-modal-sub">Quét mã QR để thanh toán nhanh</p>
                </div>
              </div>
              <button className="po-qr-modal-close" onClick={() => setShowQrModal(false)}>
                <i className="ph-bold ph-x" />
              </button>
            </div>

            {/* Body */}
            {isLoadingBiz ? (
              <div className="po-qr-loading" style={{ justifyContent: 'center', padding: '40px' }}>
                <div className="po-qr-spinner" />
                <span>Đang tải thông tin...</span>
              </div>
            ) : !businessInfo?.bank_account_number || !businessInfo?.bank_name ? (
              <div className="po-qr-no-info" style={{ margin: '20px', borderRadius: '12px' }}>
                <i className="ph-bold ph-warning-circle" />
                <div>
                  <p className="po-qr-no-info-title">Không thể tạo mã QR</p>
                  <p className="po-qr-no-info-desc">
                    Thông tin ngân hàng chưa được cài đặt.<br />
                    Vui lòng cập nhật trong <strong>Thông tin Doanh nghiệp</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="po-qr-modal-body">
                <div className="po-qr-modal-img-wrap">
                  {qrBankCode ? (
                    <img
                      className="po-qr-modal-img"
                      src={`https://img.vietqr.io/image/${qrBankCode}-${businessInfo.bank_account_number}-print.png?amount=${grandTotal}&addInfo=${encodeURIComponent(`Tra phong ${booking?.booking_code || room?.room_number || ''}`)}&accountName=${encodeURIComponent(businessInfo.bank_account_name || '')}`}
                      alt="Mã QR chuyển khoản"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        document.getElementById('po-modal-qr-fallback').style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    id="po-modal-qr-fallback"
                    className="po-qr-modal-fallback"
                    style={{ display: qrBankCode ? 'none' : 'flex' }}
                  >
                    <i className="ph-bold ph-qr-code" />
                    <span>Không tạo được QR cho ngân hàng này</span>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="po-qr-modal-footer">
              <button className="po-qr-modal-done-btn po-qr-modal-done-btn--green" onClick={() => setShowQrModal(false)}>
                <i className="ph-bold ph-check-circle" />
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CAMERA QUÉT BARCODE ──────────────────────────────── */}
      {showCamera && (
        <div className="po-qr-modal-overlay" onClick={stopCamera}>
          <div className="po-qr-modal" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '400px' }}>
            <div className="po-qr-modal-header">
              <div className="po-qr-modal-title-wrap">
                <div>
                  <h3 className="po-qr-modal-title">Quét mã thành viên</h3>
                  <p className="po-qr-modal-sub">Đưa mã barcode vào vùng camera</p>
                </div>
              </div>
              <button className="po-qr-modal-close" onClick={stopCamera}>
                <i className="ph-bold ph-x" />
              </button>
            </div>
            
            <div className="po-qr-modal-body" style={{ padding: '20px' }}>
              <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
                <video
                  ref={videoRef}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  playsInline
                />
                {/* Khung ngắm barcode */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '80%', height: '40%',
                  border: '2px dashed rgba(255, 255, 255, 0.7)',
                  borderRadius: '8px',
                  boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.4)'
                }} />
              </div>
            </div>

            <div className="po-qr-modal-footer">
              <button className="po-qr-modal-done-btn" onClick={stopCamera} style={{ background: '#f1f5f9', color: '#475569' }}>
                Đóng camera
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default PaymentOverview;
