import { useState } from 'react';
import { useDiscountsQuery, useCreateDiscount, useUpdateDiscount, useDeleteDiscount } from '../../../hooks/useDiscounts';
import './Discount.css';

function Discount() {
  // ===== TANSTACK QUERY =====
  const { data: discounts = [] } = useDiscountsQuery();
  const createDiscountMutation = useCreateDiscount();
  const updateDiscountMutation = useUpdateDiscount();
  const deleteDiscountMutation = useDeleteDiscount();

  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  // States Modals
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const isSaving = createDiscountMutation.isPending || updateDiscountMutation.isPending;
  const isDeleting = deleteDiscountMutation.isPending;

  // ===== HELPERS =====
  // Format tiền tệ
  const formatMoney = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  // Format ngày hiển thị: DD/MM/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('vi-VN');
  };

  // Chuyển chuỗi ngày từ DB -> YYYY-MM-DD cho input[type=date]
  const toInputDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().substring(0, 10);
  };

  // ===== HANDLERS =====
  const handleSelectDiscount = (discount) => {
    setSelectedDiscount(discount);
    setFormData({
      ...discount,
      start_date: toInputDate(discount.start_date),
      end_date: toInputDate(discount.end_date),
    });
    setIsEditing(false);
    setErrors({});
  };

  const handleAddNew = () => {
    setSelectedDiscount(null);
    setFormData({
      code: '', description: '', discount_amount: '',
      min_order_value: 0, usage_limit: '',
      start_date: '', end_date: '', is_active: true,
    });
    setIsEditing(true);
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === 'checkbox' ? checked : value;
    if (name === 'code') finalValue = finalValue.toUpperCase();
    setFormData(prev => ({ ...prev, [name]: finalValue }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  // Format số có dấu chấm phân cách hàng nghìn: 50000 → "50.000"
  const formatNumberInput = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    return String(value).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Handler riêng cho ô nhập tiền: strip dấu chấm trước khi lưu vào state
  const handleMoneyChange = (e) => {
    const raw = e.target.value.replace(/\./g, '');
    if (raw === '' || /^\d+$/.test(raw)) {
      setFormData(prev => ({ ...prev, discount_amount: raw }));
      if (errors.discount_amount) setErrors(prev => ({ ...prev, discount_amount: null }));
    }
  };

  const handleCancel = () => {
    if (selectedDiscount) handleSelectDiscount(selectedDiscount);
    else setIsEditing(false);
  };

  // ===== VALIDATION =====
  const validateForm = () => {
    const newErrors = {};
    if (!formData.code || formData.code.trim() === '')
      newErrors.code = 'Vui lòng nhập mã giảm giá.';
    if (!formData.discount_amount || Number(formData.discount_amount) <= 0)
      newErrors.discount_amount = 'Số tiền giảm phải lớn hơn 0.';
    if (!formData.start_date)
      newErrors.start_date = 'Vui lòng chọn ngày bắt đầu.';
    if (!formData.end_date)
      newErrors.end_date = 'Vui lòng chọn ngày kết thúc.';
    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date)
      newErrors.end_date = 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.';
    if (formData.min_order_value && Number(formData.min_order_value) < 0)
      newErrors.min_order_value = 'Không được là số âm.';
    if (formData.usage_limit && Number(formData.usage_limit) < 1)
      newErrors.usage_limit = 'Giới hạn phải từ 1 trở lên (Bỏ trống nếu không giới hạn).';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClickSave = () => {
    if (validateForm()) setShowSaveModal(true);
  };

  // ===== CALL API =====
  const confirmSave = async () => {
    if (isSaving) return;
    try {
      const payload = {
        code: formData.code.trim(),
        description: formData.description,
        discount_amount: Number(formData.discount_amount),
        min_order_value: Number(formData.min_order_value) || 0,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        is_active: formData.is_active === 'false' || formData.is_active === false ? false : true,
      };
      if (formData.usage_limit) payload.usage_limit = Number(formData.usage_limit);

      if (selectedDiscount) {
        await updateDiscountMutation.mutateAsync({ id: selectedDiscount.discount_id, data: payload });
        setSuccessMessage('Cập nhật mã giảm giá thành công!');
      } else {
        await createDiscountMutation.mutateAsync(payload);
        setSuccessMessage('Tạo mới mã giảm giá thành công!');
      }

      setShowSaveModal(false);
      setIsEditing(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Lỗi khi lưu:', error);
      alert(error.response?.data?.message || 'Lỗi hệ thống. Vui lòng thử lại.');
      setShowSaveModal(false);
    }
  };

  const confirmDelete = async () => {
    if (isDeleting) return;
    try {
      await deleteDiscountMutation.mutateAsync(selectedDiscount.discount_id);
      setShowDeleteModal(false);
      setSelectedDiscount(null);
      setSuccessMessage('Xóa mã giảm giá thành công!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Lỗi khi xóa:', error);
      alert('Lỗi khi xóa. Không thể kết nối với máy chủ.');
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="discount-container">
      <div className="ds-header">
        <h2>Quản lý Mã giảm giá</h2>
        <button className="btn-add-green" onClick={handleAddNew} disabled={isEditing && !selectedDiscount}>
          <i className="ph-bold ph-plus"></i> Tạo mã mới
        </button>
      </div>

      <div className="ds-body">
        {/* === SIDEBAR (DANH SÁCH) === */}
        <div className="ds-sidebar">
          {discounts.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Chưa có mã giảm giá nào.</div>
          ) : (
            discounts.map(item => (
              <div
                key={item.discount_id}
                className={`discount-item ${selectedDiscount?.discount_id === item.discount_id ? 'active' : ''}`}
                onClick={() => { if (!isEditing) handleSelectDiscount(item); }}
              >
                <div className="discount-code">
                  <span><i className="ph-fill ph-ticket"></i> {item.code}</span>
                  <span className={item.is_active ? 'badge-active' : 'badge-inactive'}>
                    {item.is_active ? 'Đang bật' : 'Đã tắt'}
                  </span>
                </div>
                <div className="discount-amount">Giảm: {formatMoney(item.discount_amount)}</div>
                <div className="discount-dates">
                  HSD: {formatDate(item.end_date)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* === CONTENT (FORM CHI TIẾT) === */}
        <div className="ds-content">
          {!selectedDiscount && !isEditing ? (
            <div className="empty-state">
              <i className="ph-fill ph-ticket" style={{ fontSize: '72px', color: '#cbd5e1' }}></i>
              <h3 style={{ fontSize: '20px', margin: 0 }}>Chưa chọn mã giảm giá</h3>
              <p>Vui lòng chọn mã bên trái hoặc tạo mới.</p>
            </div>
          ) : (
            <div className="form-wrapper">
              <div className="form-header">
                <h3 className="form-title">
                  {!selectedDiscount ? 'Tạo Mã Giảm Giá Mới' : (isEditing ? 'Chỉnh sửa mã giảm giá' : 'Chi tiết mã giảm giá')}
                </h3>
                <div className="form-actions">
                  {!isEditing ? (
                    <>
                      <button className="btn-warning" onClick={() => setIsEditing(true)}>
                        <i className="ph ph-pencil"></i> Chỉnh sửa
                      </button>
                      <button className="btn-danger" onClick={() => setShowDeleteModal(true)}>
                        <i className="ph ph-trash"></i> Xóa
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn-outline" onClick={handleCancel} disabled={isSaving}>Hủy</button>
                      <button className="btn-add-green" onClick={handleClickSave} disabled={isSaving}>
                        <i className="ph ph-floppy-disk"></i> Lưu thông tin
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="form-grid">
                {/* Mã code */}
                <div className="input-group full-width">
                  <label>Mã Code (Tự động viết hoa) <span style={{ color: 'red' }}>*</span></label>
                  <input type="text" name="code" value={formData.code || ''} onChange={handleChange}
                    disabled={!isEditing} placeholder="VD: SUMMER2024"
                    className={errors.code ? 'input-error' : ''} />
                  {errors.code && <span className="error-text">{errors.code}</span>}
                </div>

                {/* Số tiền giảm */}
                <div className="input-group full-width">
                  <label>Số tiền giảm (VNĐ) <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="text"
                    inputMode="numeric"
                    name="discount_amount"
                    value={formatNumberInput(formData.discount_amount)}
                    onChange={handleMoneyChange}
                    disabled={!isEditing}
                    placeholder="VD: 50.000"
                    className={errors.discount_amount ? 'input-error' : ''}
                  />
                  {errors.discount_amount && <span className="error-text">{errors.discount_amount}</span>}
                </div>

                {/* Ngày bắt đầu / kết thúc */}
                <div className="input-group">
                  <label>Ngày bắt đầu <span style={{ color: 'red' }}>*</span></label>
                  <input type="date" name="start_date" value={formData.start_date || ''}
                    onChange={handleChange} disabled={!isEditing}
                    className={errors.start_date ? 'input-error' : ''} />
                  {errors.start_date && <span className="error-text">{errors.start_date}</span>}
                </div>
                <div className="input-group">
                  <label>Ngày kết thúc <span style={{ color: 'red' }}>*</span></label>
                  <input type="date" name="end_date" value={formData.end_date || ''}
                    onChange={handleChange} disabled={!isEditing}
                    className={errors.end_date ? 'input-error' : ''} />
                  {errors.end_date && <span className="error-text">{errors.end_date}</span>}
                </div>

                {/* Điều kiện */}
                <div className="input-group">
                  <label>Đơn tối thiểu áp dụng (VNĐ)</label>
                  <input type="number" name="min_order_value" value={formData.min_order_value || ''}
                    onChange={handleChange} disabled={!isEditing} placeholder="Mặc định: 0đ" />
                  {errors.min_order_value && <span className="error-text">{errors.min_order_value}</span>}
                </div>
                <div className="input-group">
                  <label>Giới hạn số lần dùng (Tùy chọn)</label>
                  <input type="number" name="usage_limit" value={formData.usage_limit || ''}
                    onChange={handleChange} disabled={!isEditing} placeholder="Bỏ trống nếu không giới hạn" />
                  {errors.usage_limit && <span className="error-text">{errors.usage_limit}</span>}
                </div>

                {/* Mô tả */}
                <div className="input-group full-width">
                  <label>Mô tả / Ghi chú</label>
                  <textarea name="description" value={formData.description || ''} onChange={handleChange}
                    disabled={!isEditing} placeholder="Nhập ghi chú cho mã giảm giá này..."></textarea>
                </div>

                {/* Trạng thái */}
                <div className="input-group full-width">
                  <label>Trạng thái hiển thị</label>
                  <select name="is_active" value={formData.is_active} onChange={handleChange} disabled={!isEditing}>
                    <option value={true}>Bật (Cho phép sử dụng)</option>
                    <option value={false}>Tắt (Khóa mã này)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== MODAL THÀNH CÔNG ===== */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon success">
              <i className="ph-fill ph-check-circle" style={{ fontSize: '64px' }}></i>
            </div>
            <h3 style={{ marginTop: '16px' }}>Thành công!</h3>
            <p>{successMessage}</p>
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button className="btn-primary" style={{ width: '100%' }} onClick={() => setShowSuccessModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL XÁC NHẬN LƯU ===== */}
      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon" style={{ color: '#00A4D3' }}>
              <i className="ph ph-floppy-disk"></i>
            </div>
            <h3>Xác nhận lưu</h3>
            <p>Bạn có chắc chắn muốn lưu thông tin mã giảm giá này?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowSaveModal(false)} disabled={isSaving}>Hủy</button>
              <button className="btn-primary" onClick={confirmSave} disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : 'Xác nhận lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL XÁC NHẬN XÓA ===== */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">
              <i className="ph ph-trash"></i>
            </div>
            <h3>Xác nhận xóa</h3>
            <p>Bạn có chắc chắn muốn xóa mã <b>{selectedDiscount?.code}</b>? Hành động này không thể hoàn tác.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>Hủy</button>
              <button className="btn-danger" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Discount;