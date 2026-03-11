import axiosClient from './axiosClient';

const khoaService = {
  getAll() {
    return axiosClient.get('/co-so/all');
  }
};

export default khoaService;
