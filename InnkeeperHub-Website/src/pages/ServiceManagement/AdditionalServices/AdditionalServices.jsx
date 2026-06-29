import { useState } from 'react';
import { useAdditionalServicesQuery, useCreateAdditionalService, useUpdateAdditionalService, useDeleteAdditionalService } from '../../../hooks/useAdditionalServices';
import { getImageSrc } from '../../../utils/imageUrl';
import './AdditionalServices.css';

// Định nghĩa sẵn các Nhóm dịch vụ (Vì DB không có bảng Category riêng)
const SERVICE_CATEGORIES = [
  { id: 'FB', label: 'Food & Beverage (Ăn uống)', icon: 'ph-coffee' },
  { id: 'LAUNDRY', label: 'Giặt ủi', icon: 'ph-t-shirt' },
  { id: 'OTHER', label: 'Dịch vụ khác', icon: 'ph-dots-three-circle' }
];

function AdditionalServices() {
  // ===== TANSTACK QUERY =====
  const [activeTab, setActiveTab] = useState(SERVICE_CATEGORIES[0].id);
  const { data: services = [] } = useAdditionalServicesQuery(activeTab);
  const createServiceMutation = useCreateAdditionalService();
  const updateServiceMutation = useUpdateAdditionalService();
  const deleteServiceMutation = useDeleteAdditionalService();

  const [searchKeyword, setSearchKeyword] = useState('');

  // States Modal Form
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(null);

  const [formData, setFormData] = useState({ is_active: true });
  const [priceDisplayValue, setPriceDisplayValue] = useState(''); // Giá hiển thị (có dấu chấm)
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});

  // States Delete & Success Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [apiErrorMsg, setApiErrorMsg] = useState('');

  // States Loading (Chống spam click)
  const isSaving = createServiceMutation.isPending || updateServiceMutation.isPending;
  const isDeleting = deleteServiceMutation.isPending;

  // Bộ lọc tìm kiếm
  const displayServices = services.filter(srv => {
    if (!searchKeyword) return true;
    return srv.name?.toLowerCase().includes(searchKeyword.toLowerCase());
  });

  const formatMoney = (amount) => new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ';

  // ===== XỬ LÝ FORM =====
  const handleAddNew = () => {
    setIsEditing(false);
    setSelectedServiceId(null);
    // Mặc định chọn category bằng Tab hiện tại
    setFormData({ category: activeTab, name: '', unit: '', price: '', description: '', is_active: true });
    setPriceDisplayValue('');
    setImagePreview(null);
    setErrors({});
    setApiErrorMsg('');
    setShowFormModal(true);
  };

  const handleEdit = (service) => {
    setIsEditing(true);
    setSelectedServiceId(service.service_id);
    setFormData({
      category: service.category,
      name: service.name,
      unit: service.unit,
      price: service.price,
      description: service.description,
      is_active: service.is_active
    });
    setPriceDisplayValue(
      service.price != null && service.price !== '' 
        ? new Intl.NumberFormat('vi-VN').format(Number(service.price)) 
        : ''
    );
    setImagePreview(service.image_url || null);
    setErrors({});
    setApiErrorMsg('');
    setShowFormModal(true);
  };

  const handleDeleteClick = (id) => {
    setSelectedServiceId(id);
    setShowDeleteModal(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === 'checkbox' ? checked : value;
    // Xử lý select is_active
    if (name === 'is_active') finalValue = value === 'true';

    setFormData(prev => ({ ...prev, [name]: finalValue }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    if (apiErrorMsg) setApiErrorMsg('');
  };

  // Hàm xử lý nhập tiền (Tự động thêm dấu chấm)
  const handlePriceChange = (e) => {
    const rawDigits = e.target.value.replace(/\D/g, ''); // Bỏ hết chữ, chỉ lấy số
    if (rawDigits === '') {
      setPriceDisplayValue('');
      setFormData(prev => ({ ...prev, price: '' }));
    } else {
      const numericValue = Number(rawDigits);
      setPriceDisplayValue(new Intl.NumberFormat('vi-VN').format(numericValue));
      setFormData(prev => ({ ...prev, price: numericValue }));
    }
    if (errors.price) setErrors(prev => ({ ...prev, price: null }));
    if (apiErrorMsg) setApiErrorMsg('');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({ ...prev, imageFile: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Kiểm tra dữ liệu trước khi lưu
  const validateForm = () => {
    let newErrors = {};
    if (!formData.name?.trim()) newErrors.name = 'Vui lòng nhập tên dịch vụ.';
    if (!formData.unit?.trim()) newErrors.unit = 'Vui lòng nhập đơn vị tính.';
    if (formData.price === '' || formData.price === undefined || Number(formData.price) < 0) {
      newErrors.price = 'Giá không được để trống hoặc âm.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!validateForm()) return;
    
    try {
      const dataToSubmit = new FormData();
      dataToSubmit.append('category', formData.category);
      dataToSubmit.append('name', formData.name.trim());
      dataToSubmit.append('unit', formData.unit.trim());
      dataToSubmit.append('price', formData.price);
      dataToSubmit.append('is_active', formData.is_active);
      
      if (formData.description?.trim()) {
        dataToSubmit.append('description', formData.description.trim());
      }
      if (formData.imageFile) {
        dataToSubmit.append('image', formData.imageFile);
      }

      if (isEditing) {
        await updateServiceMutation.mutateAsync({ id: selectedServiceId, data: dataToSubmit });
      } else {
        await createServiceMutation.mutateAsync(dataToSubmit);
      }
      // Cache tự động được invalidate
      setShowFormModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      setApiErrorMsg(error.response?.data?.message || 'Có lỗi xảy ra (Tên dịch vụ có thể bị trùng).');
    }
  };

  const confirmDelete = async () => {
    if (isDeleting) return;
    try {
      await deleteServiceMutation.mutateAsync(selectedServiceId);
      // Cache tự động được invalidate
      setShowDeleteModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      alert("Lỗi khi xóa dịch vụ.");
    }
  };

  return (
    <div className="as-container">
      {/* ===== HEADER ===== */}
      <div className="as-header">
        <h2>Quản lý Dịch vụ đi kèm</h2>
        <button className="btn-add-green" onClick={handleAddNew}>
          <i className="ph-bold ph-plus"></i> Thêm dịch vụ
        </button>
      </div>

      <div className="as-body">
        {/* ===== BÊN TRÁI: SIDEBAR TABS ===== */}
        <div className="as-sidebar">
          <div className="sidebar-title">Nhóm dịch vụ</div>
          <div className="as-tab-list">
            {SERVICE_CATEGORIES.map(cat => (
              <div 
                key={cat.id} 
                className={`as-tab-item ${activeTab === cat.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(cat.id);
                  setSearchKeyword(''); // Reset tìm kiếm khi chuyển tab
                }}
              >
                <i className={`ph ${cat.icon}`}></i>
                <span>{cat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ===== BÊN PHẢI: NỘI DUNG DANH SÁCH ===== */}
        <div className="as-content">
          <div className="as-content-toolbar">
            <h3 className="as-content-title">
              {SERVICE_CATEGORIES.find(c => c.id === activeTab)?.label}
            </h3>
            <div className="search-box">
              <i className="ph ph-magnifying-glass"></i>
              <input 
                type="text" 
                placeholder="Tìm dịch vụ..." 
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
          </div>

          {displayServices.length === 0 ? (
            <div className="empty-state">
              <i className="ph-fill ph-dropbox-logo" style={{ fontSize: '72px', color: '#cbd5e1' }}></i>
              <h3 style={{ fontSize: '20px', margin: '16px 0 8px' }}>Chưa có dịch vụ nào</h3>
              <p>Bấm "Thêm dịch vụ" để tạo mới các món đồ thuộc nhóm này.</p>
            </div>
          ) : (
            <div className="service-list">
              {displayServices.map(srv => (
                <div key={srv.service_id} className="service-card">
                  <div className="service-info">
                    <div className="service-avatar">
                      {srv.image_url ? (
                        <img src={getImageSrc(srv.image_url)} alt={srv.name} style={{ width: '100%', height: '100%', borderRadius: '7px', objectFit: 'cover' }} />
                      ) : (
                        <i className="ph ph-image" style={{ fontSize: '28px' }}></i>
                      )}
                    </div>
                    <div className="service-details">
                      <div className="service-name">{srv.name}</div>
                      <div className="service-meta">
                        <span className="service-price">{formatMoney(srv.price)} / {srv.unit}</span>
                        <span className={srv.is_active ? 'badge-active' : 'badge-inactive'}>
                          {srv.is_active ? 'Đang phục vụ' : 'Ngừng bán'}
                        </span>
                      </div>
                      {srv.description && (
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{srv.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="service-actions">
                    <button className="btn-action btn-edit" onClick={() => handleEdit(srv)}>Chỉnh sửa</button>
                    <button className="btn-action btn-delete" onClick={() => handleDeleteClick(srv.service_id)}>Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== MODAL FORM THÊM / SỬA ===== */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="modal-content as-form-modal">
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontWeight: 'bold', fontSize: '20px' }}>
              {isEditing ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ mới'}
            </h3>

            {apiErrorMsg && (
              <div style={{ color: '#ef4444', background: '#fee2e2', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', fontWeight: '500' }}>
                <i className="ph-fill ph-warning-circle"></i> {apiErrorMsg}
              </div>
            )}

            <div className="form-grid">
              <div className="modal-form-group">
                <label>Nhóm dịch vụ</label>
                <select name="category" value={formData.category} onChange={handleChange}>
                  {SERVICE_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="modal-form-group">
                <label>Trạng thái hiển thị</label>
                <select name="is_active" value={formData.is_active !== false ? "true" : "false"} onChange={handleChange}>
                  <option value="true">Đang phục vụ</option>
                  <option value="false">Ngừng cung cấp</option>
                </select>
              </div>

              <div className="modal-form-group full-width">
                <label>Tên dịch vụ / Món ăn <span style={{ color: 'red' }}>*</span></label>
                <input type="text" name="name" value={formData.name || ''} onChange={handleChange} placeholder="VD: Nước Ép Cam, Giặt ủi quần áo..." className={errors.name ? 'input-error' : ''} />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="modal-form-group">
                <label>Đơn vị tính <span style={{ color: 'red' }}>*</span></label>
                <input type="text" name="unit" value={formData.unit || ''} onChange={handleChange} placeholder="VD: Ly, Khách, Lần, Kg..." className={errors.unit ? 'input-error' : ''} />
                {errors.unit && <span className="error-text">{errors.unit}</span>}
              </div>

              <div className="modal-form-group">
                <label>Giá dịch vụ (VNĐ) <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="price"
                  value={priceDisplayValue}
                  onChange={handlePriceChange}
                  placeholder="VD: 50.000"
                  className={errors.price ? 'input-error' : ''}
                />
                {errors.price && <span className="error-text">{errors.price}</span>}
              </div>

              <div className="modal-form-group full-width">
                <label>Mô tả chi tiết</label>
                <textarea name="description" value={formData.description || ''} onChange={handleChange} placeholder="Nhập mô tả thêm về dịch vụ này (không bắt buộc)..." rows="3"></textarea>
              </div>


              {/* Upload Ảnh */}
              <div className="modal-form-group full-width">
                <label>Ảnh minh họa</label>
                <div className="image-upload-wrapper">
                  <div className="image-preview">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" />
                    ) : (
                      <i className="ph ph-image" style={{ fontSize: '32px', color: '#94a3b8' }}></i>
                    )}
                  </div>
                  <div>
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ border: 'none', padding: '0', fontSize: '14px' }} />
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>Kích thước khuyên dùng: Hình vuông (1:1)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowFormModal(false)}>Hủy</button>
              <button className="btn-add-green" style={{ flex: 1, padding: '12px', justifyContent: 'center' }} onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : 'Lưu thông tin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL THÔNG BÁO THÀNH CÔNG ===== */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '350px', textAlign: 'center' }}>
            <div className="modal-icon"><i className="ph-fill ph-check-circle" style={{ fontSize: '64px', color: '#10b981' }}></i></div>
            <h3 style={{ marginTop: '16px' }}>Thành công!</h3>
            <p>Dữ liệu đã được cập nhật thành công.</p>
            <div className="modal-actions">
              <button className="btn-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center' }} onClick={() => setShowSuccessModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL XÓA ===== */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '350px', textAlign: 'center' }}>
            <div className="modal-icon"><i className="ph ph-trash" style={{ fontSize: '54px', color: '#ef4444' }}></i></div>
            <h3>Xác nhận xóa</h3>
            <p>Bạn có chắc chắn muốn xóa dịch vụ này khỏi hệ thống?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>Hủy</button>
              <button className="btn-delete" style={{ flex: 1, padding: '12px', borderRadius: '8px', fontWeight: 'bold' }} onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdditionalServices;