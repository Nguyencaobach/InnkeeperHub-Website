import axiosClient from './axiosClient';

const reserveBookingApi = {
  // Lấy danh sách lịch đặt trước (RESERVED) của 1 phòng
  getByRoomId: (roomDetailId) =>
    axiosClient.get(`/api/reserve-bookings/by-room/${roomDetailId}`),

  // Cập nhật giờ nhận/trả phòng dự kiến
  updateTime: (bookingId, data) =>
    axiosClient.put(`/api/reserve-bookings/${bookingId}`, data),

  // Xóa lịch đặt trước
  deleteReservation: (bookingId) =>
    axiosClient.delete(`/api/reserve-bookings/${bookingId}`),

  // Chuyển RESERVED → RENTED (nhận phòng)
  convertToRented: (bookingId) =>
    axiosClient.post(`/api/reserve-bookings/${bookingId}/convert`),
};

export default reserveBookingApi;
