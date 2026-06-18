import axiosClient from './axiosClient';

const bookingApi = {
  // Lấy danh sách phiên thuê
  getAll: () => {
    return axiosClient.get('/api/bookings');
  },

  // Tạo phiên thuê mới (Có upload ảnh CCCD nên dùng FormData)
  create: (formData) => {
    return axiosClient.post('/api/bookings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Lấy chi tiết 1 phiên thuê theo ID
  getById: (id) => {
    return axiosClient.get(`/api/bookings/${id}`);
  },

  // Lấy phiên thuê đang active theo room_detail_id
  getByRoomId: (roomDetailId) => {
    return axiosClient.get(`/api/bookings/by-room/${roomDetailId}`);
  },

  // Cập nhật thông tin phiên thuê
  update: (id, data) => {
    return axiosClient.put(`/api/bookings/${id}`, data);
  },

  // Kết thúc / checkout phiên thuê (Thanh toán & Trả phòng)
  checkout: (id, paymentData) => {
    return axiosClient.patch(`/api/bookings/${id}/checkout`, paymentData);
  },
};

export default bookingApi;