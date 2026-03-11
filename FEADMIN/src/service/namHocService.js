'use strict';
import axiosClient from './axiosClient';

const namHocService = {
  // Lấy danh sách năm học
  getAll() {
    return axiosClient.get('/nam-hoc/all');
  },

  // Lấy chi tiết một năm học
  getById(id) {
    return axiosClient.get(`/nam-hoc/${id}`);
  },

  // Tạo mới năm học
  create(data) {
    return axiosClient.post('/nam-hoc/create', data);
  },

  // Cập nhật năm học
  update(id, data) {
    return axiosClient.put(`/nam-hoc/update/${id}`, data);
  },

  // Xóa năm học
  delete(id) {
    return axiosClient.delete(`/nam-hoc/delete/${id}`);
  }
};

export default namHocService;