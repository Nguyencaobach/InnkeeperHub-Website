import axiosClient from './axiosClient';

const productBatchApi = {
  // Lấy danh sách lô hàng theo product_id
  getByProductId: (productId) => {
    return axiosClient.get(`/api/product-batches?product_id=${productId}`);
  },

  // Thêm mới lô hàng
  create: (data) => {
    return axiosClient.post('/api/product-batches', data);
  },

  // Cập nhật lô hàng
  update: (id, data) => {
    return axiosClient.put(`/api/product-batches/${id}`, data);
  },

  // Xóa lô hàng
  delete: (id) => {
    return axiosClient.delete(`/api/product-batches/${id}`);
  },
};

export default productBatchApi;
