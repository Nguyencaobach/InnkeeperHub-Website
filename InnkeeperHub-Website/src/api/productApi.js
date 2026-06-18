import axiosClient from './axiosClient';

const productApi = {
  // Lấy danh sách toàn bộ sản phẩm
  getAll: () => {
    return axiosClient.get('/api/products');
  },

  // Thêm mới sản phẩm (Có ảnh -> dùng FormData)
  create: (formData) => {
    return axiosClient.post('/api/products', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Cập nhật sản phẩm (Có ảnh -> dùng FormData)
  update: (id, formData) => {
    return axiosClient.put(`/api/products/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Xóa sản phẩm
  delete: (id) => {
    return axiosClient.delete(`/api/products/${id}`);
  },
};

export default productApi;