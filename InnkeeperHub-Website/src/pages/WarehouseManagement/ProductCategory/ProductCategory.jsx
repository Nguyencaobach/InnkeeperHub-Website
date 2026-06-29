import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductCategoriesQuery, useCreateProductCategory, useUpdateProductCategory, useDeleteProductCategory } from '../../../hooks/useProductCategories';
import './ProductCategory.css';

function ProductCategory() {
  const navigate = useNavigate();

  // ===== TANSTACK QUERY =====
  const { data: categoryList = [] } = useProductCategoriesQuery();
  const createCategoryMutation = useCreateProductCategory();
  const updateCategoryMutation = useUpdateProductCategory();
  const deleteCategoryMutation = useDeleteProductCategory();

  // Kiểm tra đăng nhập (Bảo mật)
  const [user] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [searchKeyword, setSearchKeyword] = useState('');

  // States Modals
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [apiErrorMsg, setApiErrorMsg] = useState('');

  const isSaving = createCategoryMutation.isPending || updateCategoryMutation.isPending;
  const isDeleting = deleteCategoryMutation.isPending;

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Lọc và tìm kiếm
  const displayCategories = categoryList.filter(cat => {
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      return cat.name?.toLowerCase().includes(keyword) || 
             cat.description?.toLowerCase().includes(keyword);
    }
    return true;
  });

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    setFormData(category);
    setIsEditing(false);
    setErrors({});
    setApiErrorMsg('');
  };

  const handleAddNew = () => {
    setSelectedCategory(null);
    setFormData({ name: '', description: '' });
    setIsEditing(true);
    setErrors({});
    setApiErrorMsg('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    if (apiErrorMsg) setApiErrorMsg('');
  };

  const handleCancel = () => {
    if (selectedCategory) {
      handleSelectCategory(selectedCategory);
    } else {
      setIsEditing(false);
    }
  };

  // VALIDATION
  const validateForm = () => {
    let newErrors = {};
    if (!formData.name?.trim()) {
      newErrors.name = 'Vui lòng nhập tên danh mục.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClickSave = () => {
    if (validateForm()) setShowSaveModal(true);
  };

  const confirmSave = async () => {
    if (isSaving) return;
    try {
      // Chuẩn bị dữ liệu sạch
      const cleanData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null
      };

      if (selectedCategory) {
        await updateCategoryMutation.mutateAsync({ id: selectedCategory.category_id, data: cleanData });
      } else {
        await createCategoryMutation.mutateAsync(cleanData);
      }
      // Cache tự động được invalidate
      setShowSaveModal(false);
      setIsEditing(false);
      setShowSuccessModal(true); 
    } catch (error) {
      setApiErrorMsg(error.response?.data?.message || "Có lỗi xảy ra. Tên danh mục có thể bị trùng.");
      setShowSaveModal(false);
    }
  };

  const confirmDelete = async () => {
    if (isDeleting) return;
    try {
      await deleteCategoryMutation.mutateAsync(selectedCategory.category_id);
      // Cache tự động được invalidate
      setShowDeleteModal(false);
      setSelectedCategory(null);
      setShowSuccessModal(true);
    } catch (error) {
      const msg = error.response?.data?.message || "Lỗi khi xóa. Có thể danh mục này đang chứa sản phẩm.";
      alert(msg);
      setShowDeleteModal(false);
    }
  };

  if (!user) return null;

  return (
    <div className="cat-container">
      <div className="cat-header">
        <h2>Danh mục Sản phẩm</h2>
        <div className="cat-header-controls">
          <div className="search-box">
            <i className="ph ph-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Tìm tên danh mục..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>
          <button className="btn-add-green" onClick={handleAddNew}>
            <i className="ph-bold ph-plus"></i> Thêm danh mục
          </button>
        </div>
      </div>

      <div className="cat-body">
        {/* === BÊN TRÁI: DANH SÁCH & TÌM KIẾM === */}
        <div className="cat-sidebar">

          <div className="cat-list-wrapper">
            {displayCategories.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                Không tìm thấy danh mục nào.
              </div>
            ) : (
              displayCategories.map(cat => (
                <div 
                  key={cat.category_id} 
                  className={`cat-item ${selectedCategory?.category_id === cat.category_id ? 'active' : ''}`}
                  onClick={() => { if (!isEditing) handleSelectCategory(cat); }}
                >
                  <div className="cat-name">{cat.name}</div>
                  {cat.description && <div className="cat-desc">{cat.description}</div>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* === BÊN PHẢI: FORM CHI TIẾT === */}
        <div className="cat-content">
          {!selectedCategory && !isEditing ? (
            <div className="empty-state">
              <i className="ph-fill ph-tag" style={{ fontSize: '72px', color: '#cbd5e1' }}></i>
              <h3 style={{ fontSize: '20px', margin: 0 }}>Chưa chọn danh mục</h3>
              <p>Vui lòng chọn danh mục bên trái hoặc tạo mới.</p>
            </div>
          ) : (
            <div className="form-wrapper">
              <div className="form-header">
                <h3 className="form-title">
                  {!selectedCategory ? 'Tạo Danh mục Mới' : (isEditing ? 'Chỉnh sửa danh mục' : 'Chi tiết danh mục')}
                </h3>
                
                <div className="form-actions">
                  {!isEditing ? (
                    <>
                      <button 
                        className="btn-primary" 
                        onClick={() => navigate(`/warehouse/products`, { state: { categoryId: selectedCategory.category_id, categoryName: selectedCategory.name } })}
                      >
                        <i className="ph ph-list-plus"></i> Thêm DS sản phẩm
                      </button>

                      <button className="btn-action-text edit" onClick={() => setIsEditing(true)}>Chỉnh sửa</button>
                      <button className="btn-action-text delete" onClick={() => setShowDeleteModal(true)}>Xóa danh mục</button>
                    </>
                  ) : (
                    <>
                      <button className="btn-cancel" onClick={handleCancel}>Hủy</button>
                      <button className="btn-add-green" onClick={handleClickSave}>Lưu thông tin</button>
                    </>
                  )}
                </div>
              </div>

              {apiErrorMsg && (
                <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', marginBottom: '24px', fontWeight: '500' }}>
                  <i className="ph-fill ph-warning-circle" style={{ marginRight: '8px' }}></i>
                  {apiErrorMsg}
                </div>
              )}

              <div className="form-grid">
                <div className="input-group">
                  <label>Tên danh mục <span style={{color: 'red'}}>*</span></label>
                  <input 
                    type="text" 
                    name="name" 
                    value={formData.name || ''} 
                    onChange={handleChange} 
                    disabled={!isEditing} 
                    className={errors.name ? 'input-error' : ''}
                    placeholder="VD: Nước giải khát, Đồ ăn vặt..."
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>
                
                <div className="input-group">
                  <label>Mô tả chi tiết</label>
                  <textarea 
                    name="description" 
                    value={formData.description || ''} 
                    onChange={handleChange} 
                    disabled={!isEditing}
                    rows="4"
                    placeholder="Nhập mô tả cho danh mục này..."
                  ></textarea>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== MODALS ===== */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '380px'}}>
            <div className="modal-icon success"><i className="ph-fill ph-check-circle" style={{ fontSize: '64px' }}></i></div>
            <h3 style={{marginTop: '16px'}}>Thành công!</h3>
            <p>Dữ liệu đã được lưu thành công.</p>
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowSuccessModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '380px'}}>
            <div className="modal-icon" style={{ color: '#00A4D3', fontSize: '54px' }}><i className="ph ph-floppy-disk"></i></div>
            <h3>Xác nhận lưu</h3>
            <p>Bạn có chắc chắn muốn lưu thông tin này?</p>
            <div className="modal-actions">
              <button className="btn-cancel" style={{ textAlign: 'center' }} onClick={() => setShowSaveModal(false)}>Hủy</button>
              <button className="btn-add-green" style={{ flex: 1, padding: '10px', justifyContent: 'center' }} onClick={confirmSave} disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : 'Lưu thông tin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '380px'}}>
            <div className="modal-icon" style={{fontSize: '54px'}}><i className="ph ph-trash"></i></div>
            <h3>Xác nhận xóa</h3>
            <p>Bạn có chắc chắn muốn xóa danh mục này? Không thể xóa nếu đang có sản phẩm thuộc danh mục này.</p>
            <div className="modal-actions">
              <button className="btn-cancel" style={{ textAlign: 'center' }} onClick={() => setShowDeleteModal(false)}>Hủy</button>
              <button className="btn-action-text delete" style={{ flex: 1, padding: '10px', justifyContent: 'center' }} onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductCategory;