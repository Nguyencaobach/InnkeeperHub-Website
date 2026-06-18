import axiosClient from './axiosClient';

const customerApi = {
  // Lấy danh sách toàn bộ khách hàng
  getAll: () => axiosClient.get('/api/customers'),

  // Thêm khách hàng mới
  create: (data) => axiosClient.post('/api/customers', data),

  // Cập nhật thông tin khách hàng
  update: (id, data) => axiosClient.put(`/api/customers/${id}`, data),

  // Khóa tài khoản khách hàng (Xóa mềm)
  delete: (id) => axiosClient.delete(`/api/customers/${id}`),
};

export default customerApi;