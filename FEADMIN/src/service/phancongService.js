import axiosClient from './axiosClient';

const phanCongService = {
  create(data) {
    return axiosClient.post('/phan-cong-auto/create', data);
  },
  update(buoiId, data) {
    return axiosClient.put(`/phan-cong-auto/update/${buoiId}`, data);
  },
  delete(buoiId) {
    return axiosClient.delete(`/phan-cong-auto/buoi-hoc/${buoiId}/force`);
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


