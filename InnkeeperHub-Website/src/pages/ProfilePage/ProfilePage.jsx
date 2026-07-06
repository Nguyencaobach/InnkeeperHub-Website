import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileQuery, useUpdateProfile, useUploadAvatar, useBusinessSettingsQuery, useUpdateBusinessSettings } from '../../hooks/useProfile';
import { getImageSrc } from '../../utils/imageUrl';
import './ProfilePage.css';

// =============================================
// MODAL DÙNG CHUNG
// =============================================
function Modal({ icon, iconColor, title, message, onClose, onConfirm, confirmLabel, confirmClass }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-icon" style={{ color: iconColor }}>
          <i className={icon}></i>
        </div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          {onConfirm ? (
            <>
              <button className="btn-cancel" onClick={onClose}>Hủy</button>
              <button className={confirmClass} style={{ flex: 1, justifyContent: 'center' }} onClick={onConfirm}>
                {confirmLabel}
              </button>
            </>
          ) : (
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================
// TAB 1: HỔ SƠ CÁ NHÂN
// =============================================
function PersonalProfileTab({ user, setUser }) {
  const fileInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarError, setAvatarError] = useState('');
  const [showAvatarSuccessModal, setShowAvatarSuccessModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // ===== TANSTACK QUERY =====
  const { data: profileData, isLoading } = useProfileQuery();
  const updateProfileMutation = useUpdateProfile();
  const uploadAvatarMutation = useUploadAvatar();

  const isSaving = updateProfileMutation.isPending;
  const isUploadingAvatar = uploadAvatarMutation.isPending;

  // Khởi tạo form từ data của server
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    email: user.email || '',
    phone_number: user.phone_number || '',
    gender: user.gender || '',
    address: user.permanent_address || '',
    password: '',
  });

  const [apiError, setApiError] = useState('');

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Hydrate form khi profile data load xong
  useEffect(() => {
    if (profileData?.data) {
      const data = profileData.data;
      setFormData({
        full_name:    data.full_name    || '',
        email:        data.email        || '',
        phone_number: data.phone_number || '',
        gender:       data.gender       || '',
        address:      data.permanent_address || '',
        password:     '',
      });
      const updatedUser = { ...user, ...data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (apiError) setApiError('');
  };

  // Chỉ cho phép nhập số (0-9)
  const handleNumericChange = (e) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, [e.target.name]: numericValue });
    if (apiError) setApiError('');
  };

  const handleClickSave = () => {
    setShowConfirmModal(true);
  };

  const confirmSave = async () => {
    if (isSaving) return;
    try {
      const payload = {
        full_name: formData.full_name,
        email: formData.email || null,
        phone_number: formData.phone_number || null,
        gender: formData.gender || null,
        permanent_address: formData.address || null,
        ...(formData.password ? { password: formData.password } : {}),
      };

      const res = await updateProfileMutation.mutateAsync(payload);
      const serverData = res?.data ?? res;

      // Cập nhật lại formData với data thực tế từ server
      const newFormData = {
        full_name:    serverData.full_name    || '',
        email:        serverData.email        || '',
        phone_number: serverData.phone_number || '',
        gender:       serverData.gender       || '',
        address:      serverData.permanent_address || '',
        password:     '',
      };
      setFormData(newFormData);

      // Đồng bộ lại user & localStorage
      const updatedUser = { ...user, ...serverData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      setIsEditing(false);
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      setApiError('');
    } catch (error) {
      setApiError(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật hồ sơ.');
      setShowConfirmModal(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      phone_number: user.phone_number || '',
      gender: user.gender || '',
      address: user.permanent_address || '',
      password: '',
    });
    setApiError('');
    setIsEditing(false);
  };
  // Xử lý chọn ảnh avatar → upload ngay lên server
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Kiểm tra kích thước: tối đa 3MB
    if (file.size > 3 * 1024 * 1024) {
      setAvatarError('Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn 3MB.');
      return;
    }
    setAvatarError('');

    // Hiện preview ngay lập tức
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    try {
      const fd = new FormData();
      fd.append('avatar', file);

      const res = await uploadAvatarMutation.mutateAsync(fd);
      const serverData = res?.data ?? res;

      // Cập nhật user với avatar_url mới từ server
      const updatedUser = { ...user, avatar_url: serverData.avatar_url };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Xóa preview local (dùng URL từ server)
      setAvatarPreview(null);
      URL.revokeObjectURL(previewUrl);
      setShowAvatarSuccessModal(true);
    } catch (error) {
      setAvatarError(error.response?.data?.message || 'Không thể upload ảnh. Thử lại sau.');
      setAvatarPreview(null);
    } finally {
      // Reset input để chọn lại cùng file nếu muốn
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderRoleBadge = (role) => {
    if (role === 'ADMIN') return <span className="role-badge role-admin">ADMIN</span>;
    if (role === 'MANAGER') return <span className="role-badge role-manager">QUẢN LÝ</span>;
    return <span className="role-badge role-staff">NHÂN VIÊN</span>;
  };

  return (
    <>
      {/* Action bar */}
      <div className="tab-action-bar">
        {!isEditing ? (
          <button className="btn-action-text edit" onClick={() => setIsEditing(true)} disabled={isLoading}>
            {isLoading ? 'Đang tải...' : 'Chỉnh sửa'}
          </button>
        ) : (
          <>
            <button className="btn-cancel" onClick={handleCancel}>Hủy</button>
            <button className="btn-add-green" onClick={handleClickSave} disabled={isSaving}>
              <i className="ph ph-floppy-disk"></i>
              {isSaving ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </>
        )}
      </div>

      <div className="profile-body">
        {/* Sidebar trái: Avatar */}
        <div className="profile-sidebar">
          <div className="profile-avatar-area">
            {/* Avatar có thể click để đổi ảnh */}
            <div
              className="avatar-upload-wrapper"
              onClick={() => fileInputRef.current?.click()}
              title="Nhấn để đổi ảnh đại diện"
            >
              <img
                src={
                  avatarPreview ||
                  getImageSrc(user.avatar_url) ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=00A4D3&color=fff&size=128`
                }
                alt="Avatar"
                className="profile-avatar"
              />
              <div className="avatar-upload-overlay">
                {isUploadingAvatar
                  ? <i className="ph ph-spinner" style={{ animation: 'spin 1s linear infinite' }}></i>
                  : <i className="ph ph-camera"></i>
                }
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />

            {/* Lỗi upload avatar */}
            {avatarError && (
              <span style={{ fontSize: '12px', color: '#ef4444', textAlign: 'center', maxWidth: '180px' }}>
                {avatarError}
              </span>
            )}

            <div className="profile-name">{user.full_name || user.username}</div>
            <span className="status-badge status-active">HOẠT ĐỘNG</span>
          </div>
        </div>

        {/* Nội dung form */}
        <div className="profile-content">
          <div className="section-title">1. Thông tin tài khoản</div>
          <div className="form-grid">
            <div className="input-group">
              <label>Họ và tên</label>
              <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} disabled={!isEditing} placeholder="Nhập họ và tên..." />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={!isEditing} placeholder="Nhập email..." />
            </div>
            <div className="input-group">
              <label>Tên đăng nhập</label>
              <input type="text" value={user.username || ''} disabled />
            </div>
            <div className="input-group">
              <label>Chức vụ</label>
              <input
                type="text"
                value={
                  user.role === 'ADMIN' ? 'Quản trị viên (Admin)'
                  : user.role === 'MANAGER' ? 'Quản lý (Manager)'
                  : 'Nhân viên (Staff)'
                }
                disabled
              />
            </div>
          </div>

          <div className="section-title">2. Thông tin cá nhân</div>
          <div className="form-grid">
            <div className="input-group">
              <label>Số điện thoại</label>
              <input type="text" name="phone_number" value={formData.phone_number} onChange={handleNumericChange} disabled={!isEditing} placeholder="Nhập số điện thoại..." inputMode="numeric" pattern="[0-9]*" />
            </div>
            <div className="input-group">
              <label>Giới tính</label>
              <select name="gender" value={formData.gender} onChange={handleChange} disabled={!isEditing}>
                <option value="">-- Chọn giới tính --</option>
                <option value="NAM">Nam</option>
                <option value="NU">Nữ</option>
                <option value="KHAC">Khác</option>
              </select>
            </div>
            <div className="input-group full-width">
              <label>Địa chỉ</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} disabled={!isEditing} placeholder="Nhập địa chỉ..." />
            </div>
          </div>

          <div className="section-title">3. Bảo mật tài khoản</div>
          <div className="form-grid">
            <div className="input-group full-width">
              <label>Mật khẩu mới <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '12px' }}>(bỏ trống nếu không muốn đổi)</span></label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Api error */}
      {apiError && (
        <div style={{ margin: '0 24px 8px', padding: '12px 16px', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', fontSize: '14px', fontWeight: 500 }}>
          <i className="ph-fill ph-warning-circle" style={{ marginRight: '8px' }}></i>{apiError}
        </div>
      )}

      {/* Modal xác nhận lưu */}
      {showConfirmModal && (
        <Modal
          icon="ph ph-floppy-disk"
          iconColor="#00A4D3"
          title="Xác nhận lưu"
          message="Bạn có chắc chắn muốn cập nhật thông tin hồ sơ?"
          onClose={() => setShowConfirmModal(false)}
          onConfirm={confirmSave}
          confirmLabel={isSaving ? 'Đang lưu...' : 'Lưu thông tin'}
          confirmClass="btn-add-green"
        />
      )}

      {/* Modal thành công */}
      {showSuccessModal && (
        <Modal
          icon="ph-fill ph-check-circle"
          iconColor="#10b981"
          title="Thành công!"
          message="Hồ sơ cá nhân đã được cập nhật thành công."
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      {/* Modal thành công cập nhật avatar */}
      {showAvatarSuccessModal && (
        <Modal
          icon="ph-fill ph-check-circle"
          iconColor="#10b981"
          title="Cập nhật ảnh thành công!"
          message="Ảnh đại diện của bạn đã được cập nhật thành công."
          onClose={() => setShowAvatarSuccessModal(false)}
        />
      )}
    </>
  );
}

// =============================================
// TAB 2: THÔNG TIN DOANH NGHIỆP
// =============================================
const EMPTY_BUSINESS = {
  business_type: '',
  business_name: '',
  tax_code: '',
  legal_representative: '',
  business_address: '',
  logo_url: '',
  bank_account_number: '',
  bank_name: '',
  bank_account_name: '',
  hotline: '',
  email_contact: '',
};

function BusinessSettingsTab() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_BUSINESS });
  const [savedData, setSavedData] = useState({ ...EMPTY_BUSINESS });

  // ===== TANSTACK QUERY =====
  const { data: businessData, isLoading } = useBusinessSettingsQuery();
  const updateBusinessMutation = useUpdateBusinessSettings();

  const isSaving = updateBusinessMutation.isPending;
  const [apiError, setApiError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Hydrate form khi business data load xong
  useEffect(() => {
    const raw = businessData?.data ?? businessData;
    if (raw && typeof raw === 'object') {
      const normalized = {
        business_type:        raw.business_type        || '',
        business_name:        raw.business_name        || '',
        tax_code:             raw.tax_code             || '',
        legal_representative: raw.legal_representative || '',
        business_address:     raw.business_address     || '',
        logo_url:             raw.logo_url             || '',
        bank_account_number:  raw.bank_account_number  || '',
        bank_name:            raw.bank_name            || '',
        bank_account_name:    raw.bank_account_name    || '',
        hotline:              raw.hotline              || '',
        email_contact:        raw.email_contact        || '',
      };
      setFormData(normalized);
      setSavedData(normalized);
    }
  }, [businessData]);

  const hasData = Object.values(formData).some(v => v !== '');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (apiError) setApiError('');
  };

  // Chỉ cho phép nhập số (0-9)
  const handleNumericChange = (e) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, [e.target.name]: numericValue });
    if (apiError) setApiError('');
  };

  const handleClickSave = () => {
    if (!formData.business_name?.trim()) {
      setApiError('Tên doanh nghiệp không được để trống.');
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmSave = async () => {
    if (isSaving) return;
    try {
      const res = await updateBusinessMutation.mutateAsync(formData);
      const updated = res?.data ?? res ?? formData;
      const normalized = {
        business_type:        updated.business_type        || '',
        business_name:        updated.business_name        || '',
        tax_code:             updated.tax_code             || '',
        legal_representative: updated.legal_representative || '',
        business_address:     updated.business_address     || '',
        logo_url:             updated.logo_url             || '',
        bank_account_number:  updated.bank_account_number  || '',
        bank_name:            updated.bank_name            || '',
        bank_account_name:    updated.bank_account_name    || '',
        hotline:              updated.hotline              || '',
        email_contact:        updated.email_contact        || '',
      };
      setFormData(normalized);
      setSavedData(normalized);
      setIsEditing(false);
      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      setApiError(error.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin doanh nghiệp.');
      setShowConfirmModal(false);
    }
  };

  const handleCancel = () => {
    setFormData({ ...savedData });

    setIsEditing(false);
  };

  return (
    <>
      {/* Action bar */}
      <div className="tab-action-bar">
        {!isEditing ? (
          <button className="btn-action-text edit" onClick={() => setIsEditing(true)} disabled={isLoading}>
            {isLoading ? 'Đang tải...' : (hasData ? 'Chỉnh sửa' : 'Thiết lập ngay')}
          </button>
        ) : (
          <>
            <button className="btn-cancel" onClick={handleCancel}>Hủy</button>
            <button className="btn-add-green" onClick={handleClickSave} disabled={isSaving}>
              <i className="ph ph-floppy-disk"></i>
              {isSaving ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </>
        )}
      </div>

      {/* Api error */}
      {apiError && (
        <div style={{ margin: '0 24px 8px', padding: '12px 16px', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', fontSize: '14px', fontWeight: 500 }}>
          <i className="ph-fill ph-warning-circle" style={{ marginRight: '8px' }}></i>{apiError}
        </div>
      )}

      <div className="business-content">

        {/* === PHẦN 1: ĐỊNH DANH === */}
        <div className="section-title">1. Định danh doanh nghiệp</div>
        <div className="form-grid cols-3">
          <div className="input-group">
            <label>Loại hình doanh nghiệp</label>
            <select name="business_type" value={formData.business_type} onChange={handleChange} disabled={!isEditing}>
              <option value="">-- Chọn loại hình --</option>
              <option value="Ho kinh doanh">Hộ kinh doanh</option>
              <option value="Cong ty TNHH">Công ty TNHH</option>
              <option value="Cong ty Co phan">Công ty Cổ phần</option>
              <option value="Doanh nghiep tu nhan">Doanh nghiệp tư nhân</option>
            </select>
          </div>
          <div className="input-group">
            <label>Tên doanh nghiệp <span className="required">*</span></label>
            <input type="text" name="business_name" value={formData.business_name} onChange={handleChange} disabled={!isEditing} placeholder="Nhập tên doanh nghiệp..." />
          </div>
          <div className="input-group">
            <label>Mã số thuế</label>
            <input type="text" name="tax_code" value={formData.tax_code} onChange={handleNumericChange} disabled={!isEditing} placeholder="VD: 0123456789" inputMode="numeric" pattern="[0-9]*" />
          </div>
          <div className="input-group">
            <label>Người đại diện pháp luật</label>
            <input type="text" name="legal_representative" value={formData.legal_representative} onChange={handleChange} disabled={!isEditing} placeholder="Nhập họ tên người đại diện..." />
          </div>
          <div className="input-group">
            <label>URL Logo</label>
            <input type="text" name="logo_url" value={formData.logo_url} onChange={handleChange} disabled={!isEditing} placeholder="https://..." />
          </div>
          <div className="input-group full-width-3">
            <label>Địa chỉ doanh nghiệp</label>
            <input type="text" name="business_address" value={formData.business_address} onChange={handleChange} disabled={!isEditing} placeholder="Nhập địa chỉ đầy đủ..." />
          </div>
        </div>

        {/* Logo preview */}
        {formData.logo_url && (
          <div className="logo-preview-row">
            <span className="logo-preview-label"><i className="ph ph-image"></i> Xem trước logo:</span>
            <img src={formData.logo_url} alt="Logo doanh nghiệp" className="logo-preview-img" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        )}

        {/* === PHẦN 2: NGÂN HÀNG === */}
        <div className="section-title">2. Tài khoản ngân hàng (nhận thanh toán)</div>
        <div className="info-note">
          <i className="ph ph-warning-circle"></i>
          Khách hàng sẽ chuyển khoản vào tài khoản này khi thanh toán hóa đơn.
        </div>
        <div className="form-grid cols-3">
          <div className="input-group">
            <label>Tên ngân hàng</label>
            <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} disabled={!isEditing} placeholder="VD: Vietcombank, MB Bank..." />
          </div>
          <div className="input-group">
            <label>Số tài khoản</label>
            <input type="text" name="bank_account_number" value={formData.bank_account_number} onChange={handleNumericChange} disabled={!isEditing} placeholder="Nhập số tài khoản..." inputMode="numeric" pattern="[0-9]*" />
          </div>
          <div className="input-group">
            <label>Tên chủ tài khoản</label>
            <input type="text" name="bank_account_name" value={formData.bank_account_name} onChange={handleChange} disabled={!isEditing} placeholder="VD: NGUYEN VAN A" />
          </div>
        </div>

        {/* === PHẦN 3: LIÊN HỆ === */}
        <div className="section-title">3. Thông tin liên hệ</div>
        <div className="form-grid cols-3">
          <div className="input-group">
            <label>Hotline</label>
            <input type="text" name="hotline" value={formData.hotline} onChange={handleNumericChange} disabled={!isEditing} placeholder="VD: 1900 1234" inputMode="numeric" pattern="[0-9]*" />
          </div>
          <div className="input-group">
            <label>Email liên hệ</label>
            <input type="email" name="email_contact" value={formData.email_contact} onChange={handleChange} disabled={!isEditing} placeholder="VD: contact@hotel.vn" />
          </div>
        </div>

      </div>

      {/* Modal xác nhận lưu */}
      {showConfirmModal && (
        <Modal
          icon="ph ph-floppy-disk"
          iconColor="#00A4D3"
          title="Xác nhận lưu"
          message="Bạn có chắc chắn muốn cập nhật thông tin doanh nghiệp?"
          onClose={() => setShowConfirmModal(false)}
          onConfirm={confirmSave}
          confirmLabel="Lưu thông tin"
          confirmClass="btn-add-green"
        />
      )}

      {/* Modal thành công */}
      {showSuccessModal && (
        <Modal
          icon="ph-fill ph-check-circle"
          iconColor="#10b981"
          title="Thành công!"
          message="Thông tin doanh nghiệp đã được cập nhật thành công."
          onClose={() => setShowSuccessModal(false)}
        />
      )}
    </>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================
function ProfilePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : {};
  });

  const isAdmin = user.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="profile-container">
      {/* ===== HEADER ===== */}
      <div className="profile-header">
        <div className="profile-header-left">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <i className="ph ph-arrow-left"></i>
          </button>
          <h2>
            {activeTab === 'profile' ? 'Hồ sơ cá nhân' : 'Thông tin doanh nghiệp'}
          </h2>
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Hồ sơ cá nhân
        </button>
        {isAdmin && (
          <button
            className={`tab-btn ${activeTab === 'business' ? 'active' : ''}`}
            onClick={() => setActiveTab('business')}
          >
            Thông tin doanh nghiệp
          </button>
        )}
      </div>

      {/* ===== NỘI DUNG TAB ===== */}
      <div className="profile-tab-content">
        {activeTab === 'profile' && (
          <PersonalProfileTab user={user} setUser={setUser} />
        )}
        {activeTab === 'business' && isAdmin && (
          <BusinessSettingsTab />
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
