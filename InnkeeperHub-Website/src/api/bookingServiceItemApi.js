import axiosClient from './axiosClient';

const bookingServiceItemApi = {
  // Lấy sản phẩm theo danh mục (kèm tồn kho hợp lệ)
  getProductsByCategory: (categoryId) =>
    axiosClient.get(`/api/booking-service-items/products?categoryId=${categoryId}`),

  // Lấy danh sách dịch vụ đã gọi của 1 phiên thuê
  getByBookingId: (bookingId) =>
    axiosClient.get(`/api/booking-service-items/${bookingId}`),

  // Thêm hàng kho vào phiên thuê (FEFO)
  addInventoryItem: (bookingId, data) =>
    axiosClient.post(`/api/booking-service-items/${bookingId}/inventory`, data),

  // Xóa 1 item (hoàn tồn kho nếu là hàng kho)
  removeItem: (serviceItemId) =>
    axiosClient.delete(`/api/booking-service-items/item/${serviceItemId}`),

  // Lấy danh mục dịch vụ đi kèm (DISTINCT)
  getServiceCategories: () =>
    axiosClient.get('/api/booking-service-items/service-categories'),

  // Lấy dịch vụ theo category
  getServicesByCategory: (category) =>
    axiosClient.get(`/api/booking-service-items/services?category=${encodeURIComponent(category)}`),

  // Thêm dịch vụ đi kèm vào phiên thuê
  addGeneralItem: (bookingId, data) =>
    axiosClient.post(`/api/booking-service-items/${bookingId}/general`, data),

  // Cập nhật số lượng item (tự xử lý tồn kho ở backend)
  updateQuantity: (serviceItemId, quantity) =>
    axiosClient.patch(`/api/booking-service-items/item/${serviceItemId}/quantity`, { quantity }),
};

export default bookingServiceItemApi;
