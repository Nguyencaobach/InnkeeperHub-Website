import axiosClient from './axiosClient';

const profileApi = {
  // =============================================
  // HỒ SƠ CÁ NHÂN — mọi role đều được dùng
  // =============================================

  // Lấy thông tin hồ sơ của user đang đăng nhập
  getMyProfile: () => axiosClient.get('/api/profile/me'),

  // Cập nhật hồ sơ cá nhân
  updateMyProfile: (data) => axiosClient.put('/api/profile/me', data),

  // Upload ảnh avatar (multipart/form-data)
  uploadAvatar: (formData) => axiosClient.post('/api/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // =============================================
  // THÔNG TIN DOANH NGHIỆP — chỉ ADMIN
  // =============================================

  // Lấy thông tin doanh nghiệp
  getBusinessSettings: () => axiosClient.get('/api/profile/business'),

  // Tạo mới hoặc cập nhật thông tin doanh nghiệp
  updateBusinessSettings: (data) => axiosClient.put('/api/profile/business', data),
};

export default profileApi;

