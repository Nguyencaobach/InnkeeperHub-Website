import { useState } from 'react';
import { useWarehouseStatusQuery, useDiscardBatch } from '../../../hooks/useWarehouseStatus';
import { getImageSrc } from '../../../utils/imageUrl';
import './WarehouseStatus.css';

const TABS = [
  { id: 'LOW_STOCK', label: 'Tồn kho hàng hóa', colorClass: 'warning' },
  { id: 'EXPIRING', label: 'HSD hàng hóa', colorClass: 'warning' },
  { id: 'LOCKED', label: 'Hàng chờ xử lý', colorClass: 'danger' }
];

function WarehouseStatus() {
  // ===== TANSTACK QUERY =====
  const { data = { lowStockAlert: [], expiringAlert: [], lockedBatches: [] } } = useWarehouseStatusQuery();
  const discardBatchMutation = useDiscardBatch();

  const [activeTab, setActiveTab] = useState('LOW_STOCK');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState('ALL'); // 'ALL' | 'OUT_OF_STOCK' | 'LOW_STOCK'

  // States Modal Tiêu hủy
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [discardReason, setDiscardReason] = useState('');
  const [discardError, setDiscardError] = useState('');

  // States Loading & Success
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const isSaving = discardBatchMutation.isPending;

  // Hàm Helpers định dạng ngày tháng VN (DD/MM/YYYY)
  const formatDateVN = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('vi-VN');
  };

  // Xác định mảng dữ liệu đang hiển thị dựa trên Tab
  const getCurrentListData = () => {
    if (activeTab === 'LOW_STOCK') return data.lowStockAlert;
    if (activeTab === 'EXPIRING') return data.expiringAlert;
    if (activeTab === 'LOCKED') return data.lockedBatches;
    return [];
  };

  // Lọc dữ liệu theo ô tìm kiếm và bộ lọc trạng thái tồn kho
  const displayList = getCurrentListData().filter(item => {
    // Lọc trạng thái hàng tồn (chỉ áp dụng cho tab LOW_STOCK)
    if (activeTab === 'LOW_STOCK' && lowStockFilter !== 'ALL') {
      const isOutOfStock = Number(item.total_remain) === 0;
      if (lowStockFilter === 'OUT_OF_STOCK' && !isOutOfStock) return false;
      if (lowStockFilter === 'LOW_STOCK' && isOutOfStock) return false;
    }

    // Lọc theo từ khóa tìm kiếm
    if (!searchKeyword) return true;
    const keyword = searchKeyword.toLowerCase();
    const nameMatch = item.product_name?.toLowerCase().includes(keyword);
    const codeMatch = item.batch_code?.toLowerCase().includes(keyword) || item.sku?.toLowerCase().includes(keyword);
    return nameMatch || codeMatch;
  });

  // ===== XỬ LÝ TIÊU HỦY LÔ HÀNG =====
  const handleOpenDiscard = (batch) => {
    setSelectedBatch(batch);
    setDiscardReason('');
    setDiscardError('');
    setShowDiscardModal(true);
  };

  const confirmDiscard = async () => {
    if (isSaving) return;
    if (!discardReason.trim()) {
      setDiscardError('Vui lòng nhập lý do tiêu hủy để ghi nhận vào hệ thống.');
      return;
    }

    setDiscardError('');

    try {
      await discardBatchMutation.mutateAsync({ batchId: selectedBatch.batch_id, data: { reason: discardReason.trim() } });
      // Cache tự động được invalidate
      setShowDiscardModal(false);
      setSuccessMsg(`Đã tiêu hủy lô hàng ${selectedBatch.batch_code} thành công.`);
      setShowSuccessModal(true);
    } catch (error) {
      setDiscardError(error.response?.data?.message || 'Có lỗi xảy ra khi tiêu hủy.');
    }
  };

  return (
    <div className="ws-container">
      {/* ===== HEADER ===== */}
      <div className="ws-header">
        <h2>Tình trạng Kho hàng</h2>
        {/* Có thể thêm nút In báo cáo hoặc Xuất Excel ở đây sau này */}
      </div>

      <div className="ws-body">
        {/* ===== BÊN TRÁI: SIDEBAR MENU TABS ===== */}
        <div className="ws-sidebar">
          <div className="sidebar-title">Báo cáo kiểm soát</div>
          <div className="ws-tab-list">
            {TABS.map(tab => {
              // Tính số lượng badge cho từng tab
              let count = 0;
              if (tab.id === 'LOW_STOCK') count = data.lowStockAlert.length;
              if (tab.id === 'EXPIRING') count = data.expiringAlert.length;
              if (tab.id === 'LOCKED') count = data.lockedBatches.length;

              return (
                <div
                  key={tab.id}
                  className={`ws-tab-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchKeyword('');
                    setLowStockFilter('ALL');
                  }}
                >
                  <div className="ws-tab-item-left">
                    <i className={`ph ${tab.icon}`}></i>
                    <span>{tab.label}</span>
                  </div>
                  {count > 0 && (
                    <span className={`ws-tab-badge ${tab.colorClass}`}>{count}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== BÊN PHẢI: NỘI DUNG DANH SÁCH ===== */}
        <div className="ws-content">
          <div className="ws-content-toolbar">
            <h3 className="ws-content-title">
              <i className={`ph-fill ${TABS.find(t => t.id === activeTab)?.icon}`} style={{ color: activeTab === 'LOCKED' ? '#ef4444' : '#f59e0b' }}></i>
              {TABS.find(t => t.id === activeTab)?.label}
            </h3>
            <div className="ws-toolbar-right">
              <div className="search-box">
                <i className="ph ph-magnifying-glass"></i>
                <input
                  type="text"
                  placeholder="Tìm tên SP, mã lô..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
              {activeTab === 'LOW_STOCK' && (
                <select
                  className="filter-select"
                  value={lowStockFilter}
                  onChange={(e) => setLowStockFilter(e.target.value)}
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="OUT_OF_STOCK">Hết hàng</option>
                  <option value="LOW_STOCK">Sắp hết hàng</option>
                </select>
              )}
            </div>
          </div>

          {displayList.length === 0 ? (
            <div className="empty-state">
              <i className="ph-fill ph-check-circle" style={{ fontSize: '72px', color: '#10b981' }}></i>
              <h3 style={{ fontSize: '20px', margin: '16px 0 8px' }}>Mọi thứ đều ổn định</h3>
              <p>Không có dữ liệu cảnh báo nào trong mục này hiện tại.</p>
            </div>
          ) : (
            <div className="ws-table-wrapper">
              <table className="ws-table">
                {/* HEADERS DỰA VÀO TAB */}
                <thead>
                  <tr>
                    {activeTab === 'LOW_STOCK' && (
                      <>
                        <th>Sản phẩm</th>
                        <th>Mã SKU</th>
                        <th>Đơn vị tính</th>
                        <th>Tổng tồn kho</th>
                        <th>Trạng thái</th>
                      </>
                    )}
                    {activeTab === 'EXPIRING' && (
                      <>
                        <th>Mã lô hàng</th>
                        <th>Sản phẩm</th>
                        <th>Tồn kho</th>
                        <th>Hạn sử dụng</th>
                        <th>Nhà cung cấp</th>
                      </>
                    )}
                    {activeTab === 'LOCKED' && (
                      <>
                        <th>Mã lô hàng</th>
                        <th>Sản phẩm</th>
                        <th>Tồn kho</th>
                        <th>Nhập ngày</th>
                        <th>Hạn sử dụng</th>
                        <th style={{ textAlign: 'right' }}>Hành động</th>
                      </>
                    )}
                  </tr>
                </thead>

                {/* BODY DỰA VÀO TAB */}
                <tbody>
                  {displayList.map((item, idx) => (
                    <tr key={item.batch_id || item.product_id || idx}>

                      {/* CỘT CHO TAB 1: LOW STOCK */}
                      {activeTab === 'LOW_STOCK' && (
                        <>
                          <td className="td-product">
                            <div className="td-avatar">
                              {item.image_url ? (
                                <img src={getImageSrc(item.image_url)} alt="img" style={{ width: '100%', height: '100%', borderRadius: '6px', objectFit: 'cover' }} />
                              ) : <i className="ph ph-image"></i>}
                            </div>
                            {item.product_name}
                          </td>
                          <td>{item.sku || <span className="text-muted">Chưa có</span>}</td>
                          <td>{item.unit}</td>
                          <td className={Number(item.total_remain) === 0 ? 'text-danger' : 'text-warning'}>
                            {item.total_remain || 0}
                          </td>
                          <td>
                            {Number(item.total_remain) === 0 ? (
                              <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Hết hàng</span>
                            ) : (
                              <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Sắp hết</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* CỘT CHO TAB 2: EXPIRING */}
                      {activeTab === 'EXPIRING' && (
                        <>
                          <td style={{ fontWeight: 'bold', color: '#0369a1' }}>{item.batch_code || 'Lô ẩn'}</td>
                          <td style={{ fontWeight: '600' }}>{item.product_name}</td>
                          <td>{item.remain_quantity} {item.unit}</td>
                          <td className="text-warning">{formatDateVN(item.exp_date)}</td>
                          <td>{item.supplier || <span className="text-muted">—</span>}</td>
                        </>
                      )}

                      {/* CỘT CHO TAB 3: LOCKED */}
                      {activeTab === 'LOCKED' && (
                        <>
                          <td style={{ fontWeight: 'bold', color: '#475569' }}>{item.batch_code || 'Lô ẩn'}</td>
                          <td style={{ fontWeight: '600' }}>{item.product_name}</td>
                          <td>{item.remain_quantity} {item.unit}</td>
                          <td>{formatDateVN(item.import_date)}</td>
                          <td className="text-danger">{formatDateVN(item.exp_date)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn-discard" onClick={() => handleOpenDiscard(item)}>
                              <i className="ph-bold ph-trash"></i> Tiêu hủy
                            </button>
                          </td>
                        </>
                      )}

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ===== MODAL TIÊU HỦY LÔ HÀNG ===== */}
      {showDiscardModal && selectedBatch && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon"><i className="ph-fill ph-warning-circle"></i></div>
            <h3 style={{ textAlign: 'center', marginBottom: '8px' }}>Xác nhận Tiêu hủy</h3>
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
              Thao tác này sẽ thiết lập số lượng tồn kho của <b>{selectedBatch.batch_code} ({selectedBatch.product_name})</b> về 0. Không thể hoàn tác!
            </p>

            {discardError && (
              <div style={{ background: '#fee2e2', color: '#ef4444', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', marginBottom: '16px' }}>
                <i className="ph-fill ph-warning-circle"></i> {discardError}
              </div>
            )}

            <div className="modal-form-group">
              <label>Lý do tiêu hủy <span style={{ color: 'red' }}>*</span></label>
              <textarea
                placeholder="VD: Hàng đã quá hạn sử dụng, bao bì rách..."
                value={discardReason}
                onChange={(e) => {
                  setDiscardReason(e.target.value);
                  if (discardError) setDiscardError('');
                }}
                className={discardError ? 'input-error' : ''}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDiscardModal(false)} disabled={isSaving}>Hủy thao tác</button>
              <button className="btn-ws-danger" onClick={confirmDiscard} disabled={isSaving}>
                {isSaving ? 'Đang xử lý...' : 'Tiêu hủy ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL THÔNG BÁO THÀNH CÔNG ===== */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center' }}>
            <div className="modal-icon" style={{ color: '#10b981' }}><i className="ph-fill ph-check-circle"></i></div>
            <h3 style={{ marginTop: '0' }}>Thành công!</h3>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>{successMsg}</p>
            <div className="modal-actions">
              <button className="btn-primary" style={{ width: '100%', background: '#00A4D3', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setShowSuccessModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WarehouseStatus;