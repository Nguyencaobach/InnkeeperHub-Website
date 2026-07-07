import axiosClient from './axiosClient';

const customerServiceOrderApi = {
  // Admin lấy tất cả đơn chờ duyệt
  getPendingOrders: () =>
    axiosClient.get('/api/activity/service-orders/pending'),

  // Admin xác nhận đơn
  confirmOrder: (id) =>
    axiosClient.patch(`/api/activity/service-orders/${id}/confirm`),

  // Admin hủy đơn
  cancelOrder: (id) =>
    axiosClient.delete(`/api/activity/service-orders/${id}`),
};

export default customerServiceOrderApi;
