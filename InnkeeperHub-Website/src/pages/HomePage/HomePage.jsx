import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();

  // 1. Đọc localStorage ngay lúc khởi tạo
  const [user] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });

  // 2. Chuyển trang nếu chưa đăng nhập
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
      {/* ... (Phần code HTML bên trong giữ nguyên) ... */}
      <h1 style={{ fontSize: '42px', color: '#1a1f36', marginBottom: '8px' }}>
        Hi {user.full_name || user.username},
      </h1>
      <p style={{ fontSize: '20px', color: '#8792a2', fontWeight: '500' }}>
        Have a productive day at innkeeperHub!
      </p>
    </div>
  );
}

export default HomePage;