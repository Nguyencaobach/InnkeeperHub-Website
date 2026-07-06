import { useState } from 'react';
import { useStaffQuery, useCreateStaff, useUpdateStaff, useDeleteStaff, useHardDeleteStaff } from '../../hooks/useStaff';
import './StaffManagement.css';

function StaffManagement() {
  // ===== TANSTACK QUERY: Thay thế useState/useEffect + fetchStaff =====
  const { data: staffList = [] } = useStaffQuery();
  const createStaffMutation = useCreateStaff();
  const updateStaffMutation = useUpdateStaff();
  const deleteStaffMutation = useDeleteStaff();
  const hardDeleteStaffMutation = useHardDeleteStaff();

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  
  // States cho Bộ lọc và Tìm kiếm
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ACTIVE'); // Mặc định chỉ hiện tài khoản đang hoạt động

  // States Modals
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [apiErrorMsg, setApiErrorMsg] = useState('');

  // isSaving/isDeleting lấy trực tiếp từ mutation state
  const isSaving = createStaffMutation.isPending || updateStaffMutation.isPending;
  const isDeleting = deleteStaffMutation.isPending || hardDeleteStaffMutation.isPending;

  // Lấy thông tin người đang đăng nhập từ LocalStorage để kiểm tra quyền
  const currentUser = JSON.parse(localStorage.getItem('user')) || {};
  const isAdmin = currentUser.role === 'ADMIN';
  const isManager = currentUser.role === 'MANAGER';

  // ===== PHÂN QUYỀN: Xác định quyền chỉnh sửa Role & Trạng thái =====
  // Lấy role của nhân viên đang được chọn/xem
  const viewingRole = selectedStaff?.role || formData.role;

  // Quyền chỉnh sửa Chức vụ (Role):
  // - Tài khoản ADMIN: KHÔNG ai được đổi role → ẩn hoàn toàn
  // - Tài khoản MANAGER: chỉ ADMIN mới được đổi role → ẩn nếu người đăng nhập là MANAGER
  // - Tài khoản STAFF: ADMIN hoặc MANAGER đều được đổi role
  // - Khi tạo mới: chỉ ADMIN mới được chọn role, MANAGER mặc định tạo STAFF
  const canEditRole = (() => {
    if (!selectedStaff && !isEditing) return false; // Chưa chọn ai
    if (!selectedStaff && isEditing) return isAdmin; // Tạo mới: chỉ ADMIN chọn role
    if (viewingRole === 'ADMIN') return false; // Không đổi role ADMIN
    if (viewingRole === 'MANAGER' && !isAdmin) return false; // Chỉ ADMIN đổi role MANAGER
    return isAdmin || isManager; // ADMIN hoặc MANAGER đổi role STAFF
  })();

  // Quyền chỉnh sửa Trạng thái hoạt động:
  // - Tài khoản ADMIN: KHÔNG cho khóa/mở khóa → ẩn hoàn toàn
  // - Tài khoản MANAGER: chỉ ADMIN mới được đổi trạng thái → ẩn nếu người đăng nhập là MANAGER
  const canEditStatus = viewingRole !== 'ADMIN' && !(viewingRole === 'MANAGER' && !isAdmin);


  // Xử lý Lọc & Tìm kiếm
  let displayStaff = staffList.filter(staff => {
    // 0. PHÂN QUYỀN: MANAGER không được thấy tài khoản ADMIN trong danh sách
    if (isManager && staff.role === 'ADMIN') return false;

    // 1. Lọc theo Trạng thái (ACTIVE / INACTIVE / ALL)
    if (filterStatus === 'ACTIVE' && !staff.is_active) return false;
    if (filterStatus === 'INACTIVE' && staff.is_active) return false;

    // 2. Lọc theo Vai trò
    if (filterRole !== 'ALL' && staff.role !== filterRole) return false;
    
    // 3. Lọc theo Tìm kiếm (Tên, Email hoặc SĐT)
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      const matchName = staff.full_name?.toLowerCase().includes(keyword);
      const matchEmail = staff.email?.toLowerCase().includes(keyword);
      const matchPhone = staff.phone_number?.includes(keyword);
      if (!matchName && !matchEmail && !matchPhone) return false;
    }
    
    return true;
  });

  // 4. Sắp xếp danh sách hiển thị theo bảng chữ cái (Tên Nhân viên)
  displayStaff.sort((a, b) => {
    if (!a.full_name) return 1;
    if (!b.full_name) return -1;
    return a.full_name.localeCompare(b.full_name);
  });

  const handleSelectStaff = (staff) => {
    setSelectedStaff(staff);
    // Khi lấy chi tiết, xóa password để form không hiện password hash
    // eslint-disable-next-line no-unused-vars
    const { password, ...safeData } = staff; 
    setFormData(safeData);
    setIsEditing(false);
    setErrors({});
    setApiErrorMsg('');
  };

  const handleAddNew = () => {
    setSelectedStaff(null);
    setFormData({ 
      full_name: '', email: '', password: '', role: 'STAFF', 
      phone_number: '', gender: '', date_of_birth: '',
      cccd_number: '', cccd_issue_date: '', cccd_issue_place: '',
      permanent_address: '', bank_name: '', bank_account_number: '', bank_account_name: ''
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
    if (selectedStaff) {
      handleSelectStaff(selectedStaff);
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
    if (!selectedStaff && !formData.password?.trim()) {
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
    try {
      // Chuẩn bị dữ liệu sạch trước khi gửi API
      const cleanData = {
        full_name: formData.full_name?.trim() || '',
        email: formData.email?.trim() || '',
        role: formData.role || 'STAFF',
        is_active: formData.is_active === true || formData.is_active === 'true',
        gender: formData.gender?.trim() || null,
        phone_number: formData.phone_number?.trim() || null,
        date_of_birth: formData.date_of_birth || null,
        permanent_address: formData.permanent_address?.trim() || null,
        cccd_number: formData.cccd_number?.trim() || null,
        cccd_issue_date: formData.cccd_issue_date || null,
        cccd_issue_place: formData.cccd_issue_place?.trim() || null,
        bank_name: formData.bank_name?.trim() || null,
        bank_account_number: formData.bank_account_number?.trim() || null,
        bank_account_name: formData.bank_account_name?.trim() || null,
      };

      if (formData.password && formData.password.trim() !== '') {
        cleanData.password = formData.password;
      }

      if (selectedStaff) {
        await updateStaffMutation.mutateAsync({ id: selectedStaff.user_id, data: cleanData });
      } else {
        await createStaffMutation.mutateAsync(cleanData);
      }
      // Cache tự động được invalidate bởi mutation onSuccess → không cần fetchStaff()
      setShowSaveModal(false);
      setIsEditing(false);
      setShowSuccessModal(true); 
    } catch (error) {
      setApiErrorMsg(error.response?.data?.message || "Có lỗi xảy ra. Kiểm tra lại dữ liệu.");
      setShowSaveModal(false);
    }
  };

  const confirmDelete = async () => {
    if (isDeleting) return;
    try {
      await deleteStaffMutation.mutateAsync(selectedStaff.user_id);
      // Cache tự động được invalidate → không cần fetchStaff()
      setShowDeleteModal(false);
      setSelectedStaff(null);
      setShowSuccessModal(true);
    } catch {
      alert("Lỗi khi khóa tài khoản.");
      setShowDeleteModal(false);
    }
  };

  const confirmHardDelete = async () => {
    if (isDeleting) return;
    try {
      await hardDeleteStaffMutation.mutateAsync(selectedStaff.user_id);
      setShowDeleteModal(false);
      setSelectedStaff(null);
      setShowSuccessModal(true);
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi khi xóa vĩnh viễn.");
      setShowDeleteModal(false);
    }
  };

  // Helper render huy hiệu Role
  const renderRoleBadge = (role) => {
    if (role === 'ADMIN') return <span className="role-badge role-admin">ADMIN</span>;
    if (role === 'MANAGER') return <span className="role-badge role-manager">QUẢN LÝ</span>;
    return <span className="role-badge role-staff">NHÂN VIÊN</span>;
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
    <div className="staff-settings-container">
      <div className="ss-header">
        <h2>Quản lý Nhân viên</h2>
        <div className="ss-header-controls">
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
          <select
            className="filter-select"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="ALL">Tất cả chức vụ</option>
            {isAdmin && <option value="ADMIN">Admin</option>}
            <option value="MANAGER">Quản lý (Manager)</option>
            <option value="STAFF">Nhân viên (Staff)</option>
          </select>
          <button className="btn-add-green" onClick={handleAddNew}>
            Thêm nhân viên
          </button>
        </div>
      </div>

      <div className="ss-body">
        {/* === BÊN TRÁI: DANH SÁCH & TÌM KIẾM === */}
        <div className="ss-sidebar">
{/* Vùng Danh sách */}
          <div className="staff-list-wrapper">
            {displayStaff.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                Không tìm thấy nhân viên nào.
              </div>
            ) : (
              displayStaff.map(staff => (
                <div 
                  key={staff.user_id} 
                  className={`staff-item ${selectedStaff?.user_id === staff.user_id ? 'active' : ''} ${!staff.is_active ? 'inactive' : ''}`}
                  onClick={() => { if (!isEditing) handleSelectStaff(staff); }}
                >
                  <div className="staff-name" style={{ width: '100%' }}>
                    <span className="staff-fullname" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {staff.full_name}
                    </span>
                    <div className="staff-badges" style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: 'auto' }}>
                      {renderStatusBadge(staff.is_active)}
                      {renderRoleBadge(staff.role)}
                    </div>
                  </div>
                  <div className="staff-email">
                    <i className="ph-fill ph-envelope-simple"></i> {staff.email}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* === BÊN PHẢI: FORM CHI TIẾT === */}
        <div className="ss-content">
          {!selectedStaff && !isEditing ? (
            <div className="empty-state">
              <i className="ph-fill ph-users" style={{ fontSize: '72px', color: '#cbd5e1' }}></i>
              <h3 style={{ fontSize: '20px', margin: 0 }}>Chưa chọn nhân viên</h3>
              <p>Vui lòng chọn nhân viên bên trái hoặc tạo mới.</p>
            </div>
          ) : (
            <div className="form-wrapper">
              <div className="form-header">
                <h3 className="form-title">
                  {!selectedStaff ? 'Tạo Nhân viên Mới' : (isEditing ? 'Chỉnh sửa thông tin' : 'Hồ sơ nhân viên')}
                </h3>
                
                <div className="form-actions">
                  {!isEditing ? (
                    <>
                      <button className="btn-action-text edit" onClick={() => setIsEditing(true)}>Chỉnh sửa</button>
                      {canEditStatus && selectedStaff?.is_active && (
                        <button className="btn-action-text delete" onClick={() => setShowDeleteModal(true)}>Xóa</button>
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
                <div className="section-title">1. Thông tin đăng nhập & Vai trò</div>
                
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
                  <label>Mật khẩu {!selectedStaff && <span style={{color: 'red'}}>*</span>}</label>
                  <input 
                    type="password" 
                    name="password" 
                    value={formData.password || ''} 
                    onChange={handleChange} 
                    disabled={!isEditing} 
                    placeholder={selectedStaff ? "Bỏ trống nếu không muốn đổi" : "Nhập mật khẩu..."}
                    className={errors.password ? 'input-error' : ''}
                  />
                  {errors.password && <span className="error-text">{errors.password}</span>}
                </div>

                {/* Chức vụ: Chỉ hiện khi có quyền chỉnh sửa */}
                {canEditRole ? (
                  <div className="input-group">
                    <label>Chức vụ (Role)</label>
                    <select 
                      name="role" 
                      value={formData.role || 'STAFF'} 
                      onChange={handleChange} 
                      disabled={!isEditing}
                    >
                      <option value="STAFF">Nhân viên (Staff)</option>
                      <option value="MANAGER">Quản lý (Manager)</option>
                      {isAdmin && <option value="ADMIN">Quản trị viên (Admin)</option>}
                    </select>
                  </div>
                ) : (
                  selectedStaff && (
                    <div className="input-group">
                      <label>Chức vụ (Role)</label>
                      <input type="text" value={viewingRole === 'ADMIN' ? 'Quản trị viên (Admin)' : viewingRole === 'MANAGER' ? 'Quản lý (Manager)' : 'Nhân viên (Staff)'} disabled />
                    </div>
                  )
                )}
                
                {/* Trạng thái: Ẩn hoàn toàn nếu đang xem tài khoản ADMIN */}
                {canEditStatus ? (
                  <div className="input-group">
                    <label>Trạng thái hoạt động</label>
                    <select name="is_active" value={formData.is_active !== false ? "true" : "false"} onChange={(e) => handleChange({ target: { name: 'is_active', value: e.target.value === 'true' } })} disabled={!isEditing}>
                      <option value="true">Đang hoạt động</option>
                      <option value="false">Đã khóa</option>
                    </select>
                  </div>
                ) : (
                  selectedStaff && (
                    <div className="input-group">
                      <label>Trạng thái hoạt động</label>
                      <input type="text" value="Đang hoạt động" disabled />
                    </div>
                  )
                )}
                <div className="input-group"></div> {/* Ô trống để bù cột */}

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
                
                <div className="input-group">
                  <label>Giới tính</label>
                  <select name="gender" value={formData.gender || ''} onChange={handleChange} disabled={!isEditing}>
                    <option value="">-- Chọn giới tính --</option>
                    <option value="NAM">Nam</option>
                    <option value="NU">Nữ</option>
                    <option value="KHAC">Khác</option>
                  </select>
                </div>

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
                <div className="input-group full-width">
                  <label>Địa chỉ thường trú</label>
                  <input type="text" name="permanent_address" value={formData.permanent_address || ''} onChange={handleChange} disabled={!isEditing} />
                </div>

                {/* === THÔNG TIN NGÂN HÀNG === */}
                <div className="section-title">3. Thông tin nhận lương (Ngân hàng)</div>
                <div className="input-group">
                  <label>Tên Ngân hàng</label>
                  <input type="text" name="bank_name" value={formData.bank_name || ''} onChange={handleChange} disabled={!isEditing} placeholder="VD: Vietcombank, MB Bank..." />
                </div>
                <div className="input-group">
                  <label>Số tài khoản</label>
                  <input type="text" name="bank_account_number" value={formData.bank_account_number || ''} onChange={handleChange} disabled={!isEditing} />
                </div>
                <div className="input-group">
                  <label>Tên chủ tài khoản</label>
                  <input type="text" name="bank_account_name" value={formData.bank_account_name || ''} onChange={handleChange} disabled={!isEditing} placeholder="VD: NGUYEN VAN A" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== MODALS (GIỮ NGUYÊN NHƯ CŨ) ===== */}
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
            <div className="modal-icon"></div>
            <h3>Thao tác tài khoản</h3>
            <p>Chọn <strong>Khóa tài khoản</strong> để ngăn nhân viên đăng nhập, hoặc <strong>Xóa vĩnh viễn</strong> để xóa hoàn toàn dữ liệu (chỉ áp dụng nếu chưa có giao dịch).</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>Hủy</button>
              <button className="btn-warning" style={{ padding: '10px 15px' }} onClick={confirmDelete} disabled={isDeleting}>
                Khóa TK
              </button>
              <button className="btn-action-text delete" style={{ padding: '10px 15px', background: '#fee2e2', color: '#dc2626' }} onClick={confirmHardDelete} disabled={isDeleting}>
                {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffManagement;