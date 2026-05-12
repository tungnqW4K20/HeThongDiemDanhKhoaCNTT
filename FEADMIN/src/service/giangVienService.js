import axiosClient from './axiosClient';

const giangVienService = {
  // 1. Lấy danh sách tất cả giảng viên
  getAll(params) {
    return axiosClient.get('/giang-vien', { params });
  },

  // 2. Lấy giảng viên theo ID
  getById(id) {
    return axiosClient.get(`/giang-vien/${id}`);
  },

  // 3. Tạo mới giảng viên
  create(data) {
    return axiosClient.post('/giang-vien', data);
  },

  // 4. Cập nhật giảng viên
  update(id, data) {
    return axiosClient.put(`/giang-vien/${id}`, data);
  },

  // 5. Xóa giảng viên
  delete(id) {
    return axiosClient.delete(`/giang-vien/${id}`);
  },

  // 6. Lấy theo khoa (API cũ của bạn)
  getByKhoa(maKhoa) {
    return axiosClient.get(`/giang-vien/get-gv-by-khoa?ma_khoa=${maKhoa}`);
  },

  importExcel(formData) {
    return axiosClient.post('/giang-vien/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
};

export default giangVienService;