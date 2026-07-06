import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles }) => {
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;

  // Nếu chưa đăng nhập, chuyển về trang login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Nếu không có role hoặc role không nằm trong danh sách cho phép
  if (!user.role || !allowedRoles.includes(user.role)) {
    // Nếu là STAFF mà cố truy cập trang khác (như dashboard), cho về trang được phép
    if (user.role === 'STAFF') {
      return <Navigate to="/rooms/activities" replace />;
    }
    // Mặc định trả về dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // Hợp lệ -> cho phép render các route con
  return <Outlet />;
};

export default ProtectedRoute;
