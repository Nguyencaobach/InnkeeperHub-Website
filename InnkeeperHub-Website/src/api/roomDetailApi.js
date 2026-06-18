import axiosClient from './axiosClient';

const roomDetailApi = {
  // Lấy danh sách toàn bộ phòng chi tiết
  getAll: () => axiosClient.get('/api/room-details'),

  // Thêm phòng mới (Dùng JSON)
  create: (data) => axiosClient.post('/api/room-details', data),

  // Cập nhật thông tin phòng (Dùng JSON)
  update: (id, data) => axiosClient.put(`/api/room-details/${id}`, data),

  // Xóa phòng
  delete: (id) => axiosClient.delete(`/api/room-details/${id}`),
};

export default roomDetailApi;