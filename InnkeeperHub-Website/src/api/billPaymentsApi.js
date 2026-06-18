import axiosClient from './axiosClient';

const billPaymentsApi = {
  // Lấy danh sách hóa đơn (hỗ trợ filter + phân trang)
  getAll: ({ search = '', dateFrom = '', dateTo = '', limit = 50, offset = 0 } = {}) => {
    const params = new URLSearchParams();
    if (search)   params.append('search', search);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo)   params.append('dateTo', dateTo);
    params.append('limit', limit);
    params.append('offset', offset);
    return axiosClient.get(`/api/bill-payments?${params.toString()}`);
  },

  // Lấy chi tiết 1 hóa đơn (bao gồm services_detail)
  getById: (id) => axiosClient.get(`/api/bill-payments/${id}`),

  // Xóa hóa đơn (chỉ ADMIN)
  delete: (id) => axiosClient.delete(`/api/bill-payments/${id}`),
};

export default billPaymentsApi;
