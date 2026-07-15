import axiosClient from './axiosClient';

const revenueApi = {
  getSummary: (startDate, endDate) => {
    return axiosClient.get('/api/revenue/summary', { params: { startDate, endDate } });
  },
  
  getRevenueTimeline: (startDate, endDate, groupBy) => {
    return axiosClient.get('/api/revenue/timeline', { params: { startDate, endDate, groupBy } });
  },
  
  getPaymentMethodsDist: (startDate, endDate) => {
    return axiosClient.get('/api/revenue/payment-methods', { params: { startDate, endDate } });
  },
  
  getTopRooms: (startDate, endDate, limit) => {
    return axiosClient.get('/api/revenue/top-rooms', { params: { startDate, endDate, limit } });
  }
};

export default revenueApi;
