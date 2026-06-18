import axiosClient from './axiosClient';

const additionalServiceApi = {
  // Lấy danh sách (Có hỗ trợ lọc theo category)
  getAll: (category) => {
    const url = category && category !== 'ALL' ? `/api/services?category=${category}` : '/api/services';
    return axiosClient.get(url);
  },
  
  getById: (id) => axiosClient.get(`/api/services/${id}`),
  
  // SỬA Ở ĐÂY: Thêm header multipart/form-data để axios biết là đang gửi File ảnh
  create: (data) => axiosClient.post('/api/services', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // SỬA Ở ĐÂY: Thêm header multipart/form-data để axios biết là đang gửi File ảnh
  update: (id, data) => axiosClient.put(`/api/services/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  delete: (id) => axiosClient.delete(`/api/services/${id}`),
};

export default additionalServiceApi;