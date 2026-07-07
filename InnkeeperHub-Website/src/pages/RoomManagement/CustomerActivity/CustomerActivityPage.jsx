import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';
import customerServiceOrderApi from '../../../api/customerServiceOrderApi';
import './CustomerActivityPage.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDT = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  const p = (x) => String(x).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const fmt = (n) => (n != null ? Number(n).toLocaleString('vi-VN') + ' đ' : '—');

// ── MODAL CHI TIẾT ────────────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose, onConfirmed, onCancelled }) {
  const [activeTab, setActiveTab] = useState('INVENTORY');
  const [processing, setProcessing] = useState(false);

  // Custom dialog state
  const [dialog, setDialog] = useState(null); // { type: 'confirm'|'alert', title, message, onOk }

  const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
  const inventoryItems = items.filter(i => i.service_type === 'INVENTORY');
  const generalItems = items.filter(i => i.service_type === 'GENERAL');

  const currentItems = activeTab === 'INVENTORY' ? inventoryItems : generalItems;

  const handleConfirm = () => {
    setDialog({
      type: 'confirm',
      title: 'Xác nhận đơn dịch vụ',
      message: 'Xác nhận đơn này? Các sản phẩm / dịch vụ sẽ được thêm vào phiên thuê.',
      onOk: async () => {
        setDialog(null);
        setProcessing(true);
        try {
          await customerServiceOrderApi.confirmOrder(order.id);
          onConfirmed();
        } catch (err) {
          setDialog({ type: 'alert', title: 'Lỗi', message: err.response?.data?.message || 'Lỗi xác nhận đơn.' });
        } finally {
          setProcessing(false);
        }
      },
    });
  };

  const handleCancel = () => {
    setDialog({
      type: 'confirm',
      title: 'Hủy đơn dịch vụ',
      message: 'Hủy đơn này? Dữ liệu đơn sẽ bị xóa vĩnh viễn.',
      onOk: async () => {
        setDialog(null);
        setProcessing(true);
        try {
          await customerServiceOrderApi.cancelOrder(order.id);
          onCancelled();
        } catch (err) {
          setDialog({ type: 'alert', title: 'Lỗi', message: err.response?.data?.message || 'Lỗi hủy đơn.' });
        } finally {
          setProcessing(false);
        }
      },
    });
  };

  return (
    <>
    <div className="ca-modal-overlay" onClick={onClose}>
      <div className="ca-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ca-modal-header">
          <h3>Chi tiết đơn dịch vụ</h3>
          <button className="ca-modal-close" onClick={onClose}><i className="ph ph-x" /></button>
        </div>

        {/* Info grid */}
        <div style={{ padding: '16px 24px 0' }}>
          <div className="ca-info-grid">
            <div className="ca-info-item">
              <label>Mã booking</label>
              <p>{order.booking_code}</p>
            </div>
            <div className="ca-info-item">
              <label>Khách hàng</label>
              <p>{order.guest_name}</p>
            </div>
            <div className="ca-info-item">
              <label>Phòng</label>
              <p>{order.room_type_name} · {order.room_number}</p>
            </div>
            <div className="ca-info-item">
              <label>Thời gian đặt</label>
              <p>{fmtDT(order.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="ca-modal-tabs">
          <button
            className={`ca-modal-tab ${activeTab === 'INVENTORY' ? 'active' : ''}`}
            onClick={() => setActiveTab('INVENTORY')}
          >
            Sản phẩm kho ({inventoryItems.length})
          </button>
          <button
            className={`ca-modal-tab ${activeTab === 'GENERAL' ? 'active' : ''}`}
            onClick={() => setActiveTab('GENERAL')}
          >
            Dịch vụ đi kèm ({generalItems.length})
          </button>
        </div>

        {/* Body */}
        <div className="ca-modal-body">
          {currentItems.length === 0 ? (
            <div className="ca-empty-tab">Không có {activeTab === 'INVENTORY' ? 'sản phẩm' : 'dịch vụ'} nào trong đơn</div>
          ) : (
            <ul className="ca-item-list">
              {currentItems.map((item, idx) => (
                <li key={idx} className="ca-item-row">
                  <div>
                    <div className="ca-item-name">{item.item_name}</div>
                    <div className="ca-item-meta">{fmt(item.unit_price)} / {item.unit || 'đơn vị'}</div>
                  </div>
                  <div>
                    <div className="ca-item-qty">x{item.quantity}</div>
                    <div className="ca-item-price">{fmt(item.unit_price * item.quantity)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="ca-modal-footer">
          <button className="ca-btn-confirm" onClick={handleConfirm} disabled={processing}>
            {processing ? 'Đang xử lý...' : 'Xác nhận đơn'}
          </button>
          <button className="ca-btn-cancel" onClick={handleCancel} disabled={processing}>
            Hủy đơn
          </button>
        </div>
      </div>
    </div>

    {/* Custom Dialog */}
    {dialog && (
      <div className="ca-dialog-overlay" onClick={() => setDialog(null)}>
        <div className="ca-dialog" onClick={e => e.stopPropagation()}>
          <div className="ca-dialog-icon">
            {dialog.type === 'confirm' ? (
              <i className="ph ph-question" />
            ) : (
              <i className="ph ph-warning-circle" />
            )}
          </div>
          <h4 className="ca-dialog-title">{dialog.title}</h4>
          <p className="ca-dialog-message">{dialog.message}</p>
          <div className="ca-dialog-actions">
            {dialog.type === 'confirm' ? (
              <>
                <button className="ca-dialog-btn ca-dialog-btn-primary" onClick={dialog.onOk}>Xác nhận</button>
                <button className="ca-dialog-btn ca-dialog-btn-ghost" onClick={() => setDialog(null)}>Hủy bỏ</button>
              </>
            ) : (
              <button className="ca-dialog-btn ca-dialog-btn-primary" onClick={() => setDialog(null)}>Đã hiểu</button>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ── COMPONENT CHÍNH ──────────────────────────────────────────────────────────
function CustomerActivityPage() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.CUSTOMER_SERVICE_ORDERS,
    queryFn: () => customerServiceOrderApi.getPendingOrders(),
    refetchInterval: 15000, // Auto-refresh mỗi 15 giây
  });

  const orders = data?.data || [];

  const handleModalClose = useCallback(() => {
    setSelectedOrder(null);
  }, []);

  const handleOrderProcessed = useCallback(() => {
    setSelectedOrder(null);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMER_SERVICE_ORDERS });
  }, [queryClient]);

  return (
    <div className="ca-page">
      <div className="ca-card">
        {/* Header */}
        <div className="ca-header">
          <div className="ca-header-left">
            <div>
              <h2 className="ca-title">Hoạt động khách hàng</h2>
              <p className="ca-subtitle">Đơn đặt dịch vụ từ App chờ xác nhận</p>
            </div>
          </div>
          <span className="ca-count-badge">
            {orders.length} đơn chờ
          </span>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="ca-loading"><div className="ca-spinner" /></div>
        ) : error ? (
          <div className="ca-empty">
            <i className="ph ph-warning-circle" />
            <p>Không thể tải dữ liệu. Thử lại sau.</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="ca-empty">
            <i className="ph ph-check-circle" />
            <p>Không có đơn dịch vụ nào đang chờ xử lý</p>
          </div>
        ) : (
          <div className="ca-table-wrapper">
            <table className="ca-table">
              <thead>
                <tr>
                  <th>Mã Booking</th>
                  <th>Khách hàng</th>
                  <th>Số điện thoại</th>
                  <th>Phòng</th>
                  <th>Thời gian tạo</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td><span className="ca-booking-code">{order.booking_code}</span></td>
                    <td>{order.guest_name}</td>
                    <td>{order.guest_phone}</td>
                    <td>
                      <div className="ca-room-info">
                        <span className="ca-room-type">{order.room_type_name}</span>
                        <span className="ca-room-number">Phòng {order.room_number}</span>
                      </div>
                    </td>
                    <td>{fmtDT(order.created_at)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="ca-btn-detail" onClick={() => setSelectedOrder(order)}>
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={handleModalClose}
          onConfirmed={handleOrderProcessed}
          onCancelled={handleOrderProcessed}
        />
      )}
    </div>
  );
}

export default CustomerActivityPage;
