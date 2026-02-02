'use strict';
import axiosClient from './axiosClient';

const hocKyService = {
  // Lấy danh sách học kỳ
  getAll() {
    return axiosClient.get('/hoc-ky/all');
  },

  // Tạo mới học kỳ
  create(data) {
    return axiosClient.post('/hoc-ky/create', data);
  },

  // Cập nhật học kỳ
  update(id, data) {
    return axiosClient.put(`/hoc-ky/update/${id}`, data);
  },

  // Xóa học kỳ
  delete(id) {
    return axiosClient.delete(`/hoc-ky/delete/${id}`);
  }
};

export default hocKyService;