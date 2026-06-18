import axiosClient from './axiosClient';

const discountApi = {
  getAll: () => axiosClient.get('/api/discounts'),
  getById: (id) => axiosClient.get(`/api/discounts/${id}`),
  create: (data) => axiosClient.post('/api/discounts', data),
  update: (id, data) => axiosClient.put(`/api/discounts/${id}`, data),
  delete: (id) => axiosClient.delete(`/api/discounts/${id}`),
};

export default discountApi;