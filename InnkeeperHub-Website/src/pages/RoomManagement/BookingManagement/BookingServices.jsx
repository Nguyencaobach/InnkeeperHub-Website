import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import bookingServiceItemApi from '../../../api/bookingServiceItemApi';
import ProductPickerModal from './ProductPickerModal';
import ServicePickerModal from './ServicePickerModal';
import './CreateBooking.css';
import './ViewBooking.css';
import './BookingServices.css';

const formatMoney = (n) =>
  n != null ? Number(n).toLocaleString('vi-VN') + ' đ' : '—';

function BookingServices() {
  const navigate = useNavigate();
  const location = useLocation();
  const { room, booking } = location.state || {};

  // ── DANH SÁCH ITEMS ──────────────────────────────────────────
  const [inventoryItems, setInventoryItems] = useState([]); // service_type = 'INVENTORY'
  const [serviceItems, setServiceItems] = useState([]); // service_type = 'GENERAL'
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null); // item đang được cập nhật số lượng

  // ── MODAL ────────────────────────────────────────────────────
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showServicePicker, setShowServicePicker] = useState(false);

  // ── LOAD DANH SÁCH ───────────────────────────────────────────
  useEffect(() => {
    if (!booking?.booking_id) { setIsLoading(false); return; }
    bookingServiceItemApi.getByBookingId(booking.booking_id)
      .then((res) => {
        // sendSuccess wrapper: { success, data: [...] }
        const all = Array.isArray(res) ? res : (res?.data ?? []);
        setInventoryItems(all.filter((i) => i.service_type === 'INVENTORY'));
        setServiceItems(all.filter((i) => i.service_type === 'GENERAL'));
      })
      .catch(() => { })
      .finally(() => setIsLoading(false));
  }, [booking?.booking_id]);

  // ── XÓA ITEM ────────────────────────────────────────────────
  const handleRemove = async (itemId, type) => {
    setRemovingId(itemId);
    try {
      await bookingServiceItemApi.removeItem(itemId);
      if (type === 'INVENTORY') {
        setInventoryItems((prev) => prev.filter((i) => i.id !== itemId));
      } else {
        setServiceItems((prev) => prev.filter((i) => i.id !== itemId));
      }
    } catch { /* lỗi im lặng — có thể thêm toast sau */ }
    finally { setRemovingId(null); }
  };

  // Cập nhật số lượng inline
  const handleUpdateQty = async (item, delta) => {
    const newQty = item.quantity + delta;
    if (newQty < 1) return; // không giảm xuống dưới 1
    setUpdatingId(item.id);
    try {
      const res = await bookingServiceItemApi.updateQuantity(item.id, newQty);
      const updated = res?.data ?? res;
      if (item.service_type === 'INVENTORY') {
        setInventoryItems((prev) => prev.map((i) => i.id === item.id ? updated : i));
      } else {
        setServiceItems((prev) => prev.map((i) => i.id === item.id ? updated : i));
      }
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Không thể cập nhật số lượng.');
    } finally {
      setUpdatingId(null);
    }
  };

  // CALLBACK KHI THÊM SẢN PHẨM THÀNH CÔNG
  // — Nếu đã có trong danh sách (cùng item_id) → replace (server đã cộng dồn qty)
  // — Nếu chưa có → thêm dòng mới
  const handleProductAdded = (item) => {
    setInventoryItems((prev) => {
      const idx = prev.findIndex((i) => i.item_id === item.item_id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = item;
        return updated;
      }
      return [...prev, item];
    });
  };

  // Merge khi thêm dịch vụ đi kèm thành công
  const handleServiceAdded = (item) => {
    setServiceItems((prev) => {
      const idx = prev.findIndex((i) => i.item_id === item.item_id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = item;
        return updated;
      }
      return [...prev, item];
    });
  };

  // ── TÍNH TỔNG ────────────────────────────────────────────────
  const totalInventory = inventoryItems.reduce(
    (sum, i) => sum + (i.unit_price * i.quantity), 0
  );
  const totalService = serviceItems.reduce(
    (sum, i) => sum + (i.unit_price * i.quantity), 0
  );

  return (
    <div className="cb-page vb-page">

      {/* ── HEADER ── */}
      <div className="cb-page-header">
        <button className="cb-btn-back" onClick={() => navigate(-1)} title="Quay lại phiên thuê">
          <i className="ph-bold ph-arrow-left" />
        </button>
        <div className="cb-header-text vb-header-text-grow">
          <h1 className="cb-page-title">Dịch vụ thêm</h1>
          <p className="cb-page-subtitle">
            Mã phiên: <strong>{booking?.booking_code || '—'}</strong>
            &nbsp;·&nbsp;Phòng: <strong>{room?.room_number || '—'}</strong>
          </p>
        </div>
      </div>

      {/* ── HAI BOX ── */}
      <div className="bs-content">

        {/* ══ BOX 1: HÀNG HÓA ══ */}
        <div className="bs-box">
          <div className="bs-box-header">
            <div className="bs-box-title-wrap">
              <h2 className="bs-box-title">Sản phẩm đi kèm</h2>
              <p className="bs-box-sub">Từ kho hàng</p>
            </div>
            <span className="bs-box-badge">
              {inventoryItems.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </div>

          {/* Nút mở modal chọn */}
          <div className="bs-selector-wrap">
            <button
              className="bs-select-trigger"
              type="button"
              onClick={() => setShowProductPicker(true)}
            >
              <i className="ph-bold ph-plus-circle" />
              <span>Chọn hàng hóa</span>
              <i className="ph-bold ph-caret-right bs-caret" />
            </button>
          </div>

          {/* Danh sách đã chọn */}
          <div className="bs-item-list">
            {isLoading ? (
              <div className="bs-loading">
                <i className="ph-bold ph-spinner bs-spin" /> Đang tải...
              </div>
            ) : inventoryItems.length === 0 ? (
              <div className="bs-empty">
                <i className="ph-bold ph-package" />
                <p>Chưa có hàng hóa nào được chọn</p>
              </div>
            ) : (
              inventoryItems.map((item) => (
                <div key={item.id} className="bs-item">
                  <div className="bs-item-info">
                    <span className="bs-item-name">{item.item_name}</span>
                    <span className="bs-item-meta">{formatMoney(item.unit_price)} / đv</span>
                  </div>
                  {/* Điều chỉnh số lượng */}
                  <div className="bs-qty-ctrl">
                    <button
                      className="bs-qty-btn"
                      onClick={() => handleUpdateQty(item, -1)}
                      disabled={updatingId === item.id || removingId === item.id || item.quantity <= 1}
                      title="Giảm"
                    >
                      <i className="ph-bold ph-minus" />
                    </button>
                    <span className="bs-qty-num">
                      {updatingId === item.id
                        ? <i className="ph-bold ph-spinner bs-spin" style={{ fontSize: '12px' }} />
                        : item.quantity
                      }
                    </span>
                    <button
                      className="bs-qty-btn"
                      onClick={() => handleUpdateQty(item, 1)}
                      disabled={updatingId === item.id || removingId === item.id}
                      title="Tăng"
                    >
                      <i className="ph-bold ph-plus" />
                    </button>
                  </div>
                  <span className="bs-item-total">
                    {formatMoney(item.unit_price * item.quantity)}
                  </span>
                  <button
                    className="bs-item-remove"
                    onClick={() => handleRemove(item.id, 'INVENTORY')}
                    disabled={removingId === item.id || updatingId === item.id}
                    title="Xóa"
                  >
                    {removingId === item.id
                      ? <i className="ph-bold ph-spinner bs-spin" />
                      : <i className="ph-bold ph-x" />
                    }
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer tổng tiền */}
          {inventoryItems.length > 0 && (
            <div className="bs-box-footer">
              <span>Tổng hàng hóa</span>
              <span className="bs-total-amount">{formatMoney(totalInventory)}</span>
            </div>
          )}
        </div>

        {/* ══ BOX 2: DỊCH VỤ ══ */}
        <div className="bs-box">
          <div className="bs-box-header">
            <div className="bs-box-title-wrap">
              <h2 className="bs-box-title">Dịch vụ đi kèm</h2>
              <p className="bs-box-sub">Từ quản lý dịch vụ</p>
            </div>
            <span className="bs-box-badge">
              {serviceItems.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </div>

          <div className="bs-selector-wrap">
            <button
              className="bs-select-trigger"
              type="button"
              onClick={() => setShowServicePicker(true)}
            >
              <i className="ph-bold ph-plus-circle" />
              <span>Chọn dịch vụ</span>
              <i className="ph-bold ph-caret-right bs-caret" />
            </button>
          </div>

          <div className="bs-item-list">
            {serviceItems.length === 0 ? (
              <div className="bs-empty">
                <i className="ph-bold ph-sparkle" />
                <p>Chưa có dịch vụ nào được chọn</p>
              </div>
            ) : (
              serviceItems.map((item) => (
                <div key={item.id} className="bs-item">
                  <div className="bs-item-info">
                    <span className="bs-item-name">{item.item_name}</span>
                    <span className="bs-item-meta">{formatMoney(item.unit_price)} / đv</span>
                  </div>
                  {/* Điều chỉnh số lượng */}
                  <div className="bs-qty-ctrl">
                    <button
                      className="bs-qty-btn"
                      onClick={() => handleUpdateQty(item, -1)}
                      disabled={updatingId === item.id || removingId === item.id || item.quantity <= 1}
                      title="Giảm"
                    >
                      <i className="ph-bold ph-minus" />
                    </button>
                    <span className="bs-qty-num">
                      {updatingId === item.id
                        ? <i className="ph-bold ph-spinner bs-spin" style={{ fontSize: '12px' }} />
                        : item.quantity
                      }
                    </span>
                    <button
                      className="bs-qty-btn"
                      onClick={() => handleUpdateQty(item, 1)}
                      disabled={updatingId === item.id || removingId === item.id}
                      title="Tăng"
                    >
                      <i className="ph-bold ph-plus" />
                    </button>
                  </div>
                  <span className="bs-item-total">
                    {formatMoney(item.unit_price * item.quantity)}
                  </span>
                  <button
                    className="bs-item-remove"
                    onClick={() => handleRemove(item.id, 'GENERAL')}
                    disabled={removingId === item.id || updatingId === item.id}
                  >
                    {removingId === item.id
                      ? <i className="ph-bold ph-spinner bs-spin" />
                      : <i className="ph-bold ph-x" />
                    }
                  </button>
                </div>
              ))
            )}
          </div>

          {serviceItems.length > 0 && (
            <div className="bs-box-footer">
              <span>Tổng dịch vụ</span>
              <span className="bs-total-amount">{formatMoney(totalService)}</span>
            </div>
          )}
        </div>

      </div>

      {/* ── MODAL CHỌN SẢN PHẨM ── */}
      {showProductPicker && (
        <ProductPickerModal
          bookingId={booking?.booking_id}
          onAdded={handleProductAdded}
          onClose={() => setShowProductPicker(false)}
        />
      )}

      {showServicePicker && (
        <ServicePickerModal
          bookingId={booking?.booking_id}
          onAdded={handleServiceAdded}
          onClose={() => setShowServicePicker(false)}
        />
      )}

    </div>
  );
}

export default BookingServices;
