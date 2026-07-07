import { useState, useCallback, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useReservedBookingsByRoom } from '../../../hooks/useReserveBookings';
import reserveBookingApi from '../../../api/reserveBookingApi';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';
import { Html5Qrcode } from 'html5-qrcode';
import './ReserveBookingPage.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
const getToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const buildISO = (dateStr, hour, minute) => {
  if (!dateStr) return null;
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  return `${dateStr}T${h}:${m}:00+07:00`;
};

const parseISO = (isoStr) => {
  if (!isoStr) return { date: '', hour: 12, minute: 0 };
  const d = new Date(isoStr);
  if (isNaN(d)) return { date: '', hour: 12, minute: 0 };
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
};

const clampH = (v) => Math.min(23, Math.max(0, parseInt(v, 10) || 0));
const clampM = (v) => Math.min(59, Math.max(0, parseInt(v, 10) || 0));

const fmtDT = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  const p = (x) => String(x).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const fmt = (n) => (n != null ? Number(n).toLocaleString('vi-VN') + ' đ' : '—');

// ── Badge Components ──────────────────────────────────────────────────────────
const PaymentBadge = ({ status }) =>
  status === 'PAID'
    ? <span className="rb-badge rb-badge--paid">Đã cọc</span>
    : <span className="rb-badge rb-badge--unpaid">Chưa cọc</span>;

const ValidityBadge = ({ status, expectedCheckin }) => {
  const isOverdue =
    status === 'OVERDUE' ||
    (status !== 'PENDING' && expectedCheckin && new Date(expectedCheckin) <= new Date());
  const isPending =
    status === 'PENDING' ||
    (expectedCheckin && new Date(expectedCheckin) > new Date());
  if (isOverdue) return <span className="rb-badge rb-badge--overdue">Quá hạn nhận</span>;
  if (isPending) return <span className="rb-badge rb-badge--pending">Chưa tới giờ</span>;
  return null;
};

// ── MODAL CHI TIẾT ────────────────────────────────────────────────────────────
function ReserveBookingModal({ reservation, roomTypeId, room, roomTypeName, onClose, onUpdated, onDeleted }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Edit state
  const ci = parseISO(reservation.expected_checkin);
  const co = parseISO(reservation.expected_checkout);

  const [editMode, setEditMode] = useState(false);
  const [ciDate, setCiDate] = useState(ci.date);
  const [ciHour, setCiHour] = useState(ci.hour);
  const [ciMin, setCiMin]   = useState(ci.minute);
  const [coDate, setCoDate] = useState(co.date);
  const [coHour, setCoHour] = useState(co.hour);
  const [coMin, setCoMin]   = useState(co.minute);

  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [converting, setConverting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmConvert, setConfirmConvert] = useState(false);
  const [error, setError] = useState('');

  // Tính trạng thái giờ cho nút nhận phòng
  const now = new Date();
  const checkinTime = new Date(reservation.expected_checkin);
  const checkoutTime = reservation.expected_checkout ? new Date(reservation.expected_checkout) : null;
  const canConvert = now >= checkinTime && (!checkoutTime || now < checkoutTime);
  const tooEarly  = now < checkinTime;
  const tooLate   = checkoutTime && now >= checkoutTime;

  const handleSave = async () => {
    setError('');
    if (!ciDate) { setError('Vui lòng nhập ngày nhận phòng.'); return; }
    const newCheckin  = buildISO(ciDate, ciHour, ciMin);
    const newCheckout = coDate ? buildISO(coDate, coHour, coMin) : null;
    if (newCheckout && new Date(newCheckin) >= new Date(newCheckout)) {
      setError('Giờ trả phòng phải sau giờ nhận phòng.');
      return;
    }

    try {
      setSaving(true);
      const res = await reserveBookingApi.updateTime(reservation.booking_id, {
        expected_checkin: newCheckin,
        expected_checkout: newCheckout,
      });
      onUpdated(res.data);
      setEditMode(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi cập nhật.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await reserveBookingApi.deleteReservation(reservation.booking_id);
      onDeleted(reservation.booking_id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi xóa đặt phòng.');
    } finally {
      setDeleting(false);
    }
  };

  const handleConvert = async () => {
    try {
      setConverting(true);
      const res = await reserveBookingApi.convertToRented(reservation.booking_id);
      // Invalidate queries to refresh the rooms list and booking list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROOM_DETAILS_ALL });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BOOKING_BY_ROOM(room?.id) });
      
      // Navigate to PaymentOverview for the new active booking
      navigate(`/rooms/activities/booking/${res.data.booking_id}`, {
        state: { roomTypeName, isNewBooking: false }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi nhận phòng.');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="rb-modal-overlay">
      <div className="rb-modal">
        {/* ── HEADER ── */}
        <div className="rb-modal-header">
          <div className="rb-modal-actions-top">
            <button className="btn-action-text edit" onClick={() => { setEditMode(true); setError(''); }}>
              Chỉnh sửa
            </button>
            <button className="btn-action-text delete" onClick={() => setConfirmDelete(true)}>
              Xóa
            </button>
          </div>
          <button className="rb-modal-close" onClick={onClose} title="Đóng">&times;</button>
        </div>

        {/* ── ERROR ALERT ── */}
        {error && (
          <div className="rb-modal-error" style={{ margin: '0 22px' }}>
            <i className="ph-fill ph-warning-circle" /> {error}
          </div>
        )}

        {/* ── THÔNG TIN BOOKING ── */}
        <div className="rb-modal-body">
          <div className="rb-modal-section">
            <div className="rb-modal-info-grid">
              <div className="rb-modal-info-item rb-modal-info-item--full">
                <span className="rb-modal-label">Mã đặt phòng</span>
                <span className="rb-modal-value rb-modal-code">{reservation.booking_code}</span>
              </div>
              <div className="rb-modal-info-item">
                <span className="rb-modal-label">Khách hàng</span>
                <span className="rb-modal-value">{reservation.guest_name || '—'}</span>
              </div>
              <div className="rb-modal-info-item">
                <span className="rb-modal-label">Số điện thoại</span>
                <span className="rb-modal-value">{reservation.guest_phone || '—'}</span>
              </div>
              <div className="rb-modal-info-item">
                <span className="rb-modal-label">Email</span>
                <span className="rb-modal-value">{reservation.guest_email || '—'}</span>
              </div>
              <div className="rb-modal-info-item">
                <span className="rb-modal-label">Hình thức thuê</span>
                <span className="rb-modal-value">{reservation.rent_type === 'HOURLY' ? 'Theo giờ' : 'Theo ngày'}</span>
              </div>
              <div className="rb-modal-info-item">
                <span className="rb-modal-label">Tiền cọc</span>
                <span className="rb-modal-value">{fmt(reservation.deposit_amount)}</span>
              </div>
              <div className="rb-modal-info-item">
                <span className="rb-modal-label">Trạng thái cọc</span>
                <PaymentBadge status={reservation.payment_status} />
              </div>
              <div className="rb-modal-info-item">
                <span className="rb-modal-label">Trạng thái đặt chỗ</span>
                <ValidityBadge status={reservation.reservation_validity} expectedCheckin={reservation.expected_checkin} />
              </div>
            </div>
          </div>

          {/* ── CHỈNH SỬA GIỜ ── */}
          <div className="rb-modal-section">
            <h4 className="rb-modal-section-title">
              <i className="ph-bold ph-calendar-clock" /> Thời gian dự kiến
            </h4>

            {/* Check-in */}
            <div className="rb-modal-dt-row">
              <span className="rb-modal-dt-label rb-modal-dt-label--checkin">Nhận phòng</span>
              {editMode ? (
                <div className="rb-modal-dt-inputs">
                  <input
                    type="date"
                    className="cb-dt-date"
                    min={getToday()}
                    value={ciDate}
                    onChange={(e) => setCiDate(e.target.value)}
                  />
                  <div className="cb-dt-time cb-dt-time--checkin">
                    <input type="number" className="cb-time-num" min="0" max="23"
                      value={String(ciHour).padStart(2, '0')}
                      onChange={(e) => setCiHour(clampH(e.target.value))} />
                    <span className="cb-dt-sep">:</span>
                    <input type="number" className="cb-time-num" min="0" max="59"
                      value={String(ciMin).padStart(2, '0')}
                      onChange={(e) => setCiMin(clampM(e.target.value))} />
                  </div>
                </div>
              ) : (
                <span className="rb-modal-dt-value">{fmtDT(reservation.expected_checkin)}</span>
              )}
            </div>

            {/* Check-out */}
            <div className="rb-modal-dt-row">
              <span className="rb-modal-dt-label rb-modal-dt-label--checkout">Trả phòng</span>
              {editMode ? (
                <div className="rb-modal-dt-inputs">
                  <input
                    type="date"
                    className="cb-dt-date"
                    min={ciDate || getToday()}
                    value={coDate}
                    onChange={(e) => setCoDate(e.target.value)}
                  />
                  <div className="cb-dt-time">
                    <input type="number" className="cb-time-num" min="0" max="23"
                      value={String(coHour).padStart(2, '0')}
                      onChange={(e) => setCoHour(clampH(e.target.value))} />
                    <span className="cb-dt-sep">:</span>
                    <input type="number" className="cb-time-num" min="0" max="59"
                      value={String(coMin).padStart(2, '0')}
                      onChange={(e) => setCoMin(clampM(e.target.value))} />
                  </div>
                </div>
              ) : (
                <span className="rb-modal-dt-value">{fmtDT(reservation.expected_checkout)}</span>
              )}
            </div>

            {/* Save / Cancel */}
            {editMode && (
              <div className="rb-modal-edit-actions">
                <button className="rb-modal-btn rb-modal-btn--save" onClick={handleSave} disabled={saving}>
                  {saving ? 'Đang lưu...' : <><i className="ph-bold ph-floppy-disk" /> Lưu thay đổi</>}
                </button>
                <button className="rb-modal-btn rb-modal-btn--cancel-edit" onClick={() => { setEditMode(false); setError(''); }} disabled={saving}>
                  Hủy thay đổi
                </button>
              </div>
            )}
          </div>

          {/* ── NÚT NHẬN PHÒNG ── */}
          {!editMode && (
            <div className="rb-modal-section rb-modal-section--actions">
              <div className="rb-modal-convert-hint">
                {!canConvert && tooEarly && (
                  <p className="rb-modal-hint rb-modal-hint--warn">
                    <i className="ph-bold ph-clock" /> Chưa tới giờ nhận phòng dự kiến ({fmtDT(reservation.expected_checkin)})
                  </p>
                )}
                {!canConvert && tooLate && (
                  <p className="rb-modal-hint rb-modal-hint--error">
                    <i className="ph-bold ph-warning" /> Đã quá giờ trả phòng dự kiến!
                  </p>
                )}
                {canConvert && (
                  <p className="rb-modal-hint rb-modal-hint--ok">
                    <i className="ph-bold ph-check-circle" /> Đã tới giờ nhận phòng — sẵn sàng tạo phiên thuê.
                  </p>
                )}
              </div>
              <button
                className={`rb-modal-btn rb-modal-btn--convert ${!canConvert ? 'disabled' : ''}`}
                onClick={() => canConvert && setConfirmConvert(true)}
                disabled={!canConvert}
                title={tooEarly ? 'Chưa tới giờ nhận phòng' : tooLate ? 'Đã quá giờ checkout' : 'Nhận phòng ngay'}
              >
                <i className="ph-bold ph-door-open" />
                {tooEarly ? 'Chưa tới giờ nhận phòng' : tooLate ? 'Đã quá giờ checkout' : 'Tạo phiên thuê'}
              </button>
            </div>
          )}
        </div>

        {/* ── CONFIRM DELETE ── */}
        {confirmDelete && (
          <div className="rb-confirm-overlay">
            <div className="rb-confirm-box">
              <i className="ph-fill ph-warning-circle rb-confirm-icon rb-confirm-icon--warn" />
              <h3>Xác nhận xóa lịch đặt trước?</h3>
              <p>Booking <strong>{reservation.booking_code}</strong> sẽ bị xóa vĩnh viễn.<br />Phòng sẽ được trả về trạng thái Trống.</p>
              <div className="rb-confirm-btns">
                <button className="rb-modal-btn rb-modal-btn--delete" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
                <button className="rb-modal-btn rb-modal-btn--cancel-edit" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIRM CONVERT ── */}
        {confirmConvert && (
          <div className="rb-confirm-overlay">
            <div className="rb-confirm-box">
              <i className="ph-fill ph-door-open rb-confirm-icon rb-confirm-icon--ok" />
              <h3>Xác nhận nhận phòng?</h3>
              <p>
                Khách <strong>{reservation.guest_name}</strong> sẽ được nhận phòng ngay bây giờ.<br />
                Booking <strong>{reservation.booking_code}</strong> chuyển sang phiên thuê.
              </p>
              <div className="rb-confirm-btns">
                <button className="rb-modal-btn rb-modal-btn--convert" onClick={handleConvert} disabled={converting}>
                  {converting ? 'Đang xử lý...' : <><i className="ph-bold ph-door-open" /> Nhận phòng</>}
                </button>
                <button className="rb-modal-btn rb-modal-btn--cancel-edit" onClick={() => setConfirmConvert(false)} disabled={converting}>
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── QR SCANNER MODAL ──────────────────────────────────────────────────────────
function QRScannerModal({ onClose, onScanSuccess }) {
  useEffect(() => {
    let html5QrCode;
    let isUnmounted = false;
    let timeoutId;

    const startCamera = async () => {
      if (isUnmounted) return;
      html5QrCode = new Html5Qrcode("qr-reader");
      const config = { fps: 20 };

      const onScan = (decodedText) => {
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().then(() => onScanSuccess(decodedText));
        } else {
          onScanSuccess(decodedText);
        }
      };

      try {
        await html5QrCode.start({ facingMode: "environment" }, config, onScan, () => {});
        if (isUnmounted && html5QrCode.isScanning) {
          html5QrCode.stop().catch(() => {});
        }
      } catch (err) {
        if (isUnmounted) return;
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            await html5QrCode.start(devices[0].id, config, onScan, () => {});
            if (isUnmounted && html5QrCode.isScanning) {
              html5QrCode.stop().catch(() => {});
            }
          }
        } catch (e) {
          console.error("Camera start failed", e);
        }
      }
    };
    
    timeoutId = setTimeout(() => {
      startCamera();
    }, 200);

    return () => {
      isUnmounted = true;
      clearTimeout(timeoutId);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(e => console.error(e));
      }
      const reader = document.getElementById("qr-reader");
      if (reader) reader.innerHTML = "";
    };
  }, [onScanSuccess]);

  return (
    <div className="rb-modal-overlay">
      <div className="rb-modal" style={{ maxWidth: '400px' }}>
        <div className="rb-modal-header" style={{ borderBottom: 'none' }}>
          <h2 className="rb-modal-title">Quét mã QR</h2>
          <button className="rb-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="rb-modal-body" style={{ padding: '0 20px 20px', display: 'flex', justifyContent: 'center' }}>
          <div id="qr-reader" style={{ width: '100%', minHeight: '300px', borderRadius: '8px', overflow: 'hidden' }}></div>
        </div>
      </div>
    </div>
  );
}

// ── COMPONENT CHÍNH ───────────────────────────────────────────────────────────
function ReserveBookingPage() {
  const { id: roomTypeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { room, roomTypeName } = location.state || {};

  const {
    data: reservations = [],
    isLoading,
    isError,
    refetch,
  } = useReservedBookingsByRoom(room?.id);

  const [localList, setLocalList] = useState(null); // null = dùng data từ server
  const [selectedRes, setSelectedRes] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const rawList = localList ?? reservations;
  const displayList = rawList.filter(r => 
    r.booking_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.guest_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdated = useCallback((updatedBooking) => {
    setLocalList((prev) =>
      (prev ?? reservations).map((r) =>
        r.booking_id === updatedBooking.booking_id ? { ...r, ...updatedBooking } : r
      )
    );
    setSelectedRes((prev) => prev ? { ...prev, ...updatedBooking } : prev);
    refetch();
  }, [reservations, refetch]);

  const handleDeleted = useCallback((bookingId) => {
    setLocalList((prev) =>
      (prev ?? reservations).filter((r) => r.booking_id !== bookingId)
    );
    refetch();
  }, [reservations, refetch]);

  return (
    <div className="rb-page">
      <div className="rb-card">

        {/* ══ HEADER ══ */}
        <div className="rb-header">
          <div className="rb-header-left">
            <button
              className="rb-btn-back"
              onClick={() => navigate(`/rooms/activities/list/${roomTypeId}`, { state: { roomTypeName } })}
              title="Quay lại danh sách phòng"
            >
              <i className="ph-bold ph-arrow-left" />
            </button>
            <div>
              <h2 className="rb-title">
                Lịch đặt trước — Phòng <span>{room?.room_number || '...'}</span>
              </h2>
              <p className="rb-subtitle">Danh sách khách đặt trước từ mobile app (trạng thái RESERVED)</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="rb-search-bar" style={{ margin: 0 }}>
              <div className="rb-search-input-wrapper">
                <i className="ph ph-magnifying-glass" />
                <input
                  type="text"
                  placeholder="Tìm mã booking..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="rb-btn-scan" onClick={() => setShowScanner(true)} title="Quét mã QR">
                <i className="ph-bold ph-qr-code" /> Quét mã QR
              </button>
            </div>
            <span className="rb-count-badge">
              {isLoading ? '...' : `${displayList.length} lịch đặt`}
            </span>
          </div>
        </div>

        {/* ══ TABLE AREA ══ */}
        <div className="rb-table-area">
          {isLoading ? (
            <div className="rb-state-box">
              <div className="rb-spinner" />
              <p>Đang tải lịch đặt trước...</p>
            </div>
          ) : isError ? (
            <div className="rb-state-box rb-state-error">
              <i className="ph-fill ph-warning-circle" style={{ fontSize: 40, color: '#f87171' }} />
              <p>Không thể tải dữ liệu. Kiểm tra kết nối máy chủ.</p>
              <button className="rb-retry-btn" onClick={refetch}>Thử lại</button>
            </div>
          ) : displayList.length === 0 ? (
            <div className="rb-state-box">
              <i className="ph-fill ph-calendar-x" style={{ fontSize: 56, color: '#cbd5e1' }} />
              <h3>Chưa có lịch đặt trước nào</h3>
              <p>Phòng <strong>{room?.room_number}</strong> chưa có khách đặt qua mobile app.</p>
            </div>
          ) : (
            <table className="rb-table">
              <thead>
                <tr>
                  <th style={{width:'44px'}}>STT</th>
                  <th>Mã Booking</th>
                  <th>Khách hàng</th>
                  <th>Hình thức</th>
                  <th>Check-in dự kiến</th>
                  <th>Check-out dự kiến</th>
                  <th>Tiền cọc</th>
                  <th>Trạng thái cọc</th>
                  <th style={{width:'120px', textAlign:'center'}}>Đặt chỗ</th>
                  <th style={{width:'90px', textAlign:'center'}}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {displayList.map((res, idx) => (
                  <tr key={res.booking_id} className="rb-row">
                    <td className="rb-col-stt">{idx + 1}</td>
                    <td><span className="rb-booking-code">{res.booking_code}</span></td>
                    <td>
                      <div className="rb-guest-cell">
                        <span className="rb-guest-name">{res.guest_name || '—'}</span>
                        {res.guest_phone && <span className="rb-guest-phone">{res.guest_phone}</span>}
                      </div>
                    </td>
                    <td><span className="rb-rent-type">{res.rent_type === 'HOURLY' ? 'Theo giờ' : 'Theo ngày'}</span></td>
                    <td className="rb-date-cell">{fmtDT(res.expected_checkin)}</td>
                    <td className="rb-date-cell">{fmtDT(res.expected_checkout)}</td>
                    <td className="rb-amount-cell">{fmt(res.deposit_amount)}</td>
                    <td><PaymentBadge status={res.payment_status} /></td>
                    <td style={{textAlign:'center'}}>
                      <ValidityBadge status={res.reservation_validity} expectedCheckin={res.expected_checkin} />
                    </td>
                    <td style={{textAlign:'center'}}>
                      <button className="rb-btn-detail" onClick={() => setSelectedRes(res)}>
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ══ MODAL ══ */}
      {selectedRes && (
        <ReserveBookingModal
          reservation={selectedRes}
          roomTypeId={roomTypeId}
          room={room}
          roomTypeName={roomTypeName}
          onClose={() => setSelectedRes(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}

      {showScanner && (
        <QRScannerModal 
          onClose={() => setShowScanner(false)} 
          onScanSuccess={(decodedText) => {
            setSearchTerm(decodedText);
            setShowScanner(false);
          }} 
        />
      )}
    </div>
  );
}

export default ReserveBookingPage;
