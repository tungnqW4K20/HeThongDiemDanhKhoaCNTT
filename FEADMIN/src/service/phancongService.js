import axiosClient from './axiosClient';

const phanCongService = {
  create(data) {
    return axiosClient.post('/phan-cong-auto/create', data);
  },
  getAll(params) {
    return axiosClient.get('/phan-cong/all', { params });
  },
   importExcel(formData) {
    return axiosClient.post('/phan-cong/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default phanCongService;


