import axiosClient from './axiosClient';

const warehouseStatusApi = {
  // Lấy dữ liệu 3 bảng Dashboard cùng lúc
  getDashboard: () => {
    return axiosClient.get('/api/warehouse-status/dashboard');
  },
  
  // Tiêu hủy lô hàng (Kèm theo lý do)
  discardBatch: (batchId, data) => {
    // data là một object: { reason: 'Lý do tiêu hủy...' }
    return axiosClient.put(`/api/warehouse-status/discard/${batchId}`, data);
  }
};

export default warehouseStatusApi;