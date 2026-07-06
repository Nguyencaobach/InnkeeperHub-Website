import axiosClient from './axiosClient';

const staffApi = {
  // Lấy danh sách toàn bộ nhân viên
  getAll: () => axiosClient.get('/api/staff'),

  // Thêm nhân viên mới
  create: (data) => axiosClient.post('/api/staff', data),

  // Cập nhật thông tin nhân viên
  update: (id, data) => axiosClient.put(`/api/staff/${id}`, data),

  // Khóa tài khoản nhân viên (Xóa mềm)
  delete: (id) => axiosClient.delete(`/api/staff/${id}`),

  // Xóa vĩnh viễn nhân viên (Xóa cứng)
  hardDelete: (id) => axiosClient.delete(`/api/staff/hard/${id}`),
};

export default staffApi;