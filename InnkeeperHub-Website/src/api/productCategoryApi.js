import axiosClient from './axiosClient';

const categoryApi = {
  // Lấy danh sách danh mục
  getAll: () => axiosClient.get('/api/product-categories'),

  // Thêm mới danh mục
  create: (data) => axiosClient.post('/api/product-categories', data),

  // Cập nhật danh mục
  update: (id, data) => axiosClient.put(`/api/product-categories/${id}`, data),

  // Xóa danh mục
  delete: (id) => axiosClient.delete(`/api/product-categories/${id}`),
};

export default categoryApi;