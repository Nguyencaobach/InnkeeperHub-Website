import { useState, useEffect } from 'react';
import customerApi from '../../api/customerApi';
import './CustomerManagement.css';

function CustomerManagement() {
  const [customerList, setCustomerList] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  
  // States cho Bộ lọc và Tìm kiếm
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('ACTIVE'); // Mặc định là lọc người Đang hoạt động

  // States Modals
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [apiErrorMsg, setApiErrorMsg] = useState('');

  // States loading (chống spam click)
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCustomers = async () => {
    try {
      const res = await customerApi.getAll();
      if (res.data) setCustomerList(res.data);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách khách hàng:", error);
    }
  };

  useEffect(() => {
    const initFetch = async () => {
      await fetchCustomers();
    };
    initFetch();
  }, []);

  // Xử lý Lọc, Tìm kiếm và SẮP XẾP BẢNG CHỮ CÁI
  let displayCustomers = customerList.filter(customer => {
    // 1. Lọc theo Trạng thái (ACTIVE / INACTIVE / ALL)
    if (filterStatus === 'ACTIVE' && !customer.is_active) return false;
    if (filterStatus === 'INACTIVE' && customer.is_active) return false;
    
    // 2. Lọc theo Tìm kiếm (Tên, Email hoặc SĐT)
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      const matchName = customer.full_name?.toLowerCase().includes(keyword);
      const matchEmail = customer.email?.toLowerCase().includes(keyword);
      const matchPhone = customer.phone_number?.includes(keyword);
      if (!matchName && !matchEmail && !matchPhone) return false;
    }
    
    return true;
  });

  // 3. Sắp xếp danh sách hiển thị theo bảng chữ cái (Tên Khách Hàng)
  displayCustomers.sort((a, b) => {
    if (!a.full_name) return 1;
    if (!b.full_name) return -1;
    return a.full_name.localeCompare(b.full_name);
  });

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    // Khi lấy chi tiết, xóa password để form không hiện password hash
    // eslint-disable-next-line no-unused-vars
    const { password, ...safeData } = customer; 
    setFormData(safeData);
    setIsEditing(false);
    setErrors({});
    setApiErrorMsg('');
  };

  const handleAddNew = () => {
    setSelectedCustomer(null);
    setFormData({ 
      full_name: '', email: '', password: '', is_active: true,
      phone_number: '', date_of_birth: '', address: '',
      cccd_number: '', cccd_issue_date: '', cccd_issue_place: ''
    });
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
    if (selectedCustomer) {
      handleSelectCustomer(selectedCustomer);
    } else {
      setIsEditing(false);
    }
  };

  // VALIDATION ĐẦU VÀO
  const validateForm = () => {
    let newErrors = {};

    if (!formData.full_name?.trim()) newErrors.full_name = 'Vui lòng nhập họ và tên.';
    if (!formData.email?.trim()) newErrors.email = 'Vui lòng nhập email.';
    
    // Nếu thêm mới thì bắt buộc nhập mật khẩu
    if (!selectedCustomer && !formData.password?.trim()) {
      newErrors.password = 'Vui lòng khởi tạo mật khẩu.';
    }
    // Nếu có nhập pass thì phải >= 6 ký tự
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
    }

    if (formData.phone_number && !/^[0-9]{10,11}$/.test(formData.phone_number)) {
      newErrors.phone_number = 'SĐT không hợp lệ (10-11 số).';
    }

    if (formData.cccd_number && !/^[0-9]{12}$/.test(formData.cccd_number)) {
      newErrors.cccd_number = 'CCCD phải đủ 12 số.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClickSave = () => {
    if (validateForm()) setShowSaveModal(true);
  };

  const confirmSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Chuẩn bị dữ liệu sạch trước khi gửi API
      const cleanData = {
        full_name: formData.full_name?.trim() || '',
        email: formData.email?.trim() || '',
        is_active: formData.is_active === true || formData.is_active === 'true',
        phone_number: formData.phone_number?.trim() || null,
        date_of_birth: formData.date_of_birth || null,
        address: formData.address?.trim() || null,
        avatar_url: formData.avatar_url?.trim() || null,
        cccd_number: formData.cccd_number?.trim() || null,
        cccd_issue_date: formData.cccd_issue_date || null,
        cccd_issue_place: formData.cccd_issue_place?.trim() || null,
      };

      if (formData.password && formData.password.trim() !== '') {
        cleanData.password = formData.password;
      }

      if (selectedCustomer) {
        await customerApi.update(selectedCustomer.customer_id, cleanData);
      } else {
        await customerApi.create(cleanData);
      }
      
      await fetchCustomers();
      setShowSaveModal(false);
      setIsEditing(false);
      setShowSuccessModal(true); 
    } catch (error) {
      setApiErrorMsg(error.response?.data?.message || "Có lỗi xảy ra. Kiểm tra lại dữ liệu.");
      setShowSaveModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await customerApi.delete(selectedCustomer.customer_id);
      await fetchCustomers();
      setShowDeleteModal(false);
      setSelectedCustomer(null);
      setShowSuccessModal(true);
    } catch {
      alert("Lỗi khi khóa tài khoản.");
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper render huy hiệu Trạng thái
  const renderStatusBadge = (isActive) => {
    if (isActive) return <span className="status-badge status-active">HOẠT ĐỘNG</span>;
    return <span className="status-badge status-inactive">ĐÃ KHÓA</span>;
  };

  // Format Date ra chuẩn yyyy-MM-dd để nhét vào ô input type="date"
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  return (
    <div className="customer-settings-container">
      <div className="cm-header">
        <h2>Quản lý Khách hàng</h2>
        <div className="cm-header-controls">
          <div className="search-box">
            <i className="ph ph-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Tìm tên, email, sđt..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Tài khoản bị khóa</option>
            <option value="ALL">Tất cả trạng thái</option>
          </select>
          <button className="btn-add-green" onClick={handleAddNew}>
            <i className="ph-bold ph-plus"></i> Thêm khách hàng
          </button>
        </div>
      </div>

      <div className="cm-body">
        {/* === BÊN TRÁI: DANH SÁCH & TÌM KIẾM === */}
        <div className="cm-sidebar">

          {/* Vùng Danh sách */}
          <div className="customer-list-wrapper">
            {displayCustomers.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                Không tìm thấy khách hàng nào.
              </div>
            ) : (
              displayCustomers.map(customer => (
                <div 
                  key={customer.customer_id} 
                  className={`customer-item ${selectedCustomer?.customer_id === customer.customer_id ? 'active' : ''} ${!customer.is_active ? 'inactive' : ''}`}
                  onClick={() => { if (!isEditing) handleSelectCustomer(customer); }}
                >
                  <div className="customer-name">
                    <span>{customer.full_name}</span>
                    {renderStatusBadge(customer.is_active)}
                  </div>
                  <div className="customer-email">
                    <i className="ph-fill ph-envelope-simple"></i> {customer.email}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* === BÊN PHẢI: FORM CHI TIẾT === */}
        <div className="cm-content">
          {!selectedCustomer && !isEditing ? (
            <div className="empty-state">
              <i className="ph-fill ph-user-focus" style={{ fontSize: '72px', color: '#cbd5e1' }}></i>
              <h3 style={{ fontSize: '20px', margin: 0 }}>Chưa chọn khách hàng</h3>
              <p>Vui lòng chọn khách hàng bên trái hoặc tạo mới.</p>
            </div>
          ) : (
            <div className="form-wrapper">
              <div className="form-header">
                <h3 className="form-title">
                  {!selectedCustomer ? 'Tạo Khách hàng Mới' : (isEditing ? 'Chỉnh sửa thông tin' : 'Hồ sơ khách hàng')}
                </h3>
                
                <div className="form-actions">
                  {!isEditing ? (
                    <>
                      <button className="btn-action-text edit" onClick={() => setIsEditing(true)}>Chỉnh sửa</button>
                      {selectedCustomer.is_active && (
                        <button className="btn-action-text delete" onClick={() => setShowDeleteModal(true)}>Khóa tài khoản</button>
                      )}
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
                {/* === THÔNG TIN CƠ BẢN === */}
                <div className="section-title">1. Thông tin đăng nhập</div>
                
                <div className="input-group">
                  <label>Họ và tên <span style={{color: 'red'}}>*</span></label>
                  <input type="text" name="full_name" value={formData.full_name || ''} onChange={handleChange} disabled={!isEditing} className={errors.full_name ? 'input-error' : ''}/>
                  {errors.full_name && <span className="error-text">{errors.full_name}</span>}
                </div>
                
                <div className="input-group">
                  <label>Email (Dùng đăng nhập) <span style={{color: 'red'}}>*</span></label>
                  <input type="email" name="email" value={formData.email || ''} onChange={handleChange} disabled={!isEditing} className={errors.email ? 'input-error' : ''}/>
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>
                
                <div className="input-group">
                  <label>Mật khẩu {!selectedCustomer && <span style={{color: 'red'}}>*</span>}</label>
                  <input 
                    type="password" 
                    name="password" 
                    value={formData.password || ''} 
                    onChange={handleChange} 
                    disabled={!isEditing} 
                    placeholder={selectedCustomer ? "Bỏ trống nếu không muốn đổi" : "Nhập mật khẩu..."}
                    className={errors.password ? 'input-error' : ''}
                  />
                  {errors.password && <span className="error-text">{errors.password}</span>}
                </div>

                <div className="input-group">
                  <label>Tên đăng nhập (Tự sinh)</label>
                  <input type="text" name="username" value={formData.username || ''} disabled={true} placeholder="Hệ thống tự tạo" />
                </div>
                
                <div className="input-group">
                  <label>Trạng thái hoạt động</label>
                  <select name="is_active" value={formData.is_active !== false ? "true" : "false"} onChange={(e) => handleChange({ target: { name: 'is_active', value: e.target.value === 'true' } })} disabled={!isEditing}>
                    <option value="true">Đang hoạt động</option>
                    <option value="false">Đã khóa</option>
                  </select>
                </div>
                <div className="input-group"></div> {/* Bù ô */}

                {/* === THÔNG TIN CÁ NHÂN === */}
                <div className="section-title">2. Thông tin cá nhân</div>
                
                <div className="input-group">
                  <label>Số điện thoại</label>
                  <input type="text" name="phone_number" value={formData.phone_number || ''} onChange={handleChange} disabled={!isEditing} className={errors.phone_number ? 'input-error' : ''}/>
                  {errors.phone_number && <span className="error-text">{errors.phone_number}</span>}
                </div>
                
                <div className="input-group">
                  <label>Ngày sinh</label>
                  <input type="date" name="date_of_birth" value={formatDateForInput(formData.date_of_birth)} onChange={handleChange} disabled={!isEditing} />
                </div>
                
                <div className="input-group full-width">
                  <label>Địa chỉ</label>
                  <input type="text" name="address" value={formData.address || ''} onChange={handleChange} disabled={!isEditing} />
                </div>

                {/* === THÔNG TIN ĐỊNH DANH === */}
                <div className="section-title">3. Hồ sơ lưu trú (CCCD)</div>
                <div className="input-group">
                  <label>Số CCCD</label>
                  <input type="text" name="cccd_number" value={formData.cccd_number || ''} onChange={handleChange} disabled={!isEditing} className={errors.cccd_number ? 'input-error' : ''} />
                  {errors.cccd_number && <span className="error-text">{errors.cccd_number}</span>}
                </div>
                <div className="input-group">
                  <label>Ngày cấp CCCD</label>
                  <input type="date" name="cccd_issue_date" value={formatDateForInput(formData.cccd_issue_date)} onChange={handleChange} disabled={!isEditing} />
                </div>
                <div className="input-group">
                  <label>Nơi cấp CCCD</label>
                  <input type="text" name="cccd_issue_place" value={formData.cccd_issue_place || ''} onChange={handleChange} disabled={!isEditing} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== MODALS ===== */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content">
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
          <div className="modal-content">
            <div className="modal-icon" style={{ color: '#00A4D3' }}><i className="ph ph-floppy-disk"></i></div>
            <h3>Xác nhận lưu</h3>
            <p>Bạn có chắc chắn muốn lưu thông tin này?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowSaveModal(false)}>Hủy</button>
              <button className="btn-add-green" style={{ flex: 1, padding: '10px', justifyContent: 'center' }} onClick={confirmSave} disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : 'Lưu thông tin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon"><i className="ph ph-trash"></i></div>
            <h3>Khóa tài khoản</h3>
            <p>Khách hàng này sẽ không thể đăng nhập vào hệ thống được nữa. Xác nhận khóa?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>Hủy</button>
              <button className="btn-action-text delete" style={{ flex: 1, padding: '10px', justifyContent: 'center' }} onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Đang xử lý...' : 'Khóa tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerManagement;