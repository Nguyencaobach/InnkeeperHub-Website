import { useState, useEffect, useCallback, useRef } from 'react';
import billPaymentsApi from '../../api/billPaymentsApi';
import profileApi from '../../api/profileApi';
import { printInvoiceFromBill } from './printInvoiceFromBill';
import './RoomInvoiceLog.css';

// ── Helpers ───────────────────────────────────────────────────────
const fmt = (n) =>
  n != null ? Number(n).toLocaleString('vi-VN') + ' đ' : '—';

const fmtDT = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getOneMonthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split('T')[0];
};
const getTodayStr = () => new Date().toISOString().split('T')[0];

const PAGE_SIZE = 15;

// ── COMPONENT ─────────────────────────────────────────────────────
function RoomInvoiceLog() {
  // ── Data ──────────────────────────────────────────────────────
  const [bills, setBills]           = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState('');

  // ── Business info (để in hóa đơn) ────────────────────────────
  const [businessInfo, setBusinessInfo] = useState(null);

  // ── Bộ lọc ───────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const [dateFrom, setDateFrom]       = useState(getOneMonthAgo());
  const [dateTo, setDateTo]           = useState(getTodayStr());

  // ── Phân trang ────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const tableRef = useRef(null);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    if (tableRef.current) tableRef.current.scrollTop = 0;
  };

  // ── Modal xem chi tiết ────────────────────────────────────────
  const [detailBill, setDetailBill]         = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ── Modal xóa theo khoảng ngày ───────────────────────────────
  const [showDeleteModal, setShowDeleteModal]   = useState(false);
  const [deleteFrom, setDeleteFrom]             = useState('');
  const [deleteTo, setDeleteTo]                 = useState('');
  const [isDeleting, setIsDeleting]             = useState(false);
  const [deleteError, setDeleteError]           = useState('');

  // ── Quyền ────────────────────────────────────────────────────
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.role === 'ADMIN';

  // ── Debounce search ──────────────────────────────────────────
  const debounceRef = useRef(null);
  const handleSearchInput = (val) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setCurrentPage(1);
    }, 400);
  };

  // ── Fetch danh sách ──────────────────────────────────────────
  const fetchBills = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await billPaymentsApi.getAll({ search, dateFrom, dateTo, limit: 1000 });
      const data = res?.data ?? res;
      const rows = Array.isArray(data?.rows) ? data.rows : (Array.isArray(data) ? data : []);
      setBills(rows);
      setCurrentPage(1);
    } catch {
      setError('Không thể tải dữ liệu. Kiểm tra kết nối máy chủ.');
    } finally {
      setIsLoading(false);
    }
  }, [search, dateFrom, dateTo]);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  useEffect(() => {
    profileApi.getBusinessSettings()
      .then((res) => setBusinessInfo(res?.data ?? res))
      .catch(() => {});
  }, []);

  // ── Phân trang ────────────────────────────────────────────────
  const totalPages    = Math.ceil(bills.length / PAGE_SIZE);
  const pagedBills    = bills.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const canPrev       = currentPage > 1;
  const canNext       = currentPage < totalPages;

  // ── Xem chi tiết ─────────────────────────────────────────────
  const handleViewDetail = async (bill) => {
    setIsLoadingDetail(true);
    setShowDetailModal(true);
    try {
      const res = await billPaymentsApi.getById(bill.id);
      setDetailBill(res?.data ?? res);
    } catch {
      setDetailBill(bill);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handlePrint = (bill) => printInvoiceFromBill({ bill, businessInfo });

  // ── Reset bộ lọc ─────────────────────────────────────────────
  const handleReset = () => {
    setSearchInput('');
    setSearch('');
    setDateFrom(getOneMonthAgo());
    setDateTo(getTodayStr());
    setCurrentPage(1);
  };

  // ── Xóa theo khoảng ngày ─────────────────────────────────────
  const handleOpenDeleteModal = () => {
    setDeleteFrom('');
    setDeleteTo('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteFrom || !deleteTo) {
      setDeleteError('Vui lòng chọn đủ khoảng ngày cần xóa.');
      return;
    }
    if (deleteFrom > deleteTo) {
      setDeleteError('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.');
      return;
    }
    if (isDeleting) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      // Xóa từng bill trong khoảng ngày (client-side filter → gọi delete từng cái)
      // Hoặc nếu backend hỗ trợ bulk delete thì gọi API riêng
      // Hiện tại: lọc bills trong khoảng ngày rồi xóa từng cái
      const toDelete = bills.filter((b) => {
        const d = b.created_at ? new Date(b.created_at).toISOString().split('T')[0] : '';
        return d >= deleteFrom && d <= deleteTo;
      });
      await Promise.all(toDelete.map((b) => billPaymentsApi.delete(b.id)));
      setShowDeleteModal(false);
      await fetchBills();
    } catch (err) {
      setDeleteError(err?.response?.data?.message || 'Có lỗi xảy ra khi xóa. Vui lòng thử lại.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <div className="ril-page">
      <div className="ril-card">

        {/* ══ HEADER ══ */}
        <div className="ril-card-header">
          <div>
            <h2 className="ril-title">Nhật ký phòng</h2>
            <p className="ril-subtitle">Lịch sử hóa đơn thanh toán các phiên thuê phòng</p>
          </div>
          <span className="ril-count-badge">{bills.length} hóa đơn</span>
        </div>

        {/* ══ BỘ LỌC ══ */}
        <div className="ril-filter-bar">

          {/* Tìm kiếm */}
          <div className="ril-filter-group ril-filter-search">
            <label className="ril-filter-label">Tìm kiếm</label>
            <div className="ril-search-wrap">
              <input
                type="text"
                className="ril-input"
                placeholder="Mã bill, booking, tên khách..."
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
              />
              {searchInput && (
                <button className="ril-clear-btn" onClick={() => handleSearchInput('')}>×</button>
              )}
            </div>
          </div>

          {/* Từ ngày */}
          <div className="ril-filter-group">
            <label className="ril-filter-label">Từ ngày</label>
            <input
              type="date"
              className="ril-input"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {/* Đến ngày */}
          <div className="ril-filter-group">
            <label className="ril-filter-label">Đến ngày</label>
            <input
              type="date"
              className="ril-input"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {/* Reset */}
          <button className="ril-reset-btn" onClick={handleReset}>Reset</button>

          {/* Xóa theo khoảng ngày — chỉ ADMIN */}
          {isAdmin && (
            <button className="ril-delete-range-btn" onClick={handleOpenDeleteModal}>
              Xóa hóa đơn
            </button>
          )}
        </div>

        {/* ══ TABLE ══ */}
        <div className="ril-table-area" ref={tableRef}>
          {isLoading ? (
            <div className="ril-state-box">
              <div className="ril-spinner" />
              <p>Đang tải hóa đơn...</p>
            </div>
          ) : error ? (
            <div className="ril-state-box ril-state-error">
              <p>{error}</p>
              <button className="ril-retry-btn" onClick={fetchBills}>Thử lại</button>
            </div>
          ) : bills.length === 0 ? (
            <div className="ril-state-box">
              <p>Không tìm thấy hóa đơn nào.</p>
            </div>
          ) : (
            <>
              <table className="ril-table">
                <thead>
                  <tr>
                    <th>Mã hóa đơn</th>
                    <th>Mã booking</th>
                    <th>Phòng</th>
                    <th>Khách hàng</th>
                    <th>Ngày tạo</th>
                    <th className="ril-col-actions">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedBills.map((bill) => (
                    <tr key={bill.id} className="ril-row">
                      <td><span className="ril-bill-id">{bill.id}</span></td>
                      <td><span className="ril-booking-code">{bill.booking_code || '—'}</span></td>
                      <td>{bill.room_number || '—'}</td>
                      <td>
                        <div className="ril-guest-cell">
                          <span className="ril-guest-name">{bill.guest_name || '—'}</span>
                          {bill.guest_phone && (
                            <span className="ril-guest-phone">{bill.guest_phone}</span>
                          )}
                        </div>
                      </td>
                      <td className="ril-date-cell">{fmtDT(bill.created_at)}</td>
                      <td className="ril-col-actions">
                        <button
                          className="ril-btn-view"
                          onClick={() => handleViewDetail(bill)}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* ── Phân trang ── */}
              {totalPages > 1 && (
                <div className="ril-pagination">
                  <button className="ril-page-btn" onClick={() => handlePageChange(1)} disabled={!canPrev}>«</button>
                  <button className="ril-page-btn" onClick={() => handlePageChange(currentPage - 1)} disabled={!canPrev}>‹</button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) =>
                      p === 1 || p === totalPages ||
                      Math.abs(p - currentPage) <= 2
                    )
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === '...' ? (
                        <span key={`ellipsis-${idx}`} className="ril-page-ellipsis">…</span>
                      ) : (
                        <button
                          key={item}
                          className={`ril-page-btn ${item === currentPage ? 'ril-page-btn--active' : ''}`}
                          onClick={() => handlePageChange(item)}
                        >
                          {item}
                        </button>
                      )
                    )
                  }

                  <button className="ril-page-btn" onClick={() => handlePageChange(currentPage + 1)} disabled={!canNext}>›</button>
                  <button className="ril-page-btn" onClick={() => handlePageChange(totalPages)} disabled={!canNext}>»</button>
                  <span className="ril-page-info">Trang {currentPage}/{totalPages} ({bills.length} hóa đơn)</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ══ MODAL CHI TIẾT ══ */}
      {showDetailModal && (
        <div className="ril-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="ril-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="ril-modal-header">
              <div>
                <h3 className="ril-modal-title">Chi tiết hóa đơn</h3>
                <p className="ril-modal-sub">{detailBill?.id || '...'}</p>
              </div>
              <button className="ril-modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>

            {/* Body */}
            <div className="ril-modal-body">
              {isLoadingDetail ? (
                <div className="ril-modal-loading">
                  <div className="ril-spinner" />
                  <span>Đang tải...</span>
                </div>
              ) : detailBill ? (
                <>
                  {/* Thông tin khách hàng */}
                  <div className="ril-detail-section">
                    <h4 className="ril-detail-section-title">Thông tin khách hàng</h4>
                    <div className="ril-detail-grid">
                      <div className="ril-detail-row">
                        <span className="ril-detail-label">Họ tên:</span>
                        <span className="ril-detail-value">{detailBill.guest_name || '—'}</span>
                      </div>
                      <div className="ril-detail-row">
                        <span className="ril-detail-label">Số điện thoại:</span>
                        <span className="ril-detail-value">{detailBill.guest_phone || '—'}</span>
                      </div>
                      {detailBill.guest_email && (
                        <div className="ril-detail-row">
                          <span className="ril-detail-label">Email:</span>
                          <span className="ril-detail-value">{detailBill.guest_email}</span>
                        </div>
                      )}
                      <div className="ril-detail-row">
                        <span className="ril-detail-label">Phòng:</span>
                        <span className="ril-detail-value">{detailBill.room_number || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Chi tiết thuê phòng */}
                  <div className="ril-detail-section">
                    <h4 className="ril-detail-section-title">Chi tiết thuê phòng</h4>
                    <div className="ril-detail-grid">
                      <div className="ril-detail-row">
                        <span className="ril-detail-label">Hình thức:</span>
                        <span className="ril-detail-value">
                          {detailBill.rent_type === 'HOURLY' ? 'Theo giờ' : 'Theo ngày'}
                        </span>
                      </div>
                      <div className="ril-detail-row">
                        <span className="ril-detail-label">Phương thức TT:</span>
                        <span className="ril-detail-value">
                          {detailBill.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
                        </span>
                      </div>
                      <div className="ril-detail-row">
                        <span className="ril-detail-label">Check-in thực tế:</span>
                        <span className="ril-detail-value">{fmtDT(detailBill.actual_checkin)}</span>
                      </div>
                      <div className="ril-detail-row">
                        <span className="ril-detail-label">Check-out thực tế:</span>
                        <span className="ril-detail-value">{fmtDT(detailBill.actual_checkout)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dịch vụ thêm */}
                  {Array.isArray(detailBill.services_detail) && detailBill.services_detail.length > 0 && (
                    <div className="ril-detail-section">
                      <h4 className="ril-detail-section-title">Dịch vụ &amp; Sản phẩm thêm</h4>
                      <table className="ril-service-table">
                        <thead>
                          <tr>
                            <th>Tên</th>
                            <th>Loại</th>
                            <th className="right">SL</th>
                            <th className="right">Đơn giá</th>
                            <th className="right">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailBill.services_detail.map((s, i) => (
                            <tr key={i}>
                              <td>{s.name}</td>
                              <td>
                                <span className={`ril-type-badge ${s.type === 'INVENTORY' ? 'product' : 'service'}`}>
                                  {s.type === 'INVENTORY' ? 'Sản phẩm' : 'Dịch vụ'}
                                </span>
                              </td>
                              <td className="right">{s.quantity}</td>
                              <td className="right">{fmt(s.unit_price)}</td>
                              <td className="right">{fmt(s.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Tổng kết */}
                  <div className="ril-detail-section">
                    <h4 className="ril-detail-section-title">Tổng kết thanh toán</h4>
                    <div className="ril-total-block">
                      <div className="ril-total-row">
                        <span>Tiền phòng</span>
                        <span>{fmt(detailBill.room_price)}</span>
                      </div>
                      <div className="ril-total-row">
                        <span>Tiền dịch vụ &amp; sản phẩm</span>
                        <span>{fmt(detailBill.service_price)}</span>
                      </div>
                      {detailBill.deposit_applied && detailBill.deposit_amount > 0 && (
                        <div className="ril-total-row ril-deposit-row">
                          <span>Tiền cọc đã trừ</span>
                          <span>- {fmt(detailBill.deposit_amount)}</span>
                        </div>
                      )}
                      <div className="ril-total-row ril-grand-row">
                        <span>Tổng cộng phải trả</span>
                        <span className="ril-grand-amount">{fmt(detailBill.final_amount)}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="ril-modal-footer">
              <div style={{ flex: 1 }} />
              {detailBill && (
                <button className="ril-footer-btn ril-footer-btn-print" onClick={() => handlePrint(detailBill)}>
                  In hóa đơn
                </button>
              )}
              <button className="ril-footer-btn ril-footer-btn-close" onClick={() => setShowDetailModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL XÓA THEO KHOẢNG NGÀY ══ */}
      {showDeleteModal && (
        <div className="ril-modal-overlay" onClick={() => !isDeleting && setShowDeleteModal(false)}>
          <div className="ril-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="ril-confirm-title">Xóa hóa đơn theo khoảng ngày</h3>
            <p className="ril-confirm-desc">
              Toàn bộ hóa đơn trong khoảng ngày được chọn sẽ bị xóa vĩnh viễn.
            </p>

            <div className="ril-delete-range-fields">
              <div className="ril-filter-group">
                <label className="ril-filter-label">Từ ngày</label>
                <input
                  type="date"
                  className="ril-input"
                  value={deleteFrom}
                  max={getTodayStr()}
                  onChange={(e) => { setDeleteFrom(e.target.value); setDeleteError(''); }}
                />
              </div>
              <div className="ril-filter-group">
                <label className="ril-filter-label">Đến ngày</label>
                <input
                  type="date"
                  className="ril-input"
                  value={deleteTo}
                  max={getTodayStr()}
                  onChange={(e) => { setDeleteTo(e.target.value); setDeleteError(''); }}
                />
              </div>
            </div>

            {deleteError && <p className="ril-delete-error">{deleteError}</p>}

            <p className="ril-confirm-warn">Hành động này không thể hoàn tác.</p>

            <div className="ril-confirm-actions">
              <button
                className="ril-confirm-cancel"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Hủy
              </button>
              <button
                className="ril-confirm-delete"
                onClick={handleConfirmDelete}
                disabled={isDeleting || !deleteFrom || !deleteTo}
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomInvoiceLog;
