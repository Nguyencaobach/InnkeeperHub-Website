import { useState, useMemo, useRef, useEffect } from 'react';
import { useActivityLogsQuery, useDeleteActivityLogs } from '../../hooks/useActivity';
import './AccountActivity.css';

// =============================================
// HELPER: Lấy màu + icon cho từng loại action
// =============================================
const ACTION_META = {
  CREATE: { label: 'Tạo mới', color: '#10b981', bg: '#d1fae5', icon: 'ph-plus-circle' },
  UPDATE: { label: 'Cập nhật', color: '#3b82f6', bg: '#dbeafe', icon: 'ph-pencil-simple' },
  DELETE: { label: 'Xóa', color: '#ef4444', bg: '#fee2e2', icon: 'ph-trash' },
  LOGIN: { label: 'Đăng nhập', color: '#8b5cf6', bg: '#ede9fe', icon: 'ph-sign-in' },
  LOGOUT: { label: 'Đăng xuất', color: '#64748b', bg: '#f1f5f9', icon: 'ph-sign-out' },
  EXPORT: { label: 'Xuất file', color: '#f59e0b', bg: '#fef3c7', icon: 'ph-export' },
  VIEW: { label: 'Xem', color: '#06b6d4', bg: '#cffafe', icon: 'ph-eye' },
};

const getActionMeta = (action) =>
  ACTION_META[action?.toUpperCase()] || { label: action || 'Khác', color: '#94a3b8', bg: '#f8fafc', icon: 'ph-activity' };

// Format ngày giờ: DD/MM/YYYY HH:mm
const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Lấy ngày 1 tháng trước (dạng YYYY-MM-DD)
const getOneMonthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split('T')[0];
};

const getTodayStr = () => new Date().toISOString().split('T')[0];

// =============================================
// COMPONENT CHÍNH
// =============================================
function AccountActivity() {
  // ===== TANSTACK QUERY =====
  const { data: logs = [], isLoading, error: queryError } = useActivityLogsQuery(500, 0);
  const deleteActivityMutation = useDeleteActivityLogs();

  const error = queryError ? 'Không thể tải dữ liệu nhật ký. Kiểm tra kết nối máy chủ.' : '';

  // Phân trang
  const PAGE_SIZE = 30;
  const [currentPage, setCurrentPage] = useState(1);
  const bodyRef = useRef(null);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  };

  // Bộ lọc
  const [filterDateFrom, setFilterDateFrom] = useState(getOneMonthAgo());
  const [filterDateTo, setFilterDateTo] = useState(getTodayStr());
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterKeyword, setFilterKeyword] = useState('');

  // Modal xóa dữ liệu
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [deleteBeforeDate, setDeleteBeforeDate] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const isDeleting = deleteActivityMutation.isPending;

  // Lấy thông tin người đang đăng nhập
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.role === 'ADMIN';


  // ===== LỌC DỮ LIỆU =====
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Lọc theo ngày
      const logDate = log.created_at ? new Date(log.created_at).toISOString().split('T')[0] : '';
      if (filterDateFrom && logDate < filterDateFrom) return false;
      if (filterDateTo && logDate > filterDateTo) return false;

      // Lọc theo loại action
      if (filterAction !== 'ALL' && log.action?.toUpperCase() !== filterAction) return false;

      // Lọc theo keyword (username / entity_name)
      if (filterKeyword) {
        const kw = filterKeyword.toLowerCase();
        const matchUser = log.username?.toLowerCase().includes(kw);
        const matchEntity = log.entity_name?.toLowerCase().includes(kw);
        const matchType = log.entity_type?.toLowerCase().includes(kw);
        if (!matchUser && !matchEntity && !matchType) return false;
      }

      return true;
    });
  }, [logs, filterDateFrom, filterDateTo, filterAction, filterKeyword]);

  // Reset về trang 1 khi bộ lọc thay đổi
  useEffect(() => { setCurrentPage(1); }, [filterDateFrom, filterDateTo, filterAction, filterKeyword]);

  // Phân trang
  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const pagedLogs  = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const canPrev    = currentPage > 1;
  const canNext    = currentPage < totalPages;

  // Danh sách action duy nhất để build dropdown
  const uniqueActions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action?.toUpperCase()).filter(Boolean));
    return Array.from(set).sort();
  }, [logs]);

  // ===== RESET BỘ LỌC =====
  const handleResetFilter = () => {
    setFilterDateFrom(getOneMonthAgo());
    setFilterDateTo(getTodayStr());
    setFilterAction('ALL');
    setFilterKeyword('');
    setCurrentPage(1);
  };

  // ===== XÓA LOG =====
  const handleOpenDeleteModal = () => {
    setDeleteBeforeDate('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteBeforeDate) {
      setDeleteError('Vui lòng chọn ngày.');
      return;
    }
    if (isDeleting) return;
    setDeleteError('');
    try {
      await deleteActivityMutation.mutateAsync(deleteBeforeDate);
      // Cache tự động được invalidate
      setShowDeleteModal(false);
      setShowDeleteSuccess(true);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Lỗi khi xóa. Vui lòng thử lại.');
    }
  };

  // ===== RENDER =====
  return (
    <div className="aa-container">
      {/* ===== HEADER ===== */}
      <div className="aa-header">
        <div>
          <h2>Nhật ký Hoạt động Tài khoản</h2>
          <p className="aa-header-sub">Ghi lại mọi thao tác được thực hiện trong hệ thống</p>
        </div>
        <span className="aa-stats-badge">{filteredLogs.length} bản ghi</span>
      </div>

      {/* ===== BỘ LỌC ===== */}
      <div className="aa-filter-bar">

        {/* Từ khóa */}
        <div className="filter-group filter-group-search">
          <label>Tìm kiếm</label>
          <div className="search-input-wrap">
            <input
              type="text"
              placeholder="Username, đối tượng..."
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
            />
            {filterKeyword && (
              <button className="aa-clear-btn" onClick={() => setFilterKeyword('')}>×</button>
            )}
          </div>
        </div>

        {/* Khoảng ngày */}
        <div className="filter-group">
          <label>Từ ngày</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Đến ngày</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
          />
        </div>

        {/* Loại hành động */}
        <div className="filter-group">
          <label>Hành động</label>
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
            <option value="ALL">Tất cả</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>{getActionMeta(a).label}</option>
            ))}
          </select>
        </div>

        {/* Reset */}
        <button className="btn-reset-filter" onClick={handleResetFilter}>Reset</button>

        {/* Xóa log cũ — chỉ ADMIN */}
        {isAdmin && (
          <button className="btn-delete-range" onClick={handleOpenDeleteModal}>
            Xóa log cũ
          </button>
        )}
      </div>

      {/* ===== CHÚ THÍCH: 1 THÁNG MẶC ĐỊNH ===== */}
      <div className="aa-notice">
        <i className="ph-fill ph-info"></i>
        Mặc định hiển thị log trong <strong>1 tháng gần nhất</strong>. Dùng bộ lọc ngày để xem dữ liệu cũ hơn.
      </div>

      {/* ===== NỘI DUNG CHÍNH ===== */}
      <div className="aa-body" ref={bodyRef}>
        {isLoading ? (
          <div className="aa-state-box">
            <div className="aa-spinner"></div>
            <p>Đang tải nhật ký...</p>
          </div>
        ) : error ? (
          <div className="aa-state-box error">
            <i className="ph-fill ph-warning-circle" style={{ fontSize: '48px', color: '#ef4444' }}></i>
            <p>{error}</p>
            <button className="btn-retry" onClick={fetchLogs}>Thử lại</button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="aa-state-box">
            <i className="ph-fill ph-magnifying-glass" style={{ fontSize: '56px', color: '#cbd5e1' }}></i>
            <p style={{ color: '#94a3b8' }}>Không có bản ghi nào trong khoảng thời gian này.</p>
          </div>
        ) : (
          <>
          <div className="aa-log-list">
            {pagedLogs.map((log, idx) => {
              const meta = getActionMeta(log.action);
              return (
                <div key={log.log_id || idx} className="aa-log-item">
                  <div className="aa-log-card">
                    <div className="aa-log-card-header">

                      {/* Badge hành động */}
                      <span
                        className="aa-action-badge"
                        style={{ color: meta.color, background: meta.bg }}
                      >
                        {meta.label}
                      </span>

                      {/* Tất cả thông tin trên 1 dòng */}
                      <span className="aa-log-inline">
                        <span className="aa-user">{log.username || 'Hệ thống'}</span>
                        {log.details?.role && (
                          <span className="aa-role-inline">({log.details.role})</span>
                        )}
                        {log.entity_type && (
                          <span className="aa-entity-inline">
                            {log.entity_type}
                            {log.entity_name && ` · ${log.entity_name}`}
                          </span>
                        )}
                      </span>

                      {/* Thời gian — đẩy sang phải */}
                      <span className="aa-time">
                        <i className="ph ph-clock"></i>
                        {formatDateTime(log.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

              );
            })}
          </div>

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="aa-pagination">
              <button className="aa-page-btn" onClick={() => handlePageChange(1)} disabled={!canPrev}>«</button>
              <button className="aa-page-btn" onClick={() => handlePageChange(currentPage - 1)} disabled={!canPrev}>‹</button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === '...' ? (
                    <span key={`e-${idx}`} className="aa-page-ellipsis">…</span>
                  ) : (
                    <button
                      key={item}
                      className={`aa-page-btn ${item === currentPage ? 'aa-page-btn--active' : ''}`}
                      onClick={() => handlePageChange(item)}
                    >{item}</button>
                  )
                )
              }

              <button className="aa-page-btn" onClick={() => handlePageChange(currentPage + 1)} disabled={!canNext}>›</button>
              <button className="aa-page-btn" onClick={() => handlePageChange(totalPages)} disabled={!canNext}>»</button>
              <span className="aa-page-info">Trang {currentPage}/{totalPages} ({filteredLogs.length} bản ghi)</span>
            </div>
          )}
          </>
        )}
      </div>

      {/* ===== MODAL XÓA LOG (CHỈ ADMIN) ===== */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon" style={{ color: '#ef4444' }}>
              <i className="ph ph-trash"></i>
            </div>
            <h3>Xóa nhật ký cũ</h3>
            <p>
              Xóa toàn bộ log hoạt động <strong>từ ngày được chọn trở về trước</strong> (bao gồm cả ngày được chọn).
              <br />
              <span style={{ color: '#ef4444', fontSize: '13px' }}>
                ⚠ Hành động này không thể hoàn tác.
              </span>
            </p>

            <div className="delete-date-field">
              <label>Xóa log đến hết ngày:</label>
              <input
                type="date"
                value={deleteBeforeDate}
                max={getTodayStr()}
                onChange={(e) => {
                  setDeleteBeforeDate(e.target.value);
                  setDeleteError('');
                }}
              />
              {deleteError && <span className="error-text">{deleteError}</span>}
            </div>

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Hủy
              </button>
              <button
                className="btn-danger-confirm"
                onClick={confirmDelete}
                disabled={isDeleting || !deleteBeforeDate}
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL THÀNH CÔNG ===== */}
      {showDeleteSuccess && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon success">
              <i className="ph-fill ph-check-circle" style={{ fontSize: '64px' }}></i>
            </div>
            <h3 style={{ marginTop: '16px' }}>Xóa thành công!</h3>
            <p>Nhật ký cũ đã được dọn sạch.</p>
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button
                className="btn-primary"
                style={{ width: '100%' }}
                onClick={() => setShowDeleteSuccess(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountActivity;
