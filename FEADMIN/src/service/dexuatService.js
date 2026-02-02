import axiosClient from './axiosClient';

const deXuatService = {
  // Lấy danh sách đề xuất đang chờ (pending)
  getDanhSachCho() {
    return axiosClient.get('/de-xuat/danh-sach-cho');
  },

   pheDuyetDeXuat(id, status) {
    return axiosClient.put(`/de-xuat/phe-duyet/${id}`, { status });
  }

  
};

export default deXuatService;