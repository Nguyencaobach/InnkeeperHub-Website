import axiosClient from './axiosClient';

const authApi = {
  // POST /api/auth/login
  // Body: { username, password }
  // Response: { success: true, message: "...", data: { user, accessToken } }
  login: (username, password) => {
    return axiosClient.post('/api/auth/login', { username, password });
  },
};

export default authApi;
