import axiosClient from './axiosClient';

const roomTypeApi = {
  // Lấy danh sách toàn bộ loại phòng
  getAll: () => {
    return axiosClient.get('/api/room-types');
  },

  // Thêm mới loại phòng (dùng FormData vì có upload ảnh)
  create: (formData) => {
    return axiosClient.post('/api/room-types', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Cập nhật loại phòng (dùng FormData vì có thể sửa ảnh)
  update: (id, formData) => {
    return axiosClient.put(`/api/room-types/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Xóa loại phòng
  delete: (id) => {
    return axiosClient.delete(`/api/room-types/${id}`);
  },
};

export default roomTypeApi;