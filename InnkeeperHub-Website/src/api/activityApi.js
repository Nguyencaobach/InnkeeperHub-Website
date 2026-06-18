import axiosClient from './axiosClient';

const activityApi = {
  // Lấy danh sách nhật ký (có hỗ trợ limit/offset)
  getAll: (limit = 200, offset = 0) =>
    axiosClient.get(`/api/account-activity?limit=${limit}&offset=${offset}`),

  // Xóa log theo khoảng thời gian (chỉ ADMIN)
  deleteByDateRange: (beforeDate) =>
    axiosClient.delete(`/api/account-activity/before/${beforeDate}`),
};

export default activityApi;
