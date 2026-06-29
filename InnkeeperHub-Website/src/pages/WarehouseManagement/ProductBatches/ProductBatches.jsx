import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProductBatchesQuery, useCreateProductBatch, useUpdateProductBatch, useDeleteProductBatch } from '../../../hooks/useProductBatches';
import './ProductBatches.css';

// ===== HELPERS =====
const formatMoney = (amount) =>
  new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN');
};

const toInputDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().substring(0, 10);
};

const STATUS_LABELS = {
  ACTIVE: { label: 'Đang dùng', cls: 'status-active' },
  LOCKED: { label: 'Đã khóa', cls: 'status-inactive' },
};

const EMPTY_FORM = {
  batch_code: '',
  original_quantity: '',
  import_price: '',
  mfg_date: '',
  exp_date: '',
  supplier: '',
  status: 'ACTIVE',
};

function ProductBatches() {
  const location = useLocation();
  const navigate = useNavigate();

  const productId = location.state?.productId;
  const productName = location.state?.productName || 'Chi tiết sản phẩm';

  // ===== TANSTACK QUERY =====
  const { data: batchList = [] } = useProductBatchesQuery(productId);
  const createBatchMutation = useCreateProductBatch();
  const updateBatchMutation = useUpdateProductBatch();
  const deleteBatchMutation = useDeleteProductBatch();

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');

  // ===== Form Modal states =====
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  // Hiển thị số có dấu chấm
  const [priceDisplayValue, setPriceDisplayValue] = useState('');
  const [qtyDisplayValue, setQtyDisplayValue] = useState('');

  const [errors, setErrors] = useState({});
  const [apiErrorMsg, setApiErrorMsg] = useState('');

  // ===== Delete & Success Modal =====
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ===== Loading (chống spam click) =====
  const isSaving = createBatchMutation.isPending || updateBatchMutation.isPending;
  const isDeleting = deleteBatchMutation.isPending;

  useEffect(() => {
    if (!productId) {
      navigate('/warehouse/categories');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, navigate]);

  // ===== BỘ LỌC =====
  const displayBatches = batchList.filter(b => {
    const matchStatus =
      filterStatus === 'ACTIVE' ? b.status === 'ACTIVE' :
        filterStatus === 'LOCKED' ? b.status === 'LOCKED' :
          true;
    const kw = searchKeyword.trim().toLowerCase();
    const matchKeyword = kw === '' ||
      b.batch_code?.toLowerCase().includes(kw) ||
      b.supplier?.toLowerCase().includes(kw);
    return matchStatus && matchKeyword;
  });

  // ===== FORM HANDLERS =====
  const handleAddNew = () => {
    setIsEditing(false);
    setSelectedBatchId(null);
    setFormData(EMPTY_FORM);
    setPriceDisplayValue('');
    setQtyDisplayValue('');
    setErrors({});
    setApiErrorMsg('');
    setShowFormModal(true);
  };

  const handleEdit = (batch) => {
    setIsEditing(true);
    setSelectedBatchId(batch.batch_id);
    setFormData({
      batch_code: batch.batch_code || '',
      original_quantity: batch.original_quantity ?? '',
      import_price: batch.import_price ?? '',
      mfg_date: toInputDate(batch.mfg_date),
      exp_date: toInputDate(batch.exp_date),
      supplier: batch.supplier || '',
      status: batch.status || 'ACTIVE',
    });
    setPriceDisplayValue(
      batch.import_price != null
        ? new Intl.NumberFormat('vi-VN').format(Number(batch.import_price))
        : ''
    );
    setQtyDisplayValue(
      batch.original_quantity != null ? String(batch.original_quantity) : ''
    );
    setErrors({});
    setApiErrorMsg('');
    setShowFormModal(true);
  };

  const handleDeleteClick = (batchId) => {
    setSelectedBatchId(batchId);
    setShowDeleteModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    if (apiErrorMsg) setApiErrorMsg('');
  };

  // Xử lý giá tiền — chỉ số, hiển thị dấu chấm
  const handlePriceChange = (e) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    if (rawDigits === '') {
      setPriceDisplayValue('');
      setFormData(prev => ({ ...prev, import_price: '' }));
    } else {
      const num = Number(rawDigits);
      setPriceDisplayValue(new Intl.NumberFormat('vi-VN').format(num));
      setFormData(prev => ({ ...prev, import_price: num }));
    }
    if (errors.import_price) setErrors(prev => ({ ...prev, import_price: null }));
    if (apiErrorMsg) setApiErrorMsg('');
  };

  // Xử lý số lượng — chỉ số nguyên dương
  const handleQtyChange = (e) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    setQtyDisplayValue(rawDigits);
    setFormData(prev => ({ ...prev, original_quantity: rawDigits === '' ? '' : Number(rawDigits) }));
    if (errors.original_quantity) setErrors(prev => ({ ...prev, original_quantity: null }));
    if (apiErrorMsg) setApiErrorMsg('');
  };

  // ===== VALIDATION =====
  const validateForm = () => {
    const newErrors = {};
    if (formData.original_quantity === '' || formData.original_quantity === undefined || Number(formData.original_quantity) < 0)
      newErrors.original_quantity = 'Số lượng nhập không được để trống hoặc âm.';
    if (formData.import_price === '' || formData.import_price === undefined || Number(formData.import_price) < 0)
      newErrors.import_price = 'Giá nhập không được để trống hoặc âm.';
    if (formData.mfg_date && formData.exp_date && formData.exp_date <= formData.mfg_date)
      newErrors.exp_date = 'Hạn sử dụng phải lớn hơn ngày sản xuất.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===== SAVE =====
  const handleSave = async () => {
    if (isSaving) return;
    if (!validateForm()) return;
    try {
      const payload = {
        product_id: productId,
        batch_code: formData.batch_code?.trim() || undefined,
        original_quantity: Number(formData.original_quantity),
        import_price: Number(formData.import_price),
        mfg_date: formData.mfg_date || null,
        exp_date: formData.exp_date || null,
        supplier: formData.supplier?.trim() || null,
        status: formData.status,
      };
      if (isEditing) {
        await updateBatchMutation.mutateAsync({ id: selectedBatchId, data: payload });
      } else {
        await createBatchMutation.mutateAsync(payload);
      }
      // Cache tự động được invalidate
      setShowFormModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      setApiErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  // ===== DELETE =====
  const confirmDelete = async () => {
    if (isDeleting) return;
    try {
      await deleteBatchMutation.mutateAsync(selectedBatchId);
      // Cache tự động được invalidate
      setShowDeleteModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Lỗi khi xóa lô hàng:', err);
      alert('Lỗi khi xóa lô hàng.');
    }
  };

  // ===== RENDER =====
  return (
    <div className="pb-container">
      {/* ===== HEADER ===== */}
      <div className="pb-header">
        <div className="pb-header-left">
          <button
            className="btn-back"
            onClick={() => navigate(-1)}
            title="Quay lại danh sách sản phẩm"
          >
            <i className="ph-bold ph-arrow-left"></i>
          </button>
          <div className="pb-title-group">
            <div className="pb-title-label">Lô hàng nhập kho</div>
            <h2>
              Sản phẩm: <span>{productName}</span>
            </h2>
          </div>
        </div>

        <div className="pb-header-right">
          {/* Bộ lọc trạng thái */}
          <select
            className="pb-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang dùng</option>
            <option value="LOCKED">Đã khóa</option>
          </select>

          {/* Ô tìm kiếm */}
          <div className="pb-search-wrapper">
            <i className="ph ph-magnifying-glass pb-search-icon"></i>
            <input
              type="text"
              className="pb-search-input"
              placeholder="Tìm mã lô, nhà cung cấp..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            {searchKeyword && (
              <button className="pb-search-clear" onClick={() => setSearchKeyword('')} title="Xóa tìm kiếm">
                <i className="ph ph-x"></i>
              </button>
            )}
          </div>

          <button className="btn-add-batch" onClick={handleAddNew}>
            <i className="ph-bold ph-plus"></i> Thêm lô hàng
          </button>
        </div>
      </div>

      {/* ===== BODY - DANH SÁCH LÔ HÀNG ===== */}
      <div className="pb-body">
        {displayBatches.length === 0 ? (
          <div className="pb-empty">
            <i className="ph-fill ph-stack" style={{ fontSize: '72px', color: '#cbd5e1' }}></i>
            <h3>
              {searchKeyword
                ? `Không tìm thấy lô hàng "${searchKeyword}"`
                : 'Chưa có lô hàng nào'}
            </h3>
            <p>
              {searchKeyword
                ? 'Thử tìm với từ khóa khác hoặc xóa bộ lọc.'
                : 'Hãy bấm "Thêm lô hàng" để nhập hàng vào kho.'}
            </p>
          </div>
        ) : (
          <div className="pb-list">
            {displayBatches.map(batch => (
              <div key={batch.batch_id} className="pb-list-item">
                {/* Icon & Mã lô */}
                <div className="pb-item-main">
                  <div className="pb-item-icon">
                    <i className="ph-fill ph-stack"></i>
                  </div>
                  <div className="pb-item-details">
                    <div className="pb-item-code">{batch.batch_code || '—'}</div>
                    <div className="pb-item-meta">
                      {batch.supplier && (
                        <span><i className="ph ph-buildings"></i> {batch.supplier}</span>
                      )}
                      <span>
                        <i className="ph ph-calendar-blank"></i>
                        <strong>{' '}NSX: {formatDate(batch.mfg_date)} &nbsp;|&nbsp; HSD: {formatDate(batch.exp_date)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Số liệu */}
                <div className="pb-item-stats">
                  <div className="pb-stat">
                    <span className="pb-stat-label">Nhập ban đầu</span>
                    <span className="pb-stat-value">{batch.original_quantity}</span>
                  </div>
                  <div className="pb-stat">
                    <span className="pb-stat-label">Còn lại</span>
                    <span className="pb-stat-value highlight">{batch.remain_quantity}</span>
                  </div>
                  <div className="pb-stat">
                    <span className="pb-stat-label">Giá nhập</span>
                    <span className="pb-stat-value price">{formatMoney(batch.import_price)}</span>
                  </div>
                  <span className={`pb-status-badge ${STATUS_LABELS[batch.status]?.cls || 'status-active'}`}>
                    {STATUS_LABELS[batch.status]?.label || batch.status}
                  </span>
                </div>

                {/* Actions */}
                <div className="pb-item-actions">
                  <button
                    className="btn-action-text edit"
                    onClick={() => handleEdit(batch)}
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    className="btn-action-text delete"
                    onClick={() => handleDeleteClick(batch.batch_id)}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== MODAL THÊM / SỬA ===== */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="pb-modal-content">
            <div className="pb-modal-header">
              <h3>{isEditing ? 'Chỉnh sửa lô hàng' : 'Thêm lô hàng mới'}</h3>
              <button className="barcode-close-btn" onClick={() => setShowFormModal(false)}>
                <i className="ph ph-x"></i>
              </button>
            </div>

            {apiErrorMsg && (
              <div className="pb-api-error">
                <i className="ph-fill ph-warning-circle"></i> {apiErrorMsg}
              </div>
            )}

            <div className="pb-form-grid">
              {/* Mã lô */}
              <div className="modal-form-group pb-full-width">
                <label>Mã lô hàng (Batch Code)</label>
                <input
                  type="text"
                  name="batch_code"
                  value={formData.batch_code}
                  onChange={handleChange}
                  placeholder="Để trống hệ thống sẽ tự tạo mã..."
                />
              </div>

              {/* Số lượng nhập */}
              <div className="modal-form-group">
                <label>Số lượng nhập <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="original_quantity"
                  value={qtyDisplayValue}
                  onChange={handleQtyChange}
                  placeholder="VD: 100"
                  className={errors.original_quantity ? 'input-error' : ''}
                />
                {errors.original_quantity && <span className="error-text">{errors.original_quantity}</span>}
              </div>

              {/* Giá nhập */}
              <div className="modal-form-group">
                <label>Giá nhập (VNĐ) <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="import_price"
                  value={priceDisplayValue}
                  onChange={handlePriceChange}
                  placeholder="VD: 50.000"
                  className={errors.import_price ? 'input-error' : ''}
                />
                {errors.import_price && <span className="error-text">{errors.import_price}</span>}
              </div>

              {/* Ngày sản xuất */}
              <div className="modal-form-group">
                <label>Ngày sản xuất (NSX)</label>
                <input
                  type="date"
                  name="mfg_date"
                  value={formData.mfg_date}
                  onChange={handleChange}
                  className={errors.mfg_date ? 'input-error' : ''}
                />
                {errors.mfg_date && <span className="error-text">{errors.mfg_date}</span>}
              </div>

              {/* Hạn sử dụng */}
              <div className="modal-form-group">
                <label>Hạn sử dụng (HSD)</label>
                <input
                  type="date"
                  name="exp_date"
                  value={formData.exp_date}
                  onChange={handleChange}
                  className={errors.exp_date ? 'input-error' : ''}
                />
                {errors.exp_date && <span className="error-text">{errors.exp_date}</span>}
              </div>

              {/* Nhà cung cấp */}
              <div className="modal-form-group">
                <label>Nhà cung cấp</label>
                <input
                  type="text"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleChange}
                  placeholder="VD: Công ty ABC..."
                />
              </div>

              {/* Trạng thái */}
              <div className="modal-form-group">
                <label>Trạng thái</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                  <option value="ACTIVE">Đang dùng</option>
                  <option value="LOCKED">Đã khóa</option>
                </select>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '28px' }}>
              <button className="btn-cancel" onClick={() => setShowFormModal(false)}>Hủy</button>
              <button
                className="btn-add-batch"
                style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Đang lưu...' : 'Lưu lô hàng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL THÀNH CÔNG ===== */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="pb-modal-content" style={{ maxWidth: '350px' }}>
            <div className="modal-icon success">
              <i className="ph-fill ph-check-circle" style={{ fontSize: '64px', color: '#10b981' }}></i>
            </div>
            <h3 style={{ marginTop: '16px' }}>Thành công!</h3>
            <p>Hành động của bạn đã được thực hiện thành công.</p>
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button
                className="btn-add-batch"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setShowSuccessModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL XÓA ===== */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="pb-modal-content" style={{ maxWidth: '380px' }}>
            <div className="modal-icon">
              <i className="ph ph-trash" style={{ fontSize: '54px', color: '#ef4444' }}></i>
            </div>
            <h3>Xác nhận xóa lô hàng</h3>
            <p>Bạn có chắc chắn muốn xóa lô hàng này khỏi hệ thống không? Hành động này không thể hoàn tác.</p>
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button className="btn-cancel" style={{ justifyContent: 'center' }} onClick={() => setShowDeleteModal(false)}>Hủy</button>
              <button
                className="btn-action-text delete"
                style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductBatches;
