import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useProfileQuery } from '../../hooks/useProfile';
import './MainLayout.css';

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation(); // Thêm hook để bắt sự kiện chuyển trang

  // States quản lý UI
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [openMenu, setOpenMenu] = useState('');
  
  // State MỚI: Quản lý đóng/mở Sidebar trên Mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });

  // Dùng TanStack Query để luôn có profile mới nhất (bao gồm avatar_url)
  const { data: profileData } = useProfileQuery();

  // avatar_url: ưu tiên data từ server (profileData.data), fallback về localStorage
  // axiosClient interceptor trả về response.data → profileData = { success, data: {...} }
  const avatarUrl = profileData?.data?.avatar_url
    || JSON.parse(localStorage.getItem('user') || '{}')?.avatar_url
    || null;

  // Lắng nghe sự kiện storage (khi ProfilePage lưu thông tin mới vào localStorage)
  useEffect(() => {
    const handleStorageChange = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        setUser(parsed);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 2000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Tự động đóng Sidebar trên điện thoại khi người dùng bấm vào 1 link chuyển trang
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  const handleLogoutClick = () => {
    setShowProfileMenu(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const toggleMenu = (menuName) => {
    setOpenMenu(openMenu === menuName ? '' : menuName);
  };

  return (
    <div className="layout-container">
      {/* ===== LỚP PHỦ MỜ ĐEN (OVERLAY) CHO MOBILE ===== */}
      {/* Chỉ hiện ra khi đang ở màn hình nhỏ và sidebar đang mở */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* ===== SIDEBAR ===== */}
      {/* Thêm class 'open' vào sidebar nếu isSidebarOpen là true */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <h2>innkeeper<span>Hub</span></h2>
          {/* Nút đóng sidebar bên trong (Chỉ dành cho mobile) */}
          <button className="mobile-close-btn" onClick={() => setIsSidebarOpen(false)}>
            <i className="ph ph-x"></i>
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">
            <div className={`nav-item ${openMenu === 'dashboard' ? 'active' : ''}`} onClick={() => toggleMenu('dashboard')}>
              <div className="nav-item-content">
                <i className="ph ph-squares-four"></i>
                <span>Dashboard</span>
              </div>
              <i className={`ph ph-caret-down chevron ${openMenu === 'dashboard' ? 'open' : ''}`}></i>
            </div>
            <div className={`sub-menu ${openMenu === 'dashboard' ? 'show' : ''}`}>
              <NavLink to="/dashboard/revenue" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"}>Doanh thu</NavLink>
              <NavLink to="/dashboard/warehouse-status" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"}>Tình trạng kho hàng</NavLink>
              <NavLink to="/dashboard/calender" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"}>Lịch tổng quan</NavLink>
            </div>
          </div>

          <div className="nav-group">
            <div className={`nav-item ${openMenu === 'rooms' ? 'active' : ''}`} onClick={() => toggleMenu('rooms')}>
              <div className="nav-item-content">
                <i className="ph ph-bed"></i>
                <span>Quản lý phòng</span>
              </div>
              <i className={`ph ph-caret-down chevron ${openMenu === 'rooms' ? 'open' : ''}`}></i>
            </div>
            <div className={`sub-menu ${openMenu === 'rooms' ? 'show' : ''}`}>
              <NavLink to="/rooms/settings" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"}>Cài đặt phòng</NavLink>
              <NavLink to="/rooms/activities" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"}>Hoạt động phòng</NavLink>
            </div>
          </div>

          <div className="nav-group">
            <div className={`nav-item ${openMenu === 'staff-management' ? 'active' : ''}`} onClick={() => toggleMenu('staff-management')}>
              <div className="nav-item-content">
                <i className="ph ph-users-three"></i>
                <span>Quản lý nhân viên</span>
              </div>
              <i className={`ph ph-caret-down chevron ${openMenu === 'staff-management' ? 'open' : ''}`}></i>
            </div>
            <div className={`sub-menu ${openMenu === 'staff-management' ? 'show' : ''}`}>
              <NavLink to="/staff-management/account" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"}>Cài đặt tài khoản</NavLink>
              <NavLink to="/staff-management/timekeeping" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"}>Chấm công</NavLink>
            </div>
          </div>

          <NavLink to="/customers" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <div className="nav-item-content">
              <i className="ph ph-bold ph-user-focus"></i>
              <span>Quản lý khách hàng</span>
            </div>
          </NavLink>
          
          <a href="https://my.payos.vn" target="_blank" rel="noopener noreferrer" className="nav-item">
            <div className="nav-item-content">
              <i className="ph-bold ph-bank"></i>
              <span>Quản lý giao dịch</span>
            </div>
          </a>

          <NavLink to="/warehouse/categories" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <div className="nav-item-content">
              <i className="ph ph-bold ph-warehouse"></i>
              <span>Quản lý xuất nhập kho</span>
            </div>
          </NavLink>

          <div className="nav-group">
            <div className={`nav-item ${openMenu === 'services' ? 'active' : ''}`} onClick={() => toggleMenu('services')}>
              <div className="nav-item-content">
                <i className="ph-bold ph-dropbox-logo"></i>
                <span>Quản lý dịch vụ</span>
              </div>
              <i className={`ph ph-caret-down chevron ${openMenu === 'services' ? 'open' : ''}`}></i>
            </div>
            <div className={`sub-menu ${openMenu === 'services' ? 'show' : ''}`}>
              <NavLink to="/services/discount" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"}>Khuyến mãi</NavLink>
              <NavLink to="/services/additional" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"}>Dịch vụ khác</NavLink>
            </div>
          </div>

          <div className="nav-group">
            <div className={`nav-item ${openMenu === 'records' ? 'active' : ''}`} onClick={() => toggleMenu('records')}>
              <div className="nav-item-content">
                <i className="ph-bold ph-clock-user"></i>
                <span>Quản lý hoạt động</span>
              </div>
              <i className={`ph ph-caret-down chevron ${openMenu === 'records' ? 'open' : ''}`}></i>
            </div>
            <div className={`sub-menu ${openMenu === 'records' ? 'show' : ''}`}>
              <NavLink to="/records/room-invoices" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"}>Nhật ký phòng</NavLink>
              <NavLink to="/records/account-logs" className={({ isActive }) => isActive ? "sub-item active" : "sub-item"}>Hoạt động tài khoản</NavLink>
            </div>
          </div>
        </nav>
      </aside>

      {/* ===== KHU VỰC BÊN PHẢI ===== */}
      <div className="main-wrapper">
        <header className="header">
          <div className="header-left">
            {/* ===== NÚT HAMBURGER (MỞ MENU TRÊN MOBILE) ===== */}
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <i className="ph ph-list"></i>
            </button>
          </div>
          <div className="header-right">
            <button className="notification-btn">
              <i className="ph ph-bell" style={{ fontSize: '24px', color: '#666' }}></i>
              <span className="badge">13</span>
            </button>
            <div className="user-profile" style={{ position: 'relative' }}>
              <img
                src={
                  avatarUrl
                    ? (avatarUrl.startsWith('http') ? avatarUrl : `${import.meta.env.VITE_API_URL || ''}${avatarUrl}`)
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=0097b2&color=fff`
                }
                alt="Avatar"
                className="avatar"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{ cursor: 'pointer' }}
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=0097b2&color=fff`;
                }}
              />
              
              {showProfileMenu && (
                <div className="profile-dropdown">
                  <div className="dropdown-header">
                    <strong>{user.full_name || user.username}</strong>
                    <span className="role-badge">{user.role || 'USER'}</span>
                  </div>
                  <div className="dropdown-divider"></div>
                  <div className="dropdown-item" onClick={() => { setShowProfileMenu(false); navigate('/profile'); }}>
                    <i className="ph ph-user"></i>
                    <span>Hồ sơ</span>
                  </div>
                  <button className="dropdown-item logout-item" onClick={handleLogoutClick}>
                    <i className="ph ph-sign-out"></i>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content-area">
          <Outlet /> 
        </main>

        {/* Modal Đăng xuất giữ nguyên */}
        {showLogoutModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-icon"><i className="ph ph-warning-circle"></i></div>
              <h3>Xác nhận đăng xuất</h3>
              <p>Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?</p>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={cancelLogout}>Hủy</button>
                <button className="btn-confirm" onClick={confirmLogout}>Đăng xuất</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MainLayout;